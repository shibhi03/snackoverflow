import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Enforce test environment
process.env.NODE_ENV = 'test';

const testDbUrl = process.env.TEST_DATABASE_URL || 'postgresql://snack_app:snack1234@localhost:5432/snack_overflow_test?schema=public';

export const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: testDbUrl,
    },
  },
});

/**
 * Hard safeguard: Ensures tests only run against snack_overflow_test.
 */
export async function verifyTestDatabaseSafety(): Promise<void> {
  const result = await testPrisma.$queryRaw<Array<{ current_database: string }>>`
    SELECT current_database();
  `;
  const currentDb = result[0]?.current_database;

  if (currentDb !== 'snack_overflow_test') {
    throw new Error(
      `FATAL SAFETY ABORT: Tests must ONLY run against 'snack_overflow_test'. Current connected database is: '${currentDb}'. Halting to prevent damage to development or production databases.`
    );
  }
}

/**
 * Resets and re-seeds the test database before integration suites.
 */
export async function seedTestDatabase(): Promise<{ adminToken: string; memberToken: string; adminId: string; memberId: string }> {
  await verifyTestDatabaseSafety();

  // Clean test tables in dependency order
  await testPrisma.$executeRawUnsafe(`TRUNCATE TABLE "idempotency_keys", "activities", "votes", "sessions", "snacks", "users" CASCADE;`);

  const saltRounds = 12;
  const adminPasswordHash = await bcrypt.hash('Admin1234!', saltRounds);
  const memberPasswordHash = await bcrypt.hash('Member1234!', saltRounds);

  const admin = await testPrisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'ADMIN',
      passwordHash: adminPasswordHash,
    },
  });

  const member = await testPrisma.user.create({
    data: {
      name: 'Member User',
      email: 'member@example.com',
      role: 'MEMBER',
      passwordHash: memberPasswordHash,
    },
  });

  // Sample snacks
  const snacks = await Promise.all([
    testPrisma.snack.create({ data: { name: 'Oreo', category: 'SWEET', quantity: 15, lowStockThreshold: 5 } }),
    testPrisma.snack.create({ data: { name: 'Lays', category: 'SAVOURY', quantity: 3, lowStockThreshold: 5 } }),
    testPrisma.snack.create({ data: { name: 'Masala Peanuts', category: 'SAVOURY', quantity: 0, lowStockThreshold: 5 } }),
    testPrisma.snack.create({ data: { name: 'Apple Juice', category: 'DRINK', quantity: 12, lowStockThreshold: 5 } }),
    testPrisma.snack.create({ data: { name: 'Protein Bar', category: 'HEALTHY_ISH', quantity: 4, lowStockThreshold: 5 } }),
    testPrisma.snack.create({ data: { name: 'Dairy Milk', category: 'SWEET', quantity: 20, lowStockThreshold: 5 } }),
  ]);

  // Seed sample activity for admin so RESTRICT foreign key test is valid
  const oreoSnack = snacks.find((s) => s.name === 'Oreo');
  if (oreoSnack) {
    await testPrisma.activity.create({
      data: {
        userId: admin.id,
        snackId: oreoSnack.id,
        snackName: oreoSnack.name,
        action: 'RESTOCKED',
        amount: 15,
      },
    });
  }

  // Create active sessions for test clients
  const { generateRawToken, hashToken } = await import('../src/utils/session.js');

  const adminRawToken = generateRawToken();
  await testPrisma.session.create({
    data: {
      userId: admin.id,
      tokenHash: hashToken(adminRawToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const memberRawToken = generateRawToken();
  await testPrisma.session.create({
    data: {
      userId: member.id,
      tokenHash: hashToken(memberRawToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    adminToken: adminRawToken,
    memberToken: memberRawToken,
    adminId: admin.id,
    memberId: member.id,
  };
}
