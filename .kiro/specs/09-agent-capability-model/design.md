# Specification 09 — Agent Capability Model · Design

**Project:** EduAgent Connect — WebMCP-Ready Education Website Demonstrator
**Spec ID:** 09-agent-capability-model
**Status:** Draft for review (Phase 2; SPECIFICATION PHASE)
**Traceability:** Requirements in `./requirements.md`; analysis in
`../08-website-analysis/design.md`; contract types in
`client/src/lib/webmcp/types.ts`; domain schemas in `server/src/domain/*`.

> Descriptive/advisory only. No code is written by this spec. Schema snippets are
> **illustrative contract definitions** for Specs 11–12 to implement.

---

## 1. Design goals

- **DG1** One capability contract, two interfaces (WebMCP + MCP) — no duplicated
  business logic.
- **DG2** Reuse the existing `CapabilityDefinition` shape and the authoritative
  server Zod schemas; capabilities describe + dispatch only.
- **DG3** Make classification (READ/NAVIGATION/WRITE) and human confirmation
  explicit and enforceable by the existing `CapabilityRegistry.invoke` pipeline.

## 2. Contract shape (reused, not redefined)

Each capability is a `CapabilityDefinition<TInput, TOutput>` from
`client/src/lib/webmcp/types.ts`:

```
{ name, description, permissions: { kind, requiresHumanConfirmation, scopes },
  inputSchema: ZodType<TInput>, outputSchema: ZodType<TOutput>,
  execute(input, ctx): Promise<TOutput> }
```

`execute` delegates to `ctx.transport` (READ→`transport.read`, WRITE→
`transport.write`) or, for composed/navigation capabilities, to a supplied
client-side collaborator. **No business rules live in `execute`.**

## 3. Shared schema strategy (D4)

- **Course output** reuses the course shape (`server/src/domain/course.ts`
  `courseSchema`; the client mirror `COURSE_SCHEMA` is structurally compatible).
- **Enquiry input** reuses `enquiryInputSchema` (`server/src/domain/enquiry.ts`)
  verbatim for `validate_enquiry` and `submit_enquiry`.
- **MCP server** (Spec 12) obtains schemas by reusing the server-side Zod
  definitions or a shared package — never a third mirrored copy. Spec 12 selects
  import-vs-package; this spec fixes the *direction* (reuse).

## 4. Per-capability definitions

Notation: schemas are illustrative Zod; `Course` = the shared course shape.

### 4.1 `find_courses` (READ, `courses:read`)
- **Description:** Search/filter/sort/paginate the published catalogue.
- **Input:** `{ keyword?: string(≤200); discipline?/category?/courseType?/level?/
  deliveryMode?/availability?: string[]; sort?: 'relevance'|'title'|'duration'|
  'fee'|'startDate'; direction?: 'asc'|'desc'; page?: int≥1; pageSize?: int 1..48 }`
  (mirrors `courseListQuerySchema`).
- **Output:** `{ data: Course[]; pagination: { page, pageSize, totalItems,
  totalPages } }`.
- **Maps to:** `GET /api/courses` → `courseService.search`.
- **Errors:** input → `CapabilityValidationError('input')`.

### 4.2 `get_course_details` (READ, `courses:read`)
- **Input:** `{ courseId: string(1..200) }`.
- **Output:** `{ data: Course }`.
- **Maps to:** `GET /api/courses/:courseId` → `courseService.getById`.
- **Errors:** unknown/unlisted course → sanitised not-found capability error
  (mirrors the API 404).

### 4.3 `compare_courses` (READ, `courses:read`) — composed (D1)
- **Input:** `{ courseIds: string[] (2..4, unique) }`.
- **Output:** `{ courses: Course[]; fields: ComparableField[] }` where the compare
  set mirrors the existing comparison view columns (fee, duration, delivery,
  intake, availability, …).
- **Maps to:** **composed** — fetches each id via `get_course_details`
  (or one `find_courses` call), then shapes a comparison result **client-side**.
  No backend endpoint (matches Phase 1 client-only comparison; cap 4 =
  `MAX_COMPARISON_COURSES`).
- **Errors:** <2 or >4 ids, duplicates, or an unavailable id → validation/not-found.

### 4.4 `navigate_to_course` (NAVIGATION, `navigation:course`) — WebMCP-only (D2)
- **Input:** `{ courseId: string }`.
- **Output:** `{ href: string }` (the course details route) and a side effect of
  navigating in the browser.
- **Maps to:** client routing to
  `/lifelong-learning/courses/:courseId` (existing route constant). No backend.
- **MCP:** **not exposed** (headless clients have no browser location).

### 4.5 `prepare_enquiry` (READ, `enquiry:read`)
- **Purpose:** assemble a **draft** enquiry for review; **no side effects**.
- **Input:** `{ courseId: string; name?; email?; phone?; enquiryType?; message? }`
  (partial; whatever the agent has gathered).
- **Output:** `{ draft: EnquiryDraft; missingFields: string[] }` — the shaped
  draft plus which required fields remain, so the agent/human can complete it.
- **Maps to:** pure shaping; may call `get_course_details` to attach `courseTitle`
  for the review summary. No write.

### 4.6 `validate_enquiry` (READ, `enquiry:read`)
- **Input:** a candidate enquiry `{ name, email, phone?, courseId, enquiryType,
  message }`.
- **Output:** `{ valid: boolean; fieldErrors?: Record<string,string> }`.
- **Maps to:** **reuses `enquiryInputSchema`** (advisory pre-check). The server
  still re-validates authoritatively on submit — this never replaces that.
- **Errors:** returns structured `fieldErrors` rather than throwing, so the agent
  can guide correction.

### 4.7 `submit_enquiry` (WRITE, `enquiry:write`, **confirmation required**)
- **Input:** `enquiryInputSchema` (name, email, phone?, courseId, enquiryType,
  message).
- **Output:** `{ reference, courseId, courseTitle, status:'received', createdAt }`
  (exactly the server result; **no PII echoed**).
- **Maps to:** `POST /api/enquiries` → `enquiryService.submit`.
- **Confirmation:** `requiresHumanConfirmation: true`; the registry calls
  `ctx.confirm(...)` **before** `execute`; a decline throws
  `ConfirmationDeniedError` and **nothing is submitted**.
- **Errors:** unavailable course → sanitised not-found; validation →
  `CapabilityValidationError`; server envelope errors mapped to safe messages.

## 5. Capability → interface matrix (FR-904)

| Capability | WebMCP | MCP | Rationale |
| ---------- | :----: | :-: | --------- |
| `find_courses` | ✅ | ✅ | pure READ over service |
| `get_course_details` | ✅ | ✅ | pure READ over service |
| `compare_courses` | ✅ | ✅ | composed over READs |
| `navigate_to_course` | ✅ | ❌ | browser-only (D2) |
| `prepare_enquiry` | ✅ | ✅ | pure shaping |
| `validate_enquiry` | ✅ | ✅ | schema pre-check |
| `submit_enquiry` | ✅ | ✅ | WRITE + confirmation |

## 6. Execution pipeline (unchanged; reused)

`CapabilityRegistry.invoke(name, input, ctx)`:
`validate input (Zod)` → `if requiresHumanConfirmation: ctx.confirm() else abort`
→ `execute` (transport/collaborator) → `validate output (Zod)` → return. Spec 10
layers the consent/guardrail policy on top of this; Specs 11–12 supply the
`ctx.transport` and `ctx.confirm` implementations.

## 7. Naming & scopes

- Capabilities: `domain.action`-style but using the plan's agreed identifiers
  (`find_courses`, …) as the stable public names; `scopes` follow
  `resource:operation` (`courses:read`, `enquiry:read`, `enquiry:write`,
  `navigation:course`) per coding-standards.

## 8. D1–D5 ratification (design view)

- **D1** composed compare — no endpoint. **D2** navigation WebMCP-only.
- **D3** prepare/validate are READ; `CapabilityKind` **unchanged** (no code impact).
- **D4** reuse server schemas / shared package for MCP. **D5** structure advisory
  (webmcp stays; add `client/src/agent/` and `mcp-server/` later).

## 9. Constraints recap

Spec 09 only; specification-only; no code. Reuse the WebMCP contract and server
domain schemas; no new endpoints; no Course-model changes; `submit_enquiry` is the
only WRITE (confirmation required); MCP excludes navigation. Synthetic data only;
RP inspiration only. Do not create Spec 16.
