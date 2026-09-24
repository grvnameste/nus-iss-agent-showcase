import { pino, type Logger } from 'pino';
import { env } from './env.js';

/**
 * Structured application logger (Pino).
 *
 * Emits JSON logs (NFR-008). In development, logs are pretty-printed for
 * readability; in production/test they remain machine-parsable JSON. The log
 * level is environment-driven via `LOG_LEVEL`.
 *
 * No secrets or PII should ever be logged. Standard sensitive headers are
 * redacted defensively so that request logging (pino-http) cannot leak them.
 */
export const logger: Logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
    ],
    remove: true,
  },
  ...(env.NODE_ENV === 'development'
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard' },
        },
      }
    : {}),
});
