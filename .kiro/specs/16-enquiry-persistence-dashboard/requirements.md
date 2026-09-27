# Specification 16 — Enquiry Persistence, Retrieval & Dashboard · Requirements

**Project:** EduAgent Connect — WebMCP-Ready Education Website Demonstrator
**Spec ID:** 16-enquiry-persistence-dashboard
**Title:** Enquiry Persistence (SQLite), Retrieval API + MCP Tool, and Dashboard
**Status:** Draft for review (post-Phase 2 feature; SPECIFICATION PHASE)
**Builds on:** Phase 1 (`01`–`07`) and Phase 2 (`08`–`15`), all implemented and on `main`.
**Related steering:** `.kiro/steering/product.md`, `architecture.md`,
`coding-standards.md`, `security.md`, `testing.md`, `design.md`

---

## 0. Note

This is a **new feature specification** that follows the Phase 2 agent work. It
adds durable storage for enquiries and the ability to read them back — through the
REST API, through a new MCP tool, and through a dashboard page. It is a deliberate
extension (the earlier "do not create Spec 16" guard was about not sprawling the
Phase 2 agent scope; this is a distinct, intentional feature and is numbered 16 as
the natural successor to 15).

It reuses the existing seams: the `EnquiryRepository` interface (swap the
in-memory store for SQLite), the thin route → controller → service pattern, the
MCP capability adapter (Option B), and the Phase 1 design system. **No business
logic is duplicated.** Data remains **synthetic**; there is no auth.

## 1. Purpose

Today enquiries are stored only in an in-memory array and are lost on restart
(confirmed in `server/src/repositories/enquiry-repository.ts`). This spec makes
enquiries **durable** using **SQLite on the instance disk**, exposes a **read**
path (`GET /api/enquiries`) and a matching **MCP tool** (`list_enquiries`), and
adds a **dashboard page** so submitted enquiries can be viewed. This supports the
AWS Lightsail hosting goal (a cheap, no-extra-service database).

## 2. Background & constraints

- **DB choice:** SQLite (a file on the instance), chosen as the cheapest durable
  option — no managed database, no extra monthly cost, single instance.
- **Driver:** `better-sqlite3` (pinned exact version), compatible with the repo's
  `engines: node >=20` and the Lightsail Node 20 LTS target. (Node's built-in
  `node:sqlite` is avoided so the Node floor need not rise to 22.)
- **Demo posture:** synthetic data only; **no PII masking** (explicit user
  decision for this demo); **no authentication** on the dashboard or read API.
- **Trust boundary unchanged:** the backend still owns and validates all writes.

## 3. Scope

### 3.1 In scope

- A **SQLite-backed `EnquiryRepository`** implementation (persist + read) behind
  the existing interface; selectable as the default store, with the in-memory
  implementation retained for tests.
- A repository/service **read capability**: list stored enquiries (newest first)
  and fetch one by reference.
- A **`GET /api/enquiries`** REST endpoint (READ) returning stored enquiries, and
  optionally **`GET /api/enquiries/:reference`**.
- A **`list_enquiries`** MCP tool (READ; optionally `get_enquiry`) mapping to the
  read service via the existing adapter (Option B).
- A **dashboard page** in the `client` (e.g. `/dashboard`) listing enquiries,
  reusing the design system.
- **Configuration** for the SQLite file path via the server's Zod-validated env.
- **Migration/table creation** on startup (idempotent), and an optional synthetic
  seed for an empty database.
- Co-located tests for the repository, service, endpoint, MCP tool, and dashboard.

### 3.2 Out of scope / Non-goals

- **No** authentication/authorization, **no** PII masking (demo).
- **No** managed database (RDS/Lightsail DB), **no** ORM.
- **No** change to the enquiry WRITE contract, the agent guardrails, or the
  human-confirmation flow (Spec 10 unchanged).
- **No** editing/deleting of enquiries from the dashboard (read-only view).
- **No** real data; synthetic only.

## 4. Functional Requirements (EARS-style)

### 4.1 Persistence — FR-1601

- **FR-1601.1** The system **shall** provide a `SqliteEnquiryRepository`
  implementing the existing `EnquiryRepository` interface (`create`,
  `findByReference`) backed by a SQLite database file.
- **FR-1601.2** The repository **shall** create its table if absent (idempotent
  migration on startup) so a fresh instance works with no manual setup.
- **FR-1601.3** A submitted enquiry (`POST /api/enquiries`) **shall** persist to
  SQLite and **survive a server restart**.
- **FR-1601.4** The SQLite file path **shall** be configurable via validated env
  (default a sensible local path), so the Lightsail instance can point it at a
  persistent location.
- **FR-1601.5** The in-memory repository **shall** be retained and used by tests
  (deterministic, no file I/O), so the store is swappable per the interface.

### 4.2 Read service & API — FR-1602

- **FR-1602.1** The Enquiry Service **shall** expose a read operation to **list**
  stored enquiries (newest first) and to **fetch one by reference**.
- **FR-1602.2** The system **shall** expose **`GET /api/enquiries`** (READ)
  returning the stored enquiries in the shared response envelope
  (`{ data: Enquiry[] }`, optionally with simple pagination).
- **FR-1602.3** The system **should** expose **`GET /api/enquiries/:reference`**
  returning one enquiry or a sanitised 404.
- **FR-1602.4** These endpoints **shall** be thin (validate → service → envelope),
  reusing the existing route/controller pattern; **no** business logic in routes.

### 4.3 MCP tool — FR-1603

- **FR-1603.1** The MCP server **shall** expose a **`list_enquiries`** tool (READ,
  no human approval) mapping to the read service via the existing adapter
  (Option B — reuse services, no duplicated logic).
- **FR-1603.2** The tool **shall** appear in `tools/list` alongside the existing
  six; it is a READ, so it needs no confirmation.
- **FR-1603.3** The MCP layer **shall not** gain any write/delete tool for
  enquiries in this spec.

### 4.4 Dashboard — FR-1604

- **FR-1604.1** The `client` **shall** provide a **dashboard route** (e.g.
  `/dashboard`) that lists stored enquiries read from `GET /api/enquiries`.
- **FR-1604.2** The dashboard **shall** display each enquiry's fields (reference,
  course, name, email, phone, type, message, status, timestamp) — **no masking**
  (synthetic demo).
- **FR-1604.3** The dashboard **shall** handle loading, empty, and error states,
  and **shall** reuse the Phase 1 design system and accessibility conventions
  (single H1, `Card`, `buttonClasses`, labelled table/list, keyboard-operable).
- **FR-1604.4** The dashboard **shall** be reachable via navigation appropriate
  for a demo (a link/route); it does not require auth.

### 4.5 Configuration & migration — FR-1605

- **FR-1605.1** New env keys (e.g. `ENQUIRY_DB_PATH`, and a store selector if
  needed) **shall** flow through `server/src/config/env.ts` (Zod-validated,
  fail-fast).
- **FR-1605.2** The DB file **shall** be **gitignored**; only an
  `.env.example`-style key documentation is committed.
- **FR-1605.3** Table creation **shall** be idempotent; an optional synthetic seed
  **may** populate an empty DB for demo purposes.

## 5. Non-Functional Requirements

- **NFR-1601 (Reuse)** Swap the repository implementation behind the existing
  interface; do not restate enquiry business rules (they stay in `enquiryService`).
- **NFR-1602 (Trust boundary)** Writes still validated authoritatively server-side;
  reads return stored records only.
- **NFR-1603 (Type safety)** TypeScript strict; no `any`; Zod for external input.
- **NFR-1604 (Determinism)** Tests use the in-memory repository (or a temp SQLite
  file), no shared mutable state, no network.
- **NFR-1605 (Dependency hygiene)** `better-sqlite3` pinned to an exact version;
  no other new deps without justification.
- **NFR-1606 (Demo honesty)** Dashboard/API expose synthetic data only; the
  no-auth / no-masking posture is a documented demo limitation.

## 6. Acceptance Criteria (Given / When / Then)

- **AC-1601 (Durable write) — FR-1601**
  *Given* the SQLite repository is active, *when* an enquiry is submitted and the
  server restarts, *then* the enquiry is still retrievable.
- **AC-1602 (Read API) — FR-1602**
  *Given* stored enquiries, *when* `GET /api/enquiries` is called, *then* it
  returns them (newest first) in the shared envelope; `:reference` returns one or
  a sanitised 404.
- **AC-1603 (MCP tool) — FR-1603**
  *Given* the MCP server, *when* a client lists tools, *then* `list_enquiries`
  appears (READ, no approval) and returns stored enquiries via the reused service.
- **AC-1604 (Dashboard) — FR-1604**
  *Given* `/dashboard`, *when* it renders, *then* it lists stored enquiries with
  full fields (no masking) and handles loading/empty/error states accessibly.
- **AC-1605 (Config/gitignore) — FR-1605**
  *Given* the DB path env, *when* the server starts, *then* it validates config,
  creates the table idempotently, and the DB file is gitignored.
- **AC-1606 (No regression) — NFR-1601/1602**
  *Given* the changes, *when* the suites run, *then* the enquiry WRITE contract,
  guardrails, and human confirmation are unchanged, and existing tests pass.
- **AC-1607 (Gates)**
  *Given* the feature, *when* gates run, *then* `typecheck`, `lint`, `vitest --run`
  (all workspaces), and `build` succeed, and the app boots with health `ok`.

## 7. Parallelisation

- **Foundation (sequential, blocks the rest):** SQLite repository + read service
  + `GET /api/enquiries`.
- **Then in parallel:** the **`list_enquiries` MCP tool** (backend/stdio) and the
  **dashboard page** (frontend) — independent of each other, same split as the
  WebMCP/MCP work.

## 8. Constraints

Spec 16 only; SQLite on-instance; `better-sqlite3` pinned; synthetic data only;
no auth; **no PII masking** (demo). Reuse the repository/service/adapter/design
seams; no duplicated business logic; backend remains the trust boundary; DB file
gitignored. Standard typecheck/lint/test/build/boot gates apply.
