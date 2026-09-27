# Implementation Plan: MCP HTTP (Network) Transport

**Project:** EduAgent Connect — WebMCP-Ready Education Website Demonstrator
**Spec ID:** 17-mcp-http-transport
**Owner:** Backend / Phase 2
**Traceability:** `./requirements.md`, `./design.md`.
**Branch:** `mcp-http-transport` (off `main`).

## Overview

Add a network-connectable **Streamable HTTP** transport to the MCP server,
alongside stdio, so a remote end user can test MCP over the network on Lightsail.
Additive and reuse-first: `buildServer()`, the tools, the adapter, and the Spec 10
guardrails are unchanged; **writes stay fail-closed**. Prefer Node's built-in
`http` (no new dependency). SDK version unchanged.

Task 1 is this spec. Tasks 2–4 are the implementation; Task 5 verifies; Task 6 is
deploy wiring; Task 7 docs. Implementation begins only after review.

## Tasks

- [ ] 1. Author the spec (this document set)
  - **Files:** `.kiro/specs/17-mcp-http-transport/{requirements,design,tasks}.md`.
  - **Acceptance:** the three documents exist and are internally consistent.
  - _Requirements: all (spec authoring)_

- [ ] 2. Extend env for transport selection + HTTP config
  - `config/env.ts`: `MCP_TRANSPORT` enum `stdio|http` (default stdio);
    `MCP_HTTP_HOST` (default `127.0.0.1`), `MCP_HTTP_PORT` (default 4100),
    `MCP_ALLOWED_HOSTS`, `MCP_ALLOWED_ORIGINS` (comma-separated). Zod, fail-fast.
  - **Acceptance:** env validates; stdio default unchanged. _Requirements: FR-1701, FR-1703, FR-1706.2_

- [ ] 3. Implement the HTTP host (`http/http-host.ts`)
  - Node built-in `http` server mounting `StreamableHTTPServerTransport`
    (sessionIdGenerator, DNS-rebinding protection + allow-lists). Route
    `POST/GET/DELETE /mcp` → `transport.handleRequest`; `GET /healthz` → ok.
    Reuse `buildServer()`. Clean SIGINT/SIGTERM shutdown; PII-free stderr log.
  - **Acceptance:** initialise + tools/list works; localhost bind; sanitised
    errors. _Requirements: FR-1702, FR-1703, FR-1705, FR-1707_

- [ ] 4. Wire transport selection in `index.ts`
  - Branch on `env.MCP_TRANSPORT`: `http` → `startHttpHost(...)`; else the
    existing stdio path. No change to `server.ts`.
  - **Acceptance:** both transports start; writes fail-closed on both.
    _Requirements: FR-1701, FR-1704_

- [ ] 5. Tests + verification
  - Env/selection unit test; HTTP integration test on an ephemeral port using the
    SDK client (initialise → tools/list = 7 tools; a READ returns data;
    `submit_enquiry` refused fail-closed); `/healthz` ok. Then `typecheck` + `lint`
    + `vitest --run` (mcp-server) + build; stdio tests still green.
  - **Acceptance:** AC-1701–AC-1705, AC-1707. _Requirements: NFR-1704, NFR-1705_

- [ ] 6. Deploy wiring
  - `deploy/systemd/eduagent-mcp.service` (HTTP mode); Nginx `location /mcp`
    (streaming-friendly, `proxy_buffering off`, larger body) in
    `deploy/nginx.conf.example`; optional flag in `install-services.sh`.
  - **Acceptance:** AC-1706. _Requirements: FR-1706_

- [ ] 7. Docs
  - `deploy/server.env.example` + `DEPLOYMENT.md`: new env keys and the
    remote-connect recipe (MCP Inspector / HTTP-transport client → `https://<domain>/mcp`);
    note fail-closed writes and the no-auth limitation. `mcp-server/README.md`
    HTTP section.
  - **Acceptance:** a reader can connect a remote MCP client to the hosted endpoint.
    _Requirements: FR-1706.3, FR-1703.4_

## Notes

- **Reuse-first:** transport-only change; no new capabilities/logic; SDK version
  unchanged; prefer built-in `http`.
- **Security:** localhost bind behind Nginx/TLS, DNS-rebinding protection with an
  allow-list, sanitised errors, PII-free logs, **writes fail-closed**.
- **Remote write approval** (elicitation) is a documented follow-up; the default
  refuses writes so a public endpoint is safe and the READ journey is fully
  testable.
