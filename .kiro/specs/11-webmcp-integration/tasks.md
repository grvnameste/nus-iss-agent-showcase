# Implementation Plan: WebMCP Integration Layer

**Project:** EduAgent Connect — WebMCP-Ready Education Website Demonstrator
**Spec ID:** 11-webmcp-integration
**Owner:** Frontend / Phase 2
**Traceability:** `./requirements.md`, `./design.md`.

## Overview

**Specification-only.** Designs the browser WebMCP layer. **No task writes,
modifies, or deletes application code.** Implementation is a later spec-task set
against this design.

> **This is Spec 11. Do not create Spec 16.** Specs 11 and 12 may proceed in
> parallel once Specs 09 + 10 are approved.

## Tasks

- [x] 1. Confirm the existing layer & mount point
  - Re-read `client/src/lib/webmcp/*`, `client/src/components/providers/AppProviders`,
    the course/enquiry client schemas, and the design system (`design.md`).
  - **Files:** read-only.
  - **Acceptance:** registry/transport reuse and provider mount point confirmed.
    _Requirements: FR-1102, FR-1103, FR-1106_

- [x] 2. Author `requirements.md`
  - Detection/fallback, registration/schemas, execution/mapping, confirmation,
    results/errors, non-regression/placement, acceptance criteria.
  - **Files:** `.kiro/specs/11-webmcp-integration/requirements.md`.
  - **Acceptance:** FR-1101–FR-1106 stated and testable. _Requirements: all_

- [x] 3. Author `design.md`
  - Placement (`client/src/agent/`), detection module, registration, execution/
    mapping by kind, confirmation dialog, status/error model, a11y, testing.
  - **Files:** `.kiro/specs/11-webmcp-integration/design.md`.
  - **Acceptance:** each FR has a design treatment; reuse-first. _Requirements: FR-1101–FR-1106_

- [x] 4. Author `tasks.md` (this plan)
  - **Files:** `.kiro/specs/11-webmcp-integration/tasks.md`.
  - **Acceptance:** no-code, design-only deliverable. _Requirements: §0_

- [x] 5. Consistency review & no-code verification
  - Cross-check capability names/kinds/schemas against Specs 09–10; confirm the
    repo shows only the three `11-…` files added and no application code changed.
  - **Acceptance:** AC-1107 satisfied. _Requirements: AC-1101–AC-1107_

- [x] 6. Implement the WebMCP layer (code) — branch `Webmcp-development`
  - Build `client/src/agent/webmcp/`: `detect.ts` (feature-detection + graceful
    fallback), `status-store.ts` (PII-free per-invocation status), `webmcp-adapter.ts`
    (`initWebMcp` — register + advertise + route via `invokeWithGuardrails`),
    `confirm/` (confirmation controller + accessible dialog), `use-safe-router.ts`
    (router-context-safe navigation), and `AgentProvider.tsx` mounted via
    `AppProviders` (additive).
  - **Files:** `client/src/agent/webmcp/**` + co-located tests + README;
    `client/src/components/providers/AppProviders.tsx` (mount only).
  - **Verification:** `npm run typecheck` clean; `npm run lint --workspace client`
    clean; full client suite green (298 tests, incl. 16 new); no `server/` or
    course/enquiry model changes; existing human-journey tests unaffected.
  - **Acceptance:** detection-absent = no-op (no errors); capabilities registered +
    advertised when a surface exists; `submit_enquiry` prompts confirmation
    (decline → `ConfirmationDeniedError`, no write); READs never prompt;
    `compare_courses` composes; dialog is accessible (role/focus/Escape).
    _Requirements: FR-1101–FR-1106_

## Notes

- WebMCP registers the SAME capabilities as MCP (Spec 12) — two interfaces, one
  contract — plus `navigate_to_course` (browser-only).
- Graceful fallback is mandatory: no WebMCP → normal human website, no errors.
- Confirmation dialog reuses the Phase 1 design system and a11y conventions.
- Implementation-phase verification (later): typecheck, lint, `vitest --run`,
  build, boot with `GET /api/health` → `{status:'ok'}`, no human-journey regression.
