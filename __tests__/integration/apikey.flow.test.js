// File: __tests__/integration/apikey.flow.test.js
const request = require('supertest');
const app = require('../../app.test');
const { prisma, resetDatabase } = require('../../lib/test-db');

describe('API Key Lifecycle (Integration)', () => {
  let authToken;
  let apiKey;

  beforeEach(async () => {
    await resetDatabase();
    
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'dev@example.com',
        password: 'correct-horse-battery-staple',
        name: 'API Dev',
      });

    const login = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'dev@example.com',
        password: 'correct-horse-battery-staple',
      });
    
    authToken = login.body.accessToken;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('should create API key with JWT', async () => {
    const res = await request(app)
      .post('/api/api-keys')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Test Key', plan: 'free' });

    expect(res.status).toBe(201);
    expect(res.body.apiKey).toBeDefined();
    expect(res.body.apiKey).toContain('ak_live_');
    
    apiKey = res.body.apiKey;
  });

  test('should access protected endpoint with valid API key', async () => {
    const keyRes = await request(app)
      .post('/api/api-keys')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ plan: 'free' });
    
    const key = keyRes.body.apiKey;

    const res = await request(app)
      .get('/api/v1/weather')
      .set('X-API-Key', key);

    // Только базовые проверки доступа, без requestsRemaining
    expect(res.status).toBe(200);
    expect(res.body.temperature).toBeDefined();
  });

  test('should enforce quota limits', async () => {
    const keyRes = await request(app)
      .post('/api/api-keys')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ plan: 'free' });
    
    const key = keyRes.body.apiKey;

    // Исчерпываем лимит (для free это обычно 100)
    for (let i = 0; i < 100; i++) {
      await request(app).get('/api/v1/weather').set('X-API-Key', key);
    }

    const res = await request(app)
      .get('/api/v1/weather')
      .set('X-API-Key', key);

    expect(res.status).toBe(429);
  });
});