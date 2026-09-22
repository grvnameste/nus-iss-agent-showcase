import { afterEach, describe, expect, it, vi } from 'vitest';
import { EnquiryApiError, enquiriesApi } from './api';
import type { EnquiryInput } from './types';

/**
 * Enquiry API client tests (Spec 05, TASK-509).
 *
 * `fetch` is stubbed at the boundary the client actually uses. The assertions
 * are about the request that leaves the browser and the error the UI receives —
 * the module itself must hold no business logic.
 */

const INPUT: EnquiryInput = {
  name: 'Alex Tan',
  email: 'alex.tan@example.com',
  courseId: 'ai-foundations',
  enquiryType: 'general',
  message: 'How much prior experience do I need for this course?',
};

const CONFIRMATION = {
  reference: 'ENQ-2026-000001',
  courseId: 'ai-foundations',
  courseTitle: 'AI Foundations for Professionals',
  status: 'received',
  createdAt: '2026-05-01T09:00:00.000Z',
};

function stubFetch(
  response: { status: number; body: unknown } | { reject: Error },
): ReturnType<typeof vi.fn> {
  const stub = vi.fn(() => {
    if ('reject' in response) return Promise.reject(response.reject);
    return Promise.resolve({
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      json: () => Promise.resolve(response.body),
    } as Response);
  });
  vi.stubGlobal('fetch', stub);
  return stub;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('enquiriesApi.submit', () => {
  it('POSTs the enquiry as JSON to /api/enquiries', async () => {
    const stub = stubFetch({ status: 201, body: { data: CONFIRMATION } });

    await enquiriesApi.submit(INPUT);

    const [url, init] = stub.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/enquiries$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(INPUT);
  });

  it('declares a JSON content type', async () => {
    const stub = stubFetch({ status: 201, body: { data: CONFIRMATION } });

    await enquiriesApi.submit(INPUT);

    const [, init] = stub.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' });
  });

  it('returns the confirmation payload on success', async () => {
    stubFetch({ status: 201, body: { data: CONFIRMATION } });

    await expect(enquiriesApi.submit(INPUT)).resolves.toEqual(CONFIRMATION);
  });

  it('surfaces a network failure as a retryable, generic error (FR-517)', async () => {
    stubFetch({ reject: new TypeError('Failed to fetch') });

    await expect(enquiriesApi.submit(INPUT)).rejects.toBeInstanceOf(EnquiryApiError);
    await expect(enquiriesApi.submit(INPUT)).rejects.toMatchObject({
      message: 'Unable to reach the enquiry service. Please check your connection and try again.',
    });
  });

  it('never leaks the underlying network error text', async () => {
    stubFetch({ reject: new TypeError('ECONNREFUSED 127.0.0.1:4000') });

    await expect(enquiriesApi.submit(INPUT)).rejects.not.toMatchObject({
      message: expect.stringContaining('ECONNREFUSED'),
    });
  });

  it('carries the API error code and status so the UI can react (FR-517)', async () => {
    stubFetch({
      status: 404,
      body: { error: { code: 'NOT_FOUND', message: 'The selected course is not available for enquiries.' } },
    });

    await expect(enquiriesApi.submit(INPUT)).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
      message: 'The selected course is not available for enquiries.',
    });
  });

  it('exposes server validation issues per field so the form can show them', async () => {
    stubFetch({
      status: 400,
      body: {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request parameters',
          details: [{ path: ['email'], message: 'Enter a valid email address' }],
        },
      },
    });

    await expect(enquiriesApi.submit(INPUT)).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      fieldErrors: { email: 'Enter a valid email address' },
    });
  });

  it('falls back to a generic message when the error body is unreadable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.reject(new Error('not json')),
        } as unknown as Response),
      ),
    );

    await expect(enquiriesApi.submit(INPUT)).rejects.toMatchObject({
      status: 500,
      message: 'We could not submit your enquiry. Please try again.',
    });
  });
});
