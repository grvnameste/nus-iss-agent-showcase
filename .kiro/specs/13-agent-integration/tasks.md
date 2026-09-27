# Implementation Plan: AI Agent Integration & Orchestration

**Project:** EduAgent Connect — WebMCP-Ready Education Website Demonstrator
**Spec ID:** 13-agent-integration
**Owner:** Frontend / Phase 2
**Traceability:** `./requirements.md`, `./design.md`.

## Overview

**Specification-only.** Designs the agent orchestration layer over the WebMCP/MCP
interfaces. **No task writes, modifies, or deletes application code.**

> **This is Spec 13. Do not create Spec 16.**

## Tasks

- [x] 1. Confirm interfaces & capability facade
  - Re-read Specs 11–12 (interface surfaces) and the Spec 09 contract; confirm the
    transport-agnostic facade (`list`/`invoke`) shape and the WebMCP/MCP capability
    difference (navigation).
  - **Files:** read-only.
  - **Acceptance:** facade + interface differences confirmed. _Requirements: FR-1301, FR-1302_

- [x] 2. Author `requirements.md`
  - Discovery/selection, transport-agnostic invocation, journey sequencing,
    guardrail adherence, errors/recovery/cancellation, state/separation, reference
    journey, acceptance criteria.
  - **Files:** `.kiro/specs/13-agent-integration/requirements.md`.
  - **Acceptance:** FR-1301–FR-1306 stated and testable. _Requirements: all_

- [x] 3. Author `design.md`
  - Layered view, transport-agnostic capability client, model-provider seam
    (LLM + scripted), bounded orchestration loop, journey mapping, guardrails,
    error/cancellation table, state separation, testing.
  - **Files:** `.kiro/specs/13-agent-integration/design.md`.
  - **Acceptance:** each FR has a design treatment. _Requirements: FR-1301–FR-1306_

- [x] 4. Author `tasks.md` (this plan)
  - **Files:** `.kiro/specs/13-agent-integration/tasks.md`.
  - **Acceptance:** no-code, design-only deliverable. _Requirements: §0_

- [x] 5. Consistency review & no-code verification
  - Cross-check journey/capabilities/guardrails against Specs 09–12; confirm the
    repo shows only the three `13-…` files added and no application code changed.

- [x] 6. Implement the orchestration layer (code) — branch `phase2-integration`
  - Build `client/src/agent/orchestrator/`: transport-agnostic `CapabilityClient`
    facade (+ WebMCP-backed adapter over the Spec 11 handle), the `Planner` seam
    with a deterministic `ScriptedPlanner`, and the bounded `runOrchestration` loop
    for the reference journey.
  - Merged Specs 11 (WebMCP) + 12 (MCP) into `phase2-integration` first so the
    orchestration builds on both.
  - **Files:** `client/src/agent/orchestrator/**` + co-located tests + README.
  - **Verification:** `typecheck` + `lint` clean; full client suite green (304
    tests, incl. 6 new); no `server/`, `mcp-server/`, or course/enquiry model
    changes.
  - **Acceptance:** reference journey runs in order (WebMCP) and skips navigation on
    the MCP subset; no speculative writes; a declined confirmation stops cleanly
    with no retry; bounded loop; sanitised errors. Orchestration holds no business
    logic; model provider is behind the planner seam. _Requirements: FR-1301–FR-1306_
  - **Acceptance:** AC-1307 satisfied. _Requirements: AC-1301–AC-1307_

## Notes

- The scripted (deterministic) planner is essential for Spec 15's deterministic
  tests and an offline demo; the LLM planner is the live experience.
- Orchestration holds no business logic and never writes without confirmation.
