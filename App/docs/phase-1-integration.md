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
| 05 | Human Course Enquiry | Specified | First WRITE: enquiry domain/service/repository + `POST /api/enquiries` + enquiry form/confirmation |
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
  Spec 05** (e.g. `/lifelong-learning/courses/:courseId/enquire`). Spec 03 links to
  it; until agreed, Spec 03 points at the planned route.
- **As implemented (Spec 03):** the action links to
  `/lifelong-learning/courses/:courseId/enquire`, encoded in exactly one place —
  `enquiryHref` in `client/src/components/courses/details/routes.ts`. If Spec 05
  finalises a different target, that single helper is the only change required.
  Until Spec 05 lands the route does not exist, so following the link reaches the
  app's not-found page; nothing else is affected.

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
  courseTitle?, status, createdAt } }`; errors use the Spec 01 envelope.
- **Enquiry-type enum** — `general | course_content | fees_funding | admissions |
  other` (server-authoritative; client derives).
- **Enquiry entry route/params** — the concrete navigation target for Spec 03/04.

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
   *Remaining work:* confirm `enquiryHref` matches the route Spec 05 ships.
5. **Comparison view → Details / Enquire / Back** — Spec 04 links to Spec 03 route,
   Spec 05 entry route, and the catalogue. **Wired**, with the catalogue and
   enquiry targets imported from `details/routes.ts` rather than restated, so
   the enquiry entry point stays changeable in one edit when Spec 05 lands.
6. **Enquiry form → `POST /api/enquiries` → Confirmation** — Spec 05 end to end.
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
