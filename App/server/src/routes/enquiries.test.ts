import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { logger } from '../config/logger.js';

/**
 * Enquiry API tests (Spec 05, TASK-518).
 *
 * Exercises the real Express app end to end through the HTTP boundary, so the
 * validate middleware, controller, service and repository are all in play.
 */

let app: ReturnType<typeof createApp>;

const PERSONAL_FIELDS = {
  name: 'Alex Tan',
  email: 'alex.tan@example.com',
  phone: '+65 9123 4567',
  message: 'How much prior experience do I need for this course?',
};

function validBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    ...PERSONAL_FIELDS,
    courseId: 'ai-foundations',
    enquiryType: 'general',
    ...overrides,
  };
}

/** A course id that is present in the synthetic catalogue. */
async function firstListableCourseId(): Promise<string> {
  const res = await request(app).get('/api/courses').query({ pageSize: 1 });
  return res.body.data[0].id as string;
}

beforeEach(() => {
  app = createApp();
});

describe('POST /api/enquiries', () => {
  it('creates an enquiry and returns 201 with a reference (FR-511, FR-512)', async () => {
    const courseId = await firstListableCourseId();

    const res = await request(app).post('/api/enquiries').send(validBody({ courseId }));

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ courseId, status: 'received' });
    expect(res.body.data.reference).toMatch(/^ENQ-\d{4}-\d{6}$/);
    expect(typeof res.body.data.courseTitle).toBe('string');
    expect(Date.parse(res.body.data.createdAt)).not.toBeNaN();
  });

  it('never echoes the submitted personal fields back to the client (FR-519)', async () => {
    const courseId = await firstListableCourseId();

    const res = await request(app).post('/api/enquiries').send(validBody({ courseId }));

    expect(res.body.data).not.toHaveProperty('name');
    expect(res.body.data).not.toHaveProperty('email');
    expect(res.body.data).not.toHaveProperty('phone');
    expect(res.body.data).not.toHaveProperty('message');
  });

  it('issues a distinct reference for each submission (FR-514)', async () => {
    const courseId = await firstListableCourseId();
    const body = validBody({ courseId });

    const first = await request(app).post('/api/enquiries').send(body);
    const second = await request(app).post('/api/enquiries').send(body);

    expect(first.body.data.reference).not.toBe(second.body.data.reference);
  });

  it('rejects a missing required field with a structured 400 (FR-508, SR-501)', async () => {
    const body = validBody();
    delete body.name;

    const res = await request(app).post('/api/enquiries').send(body);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(res.body.error.details)).toBe(true);
  });

  it('reports the offending field in the validation details', async () => {
    const res = await request(app)
      .post('/api/enquiries')
      .send(validBody({ email: 'not-an-email' }));

    expect(res.status).toBe(400);
    const paths = res.body.error.details.map((issue: { path: string[] }) => issue.path[0]);
    expect(paths).toContain('email');
  });

  it('rejects an enquiry type outside the allowed set (FR-509)', async () => {
    const res = await request(app)
      .post('/api/enquiries')
      .send(validBody({ enquiryType: 'refunds' }));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an oversized message before it reaches storage (SR-505)', async () => {
    const res = await request(app)
      .post('/api/enquiries')
      .send(validBody({ message: 'a'.repeat(2001) }));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an entirely empty body', async () => {
    const res = await request(app).post('/api/enquiries').send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a body beyond the size limit as a client error, not a 500 (SR-505)', async () => {
    // Bigger than the configured limit. Reporting this as INTERNAL would both
    // misattribute a client mistake to the server and log it as an unhandled
    // error, so it is mapped at the boundary instead.
    const res = await request(app)
      .post('/api/enquiries')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ ...validBody(), message: 'a'.repeat(200_000) }));

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('keeps the oversized-body message free of internals (SR-503)', async () => {
    const res = await request(app)
      .post('/api/enquiries')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ ...validBody(), message: 'a'.repeat(200_000) }));

    expect(res.body.error.message).toBe('Request body is too large.');
  });

  it('rejects an unsupported content encoding as a client error, not a 500', async () => {
    // Oversized and malformed bodies are not the only way body parsing fails.
    // Any such failure is the caller's mistake, so none of them should reach the
    // client as INTERNAL or be logged as an unhandled error (SR-503, SR-505).
    const res = await request(app)
      .post('/api/enquiries')
      .set('Content-Type', 'application/json')
      .set('Content-Encoding', 'br')
      .send(JSON.stringify(validBody()));

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a malformed JSON body as a client error', async () => {
    const res = await request(app)
      .post('/api/enquiries')
      .set('Content-Type', 'application/json')
      .send('{"name": "Alex",');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('maps an unknown course to a structured 404 (FR-510, AC-505)', async () => {
    const res = await request(app)
      .post('/api/enquiries')
      .send(validBody({ courseId: 'no-such-course' }));

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('keeps the course-unavailable message free of internals (SR-503)', async () => {
    const res = await request(app)
      .post('/api/enquiries')
      .send(validBody({ courseId: 'no-such-course' }));

    expect(res.body.error.message).toBe(
      'The selected course is not available for enquiries.',
    );
    expect(res.body.error.message).not.toMatch(/stack|Error:|at \w+/i);
  });

  it('does not accept GET on the enquiries collection (write-only endpoint)', async () => {
    const res = await request(app).get('/api/enquiries');

    expect(res.status).toBe(404);
  });
});

describe('enquiry logging (SR-504, AC-510)', () => {
  /**
   * Asserts on what Pino actually writes. Spying on `logger.info` would capture
   * the arguments *before* the serialisers run and report a false leak: pino-http
   * hands the logger the live `res` object, whose `res.req.body` still holds the
   * submitted fields, and the serialiser is what reduces it to request metadata.
   * Swapping the logger's destination stream is therefore the only way to see the
   * bytes a real deployment would emit.
   */
  // Pino keeps its destination on a private symbol that is not part of the
  // package's public type surface, so it is located by description. The
  // assertion makes the test fail loudly rather than silently pass if a future
  // Pino changes that.
  const streamSym = Object.getOwnPropertySymbols(logger).find(
    (symbol) => symbol.description === 'pino.stream',
  );
  if (streamSym === undefined) {
    throw new Error('Could not locate the Pino destination stream symbol');
  }
  const captured: string[] = [];
  let originalStream: unknown;

  beforeEach(() => {
    captured.length = 0;
    originalStream = (logger as unknown as Record<PropertyKey, unknown>)[streamSym];
    (logger as unknown as Record<PropertyKey, unknown>)[streamSym] = {
      write: (chunk: string) => captured.push(chunk),
    };
  });

  afterEach(() => {
    (logger as unknown as Record<PropertyKey, unknown>)[streamSym] = originalStream;
  });

  it('emits a request-level log line for a submission', async () => {
    const courseId = await firstListableCourseId();

    await request(app).post('/api/enquiries').send(validBody({ courseId }));

    const line = captured.find((entry) => entry.includes('/api/enquiries'));
    expect(line).toBeDefined();
    expect(JSON.parse(line as string)).toMatchObject({
      req: { method: 'POST', url: '/api/enquiries' },
      res: { statusCode: 201 },
    });
  });

  it('emits no personal field from a successful submission', async () => {
    const courseId = await firstListableCourseId();

    await request(app).post('/api/enquiries').send(validBody({ courseId }));

    const logs = captured.join('\n');
    for (const value of Object.values(PERSONAL_FIELDS)) {
      expect(logs).not.toContain(value);
    }
  });

  it('emits no personal field when a submission is rejected', async () => {
    // Reject on `enquiryType` so every personal field is sent exactly as the
    // assertion expects it — rejecting on `email` would search the logs for a
    // value that was never submitted.
    await request(app).post('/api/enquiries').send(validBody({ enquiryType: 'refunds' }));

    const logs = captured.join('\n');
    for (const value of Object.values(PERSONAL_FIELDS)) {
      expect(logs).not.toContain(value);
    }
  });
});
