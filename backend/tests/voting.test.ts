import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { testPrisma, seedTestDatabase, verifyTestDatabaseSafety } from './setup.js';

const app = createApp();

describe('Snack Voting API', () => {
  let memberToken: string;
  let snackId: string;

  beforeAll(async () => {
    await verifyTestDatabaseSafety();
    const seeded = await seedTestDatabase();
    memberToken = seeded.memberToken;

    const snack = await testPrisma.snack.findUnique({ where: { name: 'Oreo' } });
    snackId = snack!.id;
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  it('should record a user vote successfully', async () => {
    const res = await request(app)
      .post(`/api/snacks/${snackId}/vote`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(201);
    expect(res.body.hasVoted).toBe(true);
    expect(res.body.voteCount).toBe(1);
  });

  it('should reject a duplicate vote from the same user with 409 Conflict', async () => {
    const res = await request(app)
      .post(`/api/snacks/${snackId}/vote`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_VOTE');
  });

  it('should allow user to unvote successfully', async () => {
    const res = await request(app)
      .delete(`/api/snacks/${snackId}/vote`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(200);
    expect(res.body.hasVoted).toBe(false);
    expect(res.body.voteCount).toBe(0);
  });
});
