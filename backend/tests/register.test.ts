import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app.js';
import { testPrisma, seedTestDatabase, verifyTestDatabaseSafety } from './setup.js';
import { config } from '../src/config/env.js';

const app = createApp();

describe('Member Registration API (POST /api/auth/register)', () => {
  beforeAll(async () => {
    await verifyTestDatabaseSafety();
    await seedTestDatabase();
  });

  afterAll(async () => {
    config.enableMemberRegistration = true;
    await testPrisma.$disconnect();
  });

  it('should return registration status as enabled by default', async () => {
    const res = await request(app).get('/api/auth/register-status');
    expect(res.status).toBe(200);
    expect(res.body.registrationEnabled).toBe(true);
  });

  it('should successfully register a new member with valid inputs', async () => {
    // 1. Fetch CSRF token
    const csrfRes = await request(app).get('/api/auth/csrf-token');
    const csrfCookie = csrfRes.headers['set-cookie'];
    const csrfToken = csrfRes.body.csrfToken;

    // 2. Send registration
    const res = await request(app)
      .post('/api/auth/register')
      .set('Cookie', csrfCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({
        name: 'Sarah Connor',
        email: 'sarah.connor@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toContain('Account created successfully');
    expect(res.body.user).toBeDefined();
    expect(res.body.user.name).toBe('Sarah Connor');
    expect(res.body.user.email).toBe('sarah.connor@example.com');
    expect(res.body.user.role).toBe('MEMBER');
    expect(res.body.user.passwordHash).toBeUndefined(); // Never expose password hash

    // 3. Verify in PostgreSQL that password is valid bcrypt hash
    const dbUser = await testPrisma.user.findUnique({
      where: { email: 'sarah.connor@example.com' },
    });
    expect(dbUser).toBeDefined();
    expect(dbUser?.passwordHash).not.toBe('Password123!');
    expect(dbUser?.passwordHash.startsWith('$2a$12$') || dbUser?.passwordHash.startsWith('$2b$12$')).toBe(true);
    const isValidPassword = await bcrypt.compare('Password123!', dbUser!.passwordHash);
    expect(isValidPassword).toBe(true);
  });

  it('should allow the newly registered member to log in immediately', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'sarah.connor@example.com',
        password: 'Password123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('sarah.connor@example.com');
    expect(res.body.user.role).toBe('MEMBER');

    const cookies = res.headers['set-cookie'];
    const sessionCookie = cookies?.find((c: string) => c.includes(config.cookieName));
    expect(sessionCookie).toBeDefined();
  });

  it('should reject duplicate registration with the same email with 409 Conflict', async () => {
    const csrfRes = await request(app).get('/api/auth/csrf-token');
    const csrfCookie = csrfRes.headers['set-cookie'];
    const csrfToken = csrfRes.body.csrfToken;

    const res = await request(app)
      .post('/api/auth/register')
      .set('Cookie', csrfCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({
        name: 'Sarah Duplicate',
        email: 'SARAH.CONNOR@example.com', // Case insensitivity check
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('should reject invalid email formats with 400 Bad Request', async () => {
    const csrfRes = await request(app).get('/api/auth/csrf-token');
    const csrfCookie = csrfRes.headers['set-cookie'];
    const csrfToken = csrfRes.body.csrfToken;

    const res = await request(app)
      .post('/api/auth/register')
      .set('Cookie', csrfCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({
        name: 'Invalid Email Person',
        email: 'not-an-email',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_INPUT');
  });

  it('should reject weak passwords with 400 Bad Request', async () => {
    const csrfRes = await request(app).get('/api/auth/csrf-token');
    const csrfCookie = csrfRes.headers['set-cookie'];
    const csrfToken = csrfRes.body.csrfToken;

    // Weak: under 8 chars
    const shortRes = await request(app)
      .post('/api/auth/register')
      .set('Cookie', csrfCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({
        name: 'Test Weak',
        email: 'weak1@example.com',
        password: 'Pass1!',
        confirmPassword: 'Pass1!',
      });
    expect(shortRes.status).toBe(400);

    // Weak: no uppercase
    const noUpperRes = await request(app)
      .post('/api/auth/register')
      .set('Cookie', csrfCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({
        name: 'Test Weak',
        email: 'weak2@example.com',
        password: 'password123!',
        confirmPassword: 'password123!',
      });
    expect(noUpperRes.status).toBe(400);

    // Weak: no special character
    const noSpecialRes = await request(app)
      .post('/api/auth/register')
      .set('Cookie', csrfCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({
        name: 'Test Weak',
        email: 'weak3@example.com',
        password: 'Password1234',
        confirmPassword: 'Password1234',
      });
    expect(noSpecialRes.status).toBe(400);
  });

  it('should reject mismatched confirmPassword with 400 Bad Request', async () => {
    const csrfRes = await request(app).get('/api/auth/csrf-token');
    const csrfCookie = csrfRes.headers['set-cookie'];
    const csrfToken = csrfRes.body.csrfToken;

    const res = await request(app)
      .post('/api/auth/register')
      .set('Cookie', csrfCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({
        name: 'Mismatch Test',
        email: 'mismatch@example.com',
        password: 'Password123!',
        confirmPassword: 'DifferentPassword123!',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('Passwords do not match');
  });

  it('should prevent client-supplied role escalation to ADMIN', async () => {
    const csrfRes = await request(app).get('/api/auth/csrf-token');
    const csrfCookie = csrfRes.headers['set-cookie'];
    const csrfToken = csrfRes.body.csrfToken;

    const res = await request(app)
      .post('/api/auth/register')
      .set('Cookie', csrfCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({
        name: 'Hacker Attempt',
        email: 'hacker@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'ADMIN', // Malicious attempt to escalate role
      });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('MEMBER'); // Server exclusively forces MEMBER

    const dbUser = await testPrisma.user.findUnique({
      where: { email: 'hacker@example.com' },
    });
    expect(dbUser?.role).toBe('MEMBER');
  });

  it('should safely handle concurrent duplicate registrations with exactly 1 success and others 409', async () => {
    const targetEmail = 'concurrent.register@example.com';
    const csrfRes = await request(app).get('/api/auth/csrf-token');
    const csrfCookie = csrfRes.headers['set-cookie'];
    const csrfToken = csrfRes.body.csrfToken;

    // Launch 5 concurrent registration attempts
    const requests = Array.from({ length: 5 }, (_, i) =>
      request(app)
        .post('/api/auth/register')
        .set('Cookie', csrfCookie)
        .set('X-CSRF-Token', csrfToken)
        .send({
          name: `Concurrent User ${i}`,
          email: targetEmail,
          password: 'Password123!',
          confirmPassword: 'Password123!',
        })
    );

    const responses = await Promise.all(requests);
    const successes = responses.filter((r) => r.status === 201);
    const conflicts = responses.filter((r) => r.status === 409);

    expect(successes.length).toBe(1);
    expect(conflicts.length).toBe(4);

    const usersInDb = await testPrisma.user.findMany({
      where: { email: targetEmail },
    });
    expect(usersInDb.length).toBe(1);
  });

  it('should reject registration when ENABLE_MEMBER_REGISTRATION is disabled', async () => {
    // Disable registration dynamically
    config.enableMemberRegistration = false;

    const csrfRes = await request(app).get('/api/auth/csrf-token');
    const csrfCookie = csrfRes.headers['set-cookie'];
    const csrfToken = csrfRes.body.csrfToken;

    const res = await request(app)
      .post('/api/auth/register')
      .set('Cookie', csrfCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({
        name: 'Blocked User',
        email: 'blocked@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('REGISTRATION_DISABLED');

    // Re-enable
    config.enableMemberRegistration = true;
  });
});
