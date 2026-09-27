# Implementation Plan: Agent Capability Model

**Project:** EduAgent Connect — WebMCP-Ready Education Website Demonstrator
**Spec ID:** 09-agent-capability-model
**Owner:** Phase 2 Architect
**Traceability:** Tasks reference `./requirements.md` and `./design.md`.

## Overview

**Specification-only.** This plan produces the binding capability contract
documents. **No task writes, modifies, or deletes application code.** The contract
is implemented later by Spec 11 (WebMCP) and Spec 12 (MCP).

> **This is Spec 09. Do not create Spec 16.**

## Tasks

- [x] 1. Confirm inventory & schema sources against the code
  - Re-check the Spec 08 inventory and the real domain schemas
    (`server/src/domain/{course,enquiry}.ts`, `controllers/course-query.schema.ts`)
    and the WebMCP contract (`client/src/lib/webmcp/types.ts`).
  - **Files:** read-only.
  - **Acceptance:** each capability has a confirmed service/endpoint mapping and a
    reusable schema source. _Requirements: FR-902, FR-905_

- [x] 2. Author `requirements.md`
  - Catalogue, classification, interface applicability, schema strategy, error
    model, D1–D5 ratification, acceptance criteria.
  - **Files:** `.kiro/specs/09-agent-capability-model/requirements.md`.
  - **Acceptance:** all seven capabilities specified; D1–D5 ratified.
    _Requirements: FR-901–FR-907_

- [x] 3. Author `design.md`
  - Per-capability definitions (input/output schema, mapping, errors), the
    interface matrix, the reused execution pipeline, naming/scopes.
  - **Files:** `.kiro/specs/09-agent-capability-model/design.md`.
  - **Acceptance:** every capability fully defined and reuse-first.
    _Requirements: FR-901–FR-906_

- [x] 4. Author `tasks.md` (this plan)
  - **Files:** `.kiro/specs/09-agent-capability-model/tasks.md`.
  - **Acceptance:** reflects a no-code, contract-only deliverable. _Requirements: §0_

- [x] 5. Consistency review & no-code verification
  - Cross-check capability names/kinds/schemas against Spec 08 and within the
    three files; confirm the repo shows only the three `09-…` files added and no
    application code changed.
  - **Acceptance:** AC-906, AC-907 satisfied. _Requirements: AC-906, AC-907_

- [x] 6. Implement the capability catalogue (code) — branch `Webmcp-development`
  - Build the seven capabilities as typed `CapabilityDefinition`s against the
    existing WebMCP contract, reusing the client `COURSE_SCHEMA` and enquiry
    constants (no third schema copy); add a registration helper and the
    MCP-applicable subset (excludes `navigate_to_course`, D2).
  - **Files:** `client/src/agent/capabilities/{schemas,definitions,register,index}.ts`
    and co-located `capabilities.test.ts`.
  - **Reuse:** READs/WRITE dispatch via `ctx.transport`; `compare_courses` composes
    over `get_course_details`; `navigate_to_course` uses an injected collaborator;
    `prepare_enquiry`/`validate_enquiry` are pure/advisory. No business logic or
    endpoints added; server untouched.
  - **Verification:** `npm run typecheck` clean; `npm run lint --workspace client`
    clean; full client suite green (273 tests, incl. 14 new); no `server/` or
    course/enquiry model changes.
  - **Acceptance:** capabilities register with correct kinds; `submit_enquiry`
    requires confirmation (decline → `ConfirmationDeniedError`, no write);
    input/output validation → `CapabilityValidationError`; `compare_courses`
    composes; MCP subset excludes navigation. _Requirements: FR-901–FR-906_

## Notes

- The contract reuses existing WebMCP types and server domain schemas; it invents
  no business logic and adds no endpoint.
- `submit_enquiry` is the only WRITE and requires human confirmation.
- Enforcement mechanics (consent, duplicate protection, audit) are Spec 10;
  interface wiring is Specs 11–12.
