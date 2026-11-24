import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { testPrisma, seedTestDatabase, verifyTestDatabaseSafety } from './setup.js';
import { sseService, SseEvent } from '../src/services/sse.service.js';

const app = createApp();

describe('Real-Time SSE Events API (GET /api/events)', () => {
  let memberToken: string;
  let adminToken: string;
  let testSnackId: string;

  beforeAll(async () => {
    await verifyTestDatabaseSafety();
    const seeded = await seedTestDatabase();
    memberToken = seeded.memberToken;
    adminToken = seeded.adminToken;

    const snack = await testPrisma.snack.create({
      data: {
        name: 'SSE Test Snack',
        category: 'SWEET',
        quantity: 20,
        lowStockThreshold: 5,
      },
    });
    testSnackId = snack.id;
  });

  beforeEach(() => {
    sseService.closeAll();
  });

  afterAll(async () => {
    sseService.closeAll();
    await testPrisma.$disconnect();
  });

  it('should reject unauthenticated SSE connection with 401', async () => {
    const res = await request(app).get('/api/events');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('should accept authenticated SSE connection with proper streaming headers', async () => {
    const server = app.listen(0);
    const address = server.address() as { port: number };

    try {
      const response = await fetch(`http://localhost:${address.port}/api/events`, {
        headers: {
          Authorization: `Bearer ${memberToken}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/event-stream');
      expect(response.headers.get('cache-control')).toContain('no-cache');

      // Read initial connection event
      const reader = response.body?.getReader();
      expect(reader).toBeDefined();

      const { value } = await reader!.read();
      const text = new TextDecoder().decode(value);

      expect(text).toContain('CONNECTED');
      expect(text).toContain('"type":"CONNECTED"');

      // Cancel reader to close connection
      await reader!.cancel();
    } finally {
      server.close();
    }
  });

  it('should clean up client registration when connection closes', async () => {
    expect(sseService.getClientCount()).toBe(0);
    const server = app.listen(0);
    const address = server.address() as { port: number };

    try {
      const response = await fetch(`http://localhost:${address.port}/api/events`, {
        headers: {
          Authorization: `Bearer ${memberToken}`,
        },
      });

      const reader = response.body?.getReader();
      await reader!.read(); // Read connected event

      expect(sseService.getClientCount()).toBe(1);

      // Close connection
      await reader!.cancel();

      // Give event loop time to process socket close
      await new Promise((r) => setTimeout(r, 200));

      expect(sseService.getClientCount()).toBe(0);
    } finally {
      server.close();
    }
  });

  it('should broadcast inventory consumption and restock events with sanitized payload', async () => {
    const eventsReceived: SseEvent[] = [];

    // Intercept broadcast for testing verification
    const originalBroadcast = sseService.broadcast.bind(sseService);
    sseService.broadcast = (evt: SseEvent) => {
      eventsReceived.push(evt);
      originalBroadcast(evt);
    };

    try {
      // 1. Consume
      await request(app)
        .post(`/api/snacks/${testSnackId}/consume`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ amount: 2 });

      expect(eventsReceived.length).toBe(1);
      const consumeEvt = eventsReceived[0];
      expect(consumeEvt.type).toBe('SNACK_CONSUMED');
      expect(consumeEvt.snackId).toBe(testSnackId);
      expect(consumeEvt.timestamp).toBeDefined();
      // Ensure no private session tokens or user details leaked
      expect((consumeEvt as any).userId).toBeUndefined();
      expect((consumeEvt as any).token).toBeUndefined();

      // 2. Restock
      await request(app)
        .post(`/api/snacks/${testSnackId}/restock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amount: 10 });

      expect(eventsReceived.length).toBe(2);
      const restockEvt = eventsReceived[1];
      expect(restockEvt.type).toBe('SNACK_RESTOCKED');
      expect(restockEvt.snackId).toBe(testSnackId);
    } finally {
      sseService.broadcast = originalBroadcast;
    }
  });

  it('should broadcast voting events on vote and unvote', async () => {
    const eventsReceived: SseEvent[] = [];

    const originalBroadcast = sseService.broadcast.bind(sseService);
    sseService.broadcast = (evt: SseEvent) => {
      eventsReceived.push(evt);
      originalBroadcast(evt);
    };

    try {
      // 1. Cast vote
      await request(app)
        .post(`/api/snacks/${testSnackId}/vote`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(eventsReceived.length).toBe(1);
      expect(eventsReceived[0].type).toBe('VOTE_ADDED');
      expect(eventsReceived[0].snackId).toBe(testSnackId);

      // 2. Remove vote
      await request(app)
        .delete(`/api/snacks/${testSnackId}/vote`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(eventsReceived.length).toBe(2);
      expect(eventsReceived[1].type).toBe('VOTE_REMOVED');
      expect(eventsReceived[1].snackId).toBe(testSnackId);
    } finally {
      sseService.broadcast = originalBroadcast;
    }
  });

  it('should NOT broadcast any event when a transaction fails or rolls back', async () => {
    const eventsReceived: SseEvent[] = [];

    const originalBroadcast = sseService.broadcast.bind(sseService);
    sseService.broadcast = (evt: SseEvent) => {
      eventsReceived.push(evt);
      originalBroadcast(evt);
    };

    try {
      // Attempt to consume 99999 packets (causes insufficient stock rollback)
      const res = await request(app)
        .post(`/api/snacks/${testSnackId}/consume`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ amount: 99999 });

      expect(res.status).toBe(409);
      // Zero events must have been broadcast
      expect(eventsReceived.length).toBe(0);
    } finally {
      sseService.broadcast = originalBroadcast;
    }
  });
});
