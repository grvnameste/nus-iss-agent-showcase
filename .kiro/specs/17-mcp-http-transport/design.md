# Specification 17 — MCP HTTP (Network) Transport · Design

**Project:** EduAgent Connect — WebMCP-Ready Education Website Demonstrator
**Spec ID:** 17-mcp-http-transport
**Status:** Draft for review (SPECIFICATION PHASE)
**Traceability:** `./requirements.md`; MCP server `../12-mcp-server/`; guardrails
`../10-agent-guardrails/`; SDK `@modelcontextprotocol/sdk@1.30.1`
(`server/streamableHttp.js`).

> Descriptive/advisory only. No code is written by this spec. Snippets are
> illustrative for the implementation tasks.

---

## 1. Design goals

- **DG1** Make MCP reachable over the network (a URL) so a remote end user tests
  it like the website — **without** changing the capability contract or logic.
- **DG2** Additive: `buildServer()`, tools, adapter, and stdio are unchanged; HTTP
  is a second transport chosen by env.
- **DG3** Safe by default: localhost bind behind Nginx/TLS, DNS-rebinding
  protection, writes fail-closed.

## 2. Where the change lands

```
mcp-server/src/
├── index.ts                 # entrypoint — selects transport by env (stdio | http)
├── server.ts                # buildServer()/connect() — UNCHANGED (reused)
├── http/
│   └── http-host.ts         # NEW: Node http server mounting StreamableHTTPServerTransport
├── config/env.ts            # extend: MCP_TRANSPORT enum + HTTP host/port/allow-lists
└── adapters/, tools/        # UNCHANGED
```

Only `index.ts` and `config/env.ts` change; everything else is new HTTP glue. The
capability layer and guardrails are untouched.

## 3. Transport selector (env) — FR-1701

`config/env.ts` gains:

```ts
MCP_TRANSPORT: z.enum(['stdio', 'http']).default('stdio'),
MCP_HTTP_HOST: z.string().default('127.0.0.1'),   // bind localhost behind Nginx
MCP_HTTP_PORT: z.coerce.number().int().positive().default(4100),
// Comma-separated allow-lists for DNS-rebinding protection. Empty = protection off
// (dev only); production sets the deployed host/origin.
MCP_ALLOWED_HOSTS: z.string().default(''),
MCP_ALLOWED_ORIGINS: z.string().default(''),
```

`index.ts` branches:

```ts
if (env.MCP_TRANSPORT === 'http') {
  await startHttpHost(buildServer, env);     // new
} else {
  const server = buildServer();
  await connect(server, new StdioServerTransport());   // existing path
}
```

## 4. HTTP host — FR-1702, FR-1707

`http/http-host.ts` uses **Node's built-in `http`** (no new dependency) plus the
SDK's `StreamableHTTPServerTransport`:

- Create a transport with a `sessionIdGenerator` (`crypto.randomUUID`), the
  allow-lists, and DNS-rebinding protection:

```ts
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => randomUUID(),
  enableDnsRebindingProtection: allowedHosts.length > 0 || allowedOrigins.length > 0,
  ...(allowedHosts.length ? { allowedHosts } : {}),
  ...(allowedOrigins.length ? { allowedOrigins } : {}),
});
const server = buildServer();
await server.connect(transport);
```

- A Node `http` server routes the MCP endpoint to `transport.handleRequest(req,
  res, parsedBody)`:
  - `POST /mcp` — JSON-RPC requests (initialise + calls). Body is read/parsed then
    passed to `handleRequest`.
  - `GET /mcp` — server→client stream (SSE-style) for the session.
  - `DELETE /mcp` — end session.
  - `GET /healthz` — liveness (plain `200 { ok: true }`), does not touch MCP.
- **Session management:** the SDK issues a session id on `initialize`; the host
  keeps a map of session id → transport (or a single transport per the SDK's
  stateful mode) and dispatches subsequent requests accordingly. The exact
  bookkeeping follows the SDK's documented stateful pattern.

> Note on framework: the SDK's `handleRequest` takes Node `IncomingMessage`/
> `ServerResponse`, so built-in `http` is sufficient and avoids adding Express to
> the mcp-server workspace. If session routing proves fiddly, a minimal Express
> may be justified (pinned) — but built-in `http` is the default.

## 5. Security controls — FR-1703

- **Bind `127.0.0.1`** by default → the MCP process is not directly internet-
  facing; only Nginx reaches it.
- **DNS-rebinding protection ON** whenever an allow-list is set (production sets
  `MCP_ALLOWED_HOSTS`/`MCP_ALLOWED_ORIGINS` to the deployed domain). This is the
  SDK's built-in defence against a malicious page driving the local endpoint.
- **Sanitised errors**: non-JSON-RPC failures return generic messages; no stack
  traces.
- **No auth** (demo): documented limitation. The controls are network placement +
  allow-listing. A real deployment would add a bearer token / gateway.

## 6. Writes stay fail-closed — FR-1704 (Spec 10 preserved)

- `buildServer()` still defaults to `DenyingApproval`, so `submit_enquiry` over
  HTTP is **refused** unless an approver is wired — identical to stdio. A public
  demo endpoint therefore cannot submit.
- **Remote approval options (documented; default = refuse):**
  1. **Elicitation** — the SDK can ask the connected client to confirm; wire a
     `FunctionApproval` that elicits from the session. (Follow-up; not required to
     ship read-testing.)
  2. **Writes disabled** — leave the deny default for public endpoints; evaluators
     exercise the full READ journey (find → details → compare → prepare →
     validate → list) and see the write correctly refused.
- READ tools need no approval and work over HTTP.

## 7. Lifecycle & health — FR-1705

- `startHttpHost` returns a handle; SIGINT/SIGTERM close the HTTP server and the
  MCP server/sessions, then exit.
- `GET /healthz` → `200 {"ok":true}` for Nginx/uptime probes (cheap, protocol-free).
- Startup logs a single PII-free line to stderr (`mcp_http_started`, host/port).

## 8. Testing — FR (NFR-1704)

- **Env/selection:** unit test that `MCP_TRANSPORT=http` picks the HTTP path and
  `stdio` the stdio path (factory-level, no sockets).
- **Round-trip:** an integration test starts the HTTP host on an ephemeral port
  (127.0.0.1:0) and drives it with the SDK **client** + `StreamableHTTPClientTransport`
  (or raw JSON-RPC POST): `initialize` → `tools/list` returns 7 tools; a READ tool
  (e.g. `find_courses`) returns data; `submit_enquiry` is refused (fail-closed).
- **Health:** `GET /healthz` returns ok.
- Existing stdio tests remain untouched and green (no regression).

## 9. Deployment wiring — FR-1706

- **systemd:** `deploy/systemd/eduagent-mcp.service` (template) running
  `MCP_TRANSPORT=http npm run start --workspace mcp-server`, with
  `MCP_HTTP_PORT`, `MCP_ALLOWED_HOSTS`, `MCP_ALLOWED_ORIGINS` from the env file.
- **Nginx:** add a `location /mcp` proxy to `127.0.0.1:$MCP_HTTP_PORT` in
  `deploy/nginx.conf.example`, with streaming-friendly settings
  (`proxy_buffering off;` for the GET stream) and the larger body limit.
- **install-services.sh:** optionally install the MCP unit too (flag-gated).
- **Docs:** `deploy/server.env.example` + `DEPLOYMENT.md` document the new keys and
  a "connect a remote MCP client / MCP Inspector to `https://<domain>/mcp`" recipe.

## 10. Remote-connection recipe (for docs)

- **MCP Inspector:** point it at `https://<domain>/mcp` (Streamable HTTP) → list
  and call tools in a browser UI.
- **MCP client config (HTTP):** the connecting client uses its HTTP-transport
  config form (URL = `https://<domain>/mcp`), not a `command`/`args` subprocess.

## 11. Constraints recap

Spec 17 only; additive HTTP transport (SDK `StreamableHTTPServerTransport`)
alongside stdio; reuse `buildServer()`/tools/guardrails; Node built-in `http` (no
new dep); bind localhost behind Nginx/TLS; DNS-rebinding protection + allow-list;
writes fail-closed; no auth (documented); sanitised errors; PII-free logs; SDK
version unchanged. Synthetic data only.
