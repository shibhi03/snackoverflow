import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { testPrisma, seedTestDatabase, verifyTestDatabaseSafety } from './setup.js';

const app = createApp();

describe('Critical Concurrency & Atomic Consumption Tests', () => {
  let memberToken: string;

  beforeAll(async () => {
    await verifyTestDatabaseSafety();
    const seeded = await seedTestDatabase();
    memberToken = seeded.memberToken;
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  it('Scenario 1: 10 simultaneous requests consuming 1 packet each from initial quantity 3', async () => {
    // 1. Setup isolated test snack with exact quantity 3
    const testSnack = await testPrisma.snack.create({
      data: {
        name: 'High Concurrency Granola Bar',
        category: 'HEALTHY_ISH',
        quantity: 3,
        lowStockThreshold: 1,
      },
    });

    const initialQty = testSnack.quantity;
    expect(initialQty).toBe(3);

    // Count existing activity records for this snack
    const initialActivities = await testPrisma.activity.count({
      where: { snackId: testSnack.id },
    });

    // 2. Fire 10 simultaneous HTTP consumption requests using Promise.all
    const promises = Array.from({ length: 10 }).map(() =>
      request(app)
        .post(`/api/snacks/${testSnack.id}/consume`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ amount: 1 })
    );

    const responses = await Promise.all(promises);

    // 3. Evaluate results
    const successful = responses.filter((r) => r.status === 200);
    const conflicts = responses.filter((r) => r.status === 409);

    console.log(`[Concurrency Scenario 1] Successful: ${successful.length}, Conflicts: ${conflicts.length}`);

    // Exactly 3 must succeed
    expect(successful).toHaveLength(3);

    // Exactly 7 must fail with 409 Conflict
    expect(conflicts).toHaveLength(7);

    // Error code must be INSUFFICIENT_STOCK
    for (const conflict of conflicts) {
      expect(conflict.body.error.code).toBe('INSUFFICIENT_STOCK');
    }

    // 4. Verify database state
    const finalSnack = await testPrisma.snack.findUnique({
      where: { id: testSnack.id },
    });
    expect(finalSnack).not.toBeNull();
    // Final quantity must be strictly 0, never negative
    expect(finalSnack!.quantity).toBe(0);

    // Exactly 3 activity rows must have been recorded
    const finalActivities = await testPrisma.activity.count({
      where: { snackId: testSnack.id, action: 'CONSUMED' },
    });
    expect(finalActivities - initialActivities).toBe(3);
  });

  it('Scenario 2: 2 concurrent requests consuming 2 packets each from initial quantity 3', async () => {
    // Setup isolated snack with quantity 3
    const testSnack = await testPrisma.snack.create({
      data: {
        name: 'Concurrent Trail Mix',
        category: 'HEALTHY_ISH',
        quantity: 3,
        lowStockThreshold: 1,
      },
    });

    // Fire 2 concurrent requests for amount 2 each
    const promises = [
      request(app)
        .post(`/api/snacks/${testSnack.id}/consume`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ amount: 2 }),
      request(app)
        .post(`/api/snacks/${testSnack.id}/consume`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ amount: 2 }),
    ];

    const responses = await Promise.all(promises);

    const successful = responses.filter((r) => r.status === 200);
    const conflicts = responses.filter((r) => r.status === 409);

    console.log(`[Concurrency Scenario 2] Successful: ${successful.length}, Conflicts: ${conflicts.length}`);

    // Exactly 1 must succeed
    expect(successful).toHaveLength(1);

    // Exactly 1 must fail with 409
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].body.error.code).toBe('INSUFFICIENT_STOCK');

    // Final quantity must be exactly 1 (3 - 2 = 1)
    const finalSnack = await testPrisma.snack.findUnique({
      where: { id: testSnack.id },
    });
    expect(finalSnack!.quantity).toBe(1);
  });
});
