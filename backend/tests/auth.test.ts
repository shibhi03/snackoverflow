import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { testPrisma, seedTestDatabase, verifyTestDatabaseSafety } from './setup.js';
import { config } from '../src/config/env.js';

const app = createApp();

describe('Authentication & Session Management API', () => {
  let memberToken: string;

  beforeAll(async () => {
    await verifyTestDatabaseSafety();
    const seeded = await seedTestDatabase();
    memberToken = seeded.memberToken;
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  it('should return 400 when login payload is invalid', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_INPUT');
  });

  it('should return 401 on incorrect credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'member@example.com', password: 'WrongPassword!' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('should successfully log in with valid credentials and set HttpOnly session cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'member@example.com', password: 'Member1234!' });

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe('member@example.com');
    expect(res.body.user.role).toBe('MEMBER');

    // Cookie verification
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const sessionCookie = cookies.find((c: string) => c.includes(config.cookieName));
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie).toContain('HttpOnly');
  });

  it('should return 401 when accessing protected route without session', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('should return 200 and user profile when accessing /me with valid session token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('member@example.com');
  });

  it('should revoke session in PostgreSQL on logout', async () => {
    // 1. Verify /me works before logout
    const preLogout = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'Admin1234!' });

    const cookieHeader = preLogout.headers['set-cookie'];

    // 2. Perform logout
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookieHeader)
      .set('X-CSRF-Token', preLogout.body.csrfToken);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.message).toContain('revoked');

    // 3. Subsequent request with the same cookie must be rejected with 401
    const postLogout = await request(app)
      .get('/api/auth/me')
      .set('Cookie', cookieHeader);

    expect(postLogout.status).toBe(401);
    expect(postLogout.body.error.code).toBe('UNAUTHENTICATED');
  });
});
