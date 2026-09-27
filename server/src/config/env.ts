import { z } from 'zod';

/**
 * Environment configuration schema.
 *
 * All process configuration flows through this validated schema so the rest of
 * the app can rely on typed, sane values. No business logic here — this is pure
 * configuration parsing.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  /**
   * Enquiry store selector (Spec 16). `sqlite` persists to a file on disk;
   * `memory` keeps the original in-process store (used by tests / ephemeral dev).
   */
  ENQUIRY_STORE: z.enum(['sqlite', 'memory']).default('sqlite'),
  /**
   * SQLite database file path (Spec 16). Point this at a durable path on the
   * deployed instance. Ignored when ENQUIRY_STORE=memory.
   */
  ENQUIRY_DB_PATH: z.string().default('./data/enquiries.db'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // Fail fast: misconfiguration should never reach request handling.
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}

export const env: Env = loadEnv();

/**
 * Parse the CORS_ORIGIN setting into a value the cors middleware accepts.
 * "*" enables any origin (local prototyping only); otherwise a comma-separated
 * allow-list is returned.
 */
export function corsOrigins(): string | string[] {
  if (env.CORS_ORIGIN.trim() === '*') {
    return '*';
  }
  return env.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}
