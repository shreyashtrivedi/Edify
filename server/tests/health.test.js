import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';

const app = createApp();

describe('GET /api/health', () => {
  it('reports that the API is up', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('database');
  });
});

describe('unknown routes', () => {
  it('return a JSON 404 in the standard error shape', async () => {
    const res = await request(app).get('/api/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/Route not found/);
  });
});

describe('malformed JSON', () => {
  it('is rejected with 400 instead of crashing', async () => {
    const res = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{"broken": ');

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Request body is not valid JSON');
  });
});
