import { z } from 'zod';

/**
 * MCP server environment configuration (Spec 12 §8, FR-1206.2).
 *
 * All process configuration flows through this validated schema, mirroring the
 * backend's `server/src/config/env.ts` pattern (fail-fast on misconfiguration).
 * No secrets are required by the synthetic prototype. Because this server reuses
 * the backend services **in-process** (Spec 12 Option B), there is no API base
 * URL to configure — the only knobs are the transport and log level.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  /** Transport the MCP server speaks. stdio is the common local-client case. */
  MCP_TRANSPORT: z.enum(['stdio']).default('stdio'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // Fail fast: misconfiguration should never reach request handling.
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid MCP server environment configuration:\n${issues}`);
  }
  return parsed.data;
}

export const env: Env = loadEnv();
