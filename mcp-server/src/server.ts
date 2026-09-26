/**
 * MCP server composition (Spec 12 §2, §8).
 *
 * Builds the `McpServer`, wires the capability adapter (reusing the backend
 * services), registers the tools, and connects a transport. Kept separate from
 * the process entrypoint so it can be constructed in tests without touching
 * stdio.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { createAdapter } from './adapters/capability-adapter.js';
import { DuplicateSubmissionGuard } from './adapters/duplicate-guard.js';
import { StderrAuditSink, type AuditSink } from './adapters/audit.js';
import { DenyingApproval, type HumanApproval } from './adapters/approval.js';
import { registerTools } from './tools/register-tools.js';

export interface BuildServerOptions {
  /** Human approval channel for writes. Defaults to fail-closed (deny). */
  readonly approval?: HumanApproval;
  readonly audit?: AuditSink;
  readonly duplicateGuard?: DuplicateSubmissionGuard;
}

/** Construct a configured (but not yet connected) MCP server. */
export function buildServer(options: BuildServerOptions = {}): McpServer {
  const server = new McpServer({
    name: 'eduagent-connect',
    version: '0.1.0',
  });

  const adapter = createAdapter({
    // Fail-closed by default: no write proceeds without an explicit approver.
    approval: options.approval ?? new DenyingApproval(),
    audit: options.audit ?? new StderrAuditSink(),
    duplicateGuard: options.duplicateGuard ?? new DuplicateSubmissionGuard(),
  });

  registerTools(server, adapter);
  return server;
}

/** Connect a built server to a transport (e.g. stdio). */
export async function connect(server: McpServer, transport: Transport): Promise<void> {
  await server.connect(transport);
}
