# Implementation Plan: Agent Demo UI & Interaction Experience

**Project:** EduAgent Connect — WebMCP-Ready Education Website Demonstrator
**Spec ID:** 14-agent-demo
**Owner:** Frontend / Phase 2
**Traceability:** `./requirements.md`, `./design.md`.

## Overview

**Specification-only.** Designs the browser demo UI over the WebMCP layer and
orchestration. **No task writes, modifies, or deletes application code.**

> **This is Spec 14. Do not create Spec 16.**

## Tasks

- [x] 1. Confirm reusable pieces & mount strategy
  - Re-read Spec 11 (status signal, confirmation dialog), Spec 13 (orchestrator +
    scripted planner), and the design system (`design.md`). Decide toggle vs route
    mount.
  - **Files:** read-only.
  - **Acceptance:** reusable status/confirmation/orchestration surfaces and mount
    approach confirmed. _Requirements: FR-1401, FR-1403, FR-1405_

- [x] 2. Author `requirements.md`
  - Panel/coexistence, request/transcript, tool status, I/O inspection + PII,
    human approval, confirmation/errors, design/a11y, acceptance criteria.
  - **Files:** `.kiro/specs/14-agent-demo/requirements.md`.
  - **Acceptance:** FR-1401–FR-1407 stated and testable. _Requirements: all_

- [x] 3. Author `design.md`
  - Placement/mount, panel layout, transcript + tool-call cards, approval dialog,
    result/error states, PII handling, a11y, coexistence, testing.
  - **Files:** `.kiro/specs/14-agent-demo/design.md`.
  - **Acceptance:** each FR has a design treatment; reuse-first. _Requirements: FR-1401–FR-1407_

- [x] 4. Author `tasks.md` (this plan)
  - **Files:** `.kiro/specs/14-agent-demo/tasks.md`.
  - **Acceptance:** no-code, design-only deliverable. _Requirements: §0_

- [x] 5. Consistency review & no-code verification
  - Cross-check against Specs 09–13 (capability kinds, confirmation, journey);
    confirm the repo shows only the three `14-…` files added and no application
    code changed.
  - **Acceptance:** AC-1408 satisfied. _Requirements: AC-1401–AC-1408_

- [x] 6. Implement the demo UI (code) — branch `phase2-integration`
  - Build `client/src/agent/demo/` (`AgentPanel`, `Transcript`, `ToolCallCard`) and
    the additive `client/src/app/agent-demo/` route. The panel runs the Spec 13
    orchestration over the real WebMCP client (Spec 11) + guardrails (Spec 10) and
    hosts the Spec 11 confirmation dialog for the WRITE.
  - **Files:** `client/src/agent/demo/**` (+ README, co-located tests);
    `client/src/app/agent-demo/page.tsx`.
  - **Verification:** `typecheck` + `lint` clean; full client suite green (42 files
    / 281 tests, incl. 11 new demo tests); only the demo module + route added — no
    `server/`, `mcp-server/`, domain, or existing-page changes (human site
    unchanged).
  - **Acceptance:** transparent transcript with kind/status + expandable I/O;
    approve → submission confirmation; decline → cancelled (nothing submitted); no
    PII persisted/logged; accessible (single H1, aria-live status, focus-managed
    dialog). _Requirements: FR-1401–FR-1407_

## Notes

- The demo is the browser/WebMCP experience; MCP is exercised by external clients
  (Spec 12), not this UI.
- Additive only — the human website is unchanged when the panel is hidden.
- Reuse the Phase 1 design system and a11y; drive tests with the scripted planner.
