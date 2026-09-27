/**
 * Network-connectable HTTP host for MCP server (Spec 17 §2).
 *
 * Mounts the SDK's `StreamableHTTPServerTransport` on a Node built-in `http`
 * server. Provides MCP endpoint routes (`POST/GET/DELETE /mcp`) plus health
 * check (`GET /healthz`), DNS-rebinding protection via allow-lists, session
 * handling per SDK stateful pattern, and clean shutdown on SIGINT/SIGTERM.
 * 
 * Uses no additional npm dependencies (Node built-in `http` only).
 */
import { createServer, type IncomingMessage, type ServerResponse, type Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { buildServer, connect } from '../server.js';
import { env, parseList } from '../config/env.js';

export interface HttpHostOptions {
  /** Host to bind (default: env.MCP_HTTP_HOST). */
  readonly host?: string;
  /** Port to listen on (default: env.MCP_HTTP_PORT). */
  readonly port?: number;
  /** Allowed Host header values for DNS-rebinding protection. */
  readonly allowedHosts?: readonly string[];
  /** Allowed Origin header values for DNS-rebinding protection. */
  readonly allowedOrigins?: readonly string[];
  /** Custom MCP server instance (default: buildServer() with fail-closed writes). */
  readonly server?: McpServer;
}

export interface HttpHostHandle {
  /** Gracefully close the HTTP server and MCP transport. */
  close(): Promise<void>;
  /** The bound port (useful when port=0 for ephemeral allocation). */
  readonly port: number;
}

/**
 * Start an HTTP host for the MCP server.
 * 
 * Routes:
 * - `POST/GET/DELETE /mcp` → MCP protocol via StreamableHTTPServerTransport
 * - `GET /healthz` → `200 {"ok": true}`
 * 
 * DNS-rebinding protection is enabled when either allowedHosts or allowedOrigins
 * is non-empty. Requests with invalid Host/Origin headers are rejected with 403.
 * 
 * Sessions are managed per SDK patterns with a random UUID generator.
 * 
 * @returns Handle with close() method and actual bound port.
 */
export async function startHttpHost(options: HttpHostOptions = {}): Promise<HttpHostHandle> {
  const host = options.host ?? env.MCP_HTTP_HOST;
  const port = options.port ?? env.MCP_HTTP_PORT;
  const allowedHosts = options.allowedHosts ?? parseList(env.MCP_ALLOWED_HOSTS);
  const allowedOrigins = options.allowedOrigins ?? parseList(env.MCP_ALLOWED_ORIGINS);
  const server = options.server ?? buildServer();

  // DNS-rebinding protection is enabled when either allow-list is non-empty
  const enableDnsRebindingProtection = allowedHosts.length > 0 || allowedOrigins.length > 0;

  // Build transport options conditionally for exactOptionalPropertyTypes compatibility
  const transportOptions: {
    sessionIdGenerator: () => string;
    enableDnsRebindingProtection: boolean;
    enableJsonResponse: true;
    allowedHosts?: string[];
    allowedOrigins?: string[];
  } = {
    sessionIdGenerator: () => randomUUID(),
    enableDnsRebindingProtection,
    enableJsonResponse: true,
  };

  if (allowedHosts.length > 0) {
    transportOptions.allowedHosts = [...allowedHosts];
  }
  if (allowedOrigins.length > 0) {
    transportOptions.allowedOrigins = [...allowedOrigins];
  }

  const transport = new StreamableHTTPServerTransport(transportOptions);

  // Connect the MCP server to the transport
  // Note: SDK transport typing quirk with exactOptionalPropertyTypes
  await connect(server, transport as unknown as Transport);

  const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
    const url = req.url;
    const method = req.method;

    // Health check endpoint
    if (method === 'GET' && url === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    // MCP protocol endpoints
    if (url === '/mcp' && (method === 'POST' || method === 'GET' || method === 'DELETE')) {
      handleMcpRequest(req, res, transport);
      return;
    }

    // 404 for all other routes
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  });

  // Start the server
  await new Promise<void>((resolve, reject) => {
    httpServer.listen(port, host, (err?: Error) => {
      if (err) {
        reject(err);
      } else {
        const address = httpServer.address();
        const boundPort = typeof address === 'object' && address ? address.port : port;
        console.error(`MCP HTTP server listening on ${host}:${boundPort}`);
        resolve();
      }
    });
  });

  // Set up graceful shutdown
  const cleanup = setupGracefulShutdown(httpServer, transport);

  const address = httpServer.address();
  const actualPort = typeof address === 'object' && address ? address.port : port;

  return {
    port: actualPort,
    async close(): Promise<void> {
      cleanup();
      await new Promise<void>((resolve, reject) => {
        httpServer.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      await transport.close();
    },
  };
}

/**
 * Handle MCP protocol requests by delegating to the StreamableHTTPServerTransport.
 */
async function handleMcpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  transport: StreamableHTTPServerTransport,
): Promise<void> {
  try {
    // Parse request body for POST requests
    let parsedBody: unknown = undefined;
    if (req.method === 'POST') {
      parsedBody = await parseRequestBody(req);
    }

    // Delegate to the SDK transport
    await transport.handleRequest(req, res, parsedBody);
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
    }
  }
}

/**
 * Parse JSON request body from IncomingMessage.
 */
function parseRequestBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    
    req.on('data', (chunk: string) => {
      body += chunk;
    });
    
    req.on('end', () => {
      try {
        if (body.trim() === '') {
          resolve(undefined);
        } else {
          resolve(JSON.parse(body));
        }
      } catch (error) {
        reject(new Error(`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
    
    req.on('error', reject);
  });
}

/**
 * Set up graceful shutdown handlers for SIGINT and SIGTERM.
 */
function setupGracefulShutdown(
  httpServer: Server,
  transport: StreamableHTTPServerTransport,
): () => void {
  let isShuttingDown = false;
  
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    
    console.error(`Received ${signal}, shutting down gracefully...`);
    
    try {
      // Close HTTP server (stops accepting new connections)
      await new Promise<void>((resolve, reject) => {
        httpServer.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      // Close MCP transport
      await transport.close();
      
      console.error('MCP HTTP server shut down gracefully');
      process.exit(0);
    } catch (error) {
      console.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  };

  const sigintHandler = () => shutdown('SIGINT');
  const sigtermHandler = () => shutdown('SIGTERM');
  
  process.on('SIGINT', sigintHandler);
  process.on('SIGTERM', sigtermHandler);
  
  // Return cleanup function to remove listeners
  return () => {
    process.removeListener('SIGINT', sigintHandler);
    process.removeListener('SIGTERM', sigtermHandler);
  };
}