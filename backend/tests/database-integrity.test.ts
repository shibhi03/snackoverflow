import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import bcrypt from 'bcryptjs';
import { testPrisma, seedTestDatabase, verifyTestDatabaseSafety } from './setup.js';

const prisma = testPrisma;

describe('Database Integrity and Relational Constraints', () => {
  beforeAll(async () => {
    await verifyTestDatabaseSafety();
    await seedTestDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should have all 5 tables present in the public schema', async () => {
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    const tableNames = tables.map((t) => t.table_name);
    expect(tableNames).toContain('users');
    expect(tableNames).toContain('sessions');
    expect(tableNames).toContain('snacks');
    expect(tableNames).toContain('votes');
    expect(tableNames).toContain('activities');
  });

  it('should have verified demo users with hashed passwords', async () => {
    const admin = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
    expect(admin).not.toBeNull();
    expect(admin?.role).toBe('ADMIN');
    expect(await bcrypt.compare('Admin1234!', admin!.passwordHash)).toBe(true);

    const member = await prisma.user.findUnique({ where: { email: 'member@example.com' } });
    expect(member).not.toBeNull();
    expect(member?.role).toBe('MEMBER');
    expect(await bcrypt.compare('Member1234!', member!.passwordHash)).toBe(true);
  });

  it('should reject negative stock via check_snack_quantity_non_negative', async () => {
    await expect(
      prisma.$executeRaw`
        INSERT INTO snacks (id, name, category, quantity, "lowStockThreshold", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), 'Test Negative Stock', 'SWEET', -10, 5, NOW(), NOW());
      `
    ).rejects.toThrow();
  });

  it('should reject negative threshold via check_snack_threshold_non_negative', async () => {
    await expect(
      prisma.$executeRaw`
        INSERT INTO snacks (id, name, category, quantity, "lowStockThreshold", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), 'Test Negative Threshold', 'DRINK', 10, -1, NOW(), NOW());
      `
    ).rejects.toThrow();
  });

  it('should reject non-positive activity amount via check_activity_amount_positive', async () => {
    const admin = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
    expect(admin).not.toBeNull();

    await expect(
      prisma.$executeRaw`
        INSERT INTO activities (id, "userId", "snackName", action, amount, "createdAt")
        VALUES (gen_random_uuid(), ${admin!.id}::uuid, 'Test Negative Amount', 'CONSUMED', 0, NOW());
      `
    ).rejects.toThrow();
  });

  it('should reject duplicate votes via unique composite constraint', async () => {
    const member = await prisma.user.findUnique({ where: { email: 'member@example.com' } });
    const snack = await prisma.snack.findFirst();
    expect(member).not.toBeNull();
    expect(snack).not.toBeNull();

    // Create a temporary vote
    await prisma.$executeRaw`
      INSERT INTO votes (id, "userId", "snackId", "createdAt")
      VALUES (gen_random_uuid(), ${member!.id}::uuid, ${snack!.id}::uuid, NOW())
      ON CONFLICT DO NOTHING;
    `;

    // Duplicate attempt must throw
    await expect(
      prisma.$executeRaw`
        INSERT INTO votes (id, "userId", "snackId", "createdAt")
        VALUES (gen_random_uuid(), ${member!.id}::uuid, ${snack!.id}::uuid, NOW());
      `
    ).rejects.toThrow();
  });

  it('should restrict user deletion when activities exist (ON DELETE RESTRICT)', async () => {
    const admin = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
    expect(admin).not.toBeNull();

    await expect(prisma.user.delete({ where: { id: admin!.id } })).rejects.toThrow();
  });

  it('should preserve activity log when a snack is deleted (ON DELETE SET NULL)', async () => {
    const admin = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
    expect(admin).not.toBeNull();

    // Create disposable snack & activity
    const disposableSnack = await prisma.snack.create({
      data: {
        name: 'Disposable Pretzels',
        category: 'SAVOURY',
        quantity: 10,
        lowStockThreshold: 3,
      },
    });

    const disposableActivity = await prisma.activity.create({
      data: {
        userId: admin!.id,
        snackId: disposableSnack.id,
        snackName: disposableSnack.name,
        action: 'RESTOCKED',
        amount: 10,
      },
    });

    // Delete snack
    await prisma.snack.delete({ where: { id: disposableSnack.id } });

    // Verify activity persisted with null snackId and snapshot name
    const preserved = await prisma.activity.findUnique({ where: { id: disposableActivity.id } });
    expect(preserved).not.toBeNull();
    expect(preserved?.snackId).toBeNull();
    expect(preserved?.snackName).toBe('Disposable Pretzels');

    // Clean up test activity
    await prisma.activity.delete({ where: { id: disposableActivity.id } });
  });
});
