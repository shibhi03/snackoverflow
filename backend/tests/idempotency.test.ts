import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { testPrisma, seedTestDatabase, verifyTestDatabaseSafety } from './setup.js';
import crypto from 'crypto';

const app = createApp();

describe('Idempotency-Key Support (Single & Multi-Item Basket Consumption)', () => {
  let memberToken: string;
  let adminToken: string;
  let memberId: string;
  let adminId: string;
  let testSnackId: string;
  let secondSnackId: string;

  beforeAll(async () => {
    await verifyTestDatabaseSafety();
    const seeded = await seedTestDatabase();
    memberToken = seeded.memberToken;
    adminToken = seeded.adminToken;
    memberId = seeded.memberId;
    adminId = seeded.adminId;

    // Create snacks dedicated for idempotency tests
    const snack1 = await testPrisma.snack.create({
      data: {
        name: 'Idempotency Chips',
        category: 'SAVOURY',
        quantity: 10,
        lowStockThreshold: 3,
      },
    });
    testSnackId = snack1.id;

    const snack2 = await testPrisma.snack.create({
      data: {
        name: 'Idempotency Soda',
        category: 'DRINK',
        quantity: 10,
        lowStockThreshold: 3,
      },
    });
    secondSnackId = snack2.id;
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  describe('Single Snack Consumption (POST /api/snacks/:id/consume)', () => {
    it('should consume successfully on first request with Idempotency-Key', async () => {
      const idempotencyKey = crypto.randomUUID();

      const res = await request(app)
        .post(`/api/snacks/${testSnackId}/consume`)
        .set('Authorization', `Bearer ${memberToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({ amount: 2 });

      expect(res.status).toBe(200);
      expect(res.body.consumedAmount).toBe(2);
      expect(res.body.snack.quantity).toBe(8);
      expect(res.headers['idempotency-replayed']).toBe('false');

      // Verify DB
      const snackInDb = await testPrisma.snack.findUnique({ where: { id: testSnackId } });
      expect(snackInDb?.quantity).toBe(8);

      const activities = await testPrisma.activity.findMany({
        where: { snackId: testSnackId, userId: memberId },
      });
      expect(activities.length).toBe(1);
      expect(activities[0].amount).toBe(2);

      // Verify idempotency record
      const keyRecord = await testPrisma.idempotencyKey.findUnique({
        where: { unique_user_idempotency_key: { userId: memberId, key: idempotencyKey } },
      });
      expect(keyRecord).toBeDefined();
      expect(keyRecord?.status).toBe('COMPLETED');
      expect(keyRecord?.statusCode).toBe(200);
    });

    it('should return cached response and NOT deduct inventory or duplicate activity on retry with same key and payload', async () => {
      const idempotencyKey = crypto.randomUUID();

      // First call
      const res1 = await request(app)
        .post(`/api/snacks/${testSnackId}/consume`)
        .set('Authorization', `Bearer ${memberToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({ amount: 1 });

      expect(res1.status).toBe(200);
      expect(res1.body.snack.quantity).toBe(7);
      expect(res1.headers['idempotency-replayed']).toBe('false');

      // Second identical call (retry)
      const res2 = await request(app)
        .post(`/api/snacks/${testSnackId}/consume`)
        .set('Authorization', `Bearer ${memberToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({ amount: 1 });

      expect(res2.status).toBe(200);
      expect(res2.body.snack.quantity).toBe(7); // Must match original result
      expect(res2.headers['idempotency-replayed']).toBe('true');

      // Stock in DB must remain 7 (not decremented twice)
      const snackInDb = await testPrisma.snack.findUnique({ where: { id: testSnackId } });
      expect(snackInDb?.quantity).toBe(7);

      // Activity count for this 1 packet consumption must still be exactly 1
      const count = await testPrisma.activity.count({
        where: { snackId: testSnackId, userId: memberId, amount: 1 },
      });
      expect(count).toBe(1);
    });

    it('should return 409 Conflict when reusing same key with different payload', async () => {
      const idempotencyKey = crypto.randomUUID();

      // First call with amount 1
      const res1 = await request(app)
        .post(`/api/snacks/${testSnackId}/consume`)
        .set('Authorization', `Bearer ${memberToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({ amount: 1 });
      expect(res1.status).toBe(200);

      // Second call with same key but amount 3 (payload mismatch)
      const res2 = await request(app)
        .post(`/api/snacks/${testSnackId}/consume`)
        .set('Authorization', `Bearer ${memberToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({ amount: 3 });

      expect(res2.status).toBe(409);
      expect(res2.body.error.code).toBe('IDEMPOTENCY_KEY_PAYLOAD_MISMATCH');
    });

    it('should process independent requests when different keys are used', async () => {
      const key1 = crypto.randomUUID();
      const key2 = crypto.randomUUID();

      const res1 = await request(app)
        .post(`/api/snacks/${testSnackId}/consume`)
        .set('Authorization', `Bearer ${memberToken}`)
        .set('Idempotency-Key', key1)
        .send({ amount: 1 });
      expect(res1.status).toBe(200);

      const res2 = await request(app)
        .post(`/api/snacks/${testSnackId}/consume`)
        .set('Authorization', `Bearer ${memberToken}`)
        .set('Idempotency-Key', key2)
        .send({ amount: 1 });
      expect(res2.status).toBe(200);

      expect(res1.body.snack.quantity).toBe(res2.body.snack.quantity + 1);
    });

    it('should allow two different users to use the same key string independently without collision', async () => {
      const sharedKey = 'common-client-uuid-1234';

      // User 1 consumes
      const res1 = await request(app)
        .post(`/api/snacks/${testSnackId}/consume`)
        .set('Authorization', `Bearer ${memberToken}`)
        .set('Idempotency-Key', sharedKey)
        .send({ amount: 1 });
      expect(res1.status).toBe(200);
      expect(res1.headers['idempotency-replayed']).toBe('false');

      // User 2 consumes with identical key
      // Admin isn't a member so let's create a second member user
      const member2 = await testPrisma.user.create({
        data: {
          name: 'Member Two',
          email: 'member2@example.com',
          passwordHash: 'dummy',
          role: 'MEMBER',
        },
      });
      // Log in member 2 or create session
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      await testPrisma.session.create({
        data: {
          userId: member2.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 86400000),
        },
      });

      const res2 = await request(app)
        .post(`/api/snacks/${testSnackId}/consume`)
        .set('Authorization', `Bearer ${rawToken}`)
        .set('Idempotency-Key', sharedKey)
        .send({ amount: 1 });

      expect(res2.status).toBe(200);
      expect(res2.headers['idempotency-replayed']).toBe('false'); // Processed independently for user 2!
    });
  });

  describe('Multi-Item Basket Consumption (POST /api/snacks/consume-basket)', () => {
    it('should idempotently handle basket consumption across multiple items', async () => {
      const basketKey = crypto.randomUUID();
      const payload = {
        items: [
          { snackId: testSnackId, amount: 1 },
          { snackId: secondSnackId, amount: 2 },
        ],
      };

      // 1. First basket attempt
      const res1 = await request(app)
        .post('/api/snacks/consume-basket')
        .set('Authorization', `Bearer ${memberToken}`)
        .set('Idempotency-Key', basketKey)
        .send(payload);

      expect(res1.status).toBe(200);
      expect(res1.body.totalPackets).toBe(3);
      expect(res1.headers['idempotency-replayed']).toBe('false');

      const stock1After = (await testPrisma.snack.findUnique({ where: { id: testSnackId } }))?.quantity;
      const stock2After = (await testPrisma.snack.findUnique({ where: { id: secondSnackId } }))?.quantity;

      // 2. Retry identical basket call with same key
      const res2 = await request(app)
        .post('/api/snacks/consume-basket')
        .set('Authorization', `Bearer ${memberToken}`)
        .set('Idempotency-Key', basketKey)
        .send(payload);

      expect(res2.status).toBe(200);
      expect(res2.body.totalPackets).toBe(3);
      expect(res2.headers['idempotency-replayed']).toBe('true');

      // 3. Verify stocks did NOT decrement again
      const stock1Final = (await testPrisma.snack.findUnique({ where: { id: testSnackId } }))?.quantity;
      const stock2Final = (await testPrisma.snack.findUnique({ where: { id: secondSnackId } }))?.quantity;
      expect(stock1Final).toBe(stock1After);
      expect(stock2Final).toBe(stock2After);
    });

    it('should safely serialize concurrent requests with the same idempotency key', async () => {
      const concurrentKey = crypto.randomUUID();
      const payload = {
        items: [{ snackId: secondSnackId, amount: 1 }],
      };

      const startStock = (await testPrisma.snack.findUnique({ where: { id: secondSnackId } }))?.quantity || 0;

      // Send 3 concurrent requests with the exact same key
      const [res1, res2, res3] = await Promise.all([
        request(app)
          .post('/api/snacks/consume-basket')
          .set('Authorization', `Bearer ${memberToken}`)
          .set('Idempotency-Key', concurrentKey)
          .send(payload),
        request(app)
          .post('/api/snacks/consume-basket')
          .set('Authorization', `Bearer ${memberToken}`)
          .set('Idempotency-Key', concurrentKey)
          .send(payload),
        request(app)
          .post('/api/snacks/consume-basket')
          .set('Authorization', `Bearer ${memberToken}`)
          .set('Idempotency-Key', concurrentKey)
          .send(payload),
      ]);

      // All 3 should return 200 with the exact same result
      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      expect(res3.status).toBe(200);

      // Stock must have only decremented by 1 packet, NOT 3
      const endStock = (await testPrisma.snack.findUnique({ where: { id: secondSnackId } }))?.quantity;
      expect(endStock).toBe(startStock - 1);
    });

    it('should rollback transaction and release idempotency slot on insufficient stock', async () => {
      const failKey = crypto.randomUUID();

      // Attempt to consume 9999 packets (impossible)
      const resFail = await request(app)
        .post('/api/snacks/consume-basket')
        .set('Authorization', `Bearer ${memberToken}`)
        .set('Idempotency-Key', failKey)
        .send({
          items: [{ snackId: secondSnackId, amount: 9999 }],
        });

      expect(resFail.status).toBe(409);
      expect(resFail.body.error.code).toBe('INSUFFICIENT_STOCK');

      // The idempotency record was cleaned up on failure, so a corrected request with the same key can succeed
      const resSuccess = await request(app)
        .post('/api/snacks/consume-basket')
        .set('Authorization', `Bearer ${memberToken}`)
        .set('Idempotency-Key', failKey)
        .send({
          items: [{ snackId: secondSnackId, amount: 1 }],
        });

      expect(resSuccess.status).toBe(200);
      expect(resSuccess.body.totalPackets).toBe(1);
    });
  });
});
