# Specification 12 — MCP Server Integration · Requirements

**Project:** EduAgent Connect — WebMCP-Ready Education Website Demonstrator
**Spec ID:** 12-mcp-server
**Title:** MCP Server Integration
**Status:** Draft for review (Phase 2 — Agent-Ready Transformation; SPECIFICATION PHASE)
**Builds on:** `08-website-analysis`, `09-agent-capability-model`, `10-agent-guardrails`
**Related steering:** `.kiro/steering/architecture.md`, `security.md`,
`product.md`, `coding-standards.md`, `testing.md`

---

## 0. Phase note

Phase 2. This spec designs a **standalone MCP server** that exposes the approved
Spec 09 capabilities to compatible **MCP clients** (e.g. Claude, IDE agents),
honouring the Spec 10 guardrails. It is the **second integration layer** (after
WebMCP, Spec 11).

> **Two interfaces, one logic.** The MCP server reuses the **existing backend
> business services** — it does **not** duplicate business logic and does **not**
> access data/repositories directly. It maps MCP tools → capability model →
> existing services (via HTTP to the REST API, or by importing the transport-
> agnostic services if co-located — decided in §7).

**Specification-only. No application code is written here.** Only the three files
under `.kiro/specs/12-mcp-server/`.

Sequence: 08 → 09 → 10 → 11 WebMCP → **12 MCP** → 13 → 14 → 15. Specs 11 and 12 may
be implemented in parallel once 09 + 10 are approved. **Do not create Spec 16.**

## 1. Purpose

Allow compatible AI clients to use EduAgent Connect's approved capabilities
through the Model Context Protocol: define the server, its tools (from the Spec 09
contract, minus browser-only navigation), its mapping to the existing services,
input/output validation, error handling, transport/connection, permission
enforcement (including human approval for the WRITE), lifecycle/logging, and
security/deployment considerations.

## 2. Background (from Specs 08–11)

- Backend services are transport-agnostic and reusable
  (`courseService.search/getById`, `enquiryService.submit`); the REST API already
  exposes them with authoritative Zod validation.
- The capability contract (Spec 09) and guardrails (Spec 10) are fixed. MCP
  exposes the **MCP-applicable** subset: everything **except** `navigate_to_course`
  (browser-only, D2).
- MCP is greenfield here — no MCP dependency or server exists yet.

## 3. Scope

### 3.1 In scope

- **MCP server architecture** as a new workspace `mcp-server/` (D5).
- **Tool definitions & schemas** for the MCP-applicable capabilities:
  `find_courses`, `get_course_details`, `compare_courses`, `prepare_enquiry`,
  `validate_enquiry`, `submit_enquiry` (NOT `navigate_to_course`).
- A **capability adapter** mapping MCP tools → Spec 09 capabilities → existing
  services (reuse, no duplication).
- **Input validation & error handling** reusing server Zod schemas (D4).
- **Connection & transport configuration** (e.g. stdio for local clients; optional
  HTTP transport considered), with config via validated env.
- **Permission enforcement**, including **human approval** for `submit_enquiry`
  (fail-closed if the client cannot obtain human approval — Spec 10).
- **Server lifecycle & logging** (startup/shutdown, PII-free audit).
- **Security & deployment considerations** (origin/transport exposure, secrets by
  key-name only, synthetic data).

### 3.2 Out of scope / Non-goals

- **No** duplicated business logic and **no** direct repository/DB access.
- **No** browser/WebMCP concerns (Spec 11); **no** agent/LLM orchestration (Spec
  13); **no** demo UI (Spec 14).
- **No** new backend REST endpoints unless §7 concludes one is strictly required
  (default: reuse existing endpoints/services).
- **No** Course/Enquiry model changes.
- **No** application code in this spec (design only).

## 4. Personas

| ID | Persona | Need |
| -- | ------- | ---- |
| P1 | MCP client / external agent | Discover + call approved tools over MCP. |
| P2 | Human user | Approve writes; nothing submitted silently. |
| P3 | Implementer | A concrete server/adapter/transport design. |
| P4 | Security reviewer | Trust boundary, approval, and exposure locked down. |

## 5. Functional Requirements (EARS-style)

### 5.1 Server & tools — FR-1201

- **FR-1201.1** The MCP server **shall** expose exactly the MCP-applicable Spec 09
  capabilities as MCP tools (excluding `navigate_to_course`).
- **FR-1201.2** Each tool's name/description/input schema **shall** derive from the
  Spec 09 capability definition (single source of truth).
- **FR-1201.3** The server **shall** advertise tools via MCP discovery so a client
  can enumerate them.

### 5.2 Mapping & reuse — FR-1202

- **FR-1202.1** Each tool **shall** map through a **capability adapter** to the
  existing business services; it **shall not** re-implement search/sort/
  pagination/listability or enquiry rules.
- **FR-1202.2** `compare_courses` **shall** be composed over the READ capabilities
  (no backend endpoint), consistent with Spec 09.
- **FR-1202.3** The adapter **shall** reach the services either via the existing
  REST API (HTTP) or by importing the transport-agnostic services directly; §7
  (design) selects and justifies the mechanism. Either way, **no business logic is
  duplicated**.

### 5.3 Validation & schema source — FR-1203

- **FR-1203.1** Tool input **shall** be validated with Zod, **reusing the
  server-side domain schemas** or a shared package (D4) — never a third mirrored
  copy.
- **FR-1203.2** The backend **shall** remain authoritative: `submit_enquiry`
  input is re-validated by `enquiryInputSchema` at the REST boundary regardless of
  MCP-side validation.

### 5.4 Permissions & human approval — FR-1204

- **FR-1204.1** READ tools **shall** execute without human approval.
- **FR-1204.2** `submit_enquiry` (WRITE) **shall** require explicit **human
  approval** before execution, surfaced through the MCP client's approval
  mechanism (Spec 10).
- **FR-1204.3** If human approval cannot be obtained, the WRITE **shall** be
  refused (**fail-closed**); the server **shall never** self-approve.
- **FR-1204.4** There **shall** be **no ambient authority**: a tool does only what
  its capability declares.

### 5.5 Errors & duplicates — FR-1205

- **FR-1205.1** Validation failures, unavailable-course, and backend errors
  **shall** map to clear MCP tool errors with **sanitised** messages (no
  internals), consistent with the server error envelope.
- **FR-1205.2** Duplicate-submission protection (Spec 10) **shall** apply so a
  repeated `submit_enquiry` does not create a second record.

### 5.6 Transport, lifecycle & logging — FR-1206

- **FR-1206.1** The server **shall** support a local transport (e.g. stdio) for
  compatible clients; any network transport **shall** respect an origin/allow-list
  model consistent with `security.md`.
- **FR-1206.2** Configuration **shall** flow through **validated env** (mirroring
  `server/src/config/env.ts` style), including the REST API base URL if HTTP
  mapping is used.
- **FR-1206.3** The server **shall** start and shut down cleanly and **shall**
  emit **PII-free** structured audit logs per Spec 10 (capability, outcome,
  approval; never message/PII).

### 5.7 Dependencies & structure — FR-1207

- **FR-1207.1** New dependencies (the MCP SDK, e.g. the MCP TypeScript SDK)
  **shall** be pinned to exact versions and justified; the exact package/version
  (v1 `@modelcontextprotocol/sdk` vs the v2 `@modelcontextprotocol/server`
  package line) **shall** be chosen at implementation time and recorded.
- **FR-1207.2** The server **shall** live in a new `mcp-server/` workspace (D5),
  in TypeScript strict mode, following repo coding standards.

## 6. Acceptance Criteria (Given / When / Then)

- **AC-1201 (Tools) — FR-1201**
  *Given* an MCP client, *when* it lists tools, *then* it sees the MCP-applicable
  Spec 09 capabilities (no `navigate_to_course`) with schemas from the model.
- **AC-1202 (Reuse) — FR-1202**
  *Given* a tool call, *when* executed, *then* it reaches the existing services via
  the adapter with no duplicated business logic and no direct data access.
- **AC-1203 (Validation) — FR-1203**
  *Given* input, *when* validated, *then* Zod schemas (reused, not re-mirrored)
  apply and the backend re-validates the WRITE.
- **AC-1204 (Approval/fail-closed) — FR-1204**
  *Given* `submit_enquiry`, *when* called, *then* human approval is required and,
  if unavailable, the write is refused; the server never self-approves.
- **AC-1205 (Errors/dupes) — FR-1205**
  *Given* invalid/duplicate/backend-error conditions, *when* they occur, *then*
  sanitised MCP errors surface and no duplicate record is created.
- **AC-1206 (Transport/lifecycle/logs) — FR-1206**
  *Given* the server, *when* run, *then* it connects over the configured transport,
  starts/stops cleanly, and logs PII-free audit records.
- **AC-1207 (Deps/structure) — FR-1207**
  *Given* the design, *when* reviewed, *then* the MCP SDK choice is pinned/justified
  and the server is a new TypeScript-strict `mcp-server/` workspace.
- **AC-1208 (No code) — §0**
  *Given* the completed spec, *when* the repo is inspected, *then* only the three
  `12-mcp-server` files are added; no application code changes.

## 7. Constraints

Spec 12 only; specification-only; no application code. Reuse existing services and
the Spec 09 contract; MCP set excludes browser-only navigation; no duplicated
logic; no direct DB/repository access; backend remains authoritative. Human
approval required for `submit_enquiry`, fail-closed. New deps pinned/justified;
new `mcp-server/` workspace. Synthetic data only; RP inspiration only. Do not
create Spec 16.
