const request = require('supertest');
const app = require('../app');

describe('GET /', () => {
  it('responds with JSON containing version and date properties', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('version');
    expect(response.body).toHaveProperty('date');
  });
});

describe('GET /health', () => {
  it('responds with JSON containing health status', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'OK');
    expect(response.body).toHaveProperty('database');
  });
});

describe('GET /metrics', () => {
  it('responds with Prometheus metrics', async () => {
    const response = await request(app).get('/metrics');
    expect(response.status).toBe(200);
  });
});

describe('GET /v1/tools/lookup', () => {
  it('responds with JSON containing domain lookup result', async () => {
    const response = await request(app).get('/v1/tools/lookup?domain=example.com');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('addresses');
    expect(response.body).toHaveProperty('client_ip');
    expect(response.body).toHaveProperty('domain', 'example.com');
    expect(response.body).toHaveProperty('created_at');
  });
});

describe('POST /v1/tools/validate', () => {
  it('responds with JSON containing IP address validation result', async () => {
    const response = await request(app)
      .post('/v1/tools/validate')
      .send({ ip: '192.168.1.1' });
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', true);
  });
});

describe('GET /v1/history', () => {
  it('responds with JSON containing history of queries', async () => {
    const response = await request(app).get('/v1/history');
    expect(response.status).toBe(200);
  });
});

describe('POST /v1/history/clear', () => {
  it('responds with success message after clearing history', async () => {
    const response = await request(app).post('/v1/history/clear');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message', 'History cleared successfully.');
  });
});

