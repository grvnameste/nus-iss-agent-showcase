# Implementation Plan: Enquiry Persistence, Retrieval & Dashboard

**Project:** EduAgent Connect — WebMCP-Ready Education Website Demonstrator
**Spec ID:** 16-enquiry-persistence-dashboard
**Owner:** Full-stack
**Traceability:** `./requirements.md`, `./design.md`.
**Branch:** `enquiry-persistence` (off `main`).

## Overview

Add durable enquiry storage (SQLite), a read path (REST + MCP tool), and a
dashboard — reusing the existing repository/service/adapter/design seams. **No
business logic is duplicated; the backend stays the trust boundary.** Synthetic
data only; **no auth, no PII masking** (demo).

Task 1 is the authoring of this spec (done alongside requirements/design). Tasks
2–3 are the sequential foundation. Tasks 4–5 are independent and may run in
**parallel**. Task 6 verifies + integrates.

## Tasks

- [ ] 1. Author the spec (this document set)
  - `requirements.md`, `design.md`, `tasks.md` under
    `.kiro/specs/16-enquiry-persistence-dashboard/`.
  - **Acceptance:** the three documents exist and are internally consistent.
  - _Requirements: all (spec authoring)_

- [ ] 2. Foundation A — SQLite repository + interface `list` + config/migration
  - Add `list()` to `EnquiryRepository`; implement in the in-memory repo; add
    `SqliteEnquiryRepository` (`better-sqlite3`, pinned) with idempotent
    `CREATE TABLE IF NOT EXISTS` + row↔domain mapping; select SQLite as the default
    store via a factory reading `ENQUIRY_DB_PATH`; add env keys to
    `server/src/config/env.ts`; gitignore the DB file; optional `seedIfEmpty`.
  - **Files:** `server/src/repositories/enquiry-repository.ts` (+ new sqlite impl),
    `server/src/config/env.ts`, `server/package.json` (pinned dep), `.gitignore`.
  - **Tests:** repository create → list (newest first) → findByReference against a
    temp/`:memory:` DB; in-memory repo `list` too.
  - **Acceptance:** AC-1601, AC-1605. _Requirements: FR-1601, FR-1605_

- [ ] 3. Foundation B — read service + `GET /api/enquiries` endpoint
  - Add `enquiryService.listEnquiries()` / `getEnquiry(reference)` delegating to the
    repository; add `enquiryController.list` / `getByReference`; register
    `GET /api/enquiries` (+ `:reference`) on the existing enquiries router (thin,
    validate → service → envelope).
  - **Files:** `server/src/services/enquiry-service.ts`,
    `server/src/controllers/enquiry-controller.ts`, `server/src/routes/enquiries.ts`.
  - **Tests:** supertest `GET /api/enquiries` (order) + `:reference` (200/404).
  - **Acceptance:** AC-1602. _Requirements: FR-1602_
  - _Depends on: Task 2._

- [ ] 4. MCP tool `list_enquiries` (parallel)
  - Adapter method `listEnquiries()` reusing `enquiryService.listEnquiries()`
    (Option B); register `list_enquiries` (READ, no approval) in
    `register-tools.ts`; update `MCP_TOOL_NAMES` (now 7) + tests.
  - **Files:** `mcp-server/src/adapters/capability-adapter.ts`,
    `mcp-server/src/tools/register-tools.ts` (+ tests).
  - **Tests:** adapter returns rows (PII-free audit as READ); registration test =
    7 tools, navigation still excluded.
  - **Acceptance:** AC-1603. _Requirements: FR-1603_
  - _Depends on: Task 3. Parallel with Task 5._

- [ ] 5. Dashboard page (parallel)
  - `enquiriesApi.list()` in `client/src/lib/enquiries/api.ts`; a `/dashboard`
    route listing enquiries (all fields, no masking) with loading/empty/error
    states, reusing the design system + a11y; a discoverable link.
  - **Files:** `client/src/app/dashboard/page.tsx` (+ components as needed),
    `client/src/lib/enquiries/api.ts`, a nav/footer link.
  - **Tests:** Testing Library — loading/empty/populated/error; single H1; a11y.
  - **Acceptance:** AC-1604. _Requirements: FR-1604_
  - _Depends on: Task 3. Parallel with Task 4._

- [ ] 6. Integrate + full verification gate
  - `typecheck` + `lint` + `vitest --run` across `client`/`server`/`mcp-server`;
    `build`; boot + `GET /api/health` ok; confirm durability (submit → restart →
    still listed); confirm existing suites unchanged (no regression to WRITE
    contract / guardrails / confirmation).
  - **Acceptance:** AC-1606, AC-1607. _Requirements: NFR-1601–1606_
  - _Depends on: Tasks 4 and 5._

## Notes

- **Cheapest DB:** SQLite file on the instance — $0 extra vs a managed DB.
- **Parallelism:** Tasks 4 (mcp-server) and 5 (client) touch different workspaces
  and both depend only on Task 3 — run them in parallel, then integrate in Task 6.
- **Demo limitations (documented):** no auth, no PII masking; the read API and
  dashboard expose synthetic PII — acceptable only because all data is synthetic.
- **Persistence on Lightsail:** point `ENQUIRY_DB_PATH` at a durable path on the
  instance; the DB survives restarts but is tied to that single instance (no
  replication) — fine for the demo.
