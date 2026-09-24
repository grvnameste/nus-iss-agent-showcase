import { resolveApiBaseUrl } from '@/lib/webmcp';
import type { EnquiryConfirmationResult, EnquiryInput, EnquiryResponse } from './types';

/**
 * Enquiry API client (Spec 05, design §10, TASK-509).
 *
 * A thin HTTP client over `POST /api/enquiries`, mirroring the Spec 02 course
 * client. It holds **no** business logic: it does not decide whether an enquiry
 * is valid, generate references, or interpret course availability — the backend
 * owns all of that. Its only jobs are to serialise the request, deserialise the
 * confirmation, and translate a failure into something the UI can show without
 * leaking internals (SR-503, SR-506).
 */

/** Error codes the API can return, matching the Spec 01 error envelope. */
type ApiErrorCode = 'VALIDATION_ERROR' | 'NOT_FOUND' | 'INTERNAL';

/** One Zod issue as the Spec 01 error envelope renders it. */
interface ApiErrorIssue {
  path?: unknown[];
  message?: string;
}

interface ApiErrorEnvelope {
  error?: {
    code?: ApiErrorCode;
    message?: string;
    details?: ApiErrorIssue[];
  };
}

/** Structured, already-sanitised error surfaced to the enquiry UI. */
export class EnquiryApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: ApiErrorCode,
    /** Server validation issues keyed by field name, when the API supplied them. */
    public readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = 'EnquiryApiError';
  }
}

/**
 * Map the envelope's `details` onto field names. Only the first issue per field
 * is kept — the form shows one message per control.
 */
function toFieldErrors(details: ApiErrorIssue[] | undefined): Record<string, string> | undefined {
  if (!Array.isArray(details)) return undefined;
  const fieldErrors: Record<string, string> = {};
  for (const issue of details) {
    const field = Array.isArray(issue.path) ? issue.path[0] : undefined;
    if (typeof field !== 'string' || typeof issue.message !== 'string') continue;
    // Keep the first issue per field: each control shows one message.
    if (fieldErrors[field] === undefined) fieldErrors[field] = issue.message;
  }
  return Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined;
}

const NETWORK_MESSAGE =
  'Unable to reach the enquiry service. Please check your connection and try again.';
const GENERIC_MESSAGE = 'We could not submit your enquiry. Please try again.';

export const enquiriesApi = {
  /** POST /api/enquiries — submit one enquiry (FR-511). */
  async submit(
    input: EnquiryInput,
    signal?: AbortSignal,
  ): Promise<EnquiryConfirmationResult> {
    const base = resolveApiBaseUrl().replace(/\/+$/, '');

    let response: Response;
    try {
      response = await fetch(`${base}/api/enquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(input),
        ...(signal ? { signal } : {}),
      });
    } catch {
      // The underlying reason (DNS, refused connection, CORS) is an internal
      // detail: report only that the service is unreachable (SR-503).
      throw new EnquiryApiError(NETWORK_MESSAGE);
    }

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as ApiErrorEnvelope;
      throw new EnquiryApiError(
        body.error?.message ?? GENERIC_MESSAGE,
        response.status,
        body.error?.code,
        toFieldErrors(body.error?.details),
      );
    }

    const body = (await response.json()) as EnquiryResponse;
    return body.data;
  },
};
