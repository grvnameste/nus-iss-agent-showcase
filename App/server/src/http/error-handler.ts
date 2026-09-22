import type { NextFunction, Request, Response } from 'express';
import { ApiError, type ApiErrorBody } from './api-error.js';
import { logger } from '../config/logger.js';

/**
 * 404 handler for unknown routes. Returns the shared structured error envelope
 * (FR-019).
 */
export function notFoundHandler(_req: Request, res: Response): void {
  const body: ApiErrorBody = {
    error: { code: 'NOT_FOUND', message: 'Not Found' },
  };
  res.status(404).json(body);
}

/**
 * Body-parser failures reach the error handler as plain `Error`s carrying a
 * `type`, an HTTP `status`, and `expose: true` when the message is safe to
 * return. They are caller mistakes, so mapping them to a generic 500 would both
 * misreport the cause and log a routine client error as an unhandled one.
 * Introduced with the first WRITE endpoint (Specification 05, SR-505); before
 * that no route accepted a body.
 *
 * The two common cases get their own wording; every other 4xx in the family
 * (an unsupported content encoding, an aborted request) is covered generically
 * rather than being left to fall through to a 500. Body-parser's own message is
 * never forwarded — only messages chosen here reach the client (SR-503).
 */
function asBodyParserError(err: unknown): ApiError | null {
  if (typeof err !== 'object' || err === null || !('type' in err)) return null;
  const { type, status } = err as { type?: unknown; status?: unknown };
  if (typeof type !== 'string') return null;

  if (type === 'entity.too.large') {
    return new ApiError(413, 'VALIDATION_ERROR', 'Request body is too large.');
  }
  if (type === 'entity.parse.failed') {
    return ApiError.validation('Request body is not valid JSON.');
  }
  // Anything else body-parser reports as a client error.
  if (typeof status === 'number' && status >= 400 && status < 500) {
    return new ApiError(status, 'VALIDATION_ERROR', 'Request body could not be read.');
  }
  return null;
}

/**
 * Centralised error handler.
 *
 * Renders operational {@link ApiError}s into the shared envelope with their
 * status/code. Any other (unexpected) error is logged server-side and mapped to
 * a generic, sanitised 500 so internal details never reach the client (FR-020,
 * NFR-211).
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ApiError) {
    res.status(err.status).json(err.toBody());
    return;
  }

  const bodyError = asBodyParserError(err);
  if (bodyError !== null) {
    res.status(bodyError.status).json(bodyError.toBody());
    return;
  }

  logger.error({ err }, 'Unhandled error');

  const body: ApiErrorBody = {
    error: { code: 'INTERNAL', message: 'Internal Server Error' },
  };
  res.status(500).json(body);
}
