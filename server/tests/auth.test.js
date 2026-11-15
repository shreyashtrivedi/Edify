import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { courseOutline } from './fixtures/courseOutline.js';
import { authHeader, createTestApp, tokenFor } from './helpers/auth.js';
import { useTestDatabase } from './helpers/db.js';
import { saveCourseOutline } from '../services/course.service.js';
import { Lesson } from '../models/Lesson.js';

useTestDatabase();
const app = createTestApp();

const withToken = (token) => ({ Authorization: `Bearer ${token}` });

describe('authentication', () => {
  it('keeps the health check public', async () => {
    expect((await request(app).get('/api/health')).status).toBe(200);
  });

  it('rejects requests without a token with 401 AUTH_REQUIRED', async () => {
    const res = await request(app).get('/api/courses');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_REQUIRED');
  });

  it('rejects a malformed token', async () => {
    const res = await request(app).get('/api/courses').set(withToken('not-a-real-token'));

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('rejects a token issued for another API (wrong audience) or by another tenant', async () => {
    const wrongAudience = await tokenFor(undefined, { audience: 'https://some-other-api' });
    const wrongIssuer = await tokenFor(undefined, { issuer: 'https://attacker.example/' });

    for (const token of [wrongAudience, wrongIssuer]) {
      const res = await request(app).get('/api/courses').set(withToken(token));
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    }
  });

  it('tells the client when the token has expired', async () => {
    const expired = await tokenFor(undefined, { expiresIn: Math.floor(Date.now() / 1000) - 60 });

    const res = await request(app).get('/api/courses').set(withToken(expired));

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });
});

describe('data isolation between users', () => {
  it("never shows or changes another user's course or lessons", async () => {
    const course = await saveCourseOutline(courseOutline, { creator: 'auth0|alice', level: 'beginner' });
    const lessonId = String(course.modules[0].lessons[0]._id);
    const bob = await authHeader('auth0|bob');

    const list = await request(app).get('/api/courses').set(bob);
    expect(list.status).toBe(200);
    expect(list.body.courses).toEqual([]);

    // 404 rather than 403, so Bob can't even learn that the course exists.
    expect((await request(app).get(`/api/courses/${course._id}`).set(bob)).status).toBe(404);
    expect((await request(app).get(`/api/courses/${course._id}/export`).set(bob)).status).toBe(404);
    expect((await request(app).delete(`/api/courses/${course._id}`).set(bob)).status).toBe(404);
    expect((await request(app).get(`/api/lessons/${lessonId}`).set(bob)).status).toBe(404);
    expect((await request(app).post(`/api/lessons/${lessonId}/generate`).set(bob)).status).toBe(404);

    // Alice still sees it.
    const alice = await authHeader('auth0|alice');
    const own = await request(app).get('/api/courses').set(alice);
    expect(own.body.courses).toHaveLength(1);
  });
});

describe('/api/users/me', () => {
  it('creates the profile on first login, updates it later, and reports stats', async () => {
    const headers = await authHeader('auth0|carol');
    const course = await saveCourseOutline(courseOutline, { creator: 'auth0|carol', level: 'beginner' });
    await Lesson.updateOne({ _id: course.modules[0].lessons[0]._id }, { isEnriched: true });

    const first = await request(app)
      .put('/api/users/me')
      .set(headers)
      .send({ name: 'Carol', email: 'Carol@Example.com', picture: 'https://example.com/c.png' });

    expect(first.status).toBe(200);
    expect(first.body.user).toMatchObject({
      auth0Id: 'auth0|carol',
      name: 'Carol',
      email: 'carol@example.com',
      stats: { courses: 1, lessonsGenerated: 1 },
    });

    await request(app).put('/api/users/me').set(headers).send({ name: 'Carol D.' });
    const me = await request(app).get('/api/users/me').set(headers);

    expect(me.body.user.name).toBe('Carol D.');
    expect(me.body.user.picture).toBe('https://example.com/c.png'); // untouched fields kept
  });

  it('rejects a non-https picture URL', async () => {
    const res = await request(app)
      .put('/api/users/me')
      .set(await authHeader())
      .send({ picture: 'javascript:alert(1)' });

    expect(res.status).toBe(400);
  });
});
