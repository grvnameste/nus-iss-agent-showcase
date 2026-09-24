/**
 * API error taxonomy and consistent error envelope.
 *
 * Establishes the sanitised, structured error shape that all endpoints share
 * (design §9). Operational errors carry a machine-readable `code` and an HTTP
 * `status`; the centralised handler maps anything else to a generic 500 without
 * leaking internals (FR-020).
 */

export type ApiErrorCode = 'VALIDATION_ERROR' | 'NOT_FOUND' | 'INTERNAL';

/** Structured error payload returned to clients. */
export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
}

/**
 * Operational (expected) error with an explicit HTTP status and code. Handlers
 * and future controllers throw these; the centralised error handler renders
 * them into the shared envelope.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static notFound(message = 'Resource not found'): ApiError {
    return new ApiError(404, 'NOT_FOUND', message);
  }

  static validation(message = 'Invalid request', details?: unknown): ApiError {
    return new ApiError(400, 'VALIDATION_ERROR', message, details);
  }

  toBody(): ApiErrorBody {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details !== undefined ? { details: this.details } : {}),
      },
    };
  }
}
