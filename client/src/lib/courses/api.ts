import { resolveApiBaseUrl } from '@/lib/webmcp';
import type {
  Course,
  CourseListResponse,
  CourseQueryParams,
  CourseResponse,
} from './types';

/**
 * Course API client (FR-215, FR-216).
 *
 * A thin HTTP client over the Course REST API. It contains **no** business logic
 * — no search/filter/sort/pagination is computed here; it only serialises the
 * structured query into request parameters and deserialises the response. The
 * catalogue UI never touches the data source directly; it derives all results
 * from these calls. Reuses the Spec 01 API base-URL resolution.
 */

/** Structured API error surfaced to the UI without leaking internals. */
export class CourseApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'CourseApiError';
  }
}

function buildSearchParams(params: CourseQueryParams): URLSearchParams {
  const search = new URLSearchParams();
  const appendList = (key: string, values?: readonly string[]): void => {
    if (!values || values.length === 0) return;
    for (const value of values) search.append(key, value);
  };

  if (params.keyword && params.keyword.trim().length > 0) {
    search.set('keyword', params.keyword.trim());
  }
  appendList('discipline', params.discipline);
  appendList('category', params.category);
  appendList('courseType', params.courseType);
  appendList('level', params.level);
  appendList('deliveryMode', params.deliveryMode);
  appendList('availability', params.availability);
  if (params.sort) search.set('sort', params.sort);
  if (params.direction) search.set('direction', params.direction);
  if (params.page !== undefined) search.set('page', String(params.page));
  if (params.pageSize !== undefined) {
    search.set('pageSize', String(params.pageSize));
  }
  return search;
}

async function requestJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const base = resolveApiBaseUrl().replace(/\/+$/, '');
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      headers: { Accept: 'application/json' },
      ...(signal ? { signal } : {}),
    });
  } catch {
    // Network failure — generic, user-friendly message (no internals).
    throw new CourseApiError('Unable to reach the course service.');
  }

  if (!response.ok) {
    throw new CourseApiError(
      response.status === 404
        ? 'Course not found.'
        : 'The course service returned an error.',
      response.status,
    );
  }

  return (await response.json()) as T;
}

export const coursesApi = {
  /** GET /api/courses with structured query params. */
  async list(
    params: CourseQueryParams,
    signal?: AbortSignal,
  ): Promise<CourseListResponse> {
    const search = buildSearchParams(params).toString();
    const path = `/api/courses${search ? `?${search}` : ''}`;
    return requestJson<CourseListResponse>(path, signal);
  },

  /** GET /api/courses/:courseId. */
  async getById(courseId: string, signal?: AbortSignal): Promise<Course> {
    const path = `/api/courses/${encodeURIComponent(courseId)}`;
    const body = await requestJson<CourseResponse>(path, signal);
    return body.data;
  },
};
