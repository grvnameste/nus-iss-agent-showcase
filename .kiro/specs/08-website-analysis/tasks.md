# Implementation Plan: Existing Website Analysis & Agent-Readiness Assessment

**Project:** EduAgent Connect — WebMCP-Ready Education Website Demonstrator
**Spec ID:** 08-website-analysis
**Owner:** Phase 2 Architect
**Traceability:** Tasks reference requirements in `./requirements.md` and sections
in `./design.md`.

## Overview

This is a **specification-only** plan. Its "implementation" is the production of
the analysis documents (`requirements.md`, `design.md`, and this `tasks.md`) plus
their internal-consistency review. **No task modifies, adds, or deletes any
application code, configuration, or dependency.** The deliverable is an
Agent-Readiness Assessment and a capability inventory that Specs 09–15 build on.

> **This is Spec 08 — Website Analysis. Do not create Spec 16.** WebMCP/MCP/agent
> implementation is later and separate (Specs 09–15).

The verification "gate" for every task is documentary: claims trace to real files;
the working tree shows **only** the three files under
`.kiro/specs/08-website-analysis/` added; no application code changed.

## Tasks

- [x] 1. Inspect the Phase 1 application (read-only)
  - Read the backend (`server/src/{app,routes,controllers,services,repositories,domain,http,config}`),
    the frontend (`client/src/app`, `client/src/components`, `client/src/lib/{courses,enquiries,webmcp}`,
    `client/src/components/comparison`), steering, and Specs 01–07.
  - **Objective:** ground every later claim in concrete files/symbols.
  - **Files:** read-only inspection.
  - **Test requirements:** none.
  - **Acceptance:** notes capture routes, services, domain schemas, client
    data-access, the WebMCP scaffold state, and the client-only comparison, each
    with file paths.
  - _Requirements: FR-801, NFR-801_

- [x] 2. Author `requirements.md`
  - Scope, goals, EARS-style FRs (inventory, classification, UI mapping, gaps/
    decisions, readiness, demo feasibility), NFRs, candidate inventory, D1–D5,
    acceptance criteria, constraints.
  - **Objective:** an agreed contract for the analysis deliverable.
  - **Files:** `.kiro/specs/08-website-analysis/requirements.md`.
  - **Test requirements:** none (documentation).
  - **Acceptance:** requirements are testable and consistent with steering.
  - _Requirements: all (spec authoring)_

- [x] 3. Author `design.md` — the analysis itself
  - Document current architecture, the REST surface, services/domain, frontend
    journeys, client data-access + WebMCP scaffold, client-only comparison, the
    UI-action → capability map, the capability inventory with readiness verdicts,
    gaps/risks (D1–D5, path drift, schema duplication, security, testing), the demo
    feasibility trace, and the advisory structure for later specs.
  - **Objective:** the code-grounded Agent-Readiness Assessment + inventory.
  - **Files:** `.kiro/specs/08-website-analysis/design.md`.
  - **Test requirements:** none (documentation).
  - **Acceptance:** every section of §7 (requirements) has a corresponding,
    file-referenced treatment; verdicts and demo trace are present.
  - _Requirements: FR-801–FR-806, NFR-801–NFR-805_

- [x] 4. Author `tasks.md` (this plan)
  - Record the specification-only task breakdown and the documentary verification
    gate.
  - **Files:** `.kiro/specs/08-website-analysis/tasks.md`.
  - **Test requirements:** none.
  - **Acceptance:** tasks reflect a no-code, analysis-only deliverable.
  - _Requirements: §0, §12_

- [x] 5. Internal-consistency review & no-code verification
  - Cross-check Spec ID, the Phase 2 numbering (08→15), capability names, and
    D1–D5 across all three files. Confirm via the repository that **only** the
    three `08-website-analysis` files were added and no application code, config,
    or dependency changed (e.g. `git status` shows a clean tree apart from the
    spec files).
  - **Objective:** a coherent, trustworthy, side-effect-free deliverable.
  - **Files:** the three spec files (review only).
  - **Test requirements:** none (no app tests apply to a spec-only change).
  - **Acceptance:** AC-806 and AC-807 satisfied.
  - _Requirements: AC-806, AC-807, NFR-802_

## Notes

- Tasks 2–4 are the document authoring; Task 5 is the consistency/no-code gate.
- Nothing here registers a capability, adds an endpoint, changes the Course/Enquiry
  model, or introduces WebMCP/MCP/agent code. Those begin at Spec 09.
- D1–D5 are recorded as **proposals for review**; Spec 09 (capability model) and
  Spec 10 (guardrails) ratify them.
- The steering path drift (`App/…` vs repo-root `client/`/`server/`) is
  **documented** here and corrected separately — not by this spec.
