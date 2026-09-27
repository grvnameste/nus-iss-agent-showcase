# Specification 16 — Enquiry Persistence, Retrieval & Dashboard · Design

**Project:** EduAgent Connect — WebMCP-Ready Education Website Demonstrator
**Spec ID:** 16-enquiry-persistence-dashboard
**Status:** Draft for review (SPECIFICATION PHASE)
**Traceability:** `./requirements.md`; repository seam
`server/src/repositories/enquiry-repository.ts`; enquiry service
`server/src/services/enquiry-service.ts`; MCP adapter
`mcp-server/src/adapters/capability-adapter.ts`; design system `.kiro/steering/design.md`.

> Descriptive/advisory only. No code is written by this spec. Snippets are
> illustrative for the implementation tasks.

---

## 1. Design goals

- **DG1** Durable enquiries with the **cheapest** footprint (SQLite file, no extra
  service) — swappable behind the existing `EnquiryRepository` interface.
- **DG2** Read path exposed three ways over **one** service method: REST, MCP
  tool, dashboard — no duplicated logic.
- **DG3** Reuse everything (repository seam, thin routes, Option B adapter, design
  system); keep the backend the trust boundary.

## 2. Data store — SQLite via `better-sqlite3`

- **Driver:** `better-sqlite3` (pinned exact version). Synchronous API — simple
  and fast for this scale; wrapped so the async `EnquiryRepository` interface is
  preserved (`Promise.resolve(...)`).
- **File path:** from `server/src/config/env.ts` (`ENQUIRY_DB_PATH`, default e.g.
  `./data/enquiries.db`). On Lightsail, point at a persistent path on the instance.
- **Schema (idempotent, created on startup):**

```sql
CREATE TABLE IF NOT EXISTS enquiries (
  id            TEXT PRIMARY KEY,
  reference     TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT,
  course_id     TEXT NOT NULL,
  course_title  TEXT NOT NULL,
  enquiry_type  TEXT NOT NULL,
  message       TEXT NOT NULL,
  status        TEXT NOT NULL,
  created_at    TEXT NOT NULL      -- ISO 8601
);
CREATE INDEX IF NOT EXISTS idx_enquiries_created_at ON enquiries(created_at);
```

- Column names are snake_case in SQL; mapped to the camelCase `Enquiry` domain
  type in the repository (a small row↔domain mapper). The domain `Enquiry` type is
  unchanged.

## 3. Repository (swap behind the interface) — FR-1601

`server/src/repositories/enquiry-repository.ts` already defines
`EnquiryRepository` (`create`, `findByReference`) with an in-memory default. This
spec:

- **Extends the interface** with a read method:
  `list(): Promise<readonly Enquiry[]>` (newest first). Add it to the interface and
  implement in **both** the in-memory and SQLite repositories (so tests keep working).
- **Adds `SqliteEnquiryRepository`** implementing `create` / `findByReference` /
  `list` over prepared statements. Constructor takes a db handle/path (injectable
  for tests → temp file or `:memory:`).
- **Selects the default store:** the exported `enquiryRepository` singleton becomes
  the SQLite one for the running app (reading `ENQUIRY_DB_PATH`); tests continue to
  inject `InMemoryEnquiryRepository`. A small factory keeps this clean.

```ts
export interface EnquiryRepository {
  create(enquiry: Enquiry): Promise<Enquiry>;
  findByReference(reference: string): Promise<Enquiry | null>;
  list(): Promise<readonly Enquiry[]>; // NEW — newest first
}
```

## 4. Service read operation — FR-1602

`enquiry-service.ts` gains read methods that delegate to the repository (no rules
beyond ordering, which the repo provides):

```ts
listEnquiries(): Promise<readonly CreateEnquiryResult[]>   // maps stored → safe view
getEnquiry(reference): Promise<CreateEnquiryResult | null>
```

- Returned shape reuses the existing `CreateEnquiryResult`-style view, **extended**
  for the dashboard to include the fields it must show (name/email/phone/message).
  Because this is a demo with **no masking**, the read view returns full fields.
  (Contrast: the WRITE result deliberately omits PII; the READ view here is a
  separate, explicit demo affordance.)
- The service stays transport-agnostic (no Express/HTTP), so the MCP adapter can
  import and reuse it directly (Option B), exactly like the other capabilities.

## 5. REST endpoint — FR-1602

Mirror the course routes (thin route → controller → service → envelope):

- `GET /api/enquiries` → `enquiryController.list` → `enquiryService.listEnquiries()`
  → `{ data: Enquiry[] }` (newest first). Optional simple `page`/`pageSize` later.
- `GET /api/enquiries/:reference` → `getByReference` → `{ data }` or `ApiError.notFound`.
- Registered in `app.ts` under the existing `/api/enquiries` router (add GET
  handlers alongside the existing POST). Validation via the `validate` middleware
  for params/query where applicable.

## 6. MCP tool — FR-1603

Add to `mcp-server`:
- A capability-adapter method `listEnquiries()` calling the reused
  `enquiryService.listEnquiries()` (Option B — no logic here).
- A `list_enquiries` tool in `register-tools.ts` (READ; **no** approval), returning
  the stored enquiries as JSON `content`.
- Update the tool-name constant + the registration test (now 7 tools; navigation
  still excluded). Add an adapter test (returns stored rows; PII-free audit as a
  READ).

## 7. Dashboard — FR-1604

- **Route:** `client/src/app/dashboard/page.tsx` (or `/admin/enquiries`), a client
  component that fetches `GET /api/enquiries` through a small `enquiriesApi.list()`
  added to `client/src/lib/enquiries/api.ts` (mirrors `coursesApi`).
- **UI:** single `<h1>`; a labelled table (or `Card` list on mobile) of enquiries
  with all fields (reference, course, name, email, phone, type, message, status,
  createdAt). Loading / empty / error states. Reuse `Card`, `buttonClasses`,
  slate/sky palette, spacing scale, and a11y conventions (design.md).
- **No masking** (demo): full values shown. A visible "synthetic demo data" note
  is included for honesty.
- **Discoverability:** a link to `/dashboard` (e.g. in the footer or a small nav
  affordance) — placement per the design system; not behind auth.

## 8. Configuration & migration — FR-1605

- `env.ts`: add `ENQUIRY_DB_PATH` (string, default `./data/enquiries.db`) and, if
  needed, `ENQUIRY_STORE` (`sqlite` | `memory`, default `sqlite`) for local dev.
- Startup runs the idempotent `CREATE TABLE IF NOT EXISTS` migration. An optional
  `seedIfEmpty()` inserts a few synthetic enquiries for a non-empty demo.
- **.gitignore:** add the DB file/dir (e.g. `server/data/` / `*.db`). Document the
  env key in the server `.env.example` if one exists (or add key-name docs).

## 9. Parallelisation plan — §7 of requirements

```
Foundation (sequential):
  interface.list + SqliteEnquiryRepository + env + migration
  + enquiryService.listEnquiries + GET /api/enquiries
        │
        ├─────────────────────────────┐
   MCP tool (mcp-server):        Dashboard (client):
   list_enquiries + adapter       /dashboard page + enquiriesApi.list
   + tests                        + tests
        └─────────────┬───────────────┘
              integrate + full gate
```

The two branches touch different workspaces (mcp-server vs client) and both depend
only on the foundation's service + endpoint — so they can be built in parallel
(e.g. two sub-agents) and integrated.

## 10. Testing — testing.md

- **Repository:** `SqliteEnquiryRepository` against a temp file / `:memory:` —
  create → list (order) → findByReference; durability implied by file store.
- **Service:** `listEnquiries` returns newest-first over an injected repo.
- **Endpoint:** supertest `GET /api/enquiries` (+ `:reference` 200/404) with an
  in-memory/temp repo.
- **MCP:** adapter `listEnquiries` returns rows; `register-tools` test asserts 7
  tools incl. `list_enquiries`, navigation still excluded.
- **Dashboard:** Testing Library — loading/empty/populated/error states; a11y.
- Determinism: no real network; temp DB or fake repo; existing suites unchanged.

## 11. Security & demo posture

- Backend remains the trust boundary; WRITE contract + guardrails unchanged.
- **No auth, no masking** — explicit demo decisions; documented as limitations
  (the read API/dashboard expose synthetic PII, acceptable only because all data
  is synthetic). If ever pointed at real data, gate the dashboard and mask/omit
  fields first.
- DB file gitignored; no secrets introduced.

## 12. Constraints recap

Spec 16 only; SQLite via pinned `better-sqlite3`; reuse the repository/service/
adapter/design seams; one read service feeding REST + MCP + dashboard; no
duplicated logic; backend trust boundary intact; synthetic data only; no auth; no
masking (demo). Standard gates apply.
