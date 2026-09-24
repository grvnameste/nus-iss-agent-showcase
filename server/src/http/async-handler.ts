import type { NextFunction, Request, Response } from 'express';

/**
 * Wrap an async Express handler so rejected promises are forwarded to the
 * centralised error handler. Express 4 does not await handler return values, so
 * without this a thrown `ApiError` inside an async handler would not reach
 * `errorHandler`. This is infrastructure only — no business logic.
 */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
