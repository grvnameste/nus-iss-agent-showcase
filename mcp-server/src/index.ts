/**
 * MCP server process entrypoint (Spec 12 §8, FR-1206).
 *
 * Boots the MCP server over stdio and handles graceful shutdown. Audit and any
 * diagnostics go to stderr so they never corrupt the stdio protocol on stdout.
 *
 * Human approval: over stdio there is no interactive approver wired in this
 * prototype, so the server is **fail-closed** — `submit_enquiry` is refused unless
 * an approval channel is provided. A future spec can wire MCP elicitation.
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { env } from './config/env.js';
import { buildServer, connect } from './server.js';

async function main(): Promise<void> {
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
    `${JSON.stringify({ event: 'mcp_server_started', transport: env.MCP_TRANSPORT })}\n`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${JSON.stringify({ event: 'mcp_server_fatal', message })}\n`);
  process.exit(1);
});
