# Specification 07 — Section Pages · Design

**Project:** EduAgent Connect — WebMCP-Ready Education Website Demonstrator
**Spec ID:** 07-section-pages
**Title:** Section Pages (Education, Admissions, Industry, About)
**Status:** Draft for review (Phase 1 — human website; SPECIFICATION PHASE)
**Traceability:** Requirements in `./requirements.md`; steering in
`.kiro/steering/*.md`.

---

## 1. Design Goals

- **DG1** Turn four placeholder routes into rich, polished, static pages that feel
  like completed sections of one professional education website.
- **DG2** Achieve visual and structural parity with the existing Lifelong Learning
  area by **reusing** its primitives and patterns — not by inventing a new style.
- **DG3** Keep every page purely presentational: server components, no state, no
  data fetching, no business logic, no new routes.
- **DG4** Make content unmistakably synthetic and demonstration-safe, with an
  explicit non-affiliation posture toward Republic Polytechnic.
- **DG5** Keep the implementation small and DRY; introduce shared components only
  where duplication is real.

## 2. Design Principles

- **Reuse over reinvention.** Compose from `Card`, `Button`/`buttonClasses`,
  `Container` (via the shell), and `cn`. Match the Lifelong Learning page's
  `space-y-8` rhythm and section pattern.
- **Semantics first.** One `<h1>`; `<section aria-labelledby>` for each major block;
  `<ol>` for ordered processes; descriptive links.
- **Static by default.** No `'use client'` unless a concrete interactive need
  arises (none is expected). Metadata is exported per page.
- **Honest content.** Any figure carries an "Illustrative synthetic data" label;
  copy is original and never mimics RP.

## 3. Existing Building Blocks (source of truth)

| Building block | Path | Use here |
| -------------- | ---- | -------- |
| `Card` | `@/components/ui/Card` | Grouped content; `as="section" \| "article" \| "li"` for semantics |
| `Button` / `buttonClasses` | `@/components/ui/Button` | CTA styling on `next/link` (`primary` \| `secondary` \| `ghost`) |
| `Container` | `@/components/ui/Container` | Provided by the shell's `PageContainer`; pages do **not** re-wrap |
| `cn` | `@/lib/cn` | Class merging in any shared component |
| Shell | `PageContainer`, `Header`, `Navigation`, `Footer` | Already wrap every route; active nav via prefix match in `@/config/navigation` |
| Reference page | `client/src/app/lifelong-learning/page.tsx` | Canonical structure/spacing/CTA model |

**Route constants (existing — link to these; create none):**

- Home: `/`
- Education: `/education` · Admissions: `/admissions` · Industry: `/industry` ·
  About: `/about`
- Lifelong Learning landing: `/lifelong-learning`
- Course Catalogue: `/lifelong-learning/courses` (`CATALOGUE_HREF` in
  `@/components/courses/details/routes`)
- Comparison: `/lifelong-learning/courses/compare` (`COMPARISON_HREF`)
- Enquiry is **course-scoped** (`/lifelong-learning/courses/:courseId/enquire`) and
  therefore **not** linked directly from a section page that has no course context;
  Admissions funnels to the **catalogue**, which is the natural entry to the enquiry
  flow.

## 4. Shared Page Anatomy

Every page follows the same vertical composition inside the shell's `<main>`:

```
<div class="space-y-12">            ← page root rhythm (matches LL area scale)
  <section aria-labelledby="hero">     Hero: eyebrow, single <h1>, intro, CTA
  <section aria-labelledby="…">        Primary content (cards / pathways)
  <section aria-labelledby="…">        Highlights / secondary cards
  <section aria-labelledby="…">        Stats or supporting info (with synthetic caption)
  <section aria-labelledby="…">        Closing CTA (and/or explore links on About)
</div>
```

Heading rules:
- One `<h1>` in the hero.
- `<h2>` for each `<section>` (referenced by its `aria-labelledby`).
- `<h3>` for card titles and nested items.

Card grids use responsive Tailwind (`grid gap-4 sm:grid-cols-2 lg:grid-cols-4`
style, matching existing usage) with `Card as="article"` (or `as="li"` inside a
list) for each item.

CTAs are `next/link` elements styled with `buttonClasses('primary'|'secondary')`,
mirroring the Lifelong Learning landing.

## 5. Shared Component Strategy

Two small, presentation-only components are **justified** because the hero and the
statistics strip repeat across all/most pages with identical structure. They live
under `client/src/components/marketing/` and remain server-compatible (no
`'use client'`, no browser APIs, no data access).

### 5.1 `SectionHero`

- **Purpose:** consistent hero block (optional eyebrow, a heading, an intro
  paragraph, optional CTA slot).
- **Props (typed):**
  ```ts
  interface SectionHeroProps {
    eyebrow?: string;
    title: string;
    headingId: string;         // ties to aria-labelledby
    intro: string;
    headingLevel?: 'h1' | 'h2'; // default 'h1' for page heroes
    children?: ReactNode;       // CTA(s)
  }
  ```
- **Notes:** default renders an `<h1>` so each page's hero is the single H1; other
  sections pass `headingLevel="h2"` if they reuse it (not required).

### 5.2 `StatStrip`

- **Purpose:** a responsive row of synthetic figures with a mandatory illustrative
  caption, so the "Illustrative synthetic data" labelling is consistent and
  unmissable.
- **Props (typed):**
  ```ts
  interface StatItem { value: string; label: string }
  interface StatStripProps {
    items: readonly StatItem[];
    caption?: string;          // defaults to 'Illustrative synthetic data'
    'aria-labelledby'?: string;
  }
  ```
- **Notes:** renders each stat with the value visually prominent and the label as
  supporting text; the caption is always rendered (visible, not colour-only).

> **Guardrail (NFR-706):** if, during implementation, either component is used by
> only one page or does not reduce real duplication, inline the markup instead and
> drop the component. Do not over-engineer.

Ordered-process markup (Admissions "How to Apply") and card grids do **not** get a
component; they are simple enough to express inline with `<ol>` / `Card`.

## 6. Education Page Design (`/education`)

- **Hero** (`SectionHero`, H1): eyebrow "Education", title, intro about full-time
  and diploma-style learning pathways, primary CTA → `/lifelong-learning`.
- **Programme Areas** (`<section>` + card grid): four fictional `Card as="article"`
  items — *Computing & Digital*, *Business & Enterprise*, *Design & Media*,
  *Engineering & Applied Technology* — each `<h3>` + short synthetic blurb.
- **Academic Pathways** (`<section>`): a conceptual *Discover → Apply → Progress*
  flow expressed as three cards or a simple stepped layout (presentational).
- **Learning Experience** (`<section>` + list/cards): highlights — project-based
  learning, collaborative challenges, industry-informed activities, flexible skill
  development.
- **Illustrative Statistics** (`StatStrip`): synthetic figures (e.g. programme
  areas, learning formats) with the "Illustrative synthetic data" caption.
- **CTA** (`<section>`): closing prompt → `/lifelong-learning` (and optionally
  `/lifelong-learning/courses`).

## 7. Admissions Page Design (`/admissions`)

- **Hero** (`SectionHero`, H1): eyebrow "Admissions", intro on the application
  journey, primary CTA → `/lifelong-learning/courses` (catalogue = natural entry to
  the enquiry flow).
- **How to Apply** (`<section>` + `<ol>`): ordered, conceptual steps — *Explore your
  options → Compare pathways → Prepare your application → Review and submit → Plan
  your next step*. Each `<li>` has an `<h3>`-level label and a short synthetic
  description. **No real requirements.**
- **Entry & Planning** (`<section>` + cards): concept cards — choosing a pathway,
  understanding course expectations, preparing supporting information, planning
  around an intake.
- **Key Dates** (`<section>`): a small synthetic schedule (clearly labelled
  illustrative; may reuse `StatStrip` styling or a simple definition list). **No
  real RP dates.**
- **Helpful Guidance** (`<section>`): brief applicant-oriented tips (synthetic).
- **CTA** (`<section>`): → `/lifelong-learning/courses` (browse to enquire) and/or
  `/lifelong-learning`.

## 8. Industry Page Design (`/industry`)

- **Hero** (`SectionHero`, H1): eyebrow "Industry", intro on partnerships and
  workforce collaboration, primary CTA → `/lifelong-learning`.
- **Partnership Models** (`<section>` + card grid): four fictional `Card` items —
  *Work-Study Collaboration*, *Custom Skills Programmes*, *Capstone & Challenge
  Projects*, *Talent & Capability Development* — each `<h3>` + synthetic blurb.
- **Collaboration Journey** (`<section>`): conceptual *Discover → Design → Deliver →
  Review* flow (presentational cards/steps).
- **Illustrative Outcomes** (`StatStrip`): synthetic outcome figures with the
  illustrative caption.
- **Partner Value** (`<section>`): conceptual benefits — talent development, skills
  alignment, applied project opportunities, continuous learning.
- **CTA** (`<section>`): → `/lifelong-learning`. **No real company names/claims.**

## 9. About Page Design (`/about`)

- **Hero** (`SectionHero`, H1): what EduAgent Connect is; clearly a demonstration.
- **Purpose & Principles** (`<section>`): the site's purpose and learner-oriented
  experience (synthetic, original).
- **Conceptual "Agent Ready"** (`<section>`): describes that the information
  architecture is designed with **possible future** agent-assisted experiences in
  mind. **Conceptual only** — explicitly no WebMCP API, agent tools, autonomous
  agents, tool calling, or implementation detail. Wording aligns with product
  steering §17 (forward-looking note).
- **Synthetic Data / Non-Affiliation notice** (`<section>`): content is synthetic;
  statistics and dates are illustrative; organisations/partners are fictional; this
  is a demonstration; it is **not** an official RP website and is **not** affiliated
  with or endorsed by RP. (Complements, does not duplicate, the shell footer notice.)
- **Explore the Site** (`<section>`): descriptive links to Home, Education,
  Admissions, Industry, Lifelong Learning.

## 10. Responsive Behaviour

- Page root uses vertical spacing that collapses gracefully; card grids move from a
  single column (mobile) to 2 (tablet) to 3–4 (desktop) via Tailwind breakpoints,
  matching existing usage.
- `StatStrip` wraps to a column on mobile and a row on larger screens.
- No fixed widths that cause horizontal overflow at ≈320 px. The shell's mobile
  navigation (Spec 06) is unchanged.

## 11. Accessibility Structure

- Exactly one `<h1>` per page (the hero).
- `<section aria-labelledby="…">` for every major block, each `id` matching its
  `<h2>`.
- Admissions process is a real `<ol>`; each step is an `<li>`.
- Links are descriptive; button-styled links inherit the visible focus ring from
  `buttonClasses`.
- AA contrast using existing slate/sky palette; the synthetic caption is textual
  (never colour-only). No unnecessary interactivity; pages stay server components.

## 12. CTA / Cross-Link Strategy

| Page | Primary CTA target | Secondary / explore |
| ---- | ------------------ | ------------------- |
| Education | `/lifelong-learning` | `/lifelong-learning/courses` (optional) |
| Admissions | `/lifelong-learning/courses` | `/lifelong-learning` (optional) |
| Industry | `/lifelong-learning` | `/lifelong-learning/courses` (optional) |
| About | — | Home, Education, Admissions, Industry, Lifelong Learning |

All targets already exist. No new routes are created. Prefer importing existing
route constants (`CATALOGUE_HREF`, `COMPARISON_HREF`) where a page links to the
courses area, rather than hard-coding strings, to stay consistent with the codebase.

## 13. Metadata Approach

Each `page.tsx` exports a `Metadata` object:

```ts
export const metadata: Metadata = {
  title: '<Section> — EduAgent Connect',
  description: '<original, concise, synthetic-aware summary>',
};
```

Titles: `Education — EduAgent Connect`, `Admissions — EduAgent Connect`,
`Industry — EduAgent Connect`, `About — EduAgent Connect`.

## 14. Testing Approach

- Co-located `page.test.tsx` per route, plus tests for any shared component,
  following `client/vitest.config.ts` / `vitest.setup.ts` conventions and existing
  examples (e.g. `Navigation.test.tsx`, `Button.test.tsx`).
- Use Testing Library queries against **user-facing structure**: `getByRole`
  `heading` for the single H1 and section headings; `getByRole('list')` /
  `getByRole('listitem')` for the Admissions `<ol>`; `getByRole('link', { name })`
  with `toHaveAttribute('href', …)` for CTAs; `getByText` for the synthetic-data /
  non-affiliation notices.
- Assert exported `metadata.title` per page.
- Deterministic: no network, no timers, no shared mutable state.

## 15. RP Reference / Inspiration Boundary

Republic Polytechnic (`https://www.rp.edu.sg/`) informs **only** information
architecture and content density (audience journeys, hero usage, category cards,
admissions guidance, partnership presentation, about content, CTA patterns). No RP
wording, branding, logos, programme names, statistics, requirements, dates, partner
names, claims, or visual identity is used. The About non-affiliation notice makes
the boundary explicit to end users.

## 16. Constraints Recap

Spec 07 only. No Spec 08. Phase 1 human website. No backend/endpoint/Course-model
changes. No WebMCP/agent implementation. No real institutional data or PII. Reuse
existing primitives. The four routes stop using `PagePlaceholder`. Co-located
Vitest tests per page. Standard typecheck/lint/test/build/boot gates must pass; the
server is not modified.
