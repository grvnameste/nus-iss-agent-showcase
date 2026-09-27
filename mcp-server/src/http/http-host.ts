/**
 * Network-connectable Streamable HTTP host for the MCP server (Spec 17).
 *
 * Adds a network transport alongside stdio so remote end users can exercise the
 * MCP tools over HTTP (behind Nginx/TLS on Lightsail). This host is purely
 * additive: it reuses `buildServer()`, the same tools, and the same guardrails.
 * Writes remain **fail-closed** — `buildServer()` defaults to a denying approver,
 * so `submit_enquiry` is refused over HTTP exactly as it is over stdio until an
 * approval channel (e.g. MCP elicitation) is wired by a future spec.
 *
 * Design notes:
 * - Uses Node's built-in `http` module — no new npm dependency in `mcp-server`.
 * - Stateful sessions: each `initialize` mints a session id (crypto UUID) and a
 *   dedicated `McpServer` + `StreamableHTTPServerTransport`; later requests are
 *   routed by the `mcp-session-id` header per the SDK's standard pattern.
 * - DNS-rebinding protection is enabled when Host/Origin allow-lists are set.
 * - Diagnostics go to stderr as PII-free JSON so they never carry learner data.
 */
import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { buildServer, connect, type BuildServerOptions } from '../server.js';

/** A live MCP session: its dedicated server + transport pair. */
interface Session {
  readonly transport: StreamableHTTPServerTransport;
  readonly server: ReturnType<typeof buildServer>;
}

export interface HttpHostOptions {
  readonly host: string;
  readonly port: number;
  /** Host allow-list for DNS-rebinding protection. Empty disables the check. */
  readonly allowedHosts?: readonly string[];
  /** Origin allow-list for DNS-rebinding protection. Empty disables the check. */
  readonly allowedOrigins?: readonly string[];
  /** Options forwarded to `buildServer` (approval/audit/duplicate guard). */
  readonly serverOptions?: BuildServerOptions;
  /** Structured stderr logger; defaults to writing PII-free JSON lines. */
  readonly log?: (event: Record<string, unknown>) => void;
}

export interface HttpHostHandle {
  /** The port actually bound (useful when `port` is 0 for tests). */
  readonly port: number;
  /** Stop accepting connections and tear down all live sessions. */
  close(): Promise<void>;
}

const MCP_PATH = '/mcp';
const HEALTH_PATH = '/healthz';
const SESSION_HEADER = 'mcp-session-id';

function defaultLog(event: Record<string, unknown>): void {
  process.stderr.write(`${JSON.stringify(event)}\n`);
}

/** Best-effort read and JSON-parse of a request body. */
async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  if (chunks.length === 0) {
    return undefined;
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (raw.trim().length === 0) {
    return undefined;
  }
  return JSON.parse(raw) as unknown;
}

function writeJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(payload);
}

/** JSON-RPC error envelope for requests we reject before reaching a transport. */
function jsonRpcError(res: ServerResponse, status: number, message: string): void {
  writeJson(res, status, {
    jsonrpc: '2.0',
    error: { code: -32000, message },
    id: null,
  });
}

/** True when a parsed JSON-RPC body is an `initialize` request. */
function isInitializeRequest(body: unknown): boolean {
  if (Array.isArray(body)) {
    return body.some(isInitializeRequest);
  }
  return (
    typeof body === 'object' &&
    body !== null &&
    (body as { method?: unknown }).method === 'initialize'
  );
}

/**
 * Start the Streamable HTTP host. Returns a handle whose `close()` stops the
 * listener and disposes every live session.
 */
export async function startHttpHost(options: HttpHostOptions): Promise<HttpHostHandle> {
  const log = options.log ?? defaultLog;
  const allowedHosts = [...(options.allowedHosts ?? [])];
  const allowedOrigins = [...(options.allowedOrigins ?? [])];
  const dnsRebindingProtection = allowedHosts.length > 0 || allowedOrigins.length > 0;

  const sessions = new Map<string, Session>();

  const createSession = async (): Promise<Session> => {
    const server = buildServer(options.serverOptions ?? {});
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      enableDnsRebindingProtection: dnsRebindingProtection,
      ...(allowedHosts.length > 0 ? { allowedHosts } : {}),
      ...(allowedOrigins.length > 0 ? { allowedOrigins } : {}),
      onsessioninitialized: (sessionId) => {
        sessions.set(sessionId, { transport, server });
        log({ event: 'mcp_http_session_open', sessionId });
      },
    });

    // When a session is torn down (DELETE or transport close), forget it.
    transport.onclose = () => {
      const id = transport.sessionId;
      if (id !== undefined && sessions.delete(id)) {
        log({ event: 'mcp_http_session_close', sessionId: id });
      }
    };

    // The SDK's StreamableHTTPServerTransport exposes `onclose`/`onerror` via
    // always-present accessors typed `(() => void) | undefined`, which does not
    // satisfy the `Transport` interface's *optional* members under
    // `exactOptionalPropertyTypes`. This is a known SDK/strict-config quirk, not a
    // runtime concern — the transport fully implements `Transport`. Narrow, local
    // cast keeps strictness on everywhere else.
    await connect(server, transport as unknown as Transport);
    return { server, transport };
  };

  const handleMcp = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const sessionId = req.headers[SESSION_HEADER];
    const existingId = typeof sessionId === 'string' ? sessionId : undefined;

    if (req.method === 'POST') {
      const body = await readJsonBody(req);

      if (existingId !== undefined) {
        const session = sessions.get(existingId);
        if (session === undefined) {
          jsonRpcError(res, 404, 'Unknown or expired MCP session.');
          return;
        }
        await session.transport.handleRequest(req, res, body);
        return;
      }

      // No session id: only an `initialize` request may open one.
      if (!isInitializeRequest(body)) {
        jsonRpcError(res, 400, 'Missing MCP session id for non-initialize request.');
        return;
      }

      const session = await createSession();
      await session.transport.handleRequest(req, res, body);
      return;
    }

    // GET (SSE stream) and DELETE (session teardown) require an existing session.
    if (req.method === 'GET' || req.method === 'DELETE') {
      if (existingId === undefined) {
        jsonRpcError(res, 400, 'Missing MCP session id.');
        return;
      }
      const session = sessions.get(existingId);
      if (session === undefined) {
        jsonRpcError(res, 404, 'Unknown or expired MCP session.');
        return;
      }
      await session.transport.handleRequest(req, res);
      return;
    }

    res.writeHead(405, { Allow: 'GET, POST, DELETE' });
    res.end();
  };

  const httpServer: Server = createServer((req, res) => {
    void (async () => {
      try {
        const url = req.url ?? '';
        const path = url.split('?')[0];

        if (path === HEALTH_PATH && req.method === 'GET') {
          writeJson(res, 200, { ok: true });
          return;
        }

        if (path === MCP_PATH) {
          await handleMcp(req, res);
          return;
        }

        jsonRpcError(res, 404, 'Not found.');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        log({ event: 'mcp_http_request_error', message });
        if (!res.headersSent) {
          jsonRpcError(res, 500, 'Internal server error.');
        } else {
          res.end();
        }
      }
    })();
  });

  await new Promise<void>((resolve, reject) => {
    const onError = (err: Error): void => reject(err);
    httpServer.once('error', onError);
    httpServer.listen(options.port, options.host, () => {
      httpServer.removeListener('error', onError);
      resolve();
    });
  });

  const address = httpServer.address();
  const boundPort = typeof address === 'object' && address !== null ? address.port : options.port;

  log({
    event: 'mcp_http_listening',
    host: options.host,
    port: boundPort,
    dnsRebindingProtection,
  });

  return {
    port: boundPort,
    close: async (): Promise<void> => {
      // Dispose every live session, then stop the listener.
      const closings = [...sessions.values()].map((session) =>
        session.transport.close().catch(() => undefined),
      );
      await Promise.all(closings);
      sessions.clear();
      await new Promise<void>((resolve, reject) => {
        httpServer.close((err) => (err ? reject(err) : resolve()));
      });
    },
  };
}
