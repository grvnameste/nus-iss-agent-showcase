# Implementation Plan: Agent Permissions, Consent & Guardrails

**Project:** EduAgent Connect — WebMCP-Ready Education Website Demonstrator
**Spec ID:** 10-agent-guardrails
**Owner:** Phase 2 Architect / Security Reviewer
**Traceability:** `./requirements.md`, `./design.md`.

## Overview

**Specification-only.** Produces the guardrail/consent/security contract that
Specs 11–12 implement. **No task writes, modifies, or deletes application code.**

> **This is Spec 10. Do not create Spec 16.**

## Tasks

- [x] 1. Confirm the trust model & pipeline against the code
  - Re-read `security.md`, `client/src/lib/webmcp/registry.ts` (confirmation gate),
    `server/src/domain/enquiry.ts` (authoritative re-validation),
    `server/src/http/*` (error envelope), `server/src/config/env.ts` (CORS).
  - **Files:** read-only.
  - **Acceptance:** the confirmation gate, re-validation, and error sanitisation
    are confirmed as the enforcement points. _Requirements: FR-1001, FR-1003, FR-1006_

- [x] 2. Author `requirements.md`
  - Permission model, consent for writes, no speculative writes, validation/trust
    boundary, PII handling, duplicate protection, error/cancellation, audit,
    security boundaries, acceptance criteria.
  - **Files:** `.kiro/specs/10-agent-guardrails/requirements.md`.
  - **Acceptance:** FR-1001–FR-1008 stated and testable. _Requirements: all_

- [x] 3. Author `design.md`
  - Enforcement point, consent model per interface, dedupe options, audit record
    shape, error/cancellation table, security boundaries.
  - **Files:** `.kiro/specs/10-agent-guardrails/design.md`.
  - **Acceptance:** every FR has a design treatment. _Requirements: FR-1001–FR-1008_

- [x] 4. Author `tasks.md` (this plan)
  - **Files:** `.kiro/specs/10-agent-guardrails/tasks.md`.
  - **Acceptance:** no-code, policy-only deliverable. _Requirements: §0_

- [x] 5. Consistency review & no-code verification
  - Cross-check against Specs 08–09; confirm the repo shows only the three
    `10-…` files added and no application code changed.
  - **Acceptance:** AC-1008 satisfied; guardrails consistent with the capability
    model. _Requirements: AC-1001–AC-1008_

- [x] 6. Implement the guardrails (code) — branch `Webmcp-development`
  - Build `client/src/agent/guardrails/`: PII-free audit sink, session-scoped
    duplicate-submission guard, consent-summary helper (field names, not values),
    and `invokeWithGuardrails` tying dedupe + audit around `registry.invoke`
    (which already enforces validation + confirmation).
  - **Files:** `client/src/agent/guardrails/{audit,duplicate-guard,confirm,invoke,index}.ts`,
    `README.md`, and co-located `guardrails.test.ts`.
  - **Verification:** `npm run typecheck` clean; `npm run lint --workspace client`
    clean; full client suite green (282 tests, incl. 9 new); no `server/` or
    course/enquiry model changes.
  - **Acceptance:** write requires confirmation (decline → `ConfirmationDeniedError`,
    no write); no speculative writes; identical resubmit blocked
    (`DuplicateSubmissionError`, prior reference, no second write); audit records
    and consent details carry no PII. _Requirements: FR-1001–FR-1008_

## Notes

- Guardrails wrap, never replace, backend validation.
- Confirmation is enforced at `CapabilityRegistry.invoke`; interfaces supply the
  `ConfirmationRequester` (Spec 11 UI dialog; Spec 12 client approval, fail-closed).
- Duplicate protection favours a client-side submitted-guard for the demo; an
  idempotency key is the fallback if a backend affordance proves necessary.
