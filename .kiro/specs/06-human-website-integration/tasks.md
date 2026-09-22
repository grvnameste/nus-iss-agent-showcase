# Implementation Plan: Human Website Integration & Completion

**Project:** EduAgent Connect — WebMCP-Ready Education Website Demonstrator
**Spec ID:** 06-human-website-integration
**Owner:** Integration Lead (feature seams provided by Teams A-D)
**Traceability:** Each task references requirements in `./requirements.md` and design sections in `./design.md`.

## Overview

This plan wires the independently-built human capabilities (Catalogue 02,
Details 03, Comparison 04, Enquiry 05) into one coherent website on the Spec 01
shell. It is a frontend integration effort: mount shared state, complete the
global shell/navigation, standardise cross-feature UI/state patterns, wire the
cross-feature navigation seams, validate the shared contracts, and prove the
end-to-end journey.

Integration must not change feature internals or the shared Course model, and
adds no new backend endpoints. No task implements WebMCP, agents, MCP, tools, or
AI (that is Phase 2). Reuse Spec 01 primitives and Spec 02 conventions.

## Tasks

- [x] 1. Contracts & conflict resolution (Phase 0)
- [x] 1.1 TASK-600 — Review Specs 01–05 integration points
  - Review all cross-feature seams and the consolidated contracts (requirements §10, `App/docs/phase-1-integration.md`): catalogue card seams, details affordances, comparison interface/route, enquiry route/API, and Spec 01 shell/infra.
  - Produce a written inventory of every integration point (C1–C9) with its owner and consumer confirmed; review against Specs 02–05 so no seam is missing.
  - Dependencies: none (Specs 01–05 already implemented in `App/`).
  - _Requirements: FR-611, FR-612, NFR-602_
- [x] 1.2 TASK-601 — Validate shared contracts (C1–C9)
  - Verify each contract's input/output/owner/consumer is consistent across specs: Course model C1, Course ID C2, course API C3, details route C4, comparison interface C5, comparison route C6, enquiry route C7, enquiry API C8, Spec 01 infra C9.
  - Confirm every contract is consistent or log a conflict (TASK-603); confirm the Course model (C1) is unchanged. Cross-check against Specs 02–05.
  - Dependencies: TASK-600.
  - _Requirements: FR-611, NFR-602, NFR-608_
- [x] 1.3 TASK-602 — Confirm route shapes (comparison & catalogue query)
  - Confirm the final comparison route path and its Next.js routing precedence relative to the dynamic `[courseId]` route; confirm catalogue query params are preserved on return.
  - Comparison route path must be decided and non-colliding; catalogue query preserved on "back to catalogue". Plan deep-link + back-navigation checks.
  - Dependencies: TASK-601.
  - _Requirements: FR-619, FR-624, FR-626_
- [x] 1.4 TASK-603 — Resolve documented contract conflicts (CQ-1..CQ-5)
  - Drive resolution of recorded conflicts: enquiry route shape (CQ-1), comparison route (CQ-2), top-level alias decision (CQ-3), provider mount ownership (CQ-4), global notification pattern (CQ-5). Do not modify prior specs silently; raise any needed prior-spec change explicitly.
  - Each CQ gets a documented, approved resolution with an assigned owner, recorded in `App/docs/phase-1-integration.md`; consumers know the final values.
  - Dependencies: TASK-601.
  - _Requirements: FR-626_

- [x] 2. Shared shell & cross-feature state (Phase 1)
- [x] 2.1 TASK-604 — Add `AppProviders` and mount comparison + notification providers
  - Introduce an integration-owned `AppProviders` client wrapper in the Spec 01 shell (design §3, §5); mount Spec 04's `ComparisonProvider` and a new shell-level `NotificationProvider`. No business logic in the wrapper; no feature internals changed.
  - Comparison state is shared across catalogue/details/comparison in a session; a global notification channel exists. Add a provider render test.
  - Dependencies: TASK-603.
  - _Requirements: FR-621, FR-623, NFR-601_
- [x] 2.2 TASK-605 — Complete global navigation (primary + Lifelong-Learning sub-nav)
  - Reuse the Spec 01 header/primary nav; add a shared Lifelong-Learning sub-navigation exposing Course Catalogue and Compare within the LL area (design §4).
  - Primary nav works from all pages with the active section indicated; LL sub-nav reaches the catalogue and comparison view. Add nav render/active-state tests.
  - Dependencies: TASK-602, TASK-604.
  - _Requirements: FR-614, FR-615, FR-618_
- [x] 2.3 TASK-606 — Complete header/footer
  - Keep the consistent header on every page; extend the footer with useful secondary links while retaining the synthetic-data/demonstration notice (design §4/§5).
  - Header and footer render consistently on every page; footer includes the demo notice and useful links. Add footer/header presence tests on representative routes.
  - Dependencies: TASK-605.
  - _Requirements: FR-616_
- [x] 2.4 TASK-607 — Add reusable breadcrumbs on course routes
  - Implement an accessible `Breadcrumbs` shell component (semantic `nav` + ordered list, `aria-current` on the last crumb) and place it on catalogue, details, comparison, and enquiry routes with labels derived from loaded data (design §4).
  - Correct breadcrumb trail on each course route; last crumb marked current. Add breadcrumb render/semantics tests.
  - Dependencies: TASK-605.
  - _Requirements: FR-617_

- [x] 3. Cross-feature navigation wiring (Phase 2)
- [x] 3.1 TASK-608 — Integrate Catalogue → Details
  - Ensure the catalogue card "View Details" navigates to the details route with the correct `courseId` (seam confirmation/wiring; no feature-internal change).
  - Activating "View Details" opens the correct course. Add a seam test (stubbed router / `href` assertion).
  - Dependencies: TASK-601.
  - _Requirements: FR-601_
- [x] 3.2 TASK-609 — Integrate Catalogue → Comparison
  - Wire the catalogue card's add-to-compare control (via `useComparison`) and expose a way to open the comparison view (e.g. the comparison bar/count).
  - Adding from a card updates comparison state/count and the course appears in the comparison view. Add an add-then-open-comparison seam test.
  - Dependencies: TASK-604.
  - _Requirements: FR-602, FR-623_
- [x] 3.3 TASK-610 — Integrate Details → Catalogue / Details → Comparison
  - Confirm "Back to catalogue" from Details restores prior catalogue query state (URL), and wire the optional add-to-compare affordance on Details via the shared interface.
  - Back returns to the prior catalogue view; add-to-compare on Details updates shared state everywhere. Add back-navigation + add-from-details seam tests.
  - Dependencies: TASK-604.
  - _Requirements: FR-603, FR-604, FR-624_
- [x] 3.4 TASK-611 — Integrate Details → Enquiry
  - Wire the Details "Enquire" action to the confirmed enquiry entry route, carrying the `courseId`.
  - Enquire opens the enquiry form associated with the same course id. Add a seam test asserting the enquiry route/param + course association.
  - Dependencies: TASK-603.
  - _Requirements: FR-605, FR-613_
- [x] 3.5 TASK-612 — Integrate Comparison → Details / → Enquiry / → Catalogue
  - Wire the comparison view's per-course actions: open details (C4 route), enquire (C7 route, carrying `courseId`), and return to catalogue.
  - Each action navigates correctly with the right course identity. Add seam tests for each action.
  - Dependencies: TASK-603.
  - _Requirements: FR-606, FR-607, FR-608, FR-613_
- [x] 3.6 TASK-613 — Integrate Enquiry → Confirmation → return path
  - Confirm a successful submission ends in the confirmation state and provides a clear path back to a relevant location (course details / catalogue / Lifelong Learning); optionally surface a global notification.
  - Successful enquiry shows confirmation with reference and a working return path. Add a flow seam test with a faked enquiry API.
  - Dependencies: TASK-604.
  - _Requirements: FR-609, FR-610_

- [x] 4. Global UI, states & missing shell (Phase 3)
- [x] 4.1 TASK-614 — Standardise global UI patterns
  - Publish and apply the UI-consistency guide (buttons, forms, cards, status/availability, request-state union, layout) reusing Spec 01 primitives and Spec 02 conventions; align inconsistencies at the shell level only (design §5).
  - Features present consistent buttons/forms/cards/status; a documented guide exists. Do visual/spot checks + component tests where practical.
  - Dependencies: TASK-604.
  - _Requirements: FR-620, NFR-604_
- [x] 4.2 TASK-615 — Implement the global notification pattern
  - Implement `useNotify()` over the `NotificationProvider`, rendering accessible `aria-live` status messages; adopt it for cross-feature feedback (e.g. enquiry submitted, comparison limit reached) without removing valid local states.
  - Cross-feature feedback appears in an accessible, colour-independent notification region. Add notification render/aria-live tests.
  - Dependencies: TASK-604.
  - _Requirements: FR-621_
- [x] 4.3 TASK-616 — Complete global error handling (404 + consistency)
  - Add a global `not-found` page for unknown routes with a path back into the site; ensure invalid/unavailable-course, API-failure/network, and failed-enquiry states use consistent patterns/copy across features (design §8).
  - Unknown routes show a consistent 404; invalid-course / API-failure / failed-enquiry states are consistent and never expose internals. Add a 404 route test; do a consistency review.
  - Dependencies: TASK-605.
  - _Requirements: FR-627, FR-628, FR-629, FR-631, NFR-608_
- [x] 4.4 TASK-617 — Complete global loading/empty state consistency
  - Ensure loading and empty states (no catalogue results, empty comparison) follow the shared patterns with clear next steps (design §8).
  - Loading and empty states are consistent and provide guidance. Add empty/loading render checks.
  - Dependencies: TASK-614.
  - _Requirements: FR-630_
- [x] 4.5 TASK-618 — Complete missing human-website shell pieces
  - Complete remaining Phase-1 shell items: a Lifelong-Learning landing that surfaces catalogue/compare, consistent page metadata/titles, and any agreed route alias/redirect (only if approved in TASK-603/CQ-3). Do not expand beyond Phase 1.
  - LL landing surfaces the course journeys; page titles are consistent; alias behaves as decided (or is absent by default). Do metadata/landing checks; alias redirect check if applicable.
  - Dependencies: TASK-605, TASK-607.
  - _Requirements: FR-615, FR-622, FR-625, FR-626_

- [x] 5. Responsive & accessibility integration (Phase 4)
- [x] 5.1 TASK-619 — Validate responsive integration (incl. mobile navigation)
  - Provide a usable mobile navigation pattern for primary + LL sub-nav and verify the journey is consistent across mobile/tablet/desktop (design §9).
  - Navigation and journeys are usable at all breakpoints (not a shrunken desktop layout). Do responsive checks / manual breakpoint review.
  - Dependencies: TASK-605, TASK-607, TASK-616.
  - _Requirements: NFR-606, FR-618_
- [x] 5.2 TASK-620 — Validate accessibility integration (incl. focus management)
  - Verify site-wide landmarks/heading order, keyboard traversal of the full journey, visible focus, breadcrumb semantics, aria-live announcements, and sensible focus management on client-side route changes (design §10).
  - Keyboard-only users can complete the whole journey with visible focus and announced status; heading/landmark structure is correct. Do keyboard/a11y integration checks.
  - Dependencies: TASK-605, TASK-607, TASK-615, TASK-616.
  - _Requirements: NFR-605_

- [x] 6. Integration testing & journey validation (Phase 5)
- [x] 6.1 TASK-621 — Integration/seam tests
  - Implement seam tests for each cross-feature navigation path and Course-ID continuity, comparison-state sharing, breadcrumb correctness, the global 404, and the notification pattern — using stubbed routers/faked API clients.
  - All seam tests pass deterministically via `npm run test` (client; server where relevant).
  - Dependencies: TASK-608, TASK-609, TASK-610, TASK-611, TASK-612, TASK-613, TASK-616.
  - _Requirements: FR-612, FR-613, NFR-609_
- [x] 6.2 TASK-622 — End-to-end human journey validation
  - Validate the full journey Catalogue → Details → Comparison → Enquiry → Confirmation → return, including error/unavailable/empty paths, keeping scope to seam-level e2e (exhaustive e2e is Spec 07).
  - The end-to-end journey works with a stable Course ID and consistent states. Do manual + automated journey checks against `App`.
  - Dependencies: TASK-621.
  - _Requirements: FR-601, FR-602, FR-603, FR-604, FR-605, FR-606, FR-607, FR-608, FR-609, FR-610, FR-612, FR-613_
- [x] 6.3 TASK-623 — Non-regression check (Specs 01–05)
  - Confirm Spec 01 (health, shell) and Spec 02 (catalogue) still pass and Specs 03–05 still pass their own suites after integration.
  - No regressions in prior specs. Run existing suites + health/catalogue checks.
  - Dependencies: TASK-621.
  - _Requirements: NFR-610_

- [x] 7. Documentation & readiness (Phase 6)
- [x] 7.1 TASK-624 — Documentation
  - Update `App/docs/phase-1-integration.md` with the final resolved contracts/routes, the shell/provider architecture, the UI-consistency guide, and the end-to-end journey; add a short integration section to the root/docs README. State that WebMCP/agent is a future phase.
  - Docs reflect the integrated site and final contracts; reviewed against the implemented integration.
  - Dependencies: TASK-603, TASK-618.
  - _Requirements: NFR-604_
- [x] 7.2 TASK-625 — Phase 1 integration readiness review
  - Run the full quality gates (`npm run typecheck`, `npm run lint`, server + client tests, production build) and confirm the Definition-of-Done for integration; hand off to Spec 07 for the formal quality/release-readiness gate.
  - Zero type/lint errors; all tests pass; build succeeds; integration DoD satisfied. Capture gate output; record readiness sign-off.
  - Dependencies: TASK-619, TASK-620, TASK-621, TASK-622, TASK-623, TASK-624.
  - _Requirements: NFR-603, NFR-607, NFR-610_

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1.1"] },
    { "wave": 2, "tasks": ["1.2"] },
    { "wave": 3, "tasks": ["1.3", "1.4", "3.1"] },
    { "wave": 4, "tasks": ["2.1", "3.4", "3.5"] },
    { "wave": 5, "tasks": ["2.2", "3.2", "3.3", "3.6", "4.1", "4.2"] },
    { "wave": 6, "tasks": ["2.3", "2.4", "4.3", "4.4"] },
    { "wave": 7, "tasks": ["4.5"] },
    { "wave": 8, "tasks": ["5.1", "5.2"] },
    { "wave": 9, "tasks": ["6.1"] },
    { "wave": 10, "tasks": ["6.2", "6.3"] },
    { "wave": 11, "tasks": ["7.1"] },
    { "wave": 12, "tasks": ["7.2"] }
  ],
  "dependencies": {
    "1.1": [],
    "1.2": ["1.1"],
    "1.3": ["1.2"],
    "1.4": ["1.2"],
    "2.1": ["1.4"],
    "2.2": ["1.3", "2.1"],
    "2.3": ["2.2"],
    "2.4": ["2.2"],
    "3.1": ["1.2"],
    "3.2": ["2.1"],
    "3.3": ["2.1"],
    "3.4": ["1.4"],
    "3.5": ["1.4"],
    "3.6": ["2.1"],
    "4.1": ["2.1"],
    "4.2": ["2.1"],
    "4.3": ["2.2"],
    "4.4": ["4.1"],
    "4.5": ["2.2", "2.4"],
    "5.1": ["2.2", "2.4", "4.3"],
    "5.2": ["2.2", "2.4", "4.2", "4.3"],
    "6.1": ["3.1", "3.2", "3.3", "3.4", "3.5", "3.6", "4.3"],
    "6.2": ["6.1"],
    "6.3": ["6.1"],
    "7.1": ["1.4", "4.5"],
    "7.2": ["5.1", "5.2", "6.1", "6.2", "6.3", "7.1"]
  }
}
```

## Notes

- Dependencies are listed inline on each task and consolidated in the graph
  above. The scheduler may run independent tasks within a wave in parallel.
- Verification gates for every task: `npm run typecheck` (zero errors),
  `npm run lint` (zero warnings), and the app builds and boots
  (`GET /api/health` returns `{ "status": "ok" }`).
- Client tests use Vitest + Testing Library; server tests use supertest where
  relevant. Tests must be deterministic (no real network, injected/faked API
  clients and stubbed routers).
- Scope guard: no WebMCP/MCP/agent/AI, no new business features, no Course-model
  change, no new backend endpoints, no auth/accounts/DB. The formal
  quality/release gate and exhaustive e2e/a11y/responsive suite are owned by
  Specification 07.
