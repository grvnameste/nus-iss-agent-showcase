# Implementation Plan: MCP Server Integration

**Project:** EduAgent Connect — WebMCP-Ready Education Website Demonstrator
**Spec ID:** 12-mcp-server
**Owner:** Backend / Phase 2
**Traceability:** `./requirements.md`, `./design.md`.

## Overview

**Specification-only.** Designs a standalone MCP server that reuses the existing
business services. **No task writes, modifies, or deletes application code.**
Implementation is a later spec-task set against this design.

> **This is Spec 12. Do not create Spec 16.** Specs 11 and 12 may proceed in
> parallel once Specs 09 + 10 are approved.

## Tasks

- [x] 1. Confirm reusable services & schema source
  - Re-read `server/src/services/*` (transport-agnostic), `server/src/domain/*`
    (Zod), the REST surface, and `server/src/config/env.ts`. Decide Option A (HTTP)
    vs B (import services) direction for review.
  - **Files:** read-only.
  - **Acceptance:** service-reuse path and schema source identified. _Requirements: FR-1202, FR-1203_

- [x] 2. Author `requirements.md`
  - Server & tools, mapping/reuse, validation/schema source, permissions/approval
    (fail-closed), errors/duplicates, transport/lifecycle/logging, deps/structure,
    acceptance criteria.
  - **Files:** `.kiro/specs/12-mcp-server/requirements.md`.
  - **Acceptance:** FR-1201–FR-1207 stated and testable. _Requirements: all_

- [x] 3. Author `design.md`
  - Architecture (`mcp-server/` workspace), reuse mechanism (A/B), schema source,
    tool catalogue, human approval (fail-closed), validation/errors/dupes,
    transport/config/lifecycle, logging, deps, testing, deployment/security.
  - **Files:** `.kiro/specs/12-mcp-server/design.md`.
  - **Acceptance:** each FR has a design treatment; reuse-first, no duplication.
    _Requirements: FR-1201–FR-1207_

- [x] 4. Author `tasks.md` (this plan)
  - **Files:** `.kiro/specs/12-mcp-server/tasks.md`.
  - **Acceptance:** no-code, design-only deliverable. _Requirements: §0_

- [ ] 5. Consistency review & no-code verification
  - Cross-check tool names/kinds/schemas against Specs 09–11 (MCP excludes
    `navigate_to_course`); confirm the repo shows only the three `12-…` files added
    and no application code changed.
  - **Acceptance:** AC-1208 satisfied. _Requirements: AC-1201–AC-1208_

- [x] 6. Implement the MCP server (code) — branch `mcp-development`
  - New `mcp-server/` workspace (added to root `workspaces`). **Option B**: the
    capability adapter imports `courseService`/`enquiryService` and
    `enquiryInputSchema` directly from `server/src` (read-only reuse; server
    unchanged). SDK pinned `@modelcontextprotocol/sdk@1.30.1`. Six MCP tools
    (no `navigate_to_course`), stdio transport, validated env, PII-free audit,
    fail-closed human approval + duplicate guard.
  - **Files:** `mcp-server/**` (package.json, tsconfig, eslintrc, vitest.config,
    `src/{index,server,config,tools,adapters}`), README; root `package.json`
    (workspaces/scripts); `DEPLOYMENT.md` §3.
  - **Verification:** `typecheck` + `lint` clean; 10 unit tests pass; server boots
    over stdio and `tools/list` returns the six tools (navigation absent); `server`
    workspace unchanged (97 tests still pass).
  - **Acceptance:** tools discoverable; adapter reuses services with no duplicated
    logic/no direct data access; `submit_enquiry` fail-closed on missing/declined
    approval (no write); duplicates blocked; errors sanitised; deps pinned.
    _Requirements: FR-1201–FR-1207, AC-1201–AC-1208_

## Notes

- MCP exposes the SAME capabilities as WebMCP minus browser-only navigation — two
  interfaces, one contract, one set of services.
- No duplicated business logic; no direct repository/DB access; backend stays
  authoritative and re-validates the WRITE.
- MCP SDK dependency pinned to an exact version and justified at implementation
  time (v1 `@modelcontextprotocol/sdk` vs v2 `@modelcontextprotocol/server`).
- Implementation-phase verification (later): typecheck, lint, MCP server unit/
  integration tests, clean start/stop, and no regression to the human website or
  existing server tests.
