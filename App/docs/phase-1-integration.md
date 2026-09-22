# Phase 1 — Human Website Integration Reference

This document coordinates the **Phase 1 human-website** specifications so a
multi-member team can implement them in parallel with minimal overlap. It records
specification dependencies, shared contracts, feature ownership, integration
points, implementation order, and the final human-website flow.

> **Phase boundary.** Phase 1 is strictly a **human-facing** website. It contains
> **no** WebMCP, MCP, AI agents, agent tools, tool registries, agent permissions,
> agent guardrails, AI recommendations, AI search, or AI-generated content. Those
> belong exclusively to **Phase 2 (Agent-Ready Transformation)**, which is a
> separate set of specifications created only after Phase 1 is complete. This
> document does not describe Phase 2 implementation.

## Specifications in Phase 1

| Spec | Title | Status | Adds |
| ---- | ----- | ------ | ---- |
| 01 | Foundation | Implemented | Monorepo, Express app, Zod boundary, error/logging/security, Next.js shell, UI primitives, client API boundary, `GET /api/health` |
| 02 | Human Course Catalogue | Implemented | Course model + synthetic data, repository/service/controller/routes, `GET /api/courses`, `GET /api/courses/:courseId`, catalogue UI + minimal details placeholder |
| 03 | Human Course Details | Implemented | Complete course details page (frontend-only; reuses Course capability) — see [`course-details.md`](./course-details.md) |
| 04 | Human Course Comparison | Implemented | Client-side side-by-side comparison (frontend-only; shared `useComparison` interface) — see [`course-comparison.md`](./course-comparison.md) |
| 05 | Human Course Enquiry | Implemented | First WRITE: enquiry domain/service/repository + `POST /api/enquiries` + enquiry form/confirmation — see [`course-enquiry.md`](./course-enquiry.md) |
| 06 | Human Website Completion / Integration | Planned | Cross-feature wiring, navigation, alias/route decisions, end-to-end journey |
| 07 | Human Website Testing & Quality | Planned | Cross-feature integration/e2e tests, accessibility & responsive validation, quality gates |

## Dependency graph

```
                         Spec 01 — Foundation
                                 |
                                 v
                    Spec 02 — Course Catalogue
                    (Course model + Course API)
                        /        |         \
                       /         |          \
                      v          v           v
        Spec 03 —        Spec 04 —        (Course model/API
        Details          Comparison       consumed by all)
                      \          |          /
                       \         |         /
                        v        v        v
                        Spec 05 — Enquiry
                                 |
                                 v
                Spec 06 — Human Website Completion
                                 |
                                 v
                Spec 07 — Testing & Quality
```

**Reading the graph:** the *logical* progression is 02 → (03, 04) → 05 →
integration. In practice, **03, 04, and 05 can be implemented in parallel** once
the shared Course model and Course API (already delivered by Spec 02) plus a few
small cross-spec contracts (below) are agreed.

## Shared contracts

The single most important rule: **do not modify the shared Course model
independently.** It is owned by Spec 02 (`client/src/lib/courses/types.ts` on the
client; `server/src/domain/course.ts` on the server). Any change is a coordinated
**shared contract change** (see the change policy at the end).

### Course model & Course API (Spec 02 → 03, 04, 05)
- **Course model** — shared client `Course` type + enums/label maps.
- **Course ID** — the stable slug-like `id`; the identity used in routes, links,
  comparison, and enquiries.
- **Course retrieval** — `GET /api/courses/:courseId` (`{ data: Course }`, 404 for
  unknown/non-listable) via `coursesApi.getById`, and `GET /api/courses` for the
  catalogue.
- **Details route** — `/lifelong-learning/courses/:courseId` (established by
  Spec 02; the details page is completed by Spec 03).

### Spec 03 → Spec 05 (enquiry entry point)
- Spec 03's **Enquire** action navigates to the enquiry entry point carrying the
  course `id`. The **concrete enquiry route/params are owned and finalised by
  Spec 05**.
- **As implemented (Spec 03):** the action links to
  `/lifelong-learning/courses/:courseId/enquire`, encoded in exactly one place —
  `enquiryHref` in `client/src/components/courses/details/routes.ts`.
- **Settled (Spec 05):** that is the route Spec 05 ships, so `enquiryHref` needed
  no change and the seam is now live end to end. The page replaces the Spec 03
  placeholder at the same path.

### Spec 04 → Spec 03 (comparison interface, and details navigation)
- Spec 04 **produces** a small shared comparison interface — `useComparison()` /
  comparison context — with at least `items`, `add`, `remove`, `has`, `clear`,
  `count`, `isFull`, `max` (max = **4**; duplicates are a no-op).
- **As implemented (Spec 04):** `useComparison()` lives in
  `client/src/components/comparison/comparison-context.tsx` and returns
  `items`, `add`, `remove`, `has`, `clear`, `count`, `isFull`, `max`
  (`MAX_COMPARISON_COURSES` = 4), plus `status` — the last change worded for a
  live region. `add` returns `'added' | 'duplicate' | 'full'` so a caller can
  react to a rejection without re-deriving the rules; that return value keeps it
  assignable to Spec 03's `(course: Course) => void` seam. The hook throws
  outside a `ComparisonProvider`, which is mounted in `app/layout.tsx` together
  with `ComparisonAnnouncer` and `ComparisonBar`. The selection is mirrored into
  `sessionStorage` (`eduagent.comparison`) for the browsing session.
- **Comparison route (Spec 04):** `/lifelong-learning/courses/compare`. The
  static `compare` segment sits beside `[courseId]` and Next.js matches it
  first, so the two never collide.
- **Reusable control (Spec 04):**
  `client/src/components/comparison/AddToCompareButton.tsx` — wired into the
  Spec 02 `CourseCard`, and exported for Spec 03's optional affordance.
- Spec 03 **optionally consumes** this interface for an add-to-comparison affordance
  on the details page (guarded: if the interface is unavailable, the affordance is
  omitted without breaking the page).
- **As implemented (Spec 03):** `CourseDetails` takes an optional `comparison`
  prop typed by `client/src/components/courses/details/comparison-seam.ts` — the
  structural subset Spec 03 needs (`add`, `remove`, `has`, `isFull`, `max`). It
  is a prop, not a context owned by Spec 03, so Spec 04 remains the owner of
  comparison state and rules. The details route host now wires the real
  `useComparison()` value via a small client wrapper.
- Spec 04's comparison view **navigates to** the Spec 03 details route.

### Spec 04 → Spec 05 (selected course → enquiry)
- Spec 04's comparison view links to the **enquiry entry point** (owned by Spec 05)
  for a chosen course, carrying its `id`.

### Spec 05 produced contracts (for integration / other specs)
- **`POST /api/enquiries`** — request `{ name, email, phone?, courseId,
  enquiryType, message }`; success **201** `{ data: { reference, courseId,
  courseTitle, status, createdAt } }`; errors use the Spec 01 envelope.
- **Enquiry-type enum** — `general | course_content | fees_funding | admissions |
  other` (server-authoritative in `server/src/domain/enquiry.ts`; the client
  mirrors it in `client/src/lib/enquiries/types.ts` with display labels).
- **Enquiry entry route/params** — `/lifelong-learning/courses/:courseId/enquire`.
- **As implemented (Spec 05):** the success payload always carries `courseTitle`
  (captured from the verified course at submission time, so the confirmation
  survives later catalogue edits) and deliberately carries **none** of the
  submitted personal fields. `404 NOT_FOUND` covers both an unknown course and one
  that is not publicly listable — the same rule `GET /api/courses/:courseId`
  applies. Enquiry references are `ENQ-<year>-<6-digit sequence>` from an
  in-memory counter, so they restart at `000001` when the server restarts.
- **Error-handler addition (Spec 05, shared):** body-parser failures are now
  mapped at the Spec 01 boundary — an oversized body returns **413** and malformed
  JSON returns **400**, both `VALIDATION_ERROR`, instead of a generic 500. This is
  additive infrastructure that applies to any future WRITE endpoint; before Spec 05
  no route accepted a body.

### Spec 01 infrastructure (reused by 03, 04, 05)
- Server: `validate` middleware, `ApiError` taxonomy + error handler, async
  handler, Pino logger, Zod-validated env/config, Helmet + CORS, `express.json()`.
- Client: the API boundary/base-URL resolution and transport; UI primitives
  (`Button`, `Card`, `Container`), `cn`, Tailwind theme; catalogue conventions from
  Spec 02 (`AvailabilityBadge`, label maps, `format.ts`, discriminated-union
  request-state pattern).

## Feature ownership (recommended)

| Team | Owns | Must NOT modify |
| ---- | ---- | --------------- |
| **A** — Details (Spec 03) | Details page + `details/` components, details route usage, details docs/tests | Course model, catalogue internals, comparison internals, enquiry internals |
| **B** — Comparison (Spec 04) | Comparison provider/`useComparison`, add/remove control, comparison view/route, comparison docs/tests | Course model, catalogue internals, details internals, enquiry internals |
| **C** — Enquiry (Spec 05) | Enquiry backend (domain/schema/repo/service/controller/route) + enquiry form/confirmation, enquiry route/params, enquiry docs/tests | Course model, catalogue internals, details internals, comparison internals |
| **Lead / Integration** | Cross-spec wiring, navigation/aliases, Spec 06 completion & Spec 07 testing | — |

These are recommendations, not organizational tooling. Each team should work
primarily within its own area.

## Implementation order & parallelism

**Sequential (do first / agree early):**
1. Spec 01 + Spec 02 (already implemented) — the shared Course model and Course API.
2. Agree two small cross-spec contracts **before or early during** parallel work:
   - the **`useComparison()` interface signature** (Spec 04 → consumed by Spec 03);
   - the **enquiry entry route/params** (Spec 05 → linked by Spec 03/04).

**Parallel (after the above):**
- Spec 03, Spec 04, and Spec 05 proceed in parallel. Each is independently buildable
  and testable because the cross-spec seams are **guarded** (Spec 03's
  add-to-comparison affordance is optional; enquiry links point at the agreed route)
  and unit/component tests use **faked API clients / injected dependencies** (no
  network).
- Within Spec 05, the backend Enquiry capability and the frontend form can be built
  in parallel once the request/response contract is fixed.

**Integration (Spec 06) then Testing & Quality (Spec 07):**
- Wire the real seams: catalogue/details "Add to compare" using the real
  `useComparison`; details/comparison "Enquire" using the real enquiry route;
  mount the `ComparisonProvider` in the shell; finalise any route alias decisions
  (e.g. whether to add a top-level `/courses/:courseId` alias — an **integration**
  decision, not owned by Spec 03).
- Run cross-feature e2e/integration tests, accessibility, and responsive validation
  across the full journey; enforce quality gates (typecheck, lint, tests, build).

```
Shared Course model/API (Spec 01/02)  ──►  Agree useComparison + enquiry route
        │                                              │
        └──────────────►  Spec 03 / Spec 04 / Spec 05 (parallel)
                                       │
                                       ▼
                          Spec 06 Integration
                                       │
                                       ▼
                          Spec 07 Testing & Quality  ──►  Human Website Complete
```

## Integration points (explicit)

1. **Catalogue card → Add to compare** — Spec 02 `CourseCard` renders Spec 04's
   `AddToCompareButton` via `useComparison`. **Wired** (additive: the card gained
   one control and holds no comparison state).
2. **Catalogue/Details → Details page** — existing `/lifelong-learning/courses/:courseId`
   (Spec 02 route; content completed by Spec 03).
3. **Details → Add to compare (optional)** — Spec 03 consumes Spec 04's
   interface. **Wired:** the route host uses a small client wrapper to pass the
   real `useComparison()` value as `comparison`, so details uses the same
   add/remove behavior and limit rules as the catalogue card and comparison view.
4. **Details → Enquire** — Spec 03 links to Spec 05's enquiry entry route.
   **Wired:** Spec 05 shipped the route `enquiryHref` already pointed at, so no
   change was needed on either side.
5. **Comparison view → Details / Enquire / Back** — Spec 04 links to Spec 03 route,
   Spec 05 entry route, and the catalogue. **Wired**, with the catalogue and
   enquiry targets imported from `details/routes.ts` rather than restated; Spec 05
   landing on that exact route means the link now resolves.
6. **Enquiry form → `POST /api/enquiries` → Confirmation** — Spec 05 end to end.
   **Wired**, and covered by an integration test that runs the real Express app
   in-process and drives the real form against it.
7. **ComparisonProvider mount** — **done**: mounted in `app/layout.tsx` (Spec 04,
   FR-407), so comparison state is shared across catalogue/details/comparison.

## Final human-website flow (Phase 1 target)

```
HOME
 ├─ Education
 ├─ Admissions
 ├─ Lifelong Learning
 │    ├─ Course Catalogue (Spec 02): Search · Filter · Sort · Pagination · Compare(add)
 │    ├─ Course Details (Spec 03): Information · Compare(add) · Enquire
 │    ├─ Course Comparison (Spec 04): Compare · View Details · Enquire
 │    └─ Course Enquiry (Spec 05): Form · Validation · Submission · Confirmation
 ├─ Industry
 └─ About
```

## Testing responsibilities (who tests what)

- **Per-feature (owned by each team):** unit tests (services/state/validation),
  component tests (with faked API clients / stubbed router), API tests where the
  feature adds endpoints (Spec 05), and accessibility/responsive assertions for that
  feature. Do **not** duplicate another feature's internal tests.
- **Cross-feature (Spec 06/07):** end-to-end journeys spanning catalogue → details →
  comparison → enquiry; navigation contracts; full-journey accessibility and
  responsive validation; and the consolidated quality gates.

## Course model change policy

If any spec discovers a genuine need to change the shared Course model:
1. Stop and raise it as an explicit **shared contract change**.
2. Coordinate with the Spec 02 owner and every dependent spec (03/04/05).
3. Update Spec 02's model + docs first, then dependents, in one coordinated change.
4. Never fork or duplicate the Course model inside an individual spec.

## Future phase (conceptual only)

After Phase 1 is complete, a separate **Phase 2 (Agent-Ready Transformation)** set
of specifications may analyse the finished human website and expose selected
existing capabilities (e.g. course discovery, details, comparison, enquiry) as
structured agent capabilities with permissions and human-in-the-loop confirmation
for writes. **None of that is designed or implemented in Phase 1**; the future
phase determines actual tool boundaries after inspecting the completed application.

---

## Integration point inventory C1–C9 (TASK-600)

> **Status:** Reviewed against the implemented code in `App/client` and
> `App/server` (Specs 01–05 are implemented). This section is the written
> inventory required by requirements §10 / FR-611, FR-612, NFR-602. It records,
> for every shared contract C1–C9, the contract name, its **owner** spec, its
> **consumer(s)**, and the concrete file(s)/route(s) that realise it in the
> codebase, plus any seam that is missing or inconsistent (to be resolved by
> later Phase-0 tasks: TASK-601/602/603).
>
> **Scope note.** This is a documentation/analysis task only. No feature
> internals, the Course model, backend endpoints, or route shapes were changed.
> Verification gates at review time: `npm run typecheck` → 0 errors,
> `npm run lint` → 0 warnings/errors.

### Summary table

| # | Contract | Owner | Consumer(s) | Realised in code | Confirmed? |
| - | -------- | ----- | ----------- | ---------------- | ---------- |
| C1 | Course model | Spec 02 | 03, 04, 05 | `client/src/lib/courses/types.ts` (`Course`, `COURSE_SCHEMA`, enums + label maps); `server/src/domain/course.ts` (`courseSchema`, authoritative) | ✅ Unchanged |
| C2 | Course ID | Spec 02 | 03, 04, 05 | `Course.id` (`z.string().min(1)`); flows through routes/links/comparison entries/enquiry `courseId` | ✅ Consistent |
| C3 | Course list/detail API | Spec 02 | 03, 04, 05 | `server/src/routes/courses.ts` (`GET /api/courses`, `GET /api/courses/:courseId`); client `client/src/lib/courses/api.ts` (`coursesApi.list` / `getById`) | ✅ Consistent |
| C4 | Details route | Spec 02/03 | 02, 04 | `client/src/app/lifelong-learning/courses/[courseId]/page.tsx`; encoded in `client/src/components/courses/details/routes.ts` (`CATALOGUE_HREF`) and `comparison/routes.ts` (`courseDetailsHref`) | ✅ Consistent |
| C5 | Comparison interface | Spec 04 | 03 (optional), 02 (card) | `client/src/components/comparison/comparison-context.tsx` (`useComparison`, `ComparisonApi`, `MAX_COMPARISON_COURSES=4`) | ✅ Consistent |
| C6 | Comparison route | Spec 04 | 02, 03 | `client/src/app/lifelong-learning/courses/compare/page.tsx`; constant `COMPARISON_HREF` in `client/src/components/comparison/routes.ts` | ✅ Consistent (precedence re-checked in TASK-602) |
| C7 | Enquiry entry route/params | Spec 05 | 03, 04 | `client/src/app/lifelong-learning/courses/[courseId]/enquire/page.tsx`; helper `enquiryHref` in `client/src/components/courses/details/routes.ts` (re-exported by `comparison/routes.ts`) | ✅ Consistent (CQ-1 resolved to nested route) |
| C8 | Enquiry submission API | Spec 05 | enquiry form | `server/src/routes/enquiries.ts` (`POST /api/enquiries`); `server/src/domain/enquiry.ts` (schema/enum); client `client/src/lib/enquiries/api.ts` + `types.ts` | ✅ Consistent |
| C9 | Spec 01 infra | Spec 01 | 02–05 | Server `src/http/{validate,api-error,async-handler,error-handler}.ts`, `src/config/*`, `src/app.ts` (Helmet/CORS/json); client `lib/webmcp/adapter.ts` (`resolveApiBaseUrl`), `components/ui/*`, `lib/cn.ts` | ✅ Consistent |

### Detail per contract

**C1 — Course model (owner: Spec 02; consumers: 03, 04, 05).**
Authoritative Zod schema is server-side in `server/src/domain/course.ts`
(`courseSchema` / `parseCourse`). The client mirror `COURSE_SCHEMA` and the
`Course` type live in `client/src/lib/courses/types.ts`, along with the enum
`const` arrays (`DISCIPLINES`, `COURSE_TYPES`, `DELIVERY_MODES`, `COURSE_LEVELS`,
`COURSE_STATUSES`, `COURSE_AVAILABILITIES`) and their label maps. The comparison
layer imports `COURSE_SCHEMA` to validate `sessionStorage` rather than defining
its own shape, so there is a single client model. **Confirmed unchanged** — no
new fields, no forked definition; the field set matches across client/server
(client uses looser `z.number().finite()` vs server `int().positive()`, which is
expected since the server is authoritative and the client only renders).

**C2 — Course ID (owner: Spec 02; consumers: 03, 04, 05).**
`Course.id` is a non-empty string. The same id is the `[courseId]` route param
for details (C4) and enquiry (C7), the comparison entry key
(`remove(courseId)`, `has(courseId)` in the comparison context), and the
`courseId` field of the enquiry payload (`EnquiryInput` in
`client/src/lib/enquiries/types.ts`; `enquiryInputSchema` server-side). Identity
flows unchanged Catalogue → Details → Comparison → Enquiry. **Consistent.**

**C3 — Course list/detail API (owner: Spec 02; consumers: 03, 04, 05).**
Server routes in `server/src/routes/courses.ts` wire validation → controller for
`GET /api/courses` and `GET /api/courses/:courseId`. The client transport is
`coursesApi` in `client/src/lib/courses/api.ts` (`list` returns
`{ data, pagination }`; `getById` returns `Course`, maps 404 to
"Course not found."). No business logic in the client. **Consistent.**

**C4 — Details route (owner: Spec 02/03; consumers: 02, 04).**
Canonical path `/lifelong-learning/courses/:courseId`, realised by
`client/src/app/lifelong-learning/courses/[courseId]/page.tsx`. The path is
encoded once as `CATALOGUE_HREF` in `client/src/components/courses/details/routes.ts`
and reused by comparison via `courseDetailsHref` in
`client/src/components/comparison/routes.ts`. **Consistent.**

**C5 — Comparison interface (owner: Spec 04; consumers: 03 optional, 02 card).**
`useComparison()` / `ComparisonApi` in
`client/src/components/comparison/comparison-context.tsx` exposes
`items, add, remove, has, clear, count, isFull, max (=4)` plus `status` for a
live region; `add` returns `'added' | 'duplicate' | 'full'`. Spec 03 consumes a
structural subset via `details/comparison-seam.ts`; the catalogue card consumes
it through `AddToCompareButton`. The provider is mounted in the shell (see C-mount
below). **Consistent.**

**C6 — Comparison route (owner: Spec 04; consumers: 02, 03).**
Static segment `/lifelong-learning/courses/compare`, realised by
`client/src/app/lifelong-learning/courses/compare/page.tsx` and encoded as
`COMPARISON_HREF`. Next.js matches the static `compare` segment before the
dynamic `[courseId]`, so there is no collision. **Consistent** — final path and
routing precedence are formally re-confirmed in TASK-602.

**C7 — Enquiry entry route/params (owner: Spec 05; consumers: 03, 04).**
Nested route `/lifelong-learning/courses/:courseId/enquire`, realised by
`client/src/app/lifelong-learning/courses/[courseId]/enquire/page.tsx`. Encoded
once as `enquiryHref(courseId)` in `details/routes.ts`, re-exported by
`comparison/routes.ts`, so both Details and Comparison link to the same target.
CQ-1 (route shape) resolved to the nested route and Spec 05 ships exactly that
path, so the seam is live end to end. **Consistent.**

**C8 — Enquiry submission API (owner: Spec 05; consumer: enquiry form).**
`POST /api/enquiries` in `server/src/routes/enquiries.ts`, validated at the
boundary by `enquiryInputSchema` (`server/src/domain/enquiry.ts`). Success is
`201 { data: { reference, courseId, courseTitle, status, createdAt } }`; errors
use the Spec 01 envelope. Client transport `enquiriesApi.submit` in
`client/src/lib/enquiries/api.ts`, with the mirrored `EnquiryInput` /
`EnquiryConfirmationResult` and `ENQUIRY_TYPES` enum in `enquiries/types.ts`.
The success payload deliberately carries no submitted personal fields.
**Consistent.**

**C9 — Spec 01 infrastructure (owner: Spec 01; consumers: 02–05).**
Server: `src/http/validate.ts`, `api-error.ts`, `async-handler.ts`,
`error-handler.ts` (incl. body-parser 400/413 mapping added additively by
Spec 05), `src/config/*` (env/logger), and `src/app.ts` composing Helmet, CORS,
and `express.json({ limit })`. Client: the API base-URL resolver
`resolveApiBaseUrl()` in `client/src/lib/webmcp/adapter.ts` (consumed by both
`coursesApi` and `enquiriesApi`), the UI primitives under `components/ui/*`, and
`lib/cn.ts`. **Consistent.**

### Provider / shell mount (supports C5, CQ-4)

`ComparisonProvider` (Spec 04, C5) is already mounted in the Spec 01 shell at
`client/src/app/layout.tsx`, together with `ComparisonAnnouncer` and
`ComparisonBar`, so comparison state is shared across catalogue/details/
comparison for a session. Spec 06 (TASK-604) will introduce an integration-owned
`AppProviders` wrapper and add a shell-level `NotificationProvider` alongside it;
today the comparison provider sits directly in `layout.tsx`.

### Seams that are missing or inconsistent (deferred to later Phase-0/Phase-1 tasks)

None of C1–C9 is broken; all nine are present and consistent as implemented.
The following are integration-level items still open by design, not contract
defects, and are owned by later tasks:

- **`AppProviders` wrapper not yet present (CQ-4 completion).** The comparison
  provider is mounted directly in `layout.tsx`; the integration-owned
  `AppProviders` wrapper and the shell-level `NotificationProvider` (CQ-5) are
  introduced by TASK-604. No global notification channel exists yet.
- **Comparison-route precedence (CQ-2).** Present and non-colliding as written;
  formal confirmation of the final path + Next.js precedence is TASK-602.
- **Top-level `/courses/:courseId` alias (CQ-3).** Not added by default (no such
  route exists today); decision recorded/finalised in TASK-603. Default is no
  alias.
- **Client transport naming.** The client base-URL helper lives under
  `lib/webmcp/adapter.ts`; the `webmcp` folder is Phase-1 scaffolding with **no**
  registered capabilities. Only `resolveApiBaseUrl` (the C9 client boundary) is
  consumed by Phase-1 features — no agent/WebMCP behaviour is wired in Phase 1.

---

## Contract validation (TASK-601)

> **Status:** Validated against the implemented code in `App/client` and
> `App/server` (Specs 01–05). This section is the validation required by
> requirements §10 / FR-611, NFR-602, NFR-608. It builds on the TASK-600
> inventory above: for each contract C1–C9 it records **consistent** or the
> specific discrepancy, cross-checking the input/output/owner/consumer stated in
> requirements §10 against the real request/response shapes and types.
>
> **Scope note.** Analysis/documentation only. No feature internals, the Course
> model, backend endpoints, or route shapes were changed. Verification gates at
> validation time: `npm run typecheck` → 0 errors, `npm run lint` → 0
> warnings/errors (see gate output at the end of this section).

### Result summary

| # | Contract | §10 owner → consumer | Validation result |
| - | -------- | -------------------- | ----------------- |
| C1 | Course model | Spec 02 → 03,04,05 | **Consistent — unchanged.** Single definition each side, no fork/drift. |
| C2 | Course ID | Spec 02 → 03,04,05 | **Consistent.** One `id` string flows through routes, links, comparison, enquiry. |
| C3 | Course list/detail API | Spec 02 → 03,04,05 | **Consistent.** Server routes and client transport match the §10 shapes. |
| C4 | Details route | Spec 02/03 → 02,04 | **Consistent.** Path realised and encoded once; reused by comparison. |
| C5 | Comparison interface | Spec 04 → 03,02 | **Consistent.** `useComparison()` surface matches §10 (`max=4`). |
| C6 | Comparison route | Spec 04 → 02,03 | **Consistent.** Static `compare` segment; precedence formally re-checked in TASK-602. |
| C7 | Enquiry entry route/params | Spec 05 → 03,04 | **Consistent.** Nested route encoded once, re-exported to comparison. |
| C8 | Enquiry submission API | Spec 05 → form | **Consistent.** `201 {data:{…}}` shape matches server + client mirror. |
| C9 | Spec 01 infra | Spec 01 → 02–05 | **Consistent.** Shared boundary/UI primitives used by all consumers. |

**No conflicts found.** All nine contracts are consistent between requirements
§10 and the implemented code, so there is nothing to hand to TASK-603 as a
contract defect. The open items already noted in the TASK-600 inventory
(`AppProviders`/`NotificationProvider` mount = CQ-4/CQ-5, comparison-route
precedence confirmation = CQ-2, top-level alias decision = CQ-3) remain
**integration decisions**, not contract inconsistencies, and stay owned by
TASK-602/603/604.

### Evidence per contract

**C1 — Course model — consistent, unchanged.**
- Server authoritative schema: `server/src/domain/course.ts` — `courseSchema`
  with 23 fields.
- Client mirror: `client/src/lib/courses/types.ts` — `COURSE_SCHEMA` / `Course`,
  same 23 fields and the same six enum `const` arrays (`DISCIPLINES`,
  `COURSE_TYPES`, `DELIVERY_MODES`, `COURSE_LEVELS`, `COURSE_STATUSES`,
  `COURSE_AVAILABILITIES`) with identical members.
- Field-by-field the shapes align. The only differences are the intended
  server-authoritative tightenings: `durationWeeks` is `int().positive()`
  (server) vs `number().finite()` (client); `fee` is `nonnegative()` vs
  `finite()`; dates are `isoDate`-regex-validated server-side vs plain `string()`
  client-side. These are looser-on-the-client-by-design (the client only
  renders; the server is the trust boundary), not a forked definition.
- No independent Course definition exists elsewhere: the comparison layer imports
  `COURSE_SCHEMA` (`client/src/components/comparison/comparison-context.tsx`)
  rather than declaring its own. **Single definition per side, no drift.**

**C2 — Course ID — consistent.**
- `Course.id` is `z.string().min(1)` in both schemas. The same value is the
  `[courseId]` route segment for details and enquiry, the comparison key
  (`has(courseId)` / `remove(courseId)` in the comparison context), and the
  `courseId` field of the enquiry payload (`enquiryInputSchema` server-side;
  `EnquiryInput` in `client/src/lib/enquiries/types.ts`). Identity is carried
  unchanged Catalogue → Details → Comparison → Enquiry.

**C3 — Course list/detail API — consistent.**
- Server: `server/src/routes/courses.ts` wires `GET /api/courses` (validate query
  → `courseController.list`) and `GET /api/courses/:courseId` (validate params →
  `courseController.getById`). Both READ, no logic in the route.
- Client: `client/src/lib/courses/api.ts` — `coursesApi.list` returns
  `CourseListResponse` (`{ data, pagination }`); `coursesApi.getById` requests
  `/api/courses/:courseId`, returns `body.data` (a `Course`), and maps HTTP 404
  to the message "Course not found." Matches §10 (`{data,pagination}` /
  `{data:Course}`, 404 if unlisted).

**C4 — Details route — consistent.**
- Realised by `client/src/app/lifelong-learning/courses/[courseId]/page.tsx`
  (file confirmed present).
- Encoded once as `CATALOGUE_HREF` in
  `client/src/components/courses/details/routes.ts` and reused by comparison via
  `courseDetailsHref()` in `client/src/components/comparison/routes.ts` (which
  imports `CATALOGUE_HREF` rather than restating the path). Path matches §10:
  `/lifelong-learning/courses/:courseId`.

**C5 — Comparison interface — consistent.**
- `client/src/components/comparison/comparison-context.tsx` exposes
  `ComparisonApi` = `items, add, remove, has, clear, count, isFull, max, status`.
  `MAX_COMPARISON_COURSES = 4` (matches §10 `max(=4)`). `add(course)` returns
  `'added' | 'duplicate' | 'full'`; duplicates and over-capacity adds are no-ops.
  The hook throws outside a `ComparisonProvider`. Consumed structurally by Spec 03
  and by the catalogue card. Matches the §10 input/output.

**C6 — Comparison route — consistent.**
- Realised by `client/src/app/lifelong-learning/courses/compare/page.tsx` (file
  confirmed present); encoded as `COMPARISON_HREF` in
  `client/src/components/comparison/routes.ts`. The static `compare` segment sits
  beside dynamic `[courseId]` and Next.js resolves the static segment first, so
  they do not collide. Path matches the §10 example. (Formal precedence
  re-confirmation is TASK-602 — an integration confirmation, not a defect.)

**C7 — Enquiry entry route/params — consistent.**
- Realised by
  `client/src/app/lifelong-learning/courses/[courseId]/enquire/page.tsx` (file
  confirmed present). Encoded once as `enquiryHref(courseId)` in
  `client/src/components/courses/details/routes.ts` and re-exported by
  `client/src/components/comparison/routes.ts`, so Details and Comparison link to
  the same target. Path matches §10:
  `/lifelong-learning/courses/:courseId/enquire`. (CQ-1 resolved to the nested
  route; Spec 05 ships exactly that.)

**C8 — Enquiry submission API — consistent.**
- Server: `server/src/routes/enquiries.ts` wires `POST /api/enquiries` behind
  `validate('body', enquiryInputSchema)`; `server/src/controllers/enquiry-controller.ts`
  responds `res.status(201).json({ data: result })` and maps a missing/non-listable
  course to `404 NOT_FOUND`. Request shape (`enquiryInputSchema`: `name, email,
  phone?, courseId, enquiryType, message`) and enum (`ENQUIRY_TYPES` = `general |
  course_content | fees_funding | admissions | other`) in
  `server/src/domain/enquiry.ts`.
- Client: `client/src/lib/enquiries/api.ts` — `enquiriesApi.submit` returns
  `body.data` typed as `EnquiryConfirmationResult` (`reference, courseId,
  courseTitle, status, createdAt`), with the enum and `EnquiryInput` mirrored in
  `client/src/lib/enquiries/types.ts`. The success payload carries no submitted
  personal fields. Matches §10 (`201 {data:{reference,…}}` / envelope errors).

**C9 — Spec 01 infra — consistent.**
- Server boundary reused by all features: `server/src/http/{validate,async-handler}.ts`
  (used by both `courses.ts` and `enquiries.ts`), the `ApiError` taxonomy +
  error handler, config/logger, and `app.ts` (Helmet/CORS/`express.json`).
- Client boundary: `resolveApiBaseUrl()` in `client/src/lib/webmcp/adapter.ts`
  is consumed by both `coursesApi` and `enquiriesApi`; UI primitives under
  `components/ui/*` and `lib/cn.ts` back the feature UIs. The `webmcp` folder is
  Phase-1 scaffolding — only `resolveApiBaseUrl` (the C9 client boundary) is used
  by Phase-1 features; no agent/WebMCP behaviour is wired.

### Verification gates

Run from `App/` after appending this validation section (documentation only — no
code changes):

- `npm run typecheck` → **0 errors** (server + client `tsc --noEmit` both pass).
- `npm run lint` → **0 warnings/errors** (server ESLint + client `next lint`:
  "No ESLint warnings or errors").

---

## Route-shape confirmation (TASK-602)

> **Status:** Confirmed against the implemented app-router layout and catalogue
> state code in `App/client` (Specs 02–05 implemented). This section satisfies
> the confirmation required by FR-619 (deep links render the correct page),
> FR-624 (cross-feature navigation preserves relevant context, e.g. catalogue
> query state), and FR-626 (route/alias decisions recorded as integration
> decisions). It builds on the C6 (comparison route) and catalogue seams already
> inventoried in TASK-600/601.
>
> **Scope note.** Confirmation/analysis only. No actual route collision and no
> missing query-preservation seam were found, so **no code was changed**. The
> comparison route path and Next.js precedence, and the catalogue's URL-backed
> query state, already hold as required.

### 1. Comparison route path — decided and non-colliding

- **Final path:** `/lifelong-learning/courses/compare`, encoded once as
  `COMPARISON_HREF` in `client/src/components/comparison/routes.ts` and realised
  by `client/src/app/lifelong-learning/courses/compare/page.tsx`. This is the
  canonical comparison route; CQ-2 is settled on this value.
- **Directory layout (precedence evidence).** Under
  `client/src/app/lifelong-learning/courses/` the router tree is:

  ```
  courses/
  ├── page.tsx            # /lifelong-learning/courses          (catalogue)
  ├── compare/
  │   └── page.tsx        # /lifelong-learning/courses/compare  (static segment)
  └── [courseId]/
      ├── page.tsx        # /lifelong-learning/courses/:courseId (dynamic segment)
      └── enquire/
          └── page.tsx    # /lifelong-learning/courses/:courseId/enquire
  ```

- **Precedence is correct.** In the Next.js App Router, a **static** route
  segment takes precedence over a **dynamic** segment at the same level. Because
  `compare/` is a static sibling of `[courseId]/`, the literal path
  `/lifelong-learning/courses/compare` matches `compare/page.tsx` first and is
  **never** interpreted as a course whose id is `"compare"`. The two segments
  therefore cannot collide. This matches the inline reasoning already recorded in
  `compare/page.tsx` ("A static `compare` segment sits beside the `[courseId]`
  details route; Next.js matches the static segment first, so the two never
  collide.").
- **Deep-link render (FR-619).** Each route is a first-class app-router page
  (`compare/page.tsx`, `[courseId]/page.tsx`, `[courseId]/enquire/page.tsx`, and
  the catalogue `page.tsx` wrapped in `Suspense` so it can read search params), so
  opening any of these URLs directly renders the correct page. Formal deep-link +
  back-navigation seam checks are covered later by TASK-610/TASK-621.

### 2. Catalogue query state — preserved via the URL

- **Single source of truth is the URL.** `client/src/components/courses/CourseCatalogue.tsx`
  initialises its query state from the URL — `useState(() => parseCatalogueState(searchParams))`
  — and reflects every change back into the URL with
  `router.replace(qs ? \`?${qs}\` : '?', { scroll: false })`. `replace` (not
  `push`) is used deliberately so tweaking filters does not spam history.
- **Serialisation seam.** `client/src/components/courses/catalogue-query.ts`
  provides the pure `parseCatalogueState()` / `toSearchParams()` pair covering the
  full state — `keyword`, `filters` (discipline / courseType / level /
  deliveryMode / availability), `sort`, `direction`, and `page` — so the catalogue
  is deep-linkable and shareable, and any prior selection is restorable from the
  URL alone. No business logic lives here; the backend still computes results.
- **How "back to catalogue" restores context (FR-624).** Because the whole query
  lives in the URL, using the browser **Back** control after navigating away
  (Details / Comparison / Enquiry) returns to the previous catalogue URL with its
  query string intact, and the catalogue re-hydrates that state on mount — prior
  results, filters, sort, and page are restored. This is consistent with FR-618's
  predictable back/forward behaviour.
- **Note on the explicit "Back to catalogue" links.** The in-page "Back to
  catalogue" affordances (Details `CourseActions`/`CourseDetails`, Comparison
  `ComparisonView`, Enquiry states) link to the **bare** `CATALOGUE_HREF`
  (`/lifelong-learning/courses`), which is a deliberate reset to the unfiltered
  catalogue rather than a history restore. Context restoration is provided by the
  browser Back control against the URL-encoded state above. This distinction
  (explicit link = fresh catalogue; browser Back = restored query) is the exact
  behaviour TASK-610 wires/asserts and TASK-621 covers with seam tests; it is
  noted here so the two paths are not conflated.

### Outcome

- **Comparison route:** final path `/lifelong-learning/courses/compare`;
  precedence over `[courseId]` confirmed from the directory layout — **no
  collision, no change required.**
- **Catalogue query preservation:** the URL-backed state seam
  (`CourseCatalogue` + `catalogue-query.ts`) is present and sufficient for
  restore-on-back — **no missing seam, no change required.**
- Deep-link and back-navigation **checks** are deferred to the seam tests in
  TASK-610 / TASK-621 by design.

### Verification gates (TASK-602)

Confirmation task; no source changed. Gates re-run from `App/` to confirm the
tree is still clean:

- `npm run typecheck` → **0 errors**.
- `npm run lint` → **0 warnings / 0 errors**.
---

## Contract conflict resolutions (TASK-603)

> **Status:** Resolved. This section drives the documented, approved resolution
> of the five recorded contract conflicts/open questions (requirements §11,
> CQ-1..CQ-5) required by FR-626, assigning each an owner and a tracking task.
> It builds on the TASK-600 inventory and the TASK-601 validation above, which
> found **no contract defects** — every CQ is an integration decision, not a
> broken seam. The chosen values here align with the design's Architecture
> Decisions AD-605 (CQ-1), AD-606 (CQ-2), AD-607 (CQ-3), AD-602 (CQ-4), and
> AD-603 (CQ-5).
>
> **No prior spec is modified.** Per TASK-600/601, every resolution is already
> consistent with what Specs 02–05 ship, so none requires a prior-spec change.
> Had any resolution needed one (e.g. changing Spec 05's enquiry route), it would
> be raised as an explicit shared-contract change and applied by that spec's
> owner during review — that path was **not** triggered here.
>
> **Scope note.** Documentation only. No feature internals, the Course model,
> backend endpoints, or route shapes were changed by this task. Verification
> gates at resolution time: `npm run typecheck` → 0 errors, `npm run lint` → 0
> warnings/errors (see gate output at the end of this section).

### Resolution summary

| CQ | Resolution | Owner | Status | Tracked by |
| -- | ---------- | ----- | ------ | ---------- |
| **CQ-1** Enquiry entry route shape | Nested route `/lifelong-learning/courses/:courseId/enquire` (not the query-based `…/enquiry?courseId=…` candidate). Already shipped by Spec 05; all consumers (Details, Comparison) link to it via the single `enquiryHref(courseId)` helper. | Spec 05 / Integration confirms | ✅ Resolved — settled in code | TASK-603 (decision); consumed via TASK-611 / TASK-612 |
| **CQ-2** Comparison route path | Static path `/lifelong-learning/courses/compare`; Next.js matches the static `compare` segment before the dynamic `[courseId]`, so no collision. Precedence formally confirmed in TASK-602. | Spec 04 / Integration | ✅ Resolved — settled in code | TASK-602 (precedence) / TASK-603 (decision) |
| **CQ-3** Top-level `/courses/:courseId` alias | **Not added by default.** The canonical Lifelong-Learning route `/lifelong-learning/courses/:courseId` stays authoritative; no top-level alias/redirect is introduced (FR-626 default). | Integration (Spec 06) | ✅ Resolved — no alias | TASK-603 (decision); revisited only in TASK-618 if ever approved |
| **CQ-4** Comparison provider mount ownership | Integration owns mounting shared providers via an integration-owned `AppProviders` wrapper in the Spec 01 shell (mounting Spec 04's `ComparisonProvider`); no feature internals change. | Integration (Spec 06) | ✅ Resolved — decision approved; implemented in TASK-604 | TASK-604 |
| **CQ-5** Global notification pattern | Integration defines a shell-level `NotificationProvider` + `useNotify()` (accessible `aria-live`), adopted for cross-feature feedback without removing valid local states. | Integration (Spec 06) | ✅ Resolved — decision approved; implemented in TASK-604 / TASK-615 | TASK-604 (provider) / TASK-615 (`useNotify` + adoption) |

### Rationale and consumer-facing final values

**CQ-1 — Enquiry entry route shape → nested route (owner: Spec 05; Integration confirms).**
The concrete, final shape is `/lifelong-learning/courses/:courseId/enquire`
(design AD-605). It is preferred over the query-based
`/lifelong-learning/enquiry?courseId=…` candidate because it keeps the course
context explicit in the path, yields natural breadcrumbs and shareable deep
links, and nests cleanly under the existing course route. This is exactly the
route Spec 05 ships
(`client/src/app/lifelong-learning/courses/[courseId]/enquire/page.tsx`), and the
only encoding of it for consumers is `enquiryHref(courseId)` in
`client/src/components/courses/details/routes.ts` (re-exported by
`comparison/routes.ts`). **Final value for all consumers:**
`enquiryHref(courseId)` → `/lifelong-learning/courses/${courseId}/enquire`. No
code change was needed; Details and Comparison already point at it (wired by
TASK-611 / TASK-612).

**CQ-2 — Comparison route path → static `compare` segment (owner: Spec 04; Integration).**
The final path is `/lifelong-learning/courses/compare`, encoded once as
`COMPARISON_HREF` in `client/src/components/comparison/routes.ts` (design AD-606).
Because `compare/` is a **static** sibling of the **dynamic** `[courseId]/`
segment, the Next.js App Router matches the literal `compare` path first — it is
never interpreted as a course whose id is `"compare"`, so the two cannot collide.
Routing precedence and deep-link rendering were formally confirmed in TASK-602
(see the TASK-602 section above). **Final value for all consumers:**
`COMPARISON_HREF` → `/lifelong-learning/courses/compare`.

**CQ-3 — Top-level `/courses/:courseId` alias → not added (owner: Integration).**
The Spec 03 objective once referenced a conceptual `/courses/:courseId`, but the
canonical route established by Spec 02 is `/lifelong-learning/courses/:courseId`.
The integration decision (design AD-607, FR-626 default) is to **not** add a
top-level alias or redirect: the Lifelong-Learning route stays the single
canonical course path. No such top-level route exists in `client/src/app` today,
so this decision requires no change and introduces no duplicate entry point.
Should an alias ever be approved later, it would be introduced only under
TASK-618 as an explicit integration decision; the default remains **no alias**.

**CQ-4 — Comparison provider mount ownership → Integration via `AppProviders` (owner: Integration / Spec 06).**
Spec 04 assumed its `ComparisonProvider` is mounted "in the app shell", and the
shell is a Spec 01 asset — so **Integration owns the mount point**, not Spec 04.
The approved resolution (design AD-601/AD-602) is an integration-owned
`AppProviders` client wrapper in the shell that mounts Spec 04's
`ComparisonProvider` (and the CQ-5 `NotificationProvider`) once, with no business
logic and no change to feature internals. This is implemented by **TASK-604**.
At the time of this resolution the provider is mounted directly in
`client/src/app/layout.tsx` (alongside `ComparisonAnnouncer` / `ComparisonBar`);
TASK-604 relocates that mount into `AppProviders` without altering behaviour, so
comparison state remains shared across catalogue/details/comparison for a
session.

**CQ-5 — Global notification pattern → shell-level `NotificationProvider` + `useNotify` (owner: Integration / Spec 06).**
Specs 04 (comparison limit reached) and 05 (enquiry submitted) each describe
**local** feedback, and there is no shared notification channel yet. The approved
resolution (design AD-603, FR-621) is a lightweight, accessible, shell-level
`NotificationProvider` exposing a `useNotify()` hook that renders status messages
in an `aria-live` region (colour-independent, screen-reader announced). Features
adopt it for cross-feature feedback **without** removing their valid local
states. The provider is mounted by **TASK-604** (inside `AppProviders`), and
`useNotify()` plus its cross-feature adoption is implemented by **TASK-615**.

> **Note on tracking-task numbering.** Requirements §11 tentatively tagged CQ-5
> to "TASK-612"; the authoritative tracking for the notification pattern is
> **TASK-604** (provider mount) and **TASK-615** (`useNotify` + adoption), per the
> tasks plan and design AD-603. TASK-612 wires Comparison → Details/Enquiry/
> Catalogue and only *optionally* surfaces a notification via that same channel.

### Consumers know the final values

All resolved values are already encoded in single-source constants/helpers that
consumers import, so there is no ambiguity left for wiring tasks:

- Enquiry (CQ-1): `enquiryHref(courseId)` in `details/routes.ts`.
- Comparison (CQ-2): `COMPARISON_HREF` in `comparison/routes.ts`.
- Details (context): `CATALOGUE_HREF` / details route in `details/routes.ts`.
- No top-level alias (CQ-3): nothing to import — the LL routes are canonical.
- Provider mount (CQ-4) and notifications (CQ-5): delivered as shell primitives
  by TASK-604 / TASK-615 (`AppProviders`, `NotificationProvider`, `useNotify`).

### Verification gates (TASK-603)

Documentation/decision task; no source changed. Gates re-run from `App/` to
confirm the tree is still clean:

- `npm run typecheck` → **0 errors**.
- `npm run lint` → **0 warnings / 0 errors**.

---

## Delivered integration summary (TASK-624)

> **Status:** Spec 06 integration is **implemented**. This section records the
> as-delivered state of the integrated human website — the shell/provider
> architecture, global navigation, global states, and the end-to-end journey —
> and satisfies the documentation requirement NFR-604 (reuse of Spec 01
> primitives and Spec 02 conventions). It builds on, and does not restate, the
> TASK-600 inventory, TASK-601 validation, TASK-602 route confirmation, and
> TASK-603 conflict resolutions above; the final resolved contracts/routes live
> in those sections.
>
> **Scope note.** Integration is frontend wiring on the Spec 01 shell. It changed
> **no** feature internals, **no** shared Course model, and added **no** backend
> endpoints. WebMCP / agents / AI are **not** part of this work — they remain a
> future phase (see the closing note).

### Shell & provider architecture

The Spec 01 shell (`RootLayout` → skip link → `Header` → `PageContainer` main →
`Footer`) is extended by integration without touching feature internals:

- **`AppProviders`** — `client/src/components/providers/AppProviders.tsx` — is the
  integration-owned composition of cross-feature client providers (CQ-4/CQ-5,
  AD-601). It wraps Spec 04's **`ComparisonProvider`** with the shell-level
  **`NotificationProvider`** and contains **no** business logic. It is mounted
  once in the root layout (`client/src/app/layout.tsx`), so a learner's
  comparison shortlist and the global notification channel are shared across
  every route in a session (FR-623, FR-621).
- **`RouteFocus`** — `client/src/components/layout/RouteFocus.tsx` — is mounted in
  the shell and manages focus on client-side route changes: on each pathname
  change (after the initial load) it moves focus to the main landmark so
  keyboard/screen-reader users are re-oriented to the new page instead of being
  stranded on a stale control (AD-609, NFR-605).
- **`PageContainer` main is focusable** —
  `client/src/components/layout/PageContainer.tsx` renders the single
  `<main id="main-content" tabIndex={-1}>` landmark. `tabIndex={-1}` makes it the
  programmatic focus target for both the skip link and `RouteFocus`, without
  adding it to the natural tab order.

### Navigation

- **Primary nav + Lifelong-Learning sub-nav** share one responsive/mobile
  pattern via **`NavDisclosure`** —
  `client/src/components/layout/NavDisclosure.tsx`: an inline flex-wrap row at
  `md`+ that collapses behind an accessible disclosure toggle
  (`aria-expanded`/`aria-controls`, Escape-to-close, visible focus) below `md`.
  It is a genuine mobile pattern rather than a shrunken desktop bar (NFR-606);
  each nav supplies its own active-state rule.
- **Breadcrumbs** — the reusable `Breadcrumbs`
  (`client/src/components/layout/Breadcrumbs.tsx`, semantic `nav` + ordered list,
  `aria-current` on the last crumb) appear on the course routes (catalogue,
  details, comparison, enquiry), with labels derived from loaded data
  (see `[courseId]/CourseBreadcrumbs.tsx`) (FR-617).
- **Footer secondary links** — the footer carries useful secondary links and
  retains the synthetic-data / demonstration notice, consistently on every page
  (FR-616).

### Global states

- **Global not-found page** — `client/src/app/not-found.tsx` gives unknown routes
  a consistent 404 with a path back into the site (FR-627).
- **Notification pattern (`useNotify`)** — the shell-level `NotificationProvider`
  / `useNotify()`
  (`client/src/components/notifications/notification-context.tsx`) renders
  accessible `aria-live` status messages with textual tone labels (colour is a
  secondary cue). It is adopted for cross-feature feedback — **enquiry submitted**
  and **comparison full** — without removing any feature's valid local states
  (FR-621).
- **Consistent error / empty / loading** — every feature follows the shared
  request-state discriminated union and the loading/empty/error/not-found
  patterns catalogued in the UI-consistency guide (see below), so states look
  and behave the same across catalogue, details, comparison, and enquiry
  (FR-628..FR-631).

### End-to-end journey

The delivered journey carries the **stable Course ID (C2)** unchanged through
every step:

```
Catalogue → Details → Comparison → Enquiry → Confirmation → return
```

- **Catalogue → Details / → Comparison** — card "View Details" opens the details
  route (C4); the card's add-to-compare control updates shared comparison state
  (C5) surfaced by the comparison bar/count.
- **Details → Comparison / → Enquiry / → back** — the details page uses the same
  add-to-compare interface (C5), links "Enquire" to the confirmed enquiry entry
  route (C7), and "Back to catalogue" (browser Back restores the URL-backed
  catalogue query state — see TASK-602).
- **Comparison → Details / → Enquiry / → Catalogue** — per-course actions link to
  the details route (C4), the enquiry entry route (C7), and the catalogue, each
  carrying the right course identity.
- **Enquiry → Confirmation → return** — a successful `POST /api/enquiries` (C8)
  ends in the confirmation state with a reference and a clear return path, and
  surfaces a global notification via `useNotify`.

The **final resolved contracts and routes** (C1–C9, and CQ-1..CQ-5) are recorded
in the TASK-600 inventory, TASK-601 validation, TASK-602 route confirmation, and
TASK-603 resolutions above — this summary links to them rather than restating
them. The single-source route/interface encodings consumers import are
`enquiryHref(courseId)` and `CATALOGUE_HREF` (`details/routes.ts`),
`COMPARISON_HREF` and `courseDetailsHref()` (`comparison/routes.ts`), and
`useComparison()` (`comparison/comparison-context.tsx`).

### UI consistency

Cross-feature UI consistency (buttons, forms, cards, status/availability,
request-state union, page layout, notifications) is governed by the
**UI-consistency guide**: [`ui-consistency-guide.md`](./ui-consistency-guide.md).
It records the canonical source file for each shared pattern and confirms the
reuse of Spec 01 primitives and Spec 02 conventions required by NFR-604.

### Future phase (not implemented here)

WebMCP / agent capabilities are **Phase 2 (Agent-Ready Transformation)** and are
**not** implemented in Spec 06 or anywhere in Phase 1. The `client/src/lib/webmcp`
folder is Phase-1 scaffolding whose only Phase-1 use is the `resolveApiBaseUrl()`
transport boundary (C9); there are no agent tools, no registry wiring, no agent
permissions, and no AI integration. The agent-ready transformation is designed
only after Phase 1 is complete.

### Verification gates (TASK-624)

Documentation only — no source changed. Gates re-run from `App/`:

- `npm run typecheck` → **0 errors**.
- `npm run lint` → **0 warnings / 0 errors**.

## Phase 1 integration readiness (TASK-625)

Final integration readiness gate for Spec 06. This is a docs-only record; no
feature code was changed. All quality gates were run from `App/` on the
integrated site and passed.

### Gate results

| Gate | Command (from `App/`) | Result |
| ---- | --------------------- | ------ |
| Type safety (NFR-603) | `npm run typecheck` | **Pass** — 0 TypeScript errors (server + client, strict mode) |
| Lint | `npm run lint` | **Pass** — 0 warnings / 0 errors (server + client) |
| Server tests | `npm run test --workspace server` | **Pass** — 7 test files, **97 tests** passed |
| Client tests | `npm run test --workspace client` | **Pass** — 33 test files, **225 tests** passed |
| Production build | `npm run build` | **Pass** — server `tsc` build + Next.js build succeeded |
| Boot / health (NFR-610) | built server + `GET /api/health` | **Pass** — HTTP 200, `{"status":"ok"}` |

The Next.js production build generated **11 routes**, including the four course
journey routes:

- `/` (static)
- `/about`, `/admissions`, `/education`, `/industry` (static)
- `/lifelong-learning` (static)
- `/lifelong-learning/courses` (static — catalogue)
- `/lifelong-learning/courses/[courseId]` (dynamic — details)
- `/lifelong-learning/courses/[courseId]/enquire` (dynamic — enquiry)
- `/lifelong-learning/courses/compare` (static — comparison)
- `/_not-found` (static — global 404, FR-627)

The static `compare` segment and dynamic `[courseId]` segment coexist without
collision (CQ-2 resolution confirmed by the build output).

### Integration Definition-of-Done

- **Zero type errors** (NFR-603) — confirmed.
- **Zero lint warnings/errors** — confirmed.
- **All tests pass** — 97 server + 225 client = **322 tests**, deterministic,
  no real network (faked API clients / stubbed routers per NFR-609).
- **Production build succeeds** and all integrated routes are generated.
- **App boots and `GET /api/health` returns `{"status":"ok"}`** — no regression
  to Spec 01 health/shell or Spec 02 catalogue behaviour (NFR-610).

The integration DoD is **satisfied**.

### Sign-off

Spec 06 (Human Website Integration & Completion) integration work is **complete
and ready**. The integrated human website compiles under strict TypeScript,
lints clean, passes its full seam/integration test suite, builds for production,
and boots healthy. This readiness gate is **handed off to Spec 07** for the
formal quality / release-readiness gate and the exhaustive
e2e / accessibility / responsive validation that Spec 07 owns.

_Requirements: NFR-603, NFR-607, NFR-610._
