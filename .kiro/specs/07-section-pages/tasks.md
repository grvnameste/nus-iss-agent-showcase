# Implementation Plan: Section Pages (Education, Admissions, Industry, About)

**Project:** EduAgent Connect — WebMCP-Ready Education Website Demonstrator
**Spec ID:** 07-section-pages
**Owner:** Frontend
**Traceability:** Each task references requirements in `./requirements.md` and
design sections in `./design.md`.

## Overview

Replace the four placeholder top-level pages (`/education`, `/admissions`,
`/industry`, `/about`) with rich, original, synthetic, presentation-only static
content built from existing Spec 01 primitives and matching the Lifelong Learning
area. This is a **Phase 1 human-website** effort: **no** backend changes, **no**
new endpoints, **no** Course-model changes, **no** WebMCP/agent implementation, and
**no** real institutional data or PII. Republic Polytechnic is inspiration only;
all content is original/synthetic. The four routes must stop using
`PagePlaceholder` (which stays in the codebase for other uses). Each page gets a
co-located Vitest test.

> **This is Spec 07 — Section Pages. Do not create Spec 08.**

## Tasks

- [x] 1. Spec 07 documentation (this spec)
  - Create/update `requirements.md`, `design.md`, and `tasks.md` under
    `.kiro/specs/07-section-pages/` as the authoritative implementation spec.
  - **Objective:** implementation-ready spec; no app code.
  - **Files:** `.kiro/specs/07-section-pages/{requirements,design,tasks}.md`.
  - **Guidance:** follow the conventions in `.kiro/specs/06-human-website-integration/`.
  - **Test requirements:** none (documentation).
  - **Acceptance:** the three documents exist and are internally consistent.
  - **Demo:** walk through the three files and the agreed scope.
  - _Requirements: all (spec authoring)_

- [x] 2. Inspect the reference implementation & primitives
  - Review `client/src/app/lifelong-learning/page.tsx` and the primitives
    (`@/components/ui/Card`, `@/components/ui/Button`, `@/components/ui/Container`,
    `@/lib/cn`), the shell (`PageContainer`, `Header`, `Navigation`, `Footer`,
    `@/config/navigation`), and route constants (`CATALOGUE_HREF`,
    `COMPARISON_HREF`).
  - **Objective:** confirm the exact patterns (spacing, section/`aria-labelledby`,
    single H1, `buttonClasses` on `next/link`) to reuse; confirm existing link
    targets so no new route is invented.
  - **Files:** read-only inspection.
  - **Guidance:** capture the `space-y-*` rhythm, card grid breakpoints, and CTA
    markup used by the LL landing so the four pages match.
  - **Test requirements:** none.
  - **Acceptance:** a short written note of the reused patterns and the confirmed
    link targets (recorded in the PR description or design §12).
  - **Demo:** point to the reference page and the primitives that will be reused.
  - _Requirements: FR-705.2, FR-705.6, NFR-702_

- [x] 3. Add shared marketing components (only if justified) with tests
  - Add `client/src/components/marketing/SectionHero.tsx` and `StatStrip.tsx`
    (presentation-only, typed props, server-compatible, no business logic), plus
    co-located tests. If either does not reduce real duplication once pages are
    drafted, inline the markup instead and drop the component (NFR-706).
  - **Objective:** consistent hero + synthetic-stats presentation reused across
    pages, including the mandatory "Illustrative synthetic data" caption in
    `StatStrip`.
  - **Files:** `client/src/components/marketing/SectionHero.tsx`,
    `client/src/components/marketing/StatStrip.tsx`,
    `client/src/components/marketing/SectionHero.test.tsx`,
    `client/src/components/marketing/StatStrip.test.tsx`.
  - **Guidance:** use `cn`; `SectionHero` defaults to `<h1>` (page hero) with an
    optional `headingLevel`; `StatStrip` always renders the illustrative caption.
    No `'use client'`.
  - **Test requirements:** render tests asserting heading, intro, optional CTA slot
    (SectionHero) and the values/labels + caption (StatStrip).
  - **Acceptance:** components render as specified; tests green; typecheck/lint
    clean.
  - **Demo:** show the component tests passing and a sample render.
  - _Requirements: FR-705.2, FR-708.2, NFR-701, NFR-706, FR-709_

- [x] 4. Implement the Education page + test
  - Replace `client/src/app/education/page.tsx` (remove `PagePlaceholder`) with the
    design in §6: hero, programme-area cards, academic pathways, learning-experience
    highlights, illustrative statistics, CTA → `/lifelong-learning`. Export
    page-specific `metadata`.
  - **Objective:** a complete, accessible, synthetic Education page.
  - **Files:** `client/src/app/education/page.tsx`,
    `client/src/app/education/page.test.tsx`.
  - **Guidance:** one `<h1>`; `<section aria-labelledby>` per block; `Card`
    grid; `buttonClasses` on the CTA link; reuse `SectionHero`/`StatStrip` if kept.
  - **Test requirements:** assert H1, programme-area section, academic-pathways
    section, synthetic-data notice, LL CTA `href`, and exported `metadata.title`.
  - **Acceptance:** AC-701 satisfied; tests green.
  - **Demo:** `npm run dev`, open `/education`, show the page and working CTA.
  - _Requirements: FR-701, FR-705, FR-706, FR-707, FR-708, FR-709_

- [x] 5. Implement the Admissions page + test
  - Replace `client/src/app/admissions/page.tsx` (remove `PagePlaceholder`) with the
    design in §7: hero, "How to Apply" `<ol>` steps, entry/planning cards,
    illustrative key dates, helpful guidance, CTA → `/lifelong-learning/courses`.
    Export `metadata`.
  - **Objective:** a complete, accessible, synthetic Admissions journey page.
  - **Files:** `client/src/app/admissions/page.tsx`,
    `client/src/app/admissions/page.test.tsx`.
  - **Guidance:** the application process **must** be a semantic `<ol>`; dates are
    clearly illustrative; **no real admissions requirements or RP dates**.
  - **Test requirements:** assert H1, application-journey section, an `<ol>` list,
    the expected steps, synthetic-date content, catalogue/enquiry CTA `href`, and
    `metadata.title`.
  - **Acceptance:** AC-702 satisfied; tests green.
  - **Demo:** open `/admissions`, walk the steps and CTA.
  - _Requirements: FR-702, FR-705, FR-706 (incl. FR-706.4), FR-707, FR-708, FR-709_

- [x] 6. Implement the Industry page + test
  - Replace `client/src/app/industry/page.tsx` (remove `PagePlaceholder`) with the
    design in §8: hero, partnership-model cards, collaboration journey, illustrative
    outcomes, partner value, CTA → `/lifelong-learning`. Export `metadata`.
  - **Objective:** a complete, accessible, synthetic Industry page.
  - **Files:** `client/src/app/industry/page.tsx`,
    `client/src/app/industry/page.test.tsx`.
  - **Guidance:** fictional partnership models; **no real company names or claims**;
    outcomes carry the synthetic caption.
  - **Test requirements:** assert H1, partnership section, partnership cards,
    synthetic-data notice, LL CTA `href`, and `metadata.title`.
  - **Acceptance:** AC-703 satisfied; tests green.
  - **Demo:** open `/industry`, show partnership cards and CTA.
  - _Requirements: FR-703, FR-705, FR-706, FR-707, FR-708, FR-709_

- [x] 7. Implement the About page + test
  - Replace `client/src/app/about/page.tsx` (remove `PagePlaceholder`) with the
    design in §9: hero, purpose & principles, **conceptual** Agent-Ready section,
    synthetic-data / non-affiliation notice, explore links (Home, Education,
    Admissions, Industry, Lifelong Learning). Export `metadata`.
  - **Objective:** a complete, accessible About page that positions the site as a
    synthetic demonstration and states RP non-affiliation.
  - **Files:** `client/src/app/about/page.tsx`,
    `client/src/app/about/page.test.tsx`.
  - **Guidance:** the Agent-Ready section is **conceptual only** — no WebMCP/agent
    implementation claims; align with product steering §17.
  - **Test requirements:** assert H1, purpose section, conceptual Agent-Ready
    section, synthetic/non-affiliation notice, explore links, and `metadata.title`.
  - **Acceptance:** AC-704 satisfied; tests green.
  - **Demo:** open `/about`, show the completed page and notice.
  - _Requirements: FR-704, FR-705, FR-706, FR-707, FR-708, FR-709_

- [x] 8. Accessibility & content-consistency pass
  - Review all four pages together for consistent spacing, heading hierarchy, card
    treatment, and CTA styling; verify one H1 per page, `aria-labelledby` on
    sections, descriptive links with visible focus, the Admissions `<ol>`, AA
    contrast, and responsive behaviour at ≈320/768/1280 px. Confirm active top-level
    nav highlighting is correct on each route.
  - **Objective:** site-wide consistency and accessibility parity.
  - **Files:** the four `page.tsx` (and shared components) as needed.
  - **Guidance:** cross-check `coding-standards.md` and the a11y requirements
    (FR-706); no colour-only meaning; no unnecessary client interactivity.
  - **Test requirements:** existing page tests still green; add assertions if gaps
    are found.
  - **Acceptance:** AC-706, AC-707 satisfied.
  - **Demo:** side-by-side walkthrough at mobile and desktop widths with keyboard
    navigation.
  - _Requirements: FR-705, FR-706, NFR-702, NFR-705_

- [x] 9. Confirm the four routes no longer reference `PagePlaceholder`
  - Verify no import or usage of `@/components/layout/PagePlaceholder` remains in the
    four `page.tsx` files. Do **not** delete `PagePlaceholder` (kept for other
    routes).
  - **Objective:** the placeholder is fully removed from these four routes.
  - **Files:** the four `page.tsx`.
  - **Guidance:** grep for `PagePlaceholder` under `client/src/app/{education,admissions,industry,about}`.
  - **Test requirements:** none beyond existing page tests.
  - **Acceptance:** AC-705 satisfied (no `PagePlaceholder` references on these
    routes).
  - **Demo:** show the grep returning no matches for the four routes.
  - _Requirements: FR-705.4_

- [x] 10. Full verification gates
  - Run `npm run typecheck`, `npm run lint` (zero warnings), `vitest --run` (client
    tests), and `npm run build`; then boot the app and verify `GET /api/health`
    returns `{ "status": "ok" }`. **Do not modify the server.** Remove any scratch
    files.
  - **Objective:** the feature passes all standard gates without regressions.
  - **Files:** none (verification); fix page/test/component code if a gate fails.
  - **Guidance:** use single-run mode for Vitest; keep changes frontend-only.
  - **Test requirements:** all new and existing tests pass.
  - **Acceptance:** AC-710, AC-711 satisfied.
  - **Demo:** show each gate passing and the health check succeeding.
  - _Requirements: FR-709, §14/§16, NFR-701, NFR-705_

- [x] 11. Final demo walkthrough
  - Navigate Home → Education → Admissions → Industry → About in the running app,
    showing active-nav highlighting, working CTAs into the existing course journey,
    the synthetic-data labels, and the About non-affiliation notice.
  - **Objective:** demonstrate a complete, coherent, synthetic website.
  - **Files:** none.
  - **Guidance:** confirm CTAs land on existing routes only (AC-709) and that RP is
    referenced as inspiration only, with no RP wording/branding (AC-712).
  - **Test requirements:** none.
  - **Acceptance:** AC-701–AC-712 demonstrably satisfied.
  - **Demo:** the end-to-end click-through described above.
  - _Requirements: all acceptance criteria_

## Notes

- Tasks 4–7 are independent and each independently demoable; they may be done in any
  order after Task 3 (or after deciding to inline, per NFR-706).
- No task adds a backend endpoint, changes the Course model, or introduces
  WebMCP/agent functionality. All content is original and synthetic; RP is
  inspiration only.
