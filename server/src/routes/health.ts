import { Router, type Request, type Response } from 'express';

/**
 * Health check route.
 *
 * Classified as a READ operation. Exposes liveness information only — it does
 * not touch business data. Used by the frontend and deployment platform to
 * confirm the API is reachable.
 */
export const healthRouter = Router();

const startedAt = Date.now();

healthRouter.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'eduagent-connect-server',
    version: '0.1.0',
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString(),
  });
});
