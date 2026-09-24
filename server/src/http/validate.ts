import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { ApiError } from './api-error.js';

/**
 * Reusable Zod validation boundary for controllers (FR-021, NFR-006).
 *
 * Validates a request part (`body`, `query`, or `params`) against a Zod schema
 * before the handler runs. On failure it forwards a sanitised
 * `VALIDATION_ERROR` (400) with field-level issues; it never lets malformed
 * input reach a Service.
 *
 * The parsed, typed value is attached back onto the request part so downstream
 * handlers consume validated data. This foundation ships the mechanism; the
 * first concrete schemas arrive with later specifications.
 */
export function validate(
  part: 'body' | 'query' | 'params',
  schema: ZodType,
): (req: Request, _res: Response, next: NextFunction) => void {
  return (req, _res, next) => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      next(ApiError.validation('Invalid request parameters', result.error.issues));
      return;
    }
    // Replace with the parsed value so handlers receive typed, sanitised input.
    req[part] = result.data as Request[typeof part];
    next();
  };
}
