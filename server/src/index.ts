import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';

/**
 * Process bootstrap. Starts the HTTP listener and wires graceful shutdown
 * (NFR-013). Configuration is validated at import time in `config/env.ts`, so an
 * invalid environment fails fast before the server starts.
 */
function main(): void {
  const app = createApp();

  const server = app.listen(env.PORT, () => {
    logger.info(
      { port: env.PORT, env: env.NODE_ENV },
      'eduagent-connect-server listening',
    );
  });

  const shutdown = (signal: string): void => {
    logger.info({ signal }, 'Shutting down');
    server.close(() => process.exit(0));
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main();
