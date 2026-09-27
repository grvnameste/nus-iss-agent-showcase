# Specification 12 — MCP Server Integration · Design

**Project:** EduAgent Connect — WebMCP-Ready Education Website Demonstrator
**Spec ID:** 12-mcp-server
**Status:** Draft for review (Phase 2; SPECIFICATION PHASE)
**Traceability:** `./requirements.md`; capability model
`../09-agent-capability-model/`; guardrails `../10-agent-guardrails/`; services
`server/src/services/*`; domain schemas `server/src/domain/*`.

> Descriptive/advisory only. No code is written by this spec.

---

## 1. Design goals

- **DG1** Expose the MCP-applicable capabilities to external MCP clients without
  duplicating business logic or touching data directly.
- **DG2** Reuse the Spec 09 contract and the server-side Zod schemas.
- **DG3** Enforce Spec 10 guardrails — especially fail-closed human approval for
  `submit_enquiry`.

## 2. Architecture

```
MCP Client (Claude / IDE agent)
    │  MCP protocol (stdio, or network transport)
    ▼
mcp-server/  (NEW workspace)
    ├─ server.ts        # MCP server bootstrap + tool registration + lifecycle
    ├─ tools/           # one module per tool (schema + handler)
    ├─ adapters/        # capability adapter → existing services
    ├─ config/env.ts    # validated env (API base URL, transport, log level)
    └─ audit/           # PII-free structured logging
    │
    ▼  (reuse — no duplicated logic)
Existing business services  (server/src/services/*)
    ▼
Repository → synthetic data
```

## 3. Service-reuse mechanism (FR-1202, §7 decision)

Two viable options; **recommend Option A** for the demo, with B as the clean
long-term path:

- **Option A — HTTP to the existing REST API (recommended for the prototype).**
  The adapter calls the running Express API (`GET /api/courses`,
  `GET /api/courses/:id`, `POST /api/enquiries`). Pros: zero coupling, the REST
  boundary re-validates authoritatively, matches the WebMCP transport model, easy
  to deploy as a separate process. Cons: requires the API to be reachable.
- **Option B — import the transport-agnostic services directly.** Because
  `courseService`/`enquiryService` have no HTTP/Express coupling, the MCP server
  could import them (or a shared package). Pros: no network hop. Cons: couples the
  MCP workspace to server internals; needs a shared build/package boundary.

Either way **no business logic is duplicated**. Implementation records the final
choice; the design assumes A unless review prefers B.

## 4. Schema source (FR-1203, D4)

- Reuse the server-side domain Zod schemas (`enquiryInputSchema`, course shape) —
  via a small **shared schema package** or direct import — rather than a third
  mirrored copy. If Option A (HTTP) is used, MCP tool input is validated MCP-side
  with the reused schema **and** re-validated by the REST boundary.

## 5. Tool catalogue (FR-1201)

| MCP tool | Kind | Approval | Adapter target |
| -------- | ---- | :------: | -------------- |
| `find_courses` | READ | no | `GET /api/courses` → `courseService.search` |
| `get_course_details` | READ | no | `GET /api/courses/:id` → `courseService.getById` |
| `compare_courses` | READ | no | composed over the two READs (cap 4) |
| `prepare_enquiry` | READ | no | shape draft (may fetch course title) |
| `validate_enquiry` | READ | no | reuse `enquiryInputSchema` |
| `submit_enquiry` | WRITE | **yes** | `POST /api/enquiries` → `enquiryService.submit` |

`navigate_to_course` is **not** exposed (browser-only, D2).

## 6. Human approval (FR-1204, Spec 10)

- `submit_enquiry` requires explicit human approval before execution. MCP surfaces
  this via the client's approval/elicitation mechanism (the human confirms in
  their MCP client).
- **Fail-closed:** if approval cannot be obtained (client can't elicit, or the
  human declines), the tool returns a declined/aborted result and **submits
  nothing**. The server never self-approves. This mirrors the WebMCP
  `ConfirmationDeniedError` semantics.

## 7. Validation, errors & duplicates (FR-1203, FR-1205)

- Input validated with the reused Zod schema; failures → structured MCP tool error
  (sanitised).
- Unavailable course → not-found-style tool error (mirrors REST 404).
- Backend envelope errors mapped to safe messages; no internals.
- Duplicate protection (Spec 10): idempotency key or submitted-guard so a repeated
  `submit_enquiry` returns the prior reference and creates no second record.

## 8. Transport, config & lifecycle (FR-1206)

- **Transport:** stdio for local/compatible clients (the common case). A network
  transport, if added, respects an origin/allow-list consistent with
  `corsOrigins()`.
- **Config:** `mcp-server/config/env.ts` validates `API_BASE_URL` (Option A),
  transport mode, and `LOG_LEVEL` — same fail-fast pattern as the server.
- **Lifecycle:** clean startup (register tools, connect transport) and graceful
  shutdown (close transport, flush logs).

## 9. Logging & audit (FR-1206.3, Spec 10)

- Structured, PII-free audit per tool call: `{ tool, kind, outcome,
  approvalGranted?, at }`. No enquiry values, no message text. Reuse a `pino`-style
  logger.

## 10. Dependencies (FR-1207)

- Add the **MCP TypeScript SDK** pinned to an exact version. Two lines exist: the
  v1 `@modelcontextprotocol/sdk` and the newer v2 (`@modelcontextprotocol/server` /
  `@modelcontextprotocol/client`). The implementation spec-task selects and pins
  the exact package+version, justified against stability/spec-revision needs, per
  dependency-hygiene steering. Content verified against the MCP SDK docs at
  implementation time.

## 11. Testing approach (testing.md)

- Unit-test the capability adapter with a **fake transport** (Option A) or fake
  services (Option B): READs return shaped data; `submit_enquiry` requires approval
  and aborts fail-closed when declined; duplicate submit is prevented; errors are
  sanitised.
- Integration-test tool discovery + a READ round-trip against the running REST API
  (supertest-style / in-process) deterministically.
- Regression: the human website and existing server tests are unaffected. These
  are Spec 15 targets; Spec 12 specifies them.

## 12. Deployment & security (FR-1206, §7)

- Deploy as a separate process/service (aligns with the architecture's Vercel note
  that the server is a separate service). Secrets, if ever introduced, by env key
  name only; none required for the synthetic prototype.
- Backend remains the trust boundary; MCP is another client of it.

## 13. Constraints recap

Spec 12 only; specification-only; no code. Reuse services + Spec 09 contract +
server Zod schemas; MCP excludes navigation; no duplicated logic; no direct DB
access; backend authoritative; human approval for the WRITE (fail-closed); deps
pinned; new `mcp-server/` workspace. Synthetic data only; RP inspiration only. Do
not create Spec 16.
