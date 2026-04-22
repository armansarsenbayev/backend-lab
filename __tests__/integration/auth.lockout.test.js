// File: __tests__/integration/auth.lockout.test.js
const request = require('supertest');
const app = require('../../app.test');
const { prisma, resetDatabase } = require('../../lib/test-db');

describe('Account Lockout Flow (Integration)', () => {
  
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('should lock account after 5 failed attempts', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'correct-horse-battery-staple',
        name: 'Test User',
      });

    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrong-password',
        });
      
      if (i < 4) {
        expect(res.status).toBe(401);
        expect(res.body.attemptsRemaining).toBe(4 - i);
      } else {
        expect(res.status).toBe(423);
        expect(res.body.error).toContain('locked');
      }
    }
  });

  test('should reject correct password during lockout', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'locked@example.com',
        password: 'correct-horse-battery-staple',
        name: 'Locked User',
      });

    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'locked@example.com', password: 'wrong' });
    }

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'locked@example.com',
        password: 'correct-horse-battery-staple',
      });

    expect(res.status).toBe(423);
    expect(res.body.retryAfter).toBeDefined();
  });

  test('should reset failed count on successful login', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'reset@example.com',
        password: 'correct-horse-battery-staple',
        name: 'Reset User',
      });

    await request(app)
      .post('/api/auth/login')
      .send({ email: 'reset@example.com', password: 'wrong1' });
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'reset@example.com', password: 'wrong2' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'reset@example.com',
        password: 'correct-horse-battery-staple',
      });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();

    const res2 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'reset@example.com', password: 'wrong' });
    expect(res2.body.attemptsRemaining).toBe(4);
  });
});