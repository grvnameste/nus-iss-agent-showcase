import express, { type Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { corsOrigins } from './config/env.js';
import { logger } from './config/logger.js';
import { healthRouter } from './routes/health.js';
import { coursesRouter } from './routes/courses.js';
import { enquiriesRouter } from './routes/enquiries.js';
import { errorHandler, notFoundHandler } from './http/error-handler.js';

/**
 * Build and configure the Express application.
 *
 * Single composition point for HTTP wiring: security middleware, request
 * logging, routes, and centralised error handling. Business logic lives in
 * Service modules (added by later specifications), never in this file or in
 * route handlers directly.
 *
 * Layering (design §6): Routes → Controllers → Services → Repositories → Data.
 * The foundation ships only the health route; the layer directories under
 * `src/{controllers,services,repositories,data}` are established for later specs.
 */
/** Maximum accepted JSON body size (SR-505). Ample for a single enquiry. */
const JSON_BODY_LIMIT = '64kb';

export function createApp(): Application {
  const app = express();

  // Security baseline: hardened headers (NFR-004).
  app.use(helmet());

  // CORS restricted to a configurable allow-list (NFR-005).
  app.use(cors({ origin: corsOrigins() }));

  // Structured per-request logging, correlation-ready (FR-023, NFR-008).
  app.use(pinoHttp({ logger }));

  // Bound the request body. Enquiries are the only WRITE and their fields are
  // individually length-capped by the schema, so a small limit rejects abusive
  // payloads before parsing rather than after (SR-505).
  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  // READ: liveness / health.
  app.use('/api/health', healthRouter);

  // READ: course catalogue (Specification 02). Search/filter/sort/paginate and
  // single-course retrieval. Business logic lives in the Course Service.
  app.use('/api/courses', coursesRouter);

  // WRITE: course enquiries (Specification 05). Every submission is
  // independently re-validated at this boundary; logic lives in the Enquiry
  // Service (FR-511, SR-501).
  app.use('/api/enquiries', enquiriesRouter);

  // Structured 404 for unknown routes (FR-019).
  app.use(notFoundHandler);

  // Centralised, sanitised error handler (FR-020).
  app.use(errorHandler);

  return app;
}
