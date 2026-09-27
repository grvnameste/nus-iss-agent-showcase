# Specification 09 — Agent Capability Model · Requirements

**Project:** EduAgent Connect — WebMCP-Ready Education Website Demonstrator
**Spec ID:** 09-agent-capability-model
**Title:** Agent Capability Discovery & Capability Model
**Status:** Draft for review (Phase 2 — Agent-Ready Transformation; SPECIFICATION PHASE)
**Builds on:** `.kiro/specs/08-website-analysis/` (analysis & inventory), all
Phase 1 specs (implemented)
**Related steering:** `.kiro/steering/product.md`, `architecture.md`,
`coding-standards.md`, `security.md`, `testing.md`, `design.md`

---

## 0. Phase note

Phase 2, design phase. This specification defines the **single, binding
capability contract** that **both** the WebMCP integration (Spec 11) and the MCP
server (Spec 12) implement. It ratifies the carried-over decisions **D1–D5** from
Spec 08.

> **Two interfaces, one contract.** WebMCP and MCP are two ways to *reach* the
> same capabilities. This spec owns *what* the capabilities are; Specs 11–12 own
> *how* each interface exposes them. Business logic stays in the backend services;
> capabilities describe and dispatch only.

**Spec 09 is specification-only. No application code is written here.** The three
files under `.kiro/specs/09-agent-capability-model/` are the only artefacts.

Phase 2 sequence: 08 Analysis → **09 Capability Model** → 10 Guardrails →
11 WebMCP → 12 MCP → 13 Agent Integration → 14 Demo UI → 15 Testing. **Do not
create Spec 16.**

## 1. Purpose

Turn the Spec 08 capability inventory into a precise, reviewed contract: for each
capability, its name, description, input schema, output schema, backend/service
mapping, permission classification, human-confirmation requirement, and error
behaviour. The contract reuses the existing WebMCP types
(`client/src/lib/webmcp/types.ts`) and the authoritative server domain schemas
(`server/src/domain/*`) — it introduces **no** new business logic.

## 2. Background (from Spec 08)

- Backend services are transport-agnostic and directly reusable:
  `courseService.search`, `courseService.getById`, `enquiryService.submit`.
- The WebMCP contract already exists (`CapabilityDefinition`, `CapabilityKind`,
  `CapabilityPermissions`, `CapabilityRegistry.invoke`) but ships empty.
- Comparison is client-only (no endpoint). Navigation is browser-only. Enquiry
  submission is the only WRITE.
- Domain Zod schemas are authoritative on the server; client copies are advisory.

## 3. Scope

### 3.1 In scope

- The **capability catalogue** (seven capabilities, §7) with full per-capability
  definitions.
- **Input/output schema definitions** expressed against existing domain schemas
  (reuse `enquiryInputSchema`, `courseSchema`, enum arrays) — described in the
  spec; not implemented as code here.
- **Ratification of D1–D5** (§8).
- **Capability naming, scopes, and `CapabilityKind` mapping.**
- A **capability-to-interface matrix** (which capabilities WebMCP/MCP expose).

### 3.2 Out of scope / Non-goals

- **No** application code, capability registration, WebMCP wiring, MCP server, or
  agent (Specs 11–15).
- **No** permission/consent mechanics beyond declaring `kind` and
  `requiresHumanConfirmation` — the enforcement model is Spec 10.
- **No** new backend endpoints or Course-model changes.
- **No** changes to the existing `client/src/lib/webmcp/` contract unless §8 (D3)
  explicitly proposes one for review.

## 4. Personas

| ID | Persona | Need |
| -- | ------- | ---- |
| P1 | WebMCP Implementer (Spec 11) | A contract to register capabilities against. |
| P2 | MCP Implementer (Spec 12) | Tool schemas + service mappings to expose. |
| P3 | Guardrail Author (Spec 10) | Per-capability kind + confirmation to enforce. |
| P4 | Agent/Demo builders (Specs 13–14) | Stable names and I/O shapes to orchestrate. |

## 5. Definitions

- **Capability:** a named, permissioned, schema-validated operation
  (`CapabilityDefinition<TInput, TOutput>`).
- **Kind:** `READ` | `NAVIGATION` | `WRITE` (existing `CapabilityKind`).
- **Scope:** coarse label `resource:operation` (e.g. `courses:read`,
  `enquiry:write`) per coding-standards naming.

## 6. Functional Requirements (EARS-style)

### 6.1 Catalogue completeness — FR-901

- **FR-901.1** The model **shall** define exactly these capabilities:
  `find_courses`, `get_course_details`, `compare_courses`, `navigate_to_course`,
  `prepare_enquiry`, `validate_enquiry`, `submit_enquiry`.
- **FR-901.2** Each capability **shall** specify: name, description, `kind`,
  `requiresHumanConfirmation`, `scopes`, input schema, output schema, backend/
  service mapping, and error behaviour.

### 6.2 Reuse & no duplication — FR-902

- **FR-902.1** Input/output schemas **shall** be defined by **reusing** the
  authoritative domain schemas where one exists (e.g. `submit_enquiry` and
  `validate_enquiry` reuse `enquiryInputSchema`; course outputs reuse the course
  shape).
- **FR-902.2** Capabilities **shall** map to existing services/endpoints and
  **shall not** restate business rules (search/sort/pagination/listability live in
  `courseService`; enquiry rules in `enquiryService`).
- **FR-902.3** `compare_courses` **shall** be defined as **composed** over
  `get_course_details`/`find_courses` results, with **no** new backend endpoint
  (ratifies D1).

### 6.3 Classification & confirmation — FR-903

- **FR-903.1** `find_courses`, `get_course_details`, `compare_courses`,
  `prepare_enquiry`, `validate_enquiry` **shall** be `READ` (no side effects).
- **FR-903.2** `navigate_to_course` **shall** be `NAVIGATION`.
- **FR-903.3** `submit_enquiry` **shall** be `WRITE` with
  `requiresHumanConfirmation: true`.
- **FR-903.4** No capability other than `submit_enquiry` **shall** be a WRITE.

### 6.4 Interface applicability — FR-904

- **FR-904.1** The model **shall** state, per capability, whether it is exposed by
  **WebMCP**, **MCP**, or **both**.
- **FR-904.2** `navigate_to_course` **shall** be **WebMCP-only** (ratifies D2); the
  MCP capability set is a subset of the WebMCP set.

### 6.5 Schema source & typing — FR-905

- **FR-905.1** The model **shall** specify the schema source strategy for MCP:
  reuse server-side Zod schemas or a shared package, never a third hand-mirrored
  copy (ratifies D4); the exact mechanism is confirmed with Spec 12.
- **FR-905.2** All schemas **shall** be Zod, strict-typed, with no `any`.

### 6.6 Error model — FR-906

- **FR-906.1** Input/output validation failures **shall** surface as
  `CapabilityValidationError` (`phase: 'input'|'output'`), consistent with the
  existing registry.
- **FR-906.2** A declined confirmation **shall** surface as
  `ConfirmationDeniedError`.
- **FR-906.3** Backend/domain failures (e.g. unavailable course) **shall** map to
  clear, sanitised capability errors that never leak internals (aligns
  `security.md`, the server error envelope).

### 6.7 Decision ratification — FR-907

- **FR-907.1** The model **shall** record the ratified resolution of **D1–D5**
  (§8), noting any that require a change to the existing WebMCP contract (only D3
  might) and presenting that change for review.

## 7. Capability catalogue (normative summary)

| Capability | Kind | Confirm | Scopes | Maps to | WebMCP | MCP |
| ---------- | ---- | :-----: | ------ | ------- | :----: | :-: |
| `find_courses` | READ | no | `courses:read` | `courseService.search` / `GET /api/courses` | ✅ | ✅ |
| `get_course_details` | READ | no | `courses:read` | `courseService.getById` / `GET /api/courses/:id` | ✅ | ✅ |
| `compare_courses` | READ | no | `courses:read` | composed over READs (no endpoint) | ✅ | ✅ |
| `navigate_to_course` | NAVIGATION | no | `navigation:course` | client routing | ✅ | ❌ |
| `prepare_enquiry` | READ | no | `enquiry:read` | draft shaping (no I/O) | ✅ | ✅ |
| `validate_enquiry` | READ | no | `enquiry:read` | reuse `enquiryInputSchema` | ✅ | ✅ |
| `submit_enquiry` | WRITE | **yes** | `enquiry:write` | `enquiryService.submit` / `POST /api/enquiries` | ✅ | ✅ |

Full per-capability schemas and error behaviour are defined in `design.md`.

## 8. D1–D5 ratification (this spec decides)

- **D1 — compare has no endpoint** → **Ratified:** `compare_courses` is composed;
  no new endpoint.
- **D2 — navigation browser-only** → **Ratified:** `navigate_to_course` is
  WebMCP-only; MCP set excludes it.
- **D3 — prepare/validate access levels** → **Ratified:** model both as `READ`;
  keep `submit_enquiry` the only WRITE. **No change to `CapabilityKind`.**
- **D4 — schema source** → **Ratified (direction):** reuse server Zod schemas / a
  shared package for MCP; final mechanism confirmed in Spec 12. No third copy.
- **D5 — repo structure** → **Ratified (advisory):** keep `client/src/lib/webmcp/`;
  add `client/src/agent/` and a new `mcp-server/` workspace in later specs.

## 9. Acceptance Criteria (Given / When / Then)

- **AC-901 (Catalogue) — FR-901**
  *Given* the model, *when* reviewed, *then* all seven capabilities are fully
  specified (name, description, kind, confirmation, scopes, I/O schemas, mapping,
  errors).
- **AC-902 (Reuse) — FR-902**
  *Given* each capability, *when* reviewed, *then* it maps to an existing service/
  endpoint (or is explicitly composed) and reuses domain schemas; no business rule
  is restated.
- **AC-903 (Classification) — FR-903**
  *Given* the catalogue, *when* reviewed, *then* kinds/confirmation match §7 and
  `submit_enquiry` is the only WRITE (confirmation required).
- **AC-904 (Interfaces) — FR-904**
  *Given* each capability, *when* reviewed, *then* WebMCP/MCP applicability is
  stated and navigation is WebMCP-only.
- **AC-905 (Decisions) — FR-907**
  *Given* the model, *when* reviewed, *then* D1–D5 are ratified with any WebMCP
  contract change (D3: none) presented explicitly.
- **AC-906 (No code) — §0**
  *Given* the completed spec, *when* the repo is inspected, *then* only the three
  `09-agent-capability-model` files are added; no application code changes.
- **AC-907 (Consistency) — all**
  *Given* the three files (and Spec 08), *when* compared, *then* capability names,
  kinds, and schemas are consistent.

## 10. Constraints

Spec 09 only; specification-only; no application code. Reuse existing WebMCP
contract and server domain schemas; no new endpoints; no Course-model changes.
`submit_enquiry` is the only WRITE and requires human confirmation. Synthetic data
only; RP is inspiration only. Do not create Spec 16.
