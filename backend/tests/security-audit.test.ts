import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { createApp } from '../src/app.js';
import { testPrisma, seedTestDatabase, verifyTestDatabaseSafety } from './setup.js';
import { hashToken } from '../src/utils/session.js';
import { config } from '../src/config/env.js';
import { snackService } from '../src/services/snack.service.js';
import { seedDatabase } from '../prisma/seed.js';

const app = createApp();

describe('Comprehensive Security & Relational Transaction Audit', () => {
  let adminToken: string;
  let memberToken: string;
  let adminUserId: string;
  let memberUserId: string;
  let sampleSnackId: string;

  beforeAll(async () => {
    await verifyTestDatabaseSafety();
    const seeded = await seedTestDatabase();
    adminToken = seeded.adminToken;
    memberToken = seeded.memberToken;

    const admin = await testPrisma.user.findUnique({ where: { email: 'admin@example.com' } });
    const member = await testPrisma.user.findUnique({ where: { email: 'member@example.com' } });
    adminUserId = admin!.id;
    memberUserId = member!.id;

    const snack = await testPrisma.snack.findFirst({ where: { name: 'Oreo' } });
    sampleSnackId = snack!.id;
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  // =========================================================================
  // 1. ROLE-BASED ACCESS CONTROL AUDIT
  // =========================================================================
  describe('1. RBAC & Member Access Restrictions', () => {
    it('should reject Member attempting POST /api/snacks with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/snacks')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Member Forbidden Snack', category: 'SWEET', quantity: 10, lowStockThreshold: 2 });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_RESOURCE');
    });

    it('should reject Member attempting PATCH /api/snacks/:id with 403 Forbidden', async () => {
      const res = await request(app)
        .patch(`/api/snacks/${sampleSnackId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Hacked Name' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_RESOURCE');
    });

    it('should reject Member attempting DELETE /api/snacks/:id with 403 Forbidden', async () => {
      const res = await request(app)
        .delete(`/api/snacks/${sampleSnackId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_RESOURCE');
    });

    it('should reject Member attempting POST /api/snacks/:id/restock with 403 Forbidden', async () => {
      const res = await request(app)
        .post(`/api/snacks/${sampleSnackId}/restock`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ amount: 10 });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_RESOURCE');
    });

    it('should reject unauthenticated request to GET /api/activities with 401', async () => {
      const res = await request(app).get('/api/activities');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('should reject Member attempting GET /api/activities with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/activities')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_RESOURCE');
    });

    it('should allow Admin to access GET /api/activities with 200 OK', async () => {
      const res = await request(app)
        .get('/api/activities')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });
  });

  // =========================================================================
  // 2. SNACK DELETION & HISTORICAL AUDIT PRESERVATION
  // =========================================================================
  describe('2. Snack Deletion & Historical Activity Preservation', () => {
    it('should allow Admin to delete a snack and preserve activity snapshot', async () => {
      // 1. Create a dedicated snack to delete
      const tempSnack = await testPrisma.snack.create({
        data: {
          name: 'Temporary Deletion Test Bar',
          category: 'SWEET',
          quantity: 10,
          lowStockThreshold: 2,
        },
      });

      // 2. Record an activity log for this snack
      const activity = await testPrisma.activity.create({
        data: {
          userId: memberUserId,
          snackId: tempSnack.id,
          snackName: tempSnack.name,
          action: 'CONSUMED',
          amount: 2,
        },
      });

      // 3. Admin deletes the snack
      const delRes = await request(app)
        .delete(`/api/snacks/${tempSnack.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(delRes.status).toBe(200);

      // 4. Verify snack is deleted from database
      const checkSnack = await testPrisma.snack.findUnique({ where: { id: tempSnack.id } });
      expect(checkSnack).toBeNull();

      // 5. Verify historical activity still exists, snackId is NULL, and snackName snapshot is intact
      const preservedActivity = await testPrisma.activity.findUnique({ where: { id: activity.id } });
      expect(preservedActivity).not.toBeNull();
      expect(preservedActivity!.snackId).toBeNull();
      expect(preservedActivity!.snackName).toBe('Temporary Deletion Test Bar');
      expect(preservedActivity!.amount).toBe(2);
    });
  });

  // =========================================================================
  // 3. SESSION SECURITY: EXPIRY & REVOCATION
  // =========================================================================
  describe('3. Session Security: Expiry & Revocation in PostgreSQL', () => {
    it('should reject an expired session with 401', async () => {
      const rawExpiredToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(rawExpiredToken);

      // Insert session that expired 1 hour ago
      await testPrisma.session.create({
        data: {
          tokenHash,
          userId: memberUserId,
          expiresAt: new Date(Date.now() - 3600 * 1000),
        },
      });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${rawExpiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error.message).toContain('expired');
    });

    it('should reject a revoked session with 401', async () => {
      const rawRevokedToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(rawRevokedToken);

      // Insert session with revokedAt timestamp
      await testPrisma.session.create({
        data: {
          tokenHash,
          userId: memberUserId,
          expiresAt: new Date(Date.now() + 3600 * 1000),
          revokedAt: new Date(),
        },
      });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${rawRevokedToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error.message).toContain('revoked');
    });
  });

  // =========================================================================
  // 4. CSRF & ORIGIN / REFERER VALIDATION
  // =========================================================================
  describe('4. CSRF & Origin Validation', () => {
    it('should reject state-changing request from unauthorized Origin with 403', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .set('Origin', 'http://malicious-attacker.com')
        .send({ email: 'member@example.com', password: 'Member1234!' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CSRF_ORIGIN_INVALID');
    });

    it('should reject state-changing request with unauthorized Referer with 403', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .set('Referer', 'http://malicious-attacker.com/evil-form')
        .send({ email: 'member@example.com', password: 'Member1234!' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CSRF_REFERER_INVALID');
    });

    it('should reject mutating request with cookie session but missing X-CSRF-Token header with 403', async () => {
      // Login to get valid session and CSRF cookie
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'member@example.com', password: 'Member1234!' });

      const cookies = loginRes.headers['set-cookie'];

      // Send consume request with cookie but WITHOUT X-CSRF-Token header
      const res = await request(app)
        .post(`/api/snacks/${sampleSnackId}/consume`)
        .set('Cookie', cookies)
        .send({ amount: 1 });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CSRF_TOKEN_MISSING');
    });

    it('should reject mutating request with mismatched/tampered X-CSRF-Token header with 403', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'member@example.com', password: 'Member1234!' });

      const cookies = loginRes.headers['set-cookie'];

      // Send consume request with forged X-CSRF-Token header
      const res = await request(app)
        .post(`/api/snacks/${sampleSnackId}/consume`)
        .set('Cookie', cookies)
        .set('X-CSRF-Token', 'forged-invalid-csrf-token-1234567890abcdef')
        .send({ amount: 1 });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CSRF_TOKEN_INVALID');
    });
  });

  // =========================================================================
  // 5. INPUT VALIDATION: QUANTITY & AMOUNT
  // =========================================================================
  describe('5. Input Validation on Inventory Operations', () => {
    it('should reject consumption with amount = 0', async () => {
      const res = await request(app)
        .post(`/api/snacks/${sampleSnackId}/consume`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ amount: 0 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_INPUT');
    });

    it('should reject consumption with negative amount', async () => {
      const res = await request(app)
        .post(`/api/snacks/${sampleSnackId}/consume`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ amount: -4 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_INPUT');
    });

    it('should reject consumption with decimal/non-integer amount', async () => {
      const res = await request(app)
        .post(`/api/snacks/${sampleSnackId}/consume`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ amount: 1.5 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_INPUT');
    });

    it('should reject consumption with non-numeric string amount', async () => {
      const res = await request(app)
        .post(`/api/snacks/${sampleSnackId}/consume`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ amount: 'three' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_INPUT');
    });
  });

  // =========================================================================
  // 6. CONCURRENT DUPLICATE VOTING
  // =========================================================================
  describe('6. Concurrent Duplicate Voting Prevention', () => {
    it('should reject 10 simultaneous votes from the same user: exactly 1 succeeds and 9 conflict', async () => {
      // Create a fresh snack for voting test
      const votingSnack = await testPrisma.snack.create({
        data: {
          name: 'Concurrent Voting Test Snack',
          category: 'SAVOURY',
          quantity: 20,
          lowStockThreshold: 5,
        },
      });

      // 10 concurrent requests to vote for this snack from the SAME member
      const promises = Array.from({ length: 10 }).map(() =>
        request(app)
          .post(`/api/snacks/${votingSnack.id}/vote`)
          .set('Authorization', `Bearer ${memberToken}`)
      );

      const responses = await Promise.all(promises);

      const successful = responses.filter((r) => r.status === 201);
      const conflicts = responses.filter((r) => r.status === 409);

      expect(successful).toHaveLength(1);
      expect(conflicts).toHaveLength(9);

      // Verify that database has exactly 1 vote record
      const voteCountInDb = await testPrisma.vote.count({
        where: { snackId: votingSnack.id, userId: memberUserId },
      });
      expect(voteCountInDb).toBe(1);
    });
  });

  // =========================================================================
  // 7. TRANSACTION ROLLBACK INTEGRITY
  // =========================================================================
  describe('7. Transaction Rollback Integrity', () => {
    it('should rollback inventory update when activity logging fails', async () => {
      const testSnack = await testPrisma.snack.create({
        data: {
          name: 'Rollback Safety Pretzel',
          category: 'SAVOURY',
          quantity: 15,
          lowStockThreshold: 5,
        },
      });

      const initialQty = testSnack.quantity;
      expect(initialQty).toBe(15);

      // Attempt consumption with a non-existent userId UUID (will cause FK violation on Activity.create)
      const nonExistentUserId = '00000000-0000-0000-0000-000000000099';

      let errorThrown = false;
      try {
        await snackService.consumeSnack(testSnack.id, 5, nonExistentUserId);
      } catch (err) {
        errorThrown = true;
      }

      expect(errorThrown).toBe(true);

      // Query database to verify that quantity rolled back and was NOT decremented to 10
      const snackAfterRollback = await testPrisma.snack.findUnique({
        where: { id: testSnack.id },
      });

      expect(snackAfterRollback!.quantity).toBe(15);

      // Verify no activity was logged
      const activityCount = await testPrisma.activity.count({
        where: { snackId: testSnack.id },
      });
      expect(activityCount).toBe(0);
    });
  });

  // =========================================================================
  // 8. IDEMPOTENT SEED & INVARIANCE AUDIT
  // =========================================================================
  describe('8. Repeated Seed Invariance Audit', () => {
    it('should preserve modified snack quantities and user password hashes on re-seeding', async () => {
      // 1. Manually alter Oreo quantity from 15 to 42 in test database
      await testPrisma.snack.update({
        where: { name: 'Oreo' },
        data: { quantity: 42 },
      });

      // 2. Fetch admin user password hash before re-seed
      const adminBefore = await testPrisma.user.findUnique({
        where: { email: 'admin@example.com' },
      });
      const hashBefore = adminBefore!.passwordHash;

      // 3. Re-run production-identical idempotent seed script against test database
      await seedDatabase(testPrisma);

      // 4. Verify Oreo quantity was NOT reset to initial seed value of 15
      const oreoAfter = await testPrisma.snack.findUnique({ where: { name: 'Oreo' } });
      expect(oreoAfter!.quantity).toBe(42);

      // 5. Verify admin password hash is untouched
      const adminAfter = await testPrisma.user.findUnique({
        where: { email: 'admin@example.com' },
      });
      expect(adminAfter!.passwordHash).toBe(hashBefore);
    });
  });
});
