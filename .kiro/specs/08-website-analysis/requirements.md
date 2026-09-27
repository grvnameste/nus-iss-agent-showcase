# Specification 08 — Existing Website Analysis & Agent-Readiness Assessment · Requirements

**Project:** EduAgent Connect — WebMCP-Ready Education Website Demonstrator
**Spec ID:** 08-website-analysis
**Title:** Existing Website Analysis & Agent-Readiness Assessment
**Status:** Draft for review (Phase 2 — Agent-Ready Transformation; SPECIFICATION PHASE)
**Builds on:** All Phase 1 specs (`01-foundation` … `07-section-pages`, implemented)
**Related steering:** `.kiro/steering/product.md`, `architecture.md`,
`coding-standards.md`, `security.md`, `testing.md`, `design.md`

---

## 0. Phase note

This is the **first specification of Phase 2 (Agent-Ready Transformation).** Its
guiding principle is:

> **Do not rebuild the website.** Analyse the completed Phase 1 application,
> inventory its capabilities, and prepare to expose selected capabilities to AI
> agents through **WebMCP** (browser) and **MCP** (server) — as two interfaces
> over the *same* business logic, never two copies of it.

**Spec 08 is specification-only. It produces analysis and design documents. It
MUST NOT modify, add, or delete any application code**, backend, frontend,
configuration, or dependency. The only artefacts it creates are the three files
under `.kiro/specs/08-website-analysis/`.

Phase 2 spec sequence (fixed): **08** Website Analysis → **09** Agent Capability
Model → **10** Agent Permissions & Guardrails → **11** WebMCP Integration →
**12** MCP Server Integration → **13** Agent Integration & Orchestration →
**14** Agent Demo UI → **15** Agent Testing & Release Readiness. **This is Spec
08. Do not create Spec 16.**

## 1. Purpose

Establish a precise, code-grounded understanding of the Phase 1 application so
that every later Phase 2 spec builds on facts rather than assumptions. The
deliverable is an **Agent-Readiness Assessment** and a **capability inventory**:
what the application can already do, which of those abilities are safe and useful
to expose to agents, and what gaps, dependencies, and security considerations must
be resolved before exposing them.

This spec does not decide the final agent capability contract (that is Spec 09)
and does not implement any integration (Specs 11–12). It produces the shared
factual baseline both depend on.

## 2. Background

Phase 1 delivered a complete, human-facing education website:

- A **Next.js** frontend (catalogue, details, comparison, enquiry, section/marketing
  pages, accessible shell).
- An **Express** REST API with clean layering (Routes → Controllers → Services →
  Repositories → synthetic Data).
- An **empty WebMCP capability scaffold** at `client/src/lib/webmcp/` (typed
  contract + registry + transport) that Phase 1 intentionally shipped unused.

All data is synthetic. There is no authentication, no database, and no external
integration. The application is the analysis subject; it is treated as **read-only**
throughout this spec.

## 3. Reference / Inspiration Boundary

Republic Polytechnic remains **inspiration only**. This analysis documents
EduAgent Connect's own synthetic application; it introduces no RP data, wording,
or integration, and no real institutional systems are contacted.

## 4. Problem Statement

Phase 2 cannot safely expose capabilities to agents without first answering, from
the actual code:

- What discrete capabilities does the application already implement, and where
  does each one's business logic live?
- Which capabilities are **READ** (safe), which are **NAVIGATION** (browser-only),
  and which are **WRITE** (side-effecting, requiring human confirmation)?
- How would an agent reach that logic without duplicating it?
- Which capabilities have no reusable backend seam (e.g. client-only comparison)?
- What architectural gaps, schema-duplication issues, and security constraints
  must be resolved before Spec 09 fixes the capability contract?

Until these are documented, WebMCP and MCP design would be guesswork.

## 5. Scope

### 5.1 In scope

- **Frontend analysis:** routes/pages, the shell, the human user journeys, the
  client data-access layer (`coursesApi`, `enquiriesApi`), the client-only
  comparison feature, and the existing (empty) WebMCP scaffold.
- **Backend analysis:** every route, controller, service, repository, domain
  model/schema, the shared error envelope, configuration, logging, and security
  middleware.
- **Capability inventory:** a table of candidate agent capabilities mapped to the
  concrete services/endpoints that implement them, each classified READ /
  NAVIGATION / WRITE and noting human-confirmation needs.
- **UI-action → backend-capability map:** how each human interaction traces to a
  service call, so agent exposure reuses the same path.
- **Gap & risk analysis:** architectural gaps, the open design decisions carried
  over from Phase 2 planning (**D1–D5**, §10), the steering **path drift**, schema
  duplication, and security considerations.
- **Agent-Readiness Assessment:** a written verdict per capability (ready as-is /
  ready with adaptation / not suitable) with rationale.

### 5.2 Out of scope / Non-goals

- **No application code changes** of any kind (frontend, backend, config, deps).
- **No** capability implementation, WebMCP registration, MCP server, agent, or
  demo UI (Specs 09–15).
- **No** finalisation of the capability contract, permission model, or tool
  schemas — those are proposed here for review and ratified/authored later.
- **No** new runtime dependencies and **no** changes to steering files (the path
  drift is *documented* here; correcting steering is a separate, explicit action).
- **No** real data, PII, or external integration.

## 6. Personas

| ID | Persona | Need in Spec 08 |
| -- | ------- | --------------- |
| P1 | Phase 2 Architect | A trustworthy, code-grounded baseline to design WebMCP/MCP against. |
| P2 | Capability Model Author (Spec 09) | A capability inventory + service mapping to turn into the contract. |
| P3 | Security Reviewer (Spec 10) | The write surface, trust boundary, and risks enumerated. |
| P4 | Implementer (Specs 11–12) | Exact files, seams, and schemas to reuse without duplication. |
| P5 | Demo Stakeholder | Confidence the agent journey is feasible over the existing app. |

## 7. Functional Requirements (EARS-style)

### 7.1 Application inventory — FR-801

- **FR-801.1** The assessment **shall** document every backend route with method,
  path, input validation schema, output shape, and the service it calls
  (`/api/health`, `/api/courses`, `/api/courses/:courseId`, `/api/enquiries`).
- **FR-801.2** The assessment **shall** document each backend **service** and its
  business rules, and confirm whether it is transport-agnostic (reusable without
  HTTP).
- **FR-801.3** The assessment **shall** document the **domain models/schemas**
  (`course`, `enquiry`) and note where client-side copies exist and how they relate
  (authoritative vs advisory).
- **FR-801.4** The assessment **shall** document the frontend routes/pages and the
  human user journeys they support.
- **FR-801.5** The assessment **shall** document the client data-access layer and
  explicitly note that it currently **bypasses** the WebMCP transport/registry.
- **FR-801.6** The assessment **shall** document the existing WebMCP scaffold and
  state precisely what exists versus what is empty/unwired.

### 7.2 Capability inventory & classification — FR-802

- **FR-802.1** The assessment **shall** produce a **capability inventory** listing
  candidate agent capabilities, each mapped to the concrete service/endpoint that
  implements it.
- **FR-802.2** Each candidate capability **shall** be classified as **READ**,
  **NAVIGATION**, or **WRITE**, using the existing `CapabilityKind` definitions.
- **FR-802.3** Each WRITE capability **shall** be flagged as **requiring explicit
  human confirmation** (at minimum, enquiry submission).
- **FR-802.4** The inventory **shall** indicate, per capability, whether it is
  expressible via **WebMCP**, **MCP**, or **both** (e.g. navigation is browser-only).
- **FR-802.5** The inventory **shall** identify capabilities that have **no
  reusable backend seam** today (e.g. client-only comparison) and note the options.

### 7.3 UI-action → backend-capability mapping — FR-803

- **FR-803.1** The assessment **shall** map each significant human UI action
  (search, filter, sort, paginate, view details, add/remove compare, view
  comparison, prepare enquiry, submit enquiry) to the underlying service call or
  client-only state operation.

### 7.4 Gap, risk & decision analysis — FR-804

- **FR-804.1** The assessment **shall** record the carried-over design decisions
  **D1–D5** (§10) with a recommended resolution for each, marked as a **proposal
  for Spec 09/10 to ratify** (not a binding decision).
- **FR-804.2** The assessment **shall** document the **steering path drift**
  (steering references `App/client`, `App/server`; real code is at repo-root
  `client/`, `server/`) and recommend correcting steering as a separate action.
- **FR-804.3** The assessment **shall** document **schema duplication** between
  client and server and the options for the MCP server's schema source (reuse
  server schema, shared package, or accept a mirrored copy).
- **FR-804.4** The assessment **shall** enumerate **security considerations** for
  agent exposure: the backend trust boundary, the single WRITE surface, human
  confirmation, input validation, error sanitisation, CORS/origin, duplicate-
  submission risk, and logging/auditing — aligned with `security.md`.
- **FR-804.5** The assessment **shall** note **testing implications** (how the
  transport seam and empty registry pipeline enable capability testing) aligned
  with `testing.md`.

### 7.5 Agent-Readiness Assessment — FR-805

- **FR-805.1** The assessment **shall** give a per-capability readiness verdict:
  **ready as-is**, **ready with adaptation** (describe the adaptation), or **not
  suitable** (describe why).
- **FR-805.2** The assessment **shall** state an overall readiness conclusion and
  the prerequisites the next specs must satisfy.

### 7.6 Feasibility of the demonstration journey — FR-806

- **FR-806.1** The assessment **shall** trace the target end-to-end demo journey
  (find → details → compare → navigate → prepare → validate → confirm → submit →
  reference) against the inventory and confirm each step is feasible over the
  existing application, flagging any step needing adaptation.

## 8. Non-Functional Requirements

- **NFR-801 (Accuracy)** Every claim references a concrete file/path/symbol in the
  repository; no assumptions presented as fact.
- **NFR-802 (Read-only)** The analysis process makes **no** modification to the
  application; verification confirms a clean working tree apart from the three spec
  files.
- **NFR-803 (Reuse-first)** Recommendations favour reusing the existing service
  layer and WebMCP scaffold over new logic or duplication.
- **NFR-804 (Traceability)** The inventory and gaps are structured so Spec 09/10
  can consume them directly (stable capability names, explicit mappings).
- **NFR-805 (Security alignment)** Findings and recommendations are consistent with
  `security.md` (backend is the trust boundary; agents never bypass validation).

## 9. Candidate Capability Inventory (for review)

The following is the **proposed** inventory this spec will document and justify in
`design.md`. Names are provisional and become binding only in Spec 09.

| Capability | Kind | Human confirm | Backend/seam mapping | WebMCP | MCP |
| ---------- | ---- | :-----------: | -------------------- | :----: | :-: |
| `find_courses` | READ | no | `courseService.search` / `GET /api/courses` | ✅ | ✅ |
| `get_course_details` | READ | no | `courseService.getById` / `GET /api/courses/:id` | ✅ | ✅ |
| `compare_courses` | READ | no | **composed** over the two READs (no endpoint) | ✅ | ✅ |
| `navigate_to_course` | NAVIGATION | no | client routing only (no backend) | ✅ | ❌ |
| `prepare_enquiry` | READ | no | shape a draft; **no** side effects | ✅ | ✅ |
| `validate_enquiry` | READ | no | reuse `enquiryInputSchema` (advisory) | ✅ | ✅ |
| `submit_enquiry` | WRITE | **yes** | `enquiryService.submit` / `POST /api/enquiries` | ✅ | ✅ |

## 10. Carried-over design decisions (D1–D5, proposals for review)

Recorded here as **proposals**; Spec 09/10 ratify them.

- **D1 — `compare_courses` has no backend endpoint.** Comparison is client-only.
  *Proposal:* expose it as a capability **composed** over `find_courses` /
  `get_course_details`; do **not** add a backend endpoint.
- **D2 — `navigate_to_course` is browser-only.** *Proposal:* WebMCP-only
  NAVIGATION capability; not exposed via MCP. WebMCP and MCP therefore expose
  **overlapping but not identical** capability sets.
- **D3 — "Prepare"/"Validate" access levels.** The `CapabilityKind` enum is only
  `READ | NAVIGATION | WRITE`. *Proposal:* model `prepare_enquiry` and
  `validate_enquiry` as **READ** (no side effects); keep `submit_enquiry` the only
  WRITE. Extend the enum only if Spec 09 review insists.
- **D4 — Schema duplication.** Course/Enquiry schemas are mirrored (server
  authoritative, client advisory); no shared package. *Proposal:* MCP server
  **reuses the server-side Zod schemas** (or a shared package) rather than adding a
  third copy; Spec 09/12 choose the exact mechanism.
- **D5 — Repository structure.** *Proposal:* keep the WebMCP layer at
  `client/src/lib/webmcp/`; add `client/src/agent/` for orchestration + demo UI;
  add `mcp-server/` as a new workspace. Confirm against the real tree (the
  planning doc's `features/`, `services/` folders do not exist today).

## 11. Acceptance Criteria (Given / When / Then)

- **AC-801 (Inventory complete) — FR-801, FR-802, FR-803**
  *Given* the assessment, *when* reviewed, *then* it lists every backend route,
  service, and domain model, a classified capability inventory, and a UI-action →
  capability map, each citing concrete files.
- **AC-802 (Classification correct) — FR-802**
  *Given* the inventory, *when* reviewed, *then* every capability is classified
  READ/NAVIGATION/WRITE, WRITE capabilities are flagged for human confirmation, and
  WebMCP/MCP applicability is stated per capability.
- **AC-803 (Gaps & decisions captured) — FR-804**
  *Given* the assessment, *when* reviewed, *then* D1–D5, the path drift, schema
  duplication, security considerations, and testing implications are all documented
  with recommendations.
- **AC-804 (Readiness verdict) — FR-805**
  *Given* the assessment, *when* reviewed, *then* each capability has a readiness
  verdict with rationale and there is an overall conclusion with prerequisites.
- **AC-805 (Demo feasibility) — FR-806**
  *Given* the target demo journey, *when* traced against the inventory, *then* each
  step is confirmed feasible or flagged with the required adaptation.
- **AC-806 (No code changed) — §0, NFR-802**
  *Given* the completed spec, *when* the repository is inspected, *then* only the
  three files under `.kiro/specs/08-website-analysis/` are added and **no
  application code, config, or dependency is modified**.
- **AC-807 (Internally consistent) — all**
  *Given* `requirements.md`, `design.md`, `tasks.md`, *when* compared, *then* the
  Spec ID, numbering, capability names, and D1–D5 are consistent across all three.

## 12. Explicit Implementation Constraints

- This is **Spec 08 — Website Analysis.** Specification-only. **No application code
  changes.** **Do not create Spec 16.**
- Phase 2, analysis phase; WebMCP/MCP/agent implementation is later and separate.
- All claims must be grounded in the actual repository.
- Recommendations favour reuse of the existing service layer and WebMCP scaffold.
- No new dependencies; no steering edits (path drift is documented, not fixed here).
- Republic Polytechnic remains inspiration only; synthetic data only.
