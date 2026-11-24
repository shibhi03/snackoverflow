import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { testPrisma, seedTestDatabase, verifyTestDatabaseSafety } from './setup.js';

const app = createApp();

describe('Snack Inventory & Authorization API', () => {
  let adminToken: string;
  let memberToken: string;

  beforeAll(async () => {
    await verifyTestDatabaseSafety();
    const seeded = await seedTestDatabase();
    adminToken = seeded.adminToken;
    memberToken = seeded.memberToken;
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  it('should list seeded snacks with server-side pagination and dynamic status', async () => {
    const res = await request(app)
      .get('/api/snacks?page=1&limit=10')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(6);
    expect(res.body.pagination.totalItems).toBe(6);

    const oreo = res.body.data.find((s: any) => s.name === 'Oreo');
    expect(oreo).toBeDefined();
    expect(oreo.status).toBe('STOCKED');
    expect(oreo.quantity).toBe(15);

    const lays = res.body.data.find((s: any) => s.name === 'Lays');
    expect(lays.status).toBe('RUNNING_LOW');

    const peanuts = res.body.data.find((s: any) => s.name === 'Masala Peanuts');
    expect(peanuts.status).toBe('GONE');
  });

  it('should filter snacks by category and status on the server', async () => {
    const res = await request(app)
      .get('/api/snacks?category=SWEET')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.every((s: any) => s.category === 'SWEET')).toBe(true);

    const goneRes = await request(app)
      .get('/api/snacks?status=GONE')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(goneRes.status).toBe(200);
    expect(goneRes.body.data).toHaveLength(1);
    expect(goneRes.body.data[0].name).toBe('Masala Peanuts');
  });

  it('should allow Admin to create a new snack', async () => {
    const res = await request(app)
      .post('/api/snacks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Dark Chocolate Almonds',
        category: 'SWEET',
        quantity: 25,
        lowStockThreshold: 5,
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Dark Chocolate Almonds');
    expect(res.body.status).toBe('STOCKED');
  });

  it('should reject Member attempting Admin operations with 403 Forbidden', async () => {
    const res = await request(app)
      .post('/api/snacks')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        name: 'Unauthorized Snack',
        category: 'SAVOURY',
        quantity: 10,
        lowStockThreshold: 5,
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_RESOURCE');
  });

  it('should allow Admin to restock snacks and record an activity row', async () => {
    const snack = await testPrisma.snack.findUnique({ where: { name: 'Lays' } });
    expect(snack).not.toBeNull();
    const initialQty = snack!.quantity;

    const res = await request(app)
      .post(`/api/snacks/${snack!.id}/restock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amount: 10 });

    expect(res.status).toBe(200);
    expect(res.body.snack.quantity).toBe(initialQty + 10);

    // Verify activity logged
    const activity = await testPrisma.activity.findFirst({
      where: {
        snackId: snack!.id,
        action: 'RESTOCKED',
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(activity).not.toBeNull();
    expect(activity!.amount).toBe(10);
  });

  it('should reject restocking with non-positive amount', async () => {
    const snack = await testPrisma.snack.findFirst();
    const res = await request(app)
      .post(`/api/snacks/${snack!.id}/restock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amount: -5 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_INPUT');
  });
});
