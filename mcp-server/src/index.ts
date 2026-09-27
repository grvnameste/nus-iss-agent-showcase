/**
 * MCP server process entrypoint (Spec 12 §8, FR-1206; Spec 17 network transport).
 *
 * Boots the MCP server over the configured transport and handles graceful
 * shutdown. Audit and any diagnostics go to stderr so they never corrupt the
 * stdio protocol on stdout.
 *
 * Transports (selected by `MCP_TRANSPORT`):
 * - `stdio` (default): launched as a subprocess by a local MCP client.
 * - `http`: a network-connectable Streamable HTTP endpoint for remote testing
 *   (see `http/http-host.ts`).
 *
 * Human approval: there is no interactive approver wired in this prototype, so
 * the server is **fail-closed** on both transports — `submit_enquiry` is refused
 * unless an approval channel is provided. A future spec can wire MCP elicitation.
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { env, parseList } from './config/env.js';
import { buildServer, connect } from './server.js';
import { startHttpHost, type HttpHostHandle } from './http/http-host.js';

async function startStdio(): Promise<void> {
  const server = buildServer();
  const transport = new StdioServerTransport();

  const shutdown = (): void => {
    // Best-effort close; the process exits after.
    void server.close().finally(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await connect(server, transport);
  process.stderr.write(
    `${JSON.stringify({ event: 'mcp_server_started', transport: 'stdio' })}\n`,
  );
}

async function startHttp(): Promise<void> {
  const handle: HttpHostHandle = await startHttpHost({
    host: env.MCP_HTTP_HOST,
    port: env.MCP_HTTP_PORT,
    allowedHosts: parseList(env.MCP_ALLOWED_HOSTS),
    allowedOrigins: parseList(env.MCP_ALLOWED_ORIGINS),
  });

  const shutdown = (): void => {
    void handle.close().finally(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  process.stderr.write(
    `${JSON.stringify({ event: 'mcp_server_started', transport: 'http', port: handle.port })}\n`,
  );
}

async function main(): Promise<void> {
  if (env.MCP_TRANSPORT === 'http') {
    await startHttp();
    return;
  }
  await startStdio();
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${JSON.stringify({ event: 'mcp_server_fatal', message })}\n`);
  process.exit(1);
});
