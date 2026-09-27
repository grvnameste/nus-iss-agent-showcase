# Specification 17 — MCP HTTP (Network) Transport · Requirements

**Project:** EduAgent Connect — WebMCP-Ready Education Website Demonstrator
**Spec ID:** 17-mcp-http-transport
**Title:** Network-connectable MCP transport (Streamable HTTP) for remote testing
**Status:** Draft for review (post-Phase 2 feature; SPECIFICATION PHASE)
**Builds on:** `.kiro/specs/12-mcp-server/` (stdio MCP server), `10-agent-guardrails/`
(fail-closed writes), all on `main`.
**Related steering:** `.kiro/steering/architecture.md`, `security.md`,
`product.md`, `coding-standards.md`, `testing.md`

---

## 0. Purpose & motivation

The MCP server (Spec 12) speaks the Model Context Protocol over **stdio** only.
stdio requires an MCP client to launch the server as a local subprocess — so a
remote **end user cannot test MCP over the network** the way they test the WebMCP
website in a browser.

This spec adds a **network-connectable HTTP transport** (the MCP SDK's
**Streamable HTTP** transport) to the MCP server, **alongside** stdio, so that a
deployed instance (e.g. AWS Lightsail behind Nginx + TLS) exposes an MCP endpoint
a remote MCP client (or the MCP Inspector) can connect to. This is additive: stdio
remains the default and unchanged.

It reuses the existing `buildServer()` composition and the Spec 10 guardrails
(fail-closed writes). **No business logic is added or duplicated.**

## 1. Scope

### 1.1 In scope

- A **transport selector** (`MCP_TRANSPORT = stdio | http`, validated env).
- An **HTTP host** for the MCP server using `StreamableHTTPServerTransport`,
  mounted on an MCP endpoint (e.g. `POST/GET/DELETE /mcp`).
- **Session handling** per the SDK (initialise → session id → subsequent requests).
- **Security controls:** bind to localhost (behind Nginx TLS), DNS-rebinding
  protection via `allowedHosts`/`allowedOrigins`, configurable via env.
- **Lifecycle & health:** clean start/stop; a simple liveness signal.
- **Remote-write approval posture:** define how `submit_enquiry` (WRITE) behaves
  over HTTP; it **stays fail-closed** by default (§4.4).
- **Deploy wiring:** an Nginx route to the MCP endpoint, a systemd unit for the
  HTTP MCP service, env/docs updates.
- Tests for transport selection and an HTTP initialise + `tools/list` round-trip.

### 1.2 Out of scope / Non-goals

- **No** change to the capability set, tools, or backend services (reuse only).
- **No** duplicated business logic; the adapter/services are unchanged.
- **No** auth/identity system (synthetic demo); access control is limited to
  origin/host allow-listing + network placement (behind Nginx). Documented as a
  limitation.
- **No** removal of stdio; it remains the default.
- **No** WebMCP change (that is the browser interface, already testable).
- **No** legacy SSE transport unless a target client requires it (Streamable HTTP
  is the current standard; note SSE availability as a fallback only).

## 2. Personas

| ID | Persona | Need |
| -- | ------- | ---- |
| P1 | Remote end user / evaluator | Connect an MCP client to the hosted server over the network and exercise the tools. |
| P2 | Demoer | Point the MCP Inspector at a URL to show tool discovery/execution. |
| P3 | Operator | Run the HTTP MCP service on Lightsail behind Nginx/TLS, safely. |
| P4 | Security reviewer | Confirm the network endpoint is locked down and writes stay fail-closed. |

## 3. Definitions

- **Streamable HTTP transport:** the MCP SDK's `StreamableHTTPServerTransport`,
  the current HTTP transport (supersedes the older HTTP+SSE transport).
- **Session:** an MCP session identified by a server-issued session id after
  `initialize`; subsequent requests carry it.

## 4. Functional Requirements (EARS-style)

### 4.1 Transport selection — FR-1701

- **FR-1701.1** The server **shall** support a validated `MCP_TRANSPORT` env value
  of `stdio` (default, unchanged) or `http`.
- **FR-1701.2** With `stdio`, behaviour **shall** be exactly as Spec 12 today.
- **FR-1701.3** With `http`, the server **shall** start an HTTP host exposing the
  MCP endpoint and **shall not** use stdio.
- **FR-1701.4** Both paths **shall** reuse the same `buildServer()` composition
  (same tools, same guardrails) — the transport is the only difference.

### 4.2 HTTP endpoint & sessions — FR-1702

- **FR-1702.1** The HTTP host **shall** expose the MCP endpoint using
  `StreamableHTTPServerTransport`, handling the protocol's `POST` (requests),
  `GET` (stream), and `DELETE` (session end) as the SDK specifies.
- **FR-1702.2** The host **shall** issue a **session id** on `initialize` and
  route subsequent requests to the correct session.
- **FR-1702.3** A client **shall** be able to `initialize` then `tools/list` and
  receive the seven tools (Spec 16 set; `navigate_to_course` still excluded).
- **FR-1702.4** The host **shall** listen on a configurable **host/port** (default
  bind `127.0.0.1` so it is only reachable via the reverse proxy).

### 4.3 Security controls — FR-1703

- **FR-1703.1** The host **shall** enable **DNS-rebinding protection** using
  `allowedHosts` and/or `allowedOrigins`, configurable via env (a comma-separated
  allow-list), so only the intended domain(s) can drive it.
- **FR-1703.2** The host **shall** default to binding **`127.0.0.1`**, relying on
  Nginx (TLS + routing) for public exposure — the MCP process is never directly
  internet-facing.
- **FR-1703.3** Errors **shall** be sanitised (no internals/stack traces to the
  client), consistent with the existing error posture.
- **FR-1703.4** The absence of user authentication **shall** be documented as a
  demo limitation; the allow-list + network placement are the controls.

### 4.4 Remote writes stay fail-closed — FR-1704

- **FR-1704.1** `submit_enquiry` (the only WRITE) **shall** remain **fail-closed**
  over HTTP: with no wired human-approval channel it is **refused** (the existing
  `DenyingApproval` default), exactly as over stdio.
- **FR-1704.2** The spec **shall** describe the options for a remote human to
  approve a write (e.g. MCP elicitation to the connected client, or leaving writes
  disabled for public demos) and **shall** default to the safe one (refuse).
- **FR-1704.3** READ tools (find/details/compare/prepare/validate/list) **shall**
  work over HTTP without approval, so evaluators can exercise the read journey.

### 4.5 Lifecycle & health — FR-1705

- **FR-1705.1** The HTTP MCP service **shall** start and shut down cleanly
  (handle SIGINT/SIGTERM; close sessions/server).
- **FR-1705.2** The host **shall** provide a lightweight **liveness** signal
  (e.g. a `GET /healthz` returning ok) so Nginx/uptime checks can probe it without
  speaking MCP.
- **FR-1705.3** Diagnostics/audit **shall** be PII-free and not corrupt the MCP
  protocol stream.

### 4.6 Deployment wiring — FR-1706

- **FR-1706.1** The deploy toolkit **shall** gain an **Nginx route** to the MCP
  endpoint (e.g. `location /mcp`), and a **systemd unit** for the HTTP MCP service.
- **FR-1706.2** New env keys **shall** be documented (`MCP_TRANSPORT`,
  `MCP_HTTP_PORT`, `MCP_HTTP_HOST`, `MCP_ALLOWED_HOSTS`, `MCP_ALLOWED_ORIGINS`) in
  `deploy/server.env.example`-style docs and `DEPLOYMENT.md`.
- **FR-1706.3** `deploy/README.md` **shall** explain how a remote user connects an
  MCP client / MCP Inspector to the hosted endpoint.

### 4.7 Dependencies — FR-1707

- **FR-1707.1** The HTTP host **should** use Node's built-in `http` module to
  avoid a new dependency; if a minimal framework is used instead, it **shall** be
  pinned and justified.
- **FR-1707.2** The MCP SDK (already pinned `@modelcontextprotocol/sdk@1.30.1`)
  **shall** provide the transport; no SDK version change.

## 5. Non-Functional Requirements

- **NFR-1701 (Reuse)** Same `buildServer()`, tools, guardrails; transport-only
  change.
- **NFR-1702 (Security)** Endpoint bound to localhost behind TLS; DNS-rebinding
  protection on; writes fail-closed; sanitised errors; PII-free logs.
- **NFR-1703 (Type safety)** TS strict; no `any`; env via Zod, fail-fast.
- **NFR-1704 (Determinism)** Tests use an in-process transport/client; no real
  network sockets required for unit tests where avoidable.
- **NFR-1705 (No regression)** stdio remains the default and unchanged; existing
  MCP tests stay green.

## 6. Acceptance Criteria (Given / When / Then)

- **AC-1701 (Selection) — FR-1701**
  *Given* `MCP_TRANSPORT=http`, *when* the server starts, *then* it serves the MCP
  endpoint over HTTP and not stdio; with `stdio` (default) behaviour is unchanged.
- **AC-1702 (Round-trip) — FR-1702**
  *Given* the HTTP endpoint, *when* a client `initialize`s then calls `tools/list`,
  *then* it receives a session and the seven tools (navigation excluded).
- **AC-1703 (Security) — FR-1703**
  *Given* the host, *when* configured, *then* DNS-rebinding protection is enabled
  with an allow-list, it binds localhost by default, and errors are sanitised.
- **AC-1704 (Fail-closed writes) — FR-1704**
  *Given* `submit_enquiry` over HTTP with no approver, *when* invoked, *then* it is
  refused and nothing is written; READ tools succeed without approval.
- **AC-1705 (Lifecycle/health) — FR-1705**
  *Given* the HTTP service, *when* probed at `/healthz`, *then* it returns ok; on
  SIGTERM it shuts down cleanly.
- **AC-1706 (Deploy) — FR-1706**
  *Given* the deploy toolkit, *when* reviewed, *then* it includes the Nginx MCP
  route, a systemd unit, documented env keys, and remote-connection instructions.
- **AC-1707 (Gates)**
  *Given* the change, *when* gates run, *then* `typecheck`, `lint`, `vitest --run`
  (mcp-server + others), and `build` succeed; the HTTP server boots and answers
  `initialize`/`tools/list`; stdio still works.

## 7. Constraints

Spec 17 only. Additive HTTP transport alongside stdio; reuse `buildServer()`,
tools, and guardrails. Bind localhost behind Nginx/TLS; DNS-rebinding protection
with an allow-list; **writes stay fail-closed**; no auth (documented limitation);
sanitised errors; PII-free logs. Prefer Node built-in `http` (no new dep); SDK
version unchanged. Synthetic data only.
