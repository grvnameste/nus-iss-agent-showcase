# Specification 08 — Existing Website Analysis & Agent-Readiness Assessment · Design

**Project:** EduAgent Connect — WebMCP-Ready Education Website Demonstrator
**Spec ID:** 08-website-analysis
**Title:** Existing Website Analysis & Agent-Readiness Assessment
**Status:** Draft for review (Phase 2 — Agent-Ready Transformation; SPECIFICATION PHASE)
**Traceability:** Requirements in `./requirements.md`; steering in `.kiro/steering/*.md`.

> This document is the **analysis deliverable itself**. It is descriptive
> (what exists) and advisory (what to do next), grounded in concrete files. It
> changes **no** application code.

---

## 1. Method & sources

Findings below were gathered by reading the repository directly. Primary sources:

- Backend: `server/src/app.ts`, `server/src/routes/*`, `server/src/controllers/*`,
  `server/src/services/*`, `server/src/repositories/*`, `server/src/domain/*`,
  `server/src/http/*`, `server/src/config/env.ts`.
- Frontend: `client/src/app/*`, `client/src/components/*`,
  `client/src/lib/courses/*`, `client/src/lib/enquiries/*`,
  `client/src/lib/webmcp/*`, `client/src/components/comparison/*`.
- Steering: `.kiro/steering/*.md`. Specs: `.kiro/specs/01..07`.

> **Path note (see §9.2):** steering documents refer to `App/client` and
> `App/server`. The **actual** monorepo is at the repository root: `client/` and
> `server/` are npm workspaces declared in the root `package.json`. All paths in
> this document are the real ones.

## 2. Current architecture (as built)

```
Human User
   │
   ▼
Next.js frontend (client/)            ← pages, shell, client data-access
   │  coursesApi / enquiriesApi (fetch, direct)
   ▼
Express REST API (server/)            ← Routes → Controllers → Services →
   │                                     Repositories → synthetic Data
   ▼
In-memory synthetic data

Empty, unused: client/src/lib/webmcp/ (typed capability scaffold)
```

- **Layering is clean and enforced.** Route handlers are thin; **all business
  logic lives in services**, which are **transport-agnostic** (no Express/React/
  HTTP types leak in). This is the single most important finding for Phase 2:
  agents can reuse services without duplicating logic.
- **Synthetic, stateless.** In-memory repositories; no DB, no auth, no external
  integration. Server restart resets state.

## 3. Backend REST surface (FR-801.1)

| Method | Path | Input validation | Calls | Output (success) |
| ------ | ---- | ---------------- | ----- | ---------------- |
| GET | `/api/health` | none | — | `{ status:'ok', service, version, uptimeSeconds, timestamp }` (200) |
| GET | `/api/courses` | `courseListQuerySchema` (`controllers/course-query.schema.ts`) | `courseController.list` → `courseService.search` | `{ data: Course[], pagination: {page,pageSize,totalItems,totalPages} }` (200) |
| GET | `/api/courses/:courseId` | `courseParamsSchema` | `courseController.getById` → `courseService.getById` | `{ data: Course }` (200) or 404 `NOT_FOUND` |
| POST | `/api/enquiries` | `enquiryInputSchema` (`domain/enquiry.ts`) | `enquiryController.create` → `enquiryService.submit` | `{ data: { reference, courseId, courseTitle, status:'received', createdAt } }` (201) |

Composition: `server/src/app.ts` — `helmet()` → `cors({ origin: corsOrigins() })`
→ `pinoHttp` → `express.json({ limit:'64kb' })` → routes → `notFoundHandler` →
`errorHandler`.

**Shared error envelope** (`http/api-error.ts`, `http/error-handler.ts`):
`{ error: { code: 'VALIDATION_ERROR'|'NOT_FOUND'|'INTERNAL', message, details? } }`.
`details` carries Zod issues (`path`, `message`). Unexpected errors → sanitised 500.

## 4. Backend services & domain (FR-801.2, FR-801.3)

### 4.1 CourseService (`services/course-service.ts`)

- `search(query): CourseListResult` — deterministic pipeline: **listability**
  (`status==='published'`) → **keyword** (lowercased substring over title/desc/
  discipline/category/skills/tags) → **filters** (AND across fields, OR within a
  field) → **sort** (weighted relevance; or title/duration/fee/startDate) →
  **paginate** (`pageSize` 1..48, default 12; page 1-based).
- `getById(id): Course | null` — applies the same listability rule (non-listable
  reads back as `null`).
- Transport-agnostic; depends only on `CourseRepository`.

### 4.2 EnquiryService (`services/enquiry-service.ts`)

- `submit(input): CreateEnquiryResult` — **verify course** via
  `courseService.getById` (reuses listability; throws `CourseUnavailableError` if
  absent/unlisted) → **build record** with injected `EnquiryClock` +
  `SequentialEnquiryIdGenerator` (reference `ENQ-<year>-<6-digit>`) → **persist** →
  **return** `{ reference, courseId, courseTitle, status:'received', createdAt }`.
- **PII is never echoed back** (name/email/phone/message stay in storage).
- Dependency-injected (repository, courseService, idGenerator, clock) → fully unit-
  testable without a server.

### 4.3 Domain models (authoritative Zod)

- `domain/course.ts` — `courseSchema`, `Course`, enum `const` arrays
  (`DISCIPLINES`, `COURSE_TYPES`, `DELIVERY_MODES`, `COURSE_LEVELS`,
  `COURSE_STATUSES`, `COURSE_AVAILABILITIES`), `parseCourse`.
- `domain/enquiry.ts` — `enquiryInputSchema` (name 1..100; email valid ≤254,
  lowercased; phone? ≤32 loose intl, blank→undefined; courseId 1..200;
  enquiryType enum; message 10..2000; trimmed, unknown keys stripped),
  `EnquiryInput`, `Enquiry`, `ENQUIRY_TYPES`, `ENQUIRY_STATUSES`, length constants.

These schemas are the **trust boundary** and are directly reusable by capability
input/output validation (Spec 09/12).

## 5. Frontend & human journeys (FR-801.4)

- Routes: `/`, `/education`, `/admissions`, `/industry`, `/about`,
  `/lifelong-learning`, `/lifelong-learning/courses` (catalogue),
  `/lifelong-learning/courses/:courseId` (details),
  `/lifelong-learning/courses/:courseId/enquire` (enquiry),
  `/lifelong-learning/courses/compare` (comparison).
- Shell: header/nav, `<main>` landmark, footer, skip link, `RouteFocus`
  (`client/src/app/layout.tsx`).
- **Human journey (product.md):** learner request → discovery → details →
  comparison → prepare enquiry → validate → **explicit confirm** → submit →
  status. This is precisely the journey Phase 2 mirrors for agents.

## 6. Client data-access & the WebMCP scaffold (FR-801.5, FR-801.6)

- **API base URL:** `resolveApiBaseUrl()` in `client/src/lib/webmcp/adapter.ts`
  (`NEXT_PUBLIC_API_BASE_URL` → fallback `http://localhost:4000`).
- **`coursesApi`** (`lib/courses/api.ts`): `list(params, signal)`,
  `getById(id, signal)` — thin `fetch`, `CourseApiError`.
- **`enquiriesApi`** (`lib/enquiries/api.ts`): `submit(input, signal)` — thin
  `fetch` POST; parses the error envelope into per-field `fieldErrors`.
- **Key finding:** both clients import only `resolveApiBaseUrl` from the WebMCP
  barrel and otherwise **call `fetch` directly — they bypass `CapabilityTransport`
  and `capabilityRegistry` entirely.** The only consumer of the transport is
  `components/BackendHealth.tsx` (health read).
- **WebMCP scaffold** (`lib/webmcp/`): fully typed and functional but **empty at
  runtime**:
  - `types.ts` — `CapabilityKind` (READ/NAVIGATION/WRITE), `CapabilityPermissions`
    (`kind`, `requiresHumanConfirmation`, `scopes`), `CapabilityDefinition`
    (name/description/permissions/inputSchema/outputSchema/execute),
    `CapabilityContext`, `CapabilityTransport` (`read`/`write`),
    `ConfirmationRequest`/`ConfirmationRequester`, `ConfirmationDeniedError`,
    `CapabilityValidationError`.
  - `registry.ts` — `CapabilityRegistry` (`register`/`list`/`get`/`invoke`);
    `invoke` runs **validate input → confirm (if required) → execute → validate
    output**; singleton `capabilityRegistry` ships empty.
  - `adapter.ts` — `createBrowserTransport({ baseUrl })` (fetch), `resolveApiBaseUrl`.
- **Confirmation:** there is **no** `ConfirmationRequester` implementation wired to
  the registry. Today the enquiry form's own UX is the human-in-the-loop.

## 7. Client-only comparison (FR-802.5)

`components/comparison/comparison-context.tsx`: React context, `MAX_COMPARISON_COURSES=4`,
mirrored to `sessionStorage` (`eduagent.comparison`), validated with the shared
client `COURSE_SCHEMA`. **No backend endpoint, no server logic.** Selected
`Course` objects are captured at add-time. → Comparison is a **client-composed**
capability (D1).

## 8. UI-action → backend-capability map (FR-803)

| Human UI action | Underlying operation | Reusable seam for agents |
| --------------- | -------------------- | ------------------------ |
| Search / keyword | `coursesApi.list` → `GET /api/courses` → `courseService.search` | ✅ service/endpoint |
| Filter / sort / paginate | same (query params) | ✅ service/endpoint |
| View course details | `coursesApi.getById` → `GET /api/courses/:id` → `courseService.getById` | ✅ service/endpoint |
| Add / remove compare | `useComparison().add/remove` (client state) | ⚠ client-only |
| View comparison | comparison context renders captured `Course[]` | ⚠ client-only (compose) |
| Prepare enquiry | enquiry form state (client) | ✅ shapeable (no I/O) |
| Validate enquiry | client `validation.ts` (advisory) + server `enquiryInputSchema` | ✅ reuse schema |
| Submit enquiry | `enquiriesApi.submit` → `POST /api/enquiries` → `enquiryService.submit` | ✅ service/endpoint (WRITE) |

## 9. Gaps, risks & decisions (FR-804)

### 9.1 Carried-over decisions D1–D5 (proposals; Spec 09/10 ratify)

- **D1 — compare has no endpoint.** Compose `compare_courses` over the two READs;
  no new endpoint.
- **D2 — navigation is browser-only.** `navigate_to_course` is WebMCP-only; MCP set
  is a subset of the WebMCP set.
- **D3 — prepare/validate access levels.** Model as **READ** (no side effects);
  `submit_enquiry` stays the only WRITE. Extend `CapabilityKind` only if review
  insists.
- **D4 — schema duplication.** Reuse server Zod schemas (or a shared package) for
  the MCP server; avoid a third copy. Mechanism chosen in Spec 09/12.
- **D5 — repo structure.** Keep `client/src/lib/webmcp/`; add `client/src/agent/`
  (orchestration + demo UI) and a new `mcp-server/` workspace. The planning doc's
  `client/src/features` and `client/src/services` folders **do not exist** today
  (actual layout is `components/`, `lib/`).

### 9.2 Steering path drift (FR-804.2)

Steering says `App/client` / `App/server`; the real tree is repo-root `client/` /
`server/`. **Recommendation:** correct the steering paths as a separate, explicit
change (not part of this analysis-only spec) so Specs 09–15 don't inherit wrong
paths.

### 9.3 Schema source for MCP (FR-804.3)

Server domain schemas are authoritative; client copies are advisory mirrors; there
is no shared package. Options for MCP: (a) MCP server imports server-side schemas
directly; (b) extract a shared `schemas` package consumed by server + MCP (+
optionally client); (c) accept a mirrored copy (least preferred). Recommend (a) or
(b).

### 9.4 Security considerations (FR-804.4, aligned with security.md)

- **Backend is the trust boundary.** Every WRITE is re-validated by
  `enquiryInputSchema` server-side regardless of any client/agent validation —
  agents must not be trusted to enforce rules.
- **Single WRITE surface:** only `submit_enquiry` mutates state → the primary
  guardrail focus. It **must require explicit human confirmation** (registry
  `requiresHumanConfirmation`, enforced before `execute`).
- **No speculative writes:** agents may call READs freely; never a WRITE without a
  confirmed human decision.
- **Error sanitisation:** the shared envelope already hides internals; capability
  errors should preserve that.
- **CORS/origin:** `corsOrigins()` allow-list; MCP transport/origin config is new
  surface to design in Spec 12.
- **Duplicate submission:** no idempotency key today; Spec 10 should address
  duplicate-enquiry protection for agent flows.
- **PII:** synthetic only; enquiry PII is never echoed back and must not be logged
  by agent layers.

### 9.5 Testing implications (FR-804.5, aligned with testing.md)

The empty `capabilityRegistry.invoke` pipeline is already the unit under test;
capabilities just need registering + a **fake `CapabilityTransport`** (the
sanctioned seam) — no global `fetch` mocking. Server endpoints continue to be
covered by supertest. This makes capability tests deterministic and network-free.

## 10. Capability inventory & readiness verdicts (FR-802, FR-805)

| Capability | Kind | Confirm | Seam | WebMCP | MCP | Readiness verdict |
| ---------- | ---- | :-----: | ---- | :----: | :-: | ----------------- |
| `find_courses` | READ | no | `courseService.search` | ✅ | ✅ | **Ready as-is** |
| `get_course_details` | READ | no | `courseService.getById` | ✅ | ✅ | **Ready as-is** |
| `compare_courses` | READ | no | composed over two READs | ✅ | ✅ | **Ready with adaptation** (compose; no endpoint) |
| `navigate_to_course` | NAVIGATION | no | client routing | ✅ | ❌ | **Ready with adaptation** (WebMCP-only) |
| `prepare_enquiry` | READ | no | draft shaping (no I/O) | ✅ | ✅ | **Ready with adaptation** (define draft schema) |
| `validate_enquiry` | READ | no | reuse `enquiryInputSchema` | ✅ | ✅ | **Ready as-is** (reuse schema) |
| `submit_enquiry` | WRITE | **yes** | `enquiryService.submit` | ✅ | ✅ | **Ready with adaptation** (wire confirmation) |

**Overall conclusion (FR-805.2):** The application is **well-positioned** for
agent exposure. Its transport-agnostic services and the pre-built WebMCP contract
mean Phase 2 is largely *registration + wiring*, not new business logic.
Prerequisites for the next specs:
1. Ratify D1–D5 (Spec 09/10).
2. Author the binding capability contract with input/output Zod schemas (Spec 09).
3. Design the permission/consent/guardrail model, incl. confirmation + duplicate
   protection (Spec 10).
4. Choose the MCP schema-source mechanism (Spec 09/12).
5. Correct the steering path drift (separate change).

## 11. Feasibility of the demonstration journey (FR-806)

> "Find three cloud-computing courses, compare them, and help me submit an enquiry
> for the one that matches my interests."

| Step | Capability | Feasible over existing app? |
| ---- | ---------- | --------------------------- |
| 1 Search | `find_courses` | ✅ `courseService.search` |
| 2 Details | `get_course_details` | ✅ `courseService.getById` |
| 3 Compare | `compare_courses` | ✅ composed (D1) |
| 4 Navigate | `navigate_to_course` | ✅ WebMCP navigation (D2; browser only) |
| 5 Prepare | `prepare_enquiry` | ✅ draft shaping |
| 6 Validate | `validate_enquiry` | ✅ reuse `enquiryInputSchema` |
| 7 Confirm | human approval | ✅ registry `requiresHumanConfirmation` (wire UI) |
| 8 Submit | `submit_enquiry` | ✅ `enquiryService.submit` (WRITE) |
| 9 Reference | submission result | ✅ returns `reference` |

**Verdict:** the full journey is feasible with the adaptations noted (compose
comparison, wire a confirmation requester, define the enquiry draft schema). No
Phase 1 business logic needs rewriting.

## 12. Proposed structure for later specs (advisory; D5)

```
client/src/lib/webmcp/     # existing capability contract + registry (reuse)
client/src/agent/          # NEW (Spec 11/13/14): WebMCP wiring, orchestration, demo UI
server/                    # unchanged Phase 1 REST + services (reused by MCP)
mcp-server/                # NEW (Spec 12): MCP server — tools/, adapters/
docs/{architecture,capability-model,security}/  # optional Phase 2 docs
.kiro/specs/08..15-*/
```

Spec 09 confirms this against the tree before anything is created.

## 13. Constraints recap

Spec 08 only; specification-only; **no application code changes**; do not create
Spec 16. Findings grounded in real files. Reuse the service layer and WebMCP
scaffold. No new dependencies; no steering edits here (drift documented).
Republic Polytechnic remains inspiration only; synthetic data only.
