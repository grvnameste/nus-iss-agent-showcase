import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

const app = createApp();

describe('GET /api/courses', () => {
  it('returns a paginated list envelope (happy path)', async () => {
    const res = await request(app).get('/api/courses');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toMatchObject({ page: 1, pageSize: 12 });
    expect(res.body.pagination.totalItems).toBeGreaterThan(0);
    // Only listable (published) courses appear by default.
    for (const course of res.body.data) {
      expect(course.status).toBe('published');
    }
  });

  it('supports keyword search', async () => {
    const res = await request(app).get('/api/courses').query({ keyword: 'cyber' });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.pagination.totalItems).toBeLessThan(25);
  });

  it('supports filtering (AND across fields)', async () => {
    const res = await request(app)
      .get('/api/courses')
      .query({ discipline: 'Cybersecurity', deliveryMode: 'online' });
    expect(res.status).toBe(200);
    for (const course of res.body.data) {
      expect(course.discipline).toBe('Cybersecurity');
      expect(course.deliveryMode).toBe('online');
    }
  });

  it('supports sorting by fee ascending', async () => {
    const res = await request(app)
      .get('/api/courses')
      .query({ sort: 'fee', direction: 'asc', pageSize: 48 });
    expect(res.status).toBe(200);
    const fees = res.body.data.map((c: { fee: number }) => c.fee);
    expect(fees).toEqual([...fees].sort((a: number, b: number) => a - b));
  });

  it('supports pagination', async () => {
    const res = await request(app).get('/api/courses').query({ page: 2, pageSize: 5 });
    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(2);
    expect(res.body.data.length).toBeLessThanOrEqual(5);
  });

  it('returns an empty result set (200) when nothing matches', async () => {
    const res = await request(app)
      .get('/api/courses')
      .query({ keyword: 'zzzznotacourse' });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.totalItems).toBe(0);
  });

  it('rejects an out-of-range pageSize with 400', async () => {
    const res = await request(app).get('/api/courses').query({ pageSize: 9999 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a non-integer page with 400', async () => {
    const res = await request(app).get('/api/courses').query({ page: 'abc' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an unknown enum filter value with 400', async () => {
    const res = await request(app).get('/api/courses').query({ discipline: 'Wizardry' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/courses/:courseId', () => {
  it('returns a single-course envelope for a valid id (200)', async () => {
    const res = await request(app).get('/api/courses/cyber-essentials-pt');
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('cyber-essentials-pt');
    expect(res.body.pagination).toBeUndefined();
  });

  it('returns 404 with a structured error for an unknown id', async () => {
    const res = await request(app).get('/api/courses/no-such-course');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 for a non-listable (draft) course', async () => {
    const res = await request(app).get('/api/courses/mlops-foundations-draft');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
