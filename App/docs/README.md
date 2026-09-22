# EduAgent Connect — Documentation

This folder holds project documentation that complements the Kiro steering files
in `.kiro/steering/`.

## Where things live

- **Product intent & journey** → `.kiro/steering/product.md`
- **Architecture & WebMCP layer** → `.kiro/steering/architecture.md`
- **Coding standards** → `.kiro/steering/coding-standards.md`
- **Security & agent safety** → `.kiro/steering/security.md`
- **Testing approach & verification gates** → `.kiro/steering/testing.md`

## Status — Specifications 01 (Foundation), 02 (Course Catalogue), 03 (Course Details) and 04 (Course Comparison) implemented

The Course Catalogue (Specification 02) is implemented and documented in
[`course-catalogue.md`](./course-catalogue.md): synthetic course data, the
backend repository → service → controller → REST API
(`GET /api/courses`, `GET /api/courses/:courseId`) for search/filter/sort/
pagination, and an accessible, responsive catalogue UI at
`/lifelong-learning/courses` with navigation to a course details route.

The Course Details page (Specification 03) is implemented and documented in
[`course-details.md`](./course-details.md): a complete, accessible, responsive
course page at `/lifelong-learning/courses/:courseId` with the full course
record, availability, loading/not-found/error states, and the actions a learner
takes next (enquire, optionally add to comparison, back to the catalogue). It is
**frontend-only** — it reuses the Specification 02 Course capability and adds no
backend code, no endpoint, and no course business logic.

Course Comparison (Specification 04) is implemented and documented in
[`course-comparison.md`](./course-comparison.md): a client-side shortlist of up
to four courses, added from the catalogue and reviewed side by side at
`/lifelong-learning/courses/compare`, with links on to a course's details or its
enquiry entry point. It is **frontend-only** — a React context over the
Specification 02 Course model, with no backend code, no endpoint, and no
database. Nothing is ranked, scored, or recommended.

> The Course Catalogue, Course Details and Course Comparison are **human-facing
> only**. AI-agent / WebMCP / MCP functionality is **not** implemented; the
> Agent-Ready / WebMCP transformation remains a **future phase**.

### Foundation (Specification 01)

The repository also contains the **implemented foundation** (Specification 01):

- npm workspaces monorepo under `App/` (`client`, `server`), with strict
  TypeScript, ESLint, and Prettier.
- **Backend:** Express + TypeScript (strict) + Zod, with Helmet (security
  headers), CORS (configurable allow-list), and Pino (structured logging).
  Exposes `GET /api/health`. Layered as Routes → Controllers → Services →
  Repositories → Data, with a centralised, sanitised error handler and a reusable
  Zod validation boundary. The Controllers/Services/Repositories/Data layers are
  established as placeholders for later specifications.
- **Frontend:** Next.js (App Router) + React + Tailwind — an original website
  shell (Header, Navigation, Footer, page container) with client-side navigation
  across Home, Education, Admissions, Lifelong Learning, Industry, and About, plus
  reusable UI primitives and a backend health indicator on the home page.

**Agent readiness:** the architecture separates UI → API → Services →
Repositories → Data so future agent tools can reuse the same business
capabilities. **WebMCP is a future capability and is not implemented in
Specification 01** — there are no agent tools, no agent, and no AI integration.

The **enquiry** workflow is not implemented yet; it is introduced by a later
specification. The details page already carries the guarded seams for both
comparison and enquiry — see
[`phase-1-integration.md`](./phase-1-integration.md). All data is synthetic; there is no
Republic Polytechnic (or any) production integration.

## Environment variables

- **Server (server-only):** `PORT`, `NODE_ENV`, `CORS_ORIGIN`, `LOG_LEVEL`
  (see `server/.env.example`). These are never exposed to the browser.
- **Client (public):** `NEXT_PUBLIC_API_BASE_URL` (see `client/.env.example`).
  Only `NEXT_PUBLIC_*` values reach the browser; no secrets are stored client-side.

## Adding documentation

As specifications are implemented, capture design notes, API contracts, and
decision records here. Prefer linking to the authoritative steering files rather
than duplicating their content.
