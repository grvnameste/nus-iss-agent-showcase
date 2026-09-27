# Specification 07 — Section Pages · Requirements

**Project:** EduAgent Connect — WebMCP-Ready Education Website Demonstrator
**Spec ID:** 07-section-pages
**Title:** Section Pages (Education, Admissions, Industry, About)
**Status:** Draft for review (Phase 1 — human website; SPECIFICATION PHASE)
**Builds on:** `.kiro/specs/01-foundation/` (shell + UI primitives),
`02-course-catalogue/`, and `06-human-website-integration/` (shell completion,
navigation, cross-feature journeys).
**Related steering:** `.kiro/steering/product.md`, `architecture.md`,
`coding-standards.md`, `security.md`, `testing.md`

---

## 0. Phase note

This is a **Phase 1 human-website** specification. It introduces **no** WebMCP,
MCP, AI-agent, agent-tool, permission, or AI-model functionality, **no** backend
endpoints, and **no** new business logic. It replaces four placeholder pages with
rich, original, synthetic, purely-presentational static content. Phase 2
(Agent-Ready transformation) remains separate and out of scope.

> **Spec number is fixed: this is Spec 07 — Section Pages. Do not create Spec 08.**

## 1. Overview

Specifications 02–06 delivered the Lifelong Learning journey (catalogue, details,
comparison, enquiry) and integrated it into a coherent shell. The four remaining
top-level sections — **Education**, **Admissions**, **Industry**, and **About** —
still render the shared `PagePlaceholder` stub ("This section is a foundation
placeholder"). Spec 07 completes these four routes with polished, synthetic
content so the whole site is demonstration-ready and visually consistent with the
already-built Lifelong Learning area.

## 2. Problem Statement

The four top-level routes below render a placeholder, which makes the site feel
unfinished during a product demonstration:

- `/education` → `client/src/app/education/page.tsx`
- `/admissions` → `client/src/app/admissions/page.tsx`
- `/industry` → `client/src/app/industry/page.tsx`
- `/about` → `client/src/app/about/page.tsx`

Each currently imports and renders `@/components/layout/PagePlaceholder`. They
must be replaced with rich static pages that match the site's design language and
information architecture, using only existing design-system primitives.

## 3. Goals

- **G1** Replace the four placeholder pages with rich, multi-section static pages
  (hero, highlights, cards, stats, CTA) that feel like completed sections of one
  website.
- **G2** Use the existing Lifelong Learning area as the reference for spacing,
  typography, section composition, cards, CTA treatment, structure, metadata, and
  accessibility.
- **G3** Keep all content **original and synthetic**; visibly label any figures as
  illustrative.
- **G4** Cross-link naturally into the existing site journey (catalogue, comparison,
  enquiry) without inventing new routes.
- **G5** Meet the site-wide accessibility and metadata conventions and pass the
  standard verification gates.

## 4. Scope

### 4.1 In scope

- Rich, static, presentation-only content for `/education`, `/admissions`,
  `/industry`, and `/about`, replacing `PagePlaceholder` on those four routes.
- Reuse of Spec 01 primitives (`Card`, `Button`/`buttonClasses`, layout helpers,
  `cn`) and Spec 02/06 conventions.
- Page-specific Next.js `metadata` for each route.
- Cross-links into **existing** destinations (Home, Education, Admissions,
  Industry, Lifelong Learning, Course Catalogue, existing enquiry entry).
- Optional small, presentation-only shared marketing components **only if** they
  materially reduce duplication (e.g. `SectionHero`, `StatStrip`).
- Co-located Vitest tests for each page (and for any shared component introduced).

### 4.2 Out of scope / Non-goals

- **No** WebMCP, MCP, AI agents, agent tools, autonomous workflows, tool calling,
  agent permissions, or AI-generated content (Phase 2).
- **No** backend endpoints, APIs, server changes, database changes, persistence,
  or authentication.
- **No** change to the shared **Course model** (Spec 02 owns it).
- **No** new routes created solely for this feature; only existing destinations
  are linked.
- **No** modification or recreation of shell elements (`<main id="main-content">`,
  Header, Navigation, Footer, active-nav, synthetic-data notice).
- **No** breadcrumbs on these four top-level pages (breadcrumbs are course-route
  specific).
- **No** deletion of `PagePlaceholder` (it remains available for other routes); it
  is simply no longer referenced by these four pages.
- **No** real institutional data, real RP data, real PII, real testimonials, real
  partner names, or real statistics/dates.

## 5. Reference / Inspiration Boundary (Republic Polytechnic)

The public Republic Polytechnic website (`https://www.rp.edu.sg/`) may be used
**only** as a functional reference for information architecture and content
density: audience-oriented journeys, hero sections, programme/category cards,
admissions guidance, industry-partnership presentation, institutional/about
content, and CTA patterns.

The implementation **must not** copy RP's wording, page copy, slogans, branding,
logos, programme names, statistics, admissions requirements, dates, partner names,
claims, or visual identity. All content must be **original and synthetic**, and
must not imply that EduAgent Connect is affiliated with, operated by, endorsed by,
or representative of Republic Polytechnic.

## 6. Personas

| ID | Persona | Need in Spec 07 |
| -- | ------- | --------------- |
| P1 | Prospective Learner (Human) | Understand education pathways and how to apply. |
| P2 | Working Professional (Human) | See industry relevance and routes into lifelong learning. |
| P3 | Demo Stakeholder | Experience a complete, professional, consistent website. |
| P4 | Accessibility / QA Reviewer | Consistent, accessible, responsive pages. |
| P5 | Developer | Clear, testable page structure reusing existing primitives. |

## 7. Functional Requirements (EARS-style where appropriate)

### 7.1 Education (`/education`) — FR-701

The Education page **shall** present a rich discovery experience with, at minimum:

- **FR-701.1 Hero** — an education-focused eyebrow, a single `<h1>`, an
  introduction, and a primary CTA.
- **FR-701.2 Programme Areas** — a grid of **fictional** programme-area cards, at
  minimum: *Computing & Digital*, *Business & Enterprise*, *Design & Media*,
  *Engineering & Applied Technology* (clearly demonstration categories).
- **FR-701.3 Academic Pathways** — a conceptual journey (e.g. *Discover → Apply →
  Progress*).
- **FR-701.4 Learning Experience** — highlights such as project-based learning,
  collaborative challenges, industry-informed activities, and flexible skill
  development.
- **FR-701.5 Illustrative Statistics** — synthetic figures with a visible
  "Illustrative synthetic data" caption.
- **FR-701.6 CTA** — a natural path into the existing Lifelong Learning / course
  journey (`/lifelong-learning`).

### 7.2 Admissions (`/admissions`) — FR-702

The Admissions page **shall** present a rich application journey with, at minimum:

- **FR-702.1 Hero** — an admissions-focused `<h1>`, introduction, and CTA.
- **FR-702.2 How to Apply** — a semantic ordered list (`<ol>`) of conceptual steps,
  e.g. *Explore your options → Compare pathways → Prepare your application →
  Review and submit → Plan your next step*.
- **FR-702.3 Entry & Planning** — cards covering concepts such as choosing a
  pathway, understanding course expectations, preparing supporting information, and
  planning around an intake. **No real admissions requirements.**
- **FR-702.4 Key Dates** — clearly **synthetic/illustrative** dates (no real RP
  dates), with an illustrative caption.
- **FR-702.5 Helpful Guidance** — short, applicant-oriented guidance.
- **FR-702.6 CTA** — a path into an existing catalogue and/or enquiry journey
  (e.g. `/lifelong-learning/courses`).

### 7.3 Industry (`/industry`) — FR-703

The Industry page **shall** present a rich partnership experience with, at minimum:

- **FR-703.1 Hero** — an industry-focused introduction and CTA.
- **FR-703.2 Partnership Models** — **fictional** models, e.g. *Work-Study
  Collaboration*, *Custom Skills Programmes*, *Capstone & Challenge Projects*,
  *Talent & Capability Development*.
- **FR-703.3 Collaboration Journey** — a conceptual flow (e.g. *Discover → Design →
  Deliver → Review*).
- **FR-703.4 Illustrative Outcomes** — synthetic statistics with an explicit
  "Illustrative synthetic data" caption.
- **FR-703.5 Partner Value** — conceptual benefits such as talent development,
  skills alignment, applied project opportunities, and continuous learning.
- **FR-703.6 CTA** — a natural path toward the existing Lifelong Learning journey
  (`/lifelong-learning`). **No real company names or partnership claims.**

### 7.4 About (`/about`) — FR-704

The About page **shall** present a rich institutional overview with, at minimum:

- **FR-704.1 Hero** — explains what EduAgent Connect is and clearly positions it as
  a demonstration.
- **FR-704.2 Purpose & Principles** — the site's purpose and learner-oriented
  experience.
- **FR-704.3 Conceptual "Agent Ready" section** — describes that the information
  architecture is designed with **possible future** agent-assisted experiences in
  mind. This **shall remain conceptual only** and **shall not** describe or imply an
  implemented WebMCP API, agent tools, autonomous agents, tool calling, or
  implementation architecture.
- **FR-704.4 Synthetic Data / Non-Affiliation notice** — clearly communicates that
  content is synthetic; statistics and dates are illustrative; organisations and
  partners are fictional; the project is a demonstration; and the site is **not** an
  official Republic Polytechnic website and is **not** affiliated with or endorsed by
  Republic Polytechnic.
- **FR-704.5 Explore the Site** — descriptive links to existing routes: Home,
  Education, Admissions, Industry, Lifelong Learning.

### 7.5 Shared structure & consistency — FR-705

- **FR-705.1** All four pages **shall** follow a consistent structure: Hero →
  primary content → highlights/cards → stats/supporting information → CTA.
- **FR-705.2** All four pages **shall** reuse the existing design-system primitives
  (`Card`, `Button`/`buttonClasses`, layout helpers, `cn`) and match the Lifelong
  Learning area's spacing, heading hierarchy, card treatment, and CTA styling.
- **FR-705.3** All four pages **shall** be responsive across mobile (≈320–480 px),
  tablet (≈481–1024 px), and desktop (>1024 px).
- **FR-705.4** The four routes **shall** no longer import or render
  `PagePlaceholder`.
- **FR-705.5** The pages **shall not** recreate shell elements (main landmark,
  header, navigation, footer, synthetic-data notice) already provided by the shell.
- **FR-705.6** Cross-links **shall** point only to **existing** destinations; no new
  routes are created by this spec.

## 8. Accessibility Requirements — FR-706

- **FR-706.1** Exactly **one `<h1>`** per page.
- **FR-706.2** Logical heading hierarchy: `<h2>` for major sections, `<h3>` for
  nested/card headings.
- **FR-706.3** Every major section uses `<section aria-labelledby="…">` with a
  matching heading `id`.
- **FR-706.4** The Admissions application process uses a semantic `<ol>`.
- **FR-706.5** Links are descriptive (no bare "click here"); focusable with a
  visible focus state (reuse `buttonClasses` focus styling for button-styled links).
- **FR-706.6** AA contrast; no meaning conveyed by colour alone.
- **FR-706.7** No unnecessary client-side interaction; pages remain server
  components unless a specific interactive need arises (none is expected).
- **FR-706.8** Responsive presentation with no horizontal overflow at mobile widths.

> Full WCAG conformance requires later manual assistive-technology testing; Spec 07
> targets the site-wide structural a11y conventions established by Specs 01/06.

## 9. Metadata Requirements — FR-707

- **FR-707.1** Each page **shall** export a page-specific Next.js `metadata` object
  following the project convention: `title` of the form `"<Section> — EduAgent
  Connect"` and an original, concise, synthetic-data-aware `description`.
- Titles: `Education — EduAgent Connect`, `Admissions — EduAgent Connect`,
  `Industry — EduAgent Connect`, `About — EduAgent Connect`.

## 10. Synthetic-Content Requirements — FR-708

- **FR-708.1** All new copy **shall** be original, synthetic, static, and
  demonstration-safe.
- **FR-708.2** Synthetic figures **shall never** be presented as real institutional
  data; wherever numerical/statistical content appears it **shall** carry a visible
  "Illustrative synthetic data" (or equivalent) label.
- **FR-708.3** The pages **shall not** include real RP statistics, programmes,
  admissions criteria, institutional dates, partner claims, testimonials, or learner
  data.

## 11. Testing Requirements — FR-709

Follow `.kiro/steering/testing.md`. Create co-located, deterministic Vitest tests:

- `client/src/app/education/page.test.tsx`
- `client/src/app/admissions/page.test.tsx`
- `client/src/app/industry/page.test.tsx`
- `client/src/app/about/page.test.tsx`

Tests verify user-facing structure, not implementation internals. Minimum
coverage:

- **Education** — H1; programme-area section; academic-pathways section;
  synthetic-data notice; Lifelong Learning CTA (correct `href`); exported metadata.
- **Admissions** — H1; application-journey section; an ordered list (`<ol>`); the
  expected application steps; synthetic-date content; catalogue/enquiry CTA;
  metadata.
- **Industry** — H1; partnership section; partnership cards; synthetic-data notice;
  Lifelong Learning CTA; metadata.
- **About** — H1; purpose section; conceptual Agent-Ready section; synthetic /
  non-affiliation notice; explore links; metadata.

Any shared marketing component introduced **shall** have its own co-located test.

## 12. Non-Functional Requirements

- **NFR-701 (Type safety)** TypeScript strict, zero errors; no `any`.
- **NFR-702 (Consistency)** Reuse Spec 01 primitives and Spec 02/06 conventions;
  original, professional design — not an RP clone.
- **NFR-703 (Architecture integrity)** No business logic in pages; presentation
  only; no server changes and no new endpoints.
- **NFR-704 (Determinism)** Tests are deterministic (no real network, no wall-clock
  reliance, no shared mutable state).
- **NFR-705 (Non-regression)** Existing shell, navigation, and routes continue to
  work; active top-level nav highlighting remains correct on each page.
- **NFR-706 (Simplicity)** Do not over-engineer; introduce shared components only
  when they genuinely reduce duplication.

## 13. Acceptance Criteria (Given / When / Then — testable)

- **AC-701 (Education content) — FR-701, FR-708**
  *Given* `/education`, *when* it renders, *then* it shows one H1, programme-area
  cards, an academic-pathways section, an illustrative-statistics section with a
  synthetic-data caption, and a CTA linking to `/lifelong-learning`.
- **AC-702 (Admissions journey) — FR-702, FR-706.4, FR-708**
  *Given* `/admissions`, *when* it renders, *then* it shows one H1, a "How to Apply"
  ordered list (`<ol>`) with the conceptual steps, entry/planning cards, clearly
  illustrative key dates, and a CTA into the catalogue/enquiry journey.
- **AC-703 (Industry partnerships) — FR-703, FR-708**
  *Given* `/industry`, *when* it renders, *then* it shows one H1, fictional
  partnership-model cards, a collaboration-journey section, illustrative outcomes
  with a synthetic-data caption, and a CTA to `/lifelong-learning`.
- **AC-704 (About + conceptual agent + non-affiliation) — FR-704**
  *Given* `/about`, *when* it renders, *then* it shows one H1, a purpose section, a
  **conceptual-only** Agent-Ready section (no implemented WebMCP/agent claims), a
  synthetic-data/non-affiliation notice, and explore links to existing routes.
- **AC-705 (No placeholder) — FR-705.4**
  *Given* the four routes, *when* their source is inspected, *then* none imports or
  renders `PagePlaceholder`.
- **AC-706 (Consistency & primitives) — FR-705.1, FR-705.2**
  *Given* the four pages, *when* compared, *then* they follow the shared
  Hero→content→cards→stats→CTA structure and reuse `Card` / `buttonClasses` with
  consistent spacing and heading hierarchy.
- **AC-707 (Accessibility) — FR-706**
  *Given* any of the four pages, *when* audited, *then* it has exactly one H1, a
  logical heading order, `aria-labelledby` sections, descriptive links with visible
  focus, and (Admissions) a semantic `<ol>`.
- **AC-708 (Metadata) — FR-707**
  *Given* each page, *when* its module is imported, *then* it exports a `metadata`
  object with the correct `"<Section> — EduAgent Connect"` title and a
  synthetic-aware description.
- **AC-709 (Cross-links exist) — FR-705.6**
  *Given* the CTAs and explore links, *when* followed, *then* each targets an
  **existing** route (no new routes introduced).
- **AC-710 (Tests present & green) — FR-709**
  *Given* the co-located page tests, *when* run under Vitest, *then* they pass
  deterministically and assert the structure above.
- **AC-711 (Gates) — §16**
  *Given* the completed feature, *when* the gates run, *then* `npm run typecheck`,
  `npm run lint`, `vitest --run`, and `npm run build` succeed, and the app boots
  with `GET /api/health` returning `{ "status": "ok" }` (server unchanged).
- **AC-712 (RP boundary) — §5**
  *Given* all page copy, *when* reviewed, *then* it is original/synthetic, uses no
  RP wording/branding/names/figures, and includes the non-affiliation statement.

## 14. Verification Gates (§16 reference)

Independent of tests, the feature must pass: `npm run typecheck`, `npm run lint`
(zero warnings), `vitest --run` (client tests), `npm run build`, then boot with
`GET /api/health` → `{ "status": "ok" }`. **The server must not be modified.**

## 15. Explicit Implementation Constraints

- This is **Spec 07 — Section Pages**. **Do not create Spec 08.**
- Phase 1 human-website feature only.
- No backend changes, no new endpoints, no Course model changes.
- No WebMCP, no agent implementation.
- No real institutional data and no real PII.
- Republic Polytechnic is **inspiration/reference only**.
- All page content is **original and synthetic**.
- Existing design-system primitives are reused.
- The four routes **must stop using** `PagePlaceholder`.
- Each page needs **co-located Vitest tests**.
- Standard typecheck / lint / test / build / boot gates must pass.
