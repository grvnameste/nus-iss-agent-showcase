---
inclusion: fileMatch
fileMatchPattern: 'client/**/*.{tsx,ts,css}'
---

# Design System — EduAgent Connect

The visual and interaction language for the EduAgent Connect frontend. This is
the source of truth for **how the UI looks, composes, and behaves**. It documents
what is actually implemented in `client/`, so new pages and components stay
consistent instead of inventing a parallel style.

> **Scope.** Phase 1 human website. This describes presentation only — no business
> logic, no backend, no WebMCP/agent UI (that is a future phase; see §12). All
> content is original and synthetic; Republic Polytechnic is inspiration only.

Related steering: `architecture.md` (layers, seams), `coding-standards.md`
(TypeScript/React rules), `product.md` (journey), `testing.md` (verification).

---

## 1. Principles

- **Reuse over reinvention.** Compose from the existing primitives (`Card`,
  `Button`/`buttonClasses`, `Container`) and shared components. Do not hand-roll
  markup that a primitive already provides.
- **Semantics first.** Correct HTML elements and landmarks come before styling.
  One `<h1>` per page; `<section aria-labelledby>` for major blocks; `<ol>`/`<ul>`
  for real lists; `<dl>` for term/value pairs.
- **Accessible by default.** AA contrast, visible focus, keyboard operability, and
  never conveying meaning by colour alone are requirements, not enhancements.
- **Server by default.** Components are React Server Components unless they need
  browser APIs, state, or event handlers — only then add `'use client'`.
- **Honest content.** Any figure is labelled illustrative/synthetic; nothing reads
  as real institutional data.
- **Small and DRY.** Introduce a shared component only when it removes real
  duplication; otherwise inline the markup.

## 2. Foundations

### 2.1 Framework & styling

- **Next.js App Router + React + TypeScript (strict).**
- **Tailwind CSS** utility-first. The Tailwind config uses the **default theme**
  (`client/tailwind.config.ts` has an empty `theme.extend`) — there are **no
  custom design tokens**. Colour, spacing, and typography come from Tailwind's
  stock scale. Adding bespoke tokens is a deliberate, future-phase decision (§12),
  not an ad-hoc per-component choice.
- **Class composition** uses the tiny `cn()` helper in `@/lib/cn` (filter falsy +
  join). No `clsx`/`tailwind-merge` dependency — keep it that way unless a spec
  justifies otherwise.

### 2.2 Colour palette

Built entirely from Tailwind's default palette. Roles:

| Role | Palette | Typical usage |
| ---- | ------- | ------------- |
| Surface / page | `slate-50` (body), `white` (cards, header, footer) | Backgrounds |
| Text | `slate-900` (headings/strong), `slate-700`/`slate-600` (body), `slate-500`/`slate-400` (muted/captions) | Foreground |
| Borders / rings | `slate-200` (dividers, card borders), `slate-300` | Structure |
| Primary / brand | `sky-700` (primary action, brand mark, eyebrows), `sky-800` (hover/secondary text), `sky-600` (focus ring), `sky-100`/`sky-50` (active-nav / subtle fills) | Actions, emphasis, focus |
| Success | `emerald-*` | "Open" availability |
| Warning | `amber-*` | "Closing soon" availability |
| Info | `sky-*` | "Waitlist" availability |
| Neutral state | `slate-*` | "Closed" availability |

Rules:
- `sky` is the single brand/accent colour. Do not introduce a second accent hue
  without updating this file.
- Semantic colours (emerald/amber) **must** be paired with text and/or a glyph —
  never colour alone (see §6.2 and `AvailabilityBadge`).

### 2.3 Typography

Base heading styles live in `client/src/app/globals.css` (`@layer base`):

- `h1` → `text-3xl font-bold tracking-tight`
- `h2` → `text-2xl font-semibold tracking-tight`
- `h3` → `text-xl font-semibold`
- Body → `slate-900` on `slate-50`, `antialiased`.

In-component headings usually restate the colour and, for cards, a smaller size:
- Page hero H1: `text-3xl font-bold tracking-tight text-slate-900`
- Section H2: `text-2xl font-semibold text-slate-900`
- Card title H3: `text-lg font-semibold text-slate-900`
- Eyebrow (kicker above a heading): `text-sm font-semibold uppercase tracking-wide text-sky-700`
- Body copy: `text-slate-600`, constrained with `max-w-2xl` for readability.
- Muted caption / footnote: `text-sm text-slate-400`.

### 2.4 Spacing & layout rhythm

- **Page width** is owned by `Container` (`mx-auto w-full max-w-6xl px-4 sm:px-6
  lg:px-8`). Pages **do not** re-wrap in `Container` — the shell's `PageContainer`
  already applies it inside `<main>` (`py-10`).
- **Vertical rhythm** uses the `space-y-*` scale:
  - Rich section pages: root `space-y-12`.
  - Simpler landing content (e.g. Lifelong Learning): root `space-y-8`.
  - Within a section: `space-y-4` (heading + content), `space-y-3` (hero text).
- **Grid gap** is `gap-4` everywhere.
- **CTA offset** inside a card/hero: `mt-4` (or a `flex flex-wrap gap-3` row for
  multiple buttons).

### 2.5 Radii, borders, elevation

- Cards: `rounded-lg border border-slate-200 bg-white p-6 shadow-sm`.
- Buttons/links: `rounded-md`. Badges/pills: `rounded-full`.
- Elevation is minimal — `shadow-sm` on cards; no heavy shadows.

### 2.6 Responsive breakpoints

Tailwind defaults, standardised as:
- Card grids: `grid gap-4 sm:grid-cols-2 lg:grid-cols-3` (or `lg:grid-cols-4` for
  four-up rows). Single column on mobile.
- Header/footer rows: stack on mobile, `sm:flex-row` on larger screens.
- Navigation: inline row at `md+`, disclosure ("Menu") below `md` (see §7.2).
- No fixed pixel widths that cause horizontal overflow at ~320px.

---

## 3. Primitives (`@/components/ui`)

The lowest layer. Presentation only, no business logic, reused everywhere.

### 3.1 `Button` / `buttonClasses`

`client/src/components/ui/Button.tsx`

- `buttonClasses(variant?, className?) => string` is the **single source of truth**
  for button styling. Variants: `primary` (default, `bg-sky-700` → `hover:bg-sky-800`,
  white text), `secondary` (white, `ring-sky-300`, `text-sky-800`), `ghost`
  (transparent, `hover:bg-slate-100`).
- Base classes include the shared focus ring
  (`focus-visible:outline-2 focus-visible:outline-sky-600`) and disabled styles.
- `Button` is a native `<button>` for real actions.
- **A link that must look like a button** uses `buttonClasses()` on a `next/link`,
  e.g. `<Link href="…" className={buttonClasses('secondary')}>`. Never
  hand-duplicate the button Tailwind on a link.

### 3.2 `Card`

`client/src/components/ui/Card.tsx`

- Polymorphic surface: `as="div" | "article" | "section" | "li"`. Choose the tag
  for correct semantics — `article` for a grid item, `li` inside a list, `div` for
  a `<dl>` group.
- Base: `rounded-lg border border-slate-200 bg-white p-6 shadow-sm`; extra classes
  via `className` (e.g. `flex h-full flex-col gap-3` for equal-height cards).

### 3.3 `Container`

`client/src/components/ui/Container.tsx`

- Centred max-width wrapper. Used by the shell (header, `PageContainer`, footer).
  Pages generally do not use it directly.

---

## 4. Shared components (`@/components/marketing`)

Higher-level, presentation-only building blocks for content pages.

### 4.1 `SectionHero`

- Optional `eyebrow`, a `title`, an `intro`, an optional CTA slot (`children`).
- `headingId` ties the heading to a section's `aria-labelledby`.
- `headingLevel` defaults to `'h1'` (so each page's hero is the single H1); pass
  `'h2'` to reuse the block as a sub-section head.

### 4.2 `StatStrip`

- Responsive row of synthetic figures (`items: { value, label }[]`) rendered as a
  `<dl>`.
- **Always** renders an illustrative caption (`caption`, default
  `"Illustrative synthetic data"`) as visible text — so figures can never read as
  real data (never colour-only).

> **Justification rule.** A marketing component earns its place only if used by
> more than one page or if it centralises a required behaviour (e.g. `StatStrip`'s
> mandatory caption). Single-use, no special behaviour → inline instead.

---

## 5. Page composition pattern

Every content page follows the same vertical anatomy inside the shell `<main>`:

```
<div class="space-y-12">                         page root rhythm
  <section aria-labelledby="hero">   → SectionHero (single <h1>) + CTA
  <section aria-labelledby="…">      → primary content (cards / list / steps)
  <section aria-labelledby="…">      → highlights / secondary cards
  <section aria-labelledby="…">      → stats / supporting info (+ synthetic caption)
  <section aria-labelledby="…">      → closing CTA (and/or explore links)
</div>
```

Heading order: one `<h1>` (hero) → `<h2>` per section (matching each
`aria-labelledby` id) → `<h3>` for card/step titles. No level skips.

Reference implementations: the four section pages
(`client/src/app/{education,admissions,industry,about}/page.tsx`) and the Lifelong
Learning landing (`client/src/app/lifelong-learning/page.tsx`).

---

## 6. Interaction & state patterns

### 6.1 Cards & grids

- Equal-height cards: `Card as="article" className="flex h-full flex-col gap-3"`.
- Grouped attributes: a `<dl>` with `dt`/`dd` (see `CourseCard`) rather than loose
  paragraphs.
- Ordered processes: a real `<ol>` (e.g. Admissions "How to Apply"), each step a
  `Card as="li"`. Use `list-none` when the number is rendered visually.

### 6.2 Badges / status

- Pattern in `AvailabilityBadge`: `rounded-full` pill, `ring-1 ring-inset`, a
  text label, **and** a shape glyph (`● ◐ ◔ ○`). Colour is a secondary cue only —
  the label and glyph carry the meaning (AA + colour-blind safe).

### 6.3 Feedback

- Cross-feature feedback uses the shell-level notification/announcer components
  and `aria-live` regions (`ComparisonAnnouncer`, notifications provider). Don't
  invent per-page toast styling.

---

## 7. Shell & navigation

The root layout (`client/src/app/layout.tsx`) provides the shell on every route.
Pages render only their content; they must not recreate these elements.

### 7.1 Landmarks & skip link

- `<header>` (brand + primary nav), `<main id="main-content" tabIndex={-1}>`,
  `<footer>` (secondary nav + synthetic-data notice).
- A "Skip to main content" link is the first focusable element
  (`sr-only focus:not-sr-only`).
- `RouteFocus` moves focus to `<main>` on client-side navigation so keyboard and
  screen-reader users are re-oriented.

### 7.2 Navigation

- Top-level items come from `@/config/navigation` (`NAV_ITEMS`) — the single
  source of truth for the primary IA.
- Active state (`Navigation`): exact match for Home (`/`), prefix match for other
  sections (so nested routes stay highlighted). Active link:
  `bg-sky-100 text-sky-900` + `aria-current="page"`.
- `NavDisclosure` is the shared responsive nav: inline flex-wrap row at `md+`, an
  accessible "Menu" disclosure (real `<button>`, `aria-expanded`/`aria-controls`,
  Escape-to-close, focus return) below `md`. Exactly one representation is exposed
  per breakpoint.

### 7.3 Brand mark

- Wordmark "EduAgent Connect" with an `EA` monogram tile
  (`bg-sky-700 text-white rounded-md`), linking to `/`.

### 7.4 Cross-links

- Link only to **existing** routes. Prefer route constants (`CATALOGUE_HREF`,
  `COMPARISON_HREF`) over hard-coded strings. Enquiry is course-scoped, so section
  pages funnel to the catalogue rather than linking enquiry directly.

---

## 8. Accessibility checklist (per page)

- [ ] Exactly one `<h1>`; logical `h1 → h2 → h3` order, no skips.
- [ ] Every major block is `<section aria-labelledby="…">` with a matching heading id.
- [ ] Real list semantics (`<ol>`/`<ul>`/`<dl>`) where appropriate.
- [ ] Links are descriptive (no bare "click here"); button-styled links use
      `buttonClasses` for the shared focus ring; plain links have a visible focus state.
- [ ] Meaning never conveyed by colour alone (label/glyph accompanies colour).
- [ ] AA contrast using the slate/sky palette.
- [ ] No horizontal overflow at ~320px; grids collapse to one column.
- [ ] No unnecessary `'use client'`; interactivity is justified.

> Full WCAG conformance still requires manual assistive-technology testing; this
> checklist covers the structural conventions the codebase enforces today.

---

## 9. Metadata

Each route exports a Next.js `metadata` object:

```ts
export const metadata: Metadata = {
  title: '<Section> — EduAgent Connect',
  description: '<original, concise, synthetic-aware summary>',
};
```

---

## 10. Content & voice

- Original, synthetic, demonstration-safe copy. No real institutional data,
  programme names, statistics, dates, partner names, testimonials, or PII.
- Any numeric/statistical content carries a visible "Illustrative synthetic data"
  (or equivalent) label.
- Republic Polytechnic is inspiration only; no RP wording, branding, or figures.
  The About page states non-affiliation explicitly.

---

## 11. Do / Don't

**Do**
- Compose from `Card`, `Button`/`buttonClasses`, `SectionHero`, `StatStrip`.
- Follow the §5 page anatomy and the §2.4 spacing scale.
- Keep components server-rendered unless interactivity is required.
- Use `cn()` for conditional classes.

**Don't**
- Hard-code button Tailwind on links, or re-wrap pages in `Container`.
- Recreate shell elements (header/main/footer/nav/notice) inside a page.
- Introduce a new accent colour, custom Tailwind tokens, or a class-merge
  dependency without updating this file.
- Convey status by colour alone, or skip heading levels.

---

## 12. Extending for future phases

This system is intentionally small so it can grow deliberately. When a future
phase needs more, extend here first, then implement:

- **Design tokens / theming (e.g. dark mode).** Introduce tokens in
  `tailwind.config.ts` (`theme.extend.colors` + CSS variables in `globals.css`)
  and record the token names and roles in §2.2/§2.3. Migrate primitives to the
  tokens rather than sprinkling raw palette values.
- **New primitives** (Input, Select, Badge, Alert, Modal, Tabs). Add them under
  `@/components/ui`, mirror the `buttonClasses` "single source of truth" approach,
  document variants and states here, and co-locate a test.
- **Agent-facing / WebMCP UI (Phase 2).** Any surface that exposes agent
  capabilities must visibly distinguish READ / NAVIGATION / WRITE actions and keep
  human-in-the-loop confirmation for writes (see `product.md`, `security.md`).
  Define that visual language in a new section here before building it.
- **Motion.** No motion system exists yet; if added, respect
  `prefers-reduced-motion` and document durations/easings.

Any change to palette, typography, spacing, primitives, or the page anatomy
**must** be reflected in this file in the same change, so `design.md` stays the
accurate source of truth.
