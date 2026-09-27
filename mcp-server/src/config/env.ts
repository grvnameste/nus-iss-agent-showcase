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
  /**
   * Transport the MCP server speaks (Spec 12 + Spec 17):
   * - `stdio`: launched as a subprocess by a local MCP client (default).
   * - `http`: a network-connectable Streamable HTTP endpoint (for remote testing,
   *   e.g. behind Nginx/TLS on Lightsail).
   */
  MCP_TRANSPORT: z.enum(['stdio', 'http']).default('stdio'),
  /** HTTP bind host (Spec 17). Defaults to localhost so only Nginx reaches it. */
  MCP_HTTP_HOST: z.string().default('127.0.0.1'),
  /** HTTP listen port (Spec 17). */
  MCP_HTTP_PORT: z.coerce.number().int().positive().default(4100),
  /**
   * Comma-separated allow-lists for DNS-rebinding protection (Spec 17). When
   * either is non-empty, protection is enabled and only these Host/Origin values
   * may drive the endpoint. Leave empty only for local development.
   */
  MCP_ALLOWED_HOSTS: z.string().default(''),
  MCP_ALLOWED_ORIGINS: z.string().default(''),
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

/** Split a comma-separated env value into a trimmed, non-empty list. */
export function parseList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}
