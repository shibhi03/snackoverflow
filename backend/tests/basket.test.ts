import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { testPrisma, seedTestDatabase, verifyTestDatabaseSafety } from './setup.js';

const app = createApp();

describe('Snack Basket & Member Multi-Snack Consumption API', () => {
  let memberToken: string;
  let adminToken: string;
  let memberUserId: string;

  beforeAll(async () => {
    await verifyTestDatabaseSafety();
    const seeded = await seedTestDatabase();
    memberToken = seeded.memberToken;
    adminToken = seeded.adminToken;
    memberUserId = seeded.memberId;
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  // =========================================================================
  // 1. ATOMIC BASKET CONSUMPTION HAPPY PATH
  // =========================================================================
  describe('1. Atomic Basket Consumption', () => {
    it('should successfully consume multiple different snacks in a single atomic transaction', async () => {
      // 1. Create two dedicated snacks with known inventory
      const snackA = await testPrisma.snack.create({
        data: {
          name: 'Basket Test Dark Chocolate',
          category: 'SWEET',
          quantity: 10,
          lowStockThreshold: 3,
        },
      });

      const snackB = await testPrisma.snack.create({
        data: {
          name: 'Basket Test Roasted Cashews',
          category: 'SAVOURY',
          quantity: 8,
          lowStockThreshold: 2,
        },
      });

      // 2. Consume 3 of Snack A and 2 of Snack B
      const res = await request(app)
        .post('/api/snacks/consume-basket')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          items: [
            { snackId: snackA.id, amount: 3 },
            { snackId: snackB.id, amount: 2 },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.totalPackets).toBe(5);
      expect(res.body.items).toHaveLength(2);

      // 3. Verify stock in database
      const checkA = await testPrisma.snack.findUnique({ where: { id: snackA.id } });
      const checkB = await testPrisma.snack.findUnique({ where: { id: snackB.id } });

      expect(checkA!.quantity).toBe(7); // 10 - 3
      expect(checkB!.quantity).toBe(6); // 8 - 2

      // 4. Verify corresponding activity records were created
      const activitiesA = await testPrisma.activity.findMany({
        where: { snackId: snackA.id, action: 'CONSUMED' },
      });
      const activitiesB = await testPrisma.activity.findMany({
        where: { snackId: snackB.id, action: 'CONSUMED' },
      });

      expect(activitiesA).toHaveLength(1);
      expect(activitiesA[0].amount).toBe(3);
      expect(activitiesA[0].userId).toBe(memberUserId);

      expect(activitiesB).toHaveLength(1);
      expect(activitiesB[0].amount).toBe(2);
      expect(activitiesB[0].userId).toBe(memberUserId);
    });
  });

  // =========================================================================
  // 2. BASKET INPUT VALIDATION
  // =========================================================================
  describe('2. Basket Input Validation', () => {
    it('should reject an empty basket with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/snacks/consume-basket')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ items: [] });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_INPUT');
    });

    it('should reject duplicate snack IDs in the same basket with 400 Bad Request', async () => {
      const dummyId = '11111111-1111-1111-1111-111111111111';
      const res = await request(app)
        .post('/api/snacks/consume-basket')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          items: [
            { snackId: dummyId, amount: 1 },
            { snackId: dummyId, amount: 2 },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('duplicate');
    });

    it('should reject non-positive amounts with 400 Bad Request', async () => {
      const dummyId = '11111111-1111-1111-1111-111111111111';
      const res = await request(app)
        .post('/api/snacks/consume-basket')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          items: [{ snackId: dummyId, amount: 0 }],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_INPUT');
    });

    it('should reject nonexistent snack UUIDs with 404 Not Found', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000088';
      const res = await request(app)
        .post('/api/snacks/consume-basket')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          items: [{ snackId: nonExistentId, amount: 1 }],
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  // =========================================================================
  // 3. ALL-OR-NOTHING TRANSACTION ROLLBACK
  // =========================================================================
  describe('3. All-or-Nothing Transaction Rollback', () => {
    it('should rollback all deductions if any snack in the basket has insufficient stock', async () => {
      // Snack X has plenty of stock (15)
      const snackX = await testPrisma.snack.create({
        data: {
          name: 'Rollback Snack High Stock',
          category: 'DRINK',
          quantity: 15,
          lowStockThreshold: 5,
        },
      });

      // Snack Y has insufficient stock (only 1 available, but basket requests 3)
      const snackY = await testPrisma.snack.create({
        data: {
          name: 'Rollback Snack Insufficient Stock',
          category: 'DRINK',
          quantity: 1,
          lowStockThreshold: 5,
        },
      });

      const res = await request(app)
        .post('/api/snacks/consume-basket')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          items: [
            { snackId: snackX.id, amount: 5 },
            { snackId: snackY.id, amount: 3 }, // Will fail!
          ],
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
      expect(res.body.error.message).toContain('Insufficient stock for');

      // CRITICAL VERIFICATION: Snack X must remain 15 (rolled back, NOT 10)
      const checkX = await testPrisma.snack.findUnique({ where: { id: snackX.id } });
      const checkY = await testPrisma.snack.findUnique({ where: { id: snackY.id } });

      expect(checkX!.quantity).toBe(15);
      expect(checkY!.quantity).toBe(1);

      // Verify ZERO activity records were committed
      const activitiesX = await testPrisma.activity.count({ where: { snackId: snackX.id } });
      const activitiesY = await testPrisma.activity.count({ where: { snackId: snackY.id } });

      expect(activitiesX).toBe(0);
      expect(activitiesY).toBe(0);
    });
  });

  // =========================================================================
  // 4. ROLE AUTHORIZATION RESTRICTIONS (ADMIN BLOCKED FROM CONSUMPTION)
  // =========================================================================
  describe('4. Role Authorization: Admins Forbidden from Consuming', () => {
    it('should reject Admin attempting POST /api/snacks/consume-basket with 403 Forbidden', async () => {
      const dummyId = '11111111-1111-1111-1111-111111111111';
      const res = await request(app)
        .post('/api/snacks/consume-basket')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [{ snackId: dummyId, amount: 1 }],
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('MEMBER_ROLE_REQUIRED');
    });

    it('should reject Admin attempting single consumption with 403 Forbidden', async () => {
      const dummyId = '11111111-1111-1111-1111-111111111111';
      const res = await request(app)
        .post(`/api/snacks/${dummyId}/consume`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amount: 1 });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('MEMBER_ROLE_REQUIRED');
    });
  });

  // =========================================================================
  // 5. MEMBER PERSONAL CONSUMPTION HISTORY
  // =========================================================================
  describe('5. Member Personal Consumption History', () => {
    it('should return only the authenticated Member own consumed activities', async () => {
      const res = await request(app)
        .get('/api/activities/me')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();

      // Every returned activity must belong to this member and be 'CONSUMED'
      for (const act of res.body.data) {
        expect(act.userId).toBe(memberUserId);
        expect(act.action).toBe('CONSUMED');
      }
    });

    it('should reject unauthenticated request to /api/activities/me with 401', async () => {
      const res = await request(app).get('/api/activities/me');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('should reject Admin request to /api/activities/me with 403 (Member only)', async () => {
      const res = await request(app)
        .get('/api/activities/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('MEMBER_ROLE_REQUIRED');
    });
  });

  // =========================================================================
  // 6. MEMBER FAVOURITES
  // =========================================================================
  describe('6. Member Favourites API', () => {
    it('should return only snacks that the authenticated Member has voted for', async () => {
      // 1. Create snack and have member vote for it
      const favSnack = await testPrisma.snack.create({
        data: {
          name: 'Favourite Test Matcha Cookie',
          category: 'SWEET',
          quantity: 20,
          lowStockThreshold: 5,
        },
      });

      await request(app)
        .post(`/api/snacks/${favSnack.id}/vote`)
        .set('Authorization', `Bearer ${memberToken}`);

      // 2. Fetch favourites
      const res = await request(app)
        .get('/api/snacks/favourites')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);

      const found = res.body.data.find((s: any) => s.id === favSnack.id);
      expect(found).toBeDefined();
      expect(found.hasVoted).toBe(true);
    });
  });

  // =========================================================================
  // 7. CONCURRENT BASKET CONSUMPTION
  // =========================================================================
  describe('7. Concurrent Multi-Basket Consumption Integrity', () => {
    it('should maintain strict inventory integrity under simultaneous basket consumption', async () => {
      // Snack with stock 3
      const sharedSnack = await testPrisma.snack.create({
        data: {
          name: 'Shared Limited Snack',
          category: 'SAVOURY',
          quantity: 3,
          lowStockThreshold: 1,
        },
      });

      // Fire 3 simultaneous baskets each wanting 2 packets
      // Since stock is only 3, exactly 1 basket should succeed (taking 2), and 2 should fail with 409
      const promises = [1, 2, 3].map(() =>
        request(app)
          .post('/api/snacks/consume-basket')
          .set('Authorization', `Bearer ${memberToken}`)
          .send({
            items: [{ snackId: sharedSnack.id, amount: 2 }],
          })
      );

      const responses = await Promise.all(promises);
      const successes = responses.filter((r) => r.status === 200);
      const conflicts = responses.filter((r) => r.status === 409);

      expect(successes).toHaveLength(1);
      expect(conflicts).toHaveLength(2);

      // Final stock must be exactly 1
      const checkShared = await testPrisma.snack.findUnique({ where: { id: sharedSnack.id } });
      expect(checkShared!.quantity).toBe(1);
    });
  });
});
