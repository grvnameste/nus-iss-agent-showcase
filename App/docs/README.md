# EduAgent Connect — Documentation

This folder holds project documentation that complements the Kiro steering files
in `.kiro/steering/`.

## Where things live

- **Product intent & journey** → `.kiro/steering/product.md`
- **Architecture & WebMCP layer** → `.kiro/steering/architecture.md`
- **Coding standards** → `.kiro/steering/coding-standards.md`
- **Security & agent safety** → `.kiro/steering/security.md`
- **Testing approach & verification gates** → `.kiro/steering/testing.md`

## Status — Specifications 01 (Foundation), 02 (Course Catalogue), 03 (Course Details), 04 (Course Comparison) and 05 (Course Enquiry) implemented

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

Course Enquiry (Specification 05) is implemented and documented in
[`course-enquiry.md`](./course-enquiry.md): the human website's **first WRITE
capability**. A learner enquires about a course at
`/lifelong-learning/courses/:courseId/enquire`, the submission is independently
re-validated on the backend, stored in a synthetic in-memory repository, and
confirmed with a reference number. It adds the full backend stack for a new
domain — Enquiry model/schema → repository → service → controller →
`POST /api/enquiries` — reusing the Specification 01 validation boundary, error
envelope, logger and security middleware, and the Specification 02 Course Service
to verify the referenced course. Nothing is emailed, integrated, or sent
anywhere; enquiries live only in the running server's memory.

> The Course Catalogue, Course Details, Course Comparison and Course Enquiry are
> **human-facing only**. AI-agent / WebMCP / MCP functionality is **not**
> implemented — including any automated or agent-driven enquiry submission; the
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
  established as placeholders for later specifications, and are now populated by
  the Course (Spec 02) and Enquiry (Spec 05) capabilities.
- **Frontend:** Next.js (App Router) + React + Tailwind — an original website
  shell (Header, Navigation, Footer, page container) with client-side navigation
  across Home, Education, Admissions, Lifelong Learning, Industry, and About, plus
  reusable UI primitives and a backend health indicator on the home page.

**Agent readiness:** the architecture separates UI → API → Services →
Repositories → Data so future agent tools can reuse the same business
capabilities. **WebMCP is a future capability and is not implemented in
Specification 01** — there are no agent tools, no agent, and no AI integration.

The details page's guarded seams for both comparison and enquiry are now wired to
the real features — see [`phase-1-integration.md`](./phase-1-integration.md).
Cross-feature integration and quality gates (Specs 06 and 07) remain. All data is
synthetic; there is no Republic Polytechnic (or any) production integration.

### Phase 1 integration (Specification 06)

The independently-built human capabilities (Catalogue 02, Details 03,
Comparison 04, Enquiry 05) are now integrated into one coherent human website on
the Spec 01 shell:

- **Shell providers** — an integration-owned `AppProviders` wrapper
  (`client/src/components/providers/AppProviders.tsx`) mounts Spec 04's
  `ComparisonProvider` and a shell-level `NotificationProvider` once in the root
  layout, so comparison state and a global notification channel are shared across
  routes. `RouteFocus` re-orients focus on client-side route changes.
- **Navigation** — the primary nav and a Lifelong-Learning sub-nav share the
  responsive `NavDisclosure` pattern (usable on mobile); breadcrumbs appear on the
  course routes; the footer adds secondary links while keeping the demo notice.
- **Global states** — a global `not-found` (404) page, an accessible `useNotify()`
  notification pattern (adopted for enquiry-submitted and comparison-full), and
  consistent error/empty/loading states across features.
- **End-to-end journey** — Catalogue → Details → Comparison → Enquiry →
  Confirmation → return, carrying a stable Course ID throughout.

Details, the shell/provider architecture, the final resolved contracts/routes,
and the end-to-end journey are in
[`phase-1-integration.md`](./phase-1-integration.md); the shared UI patterns are
in [`ui-consistency-guide.md`](./ui-consistency-guide.md). WebMCP / agent
functionality is **not** part of this integration — it remains a **future phase**
(Phase 2, Agent-Ready Transformation).

## Environment variables

- **Server (server-only):** `PORT`, `NODE_ENV`, `CORS_ORIGIN`, `LOG_LEVEL`
  (see `server/.env.example`). These are never exposed to the browser.
- **Client (public):** `NEXT_PUBLIC_API_BASE_URL` (see `client/.env.example`).
  Only `NEXT_PUBLIC_*` values reach the browser; no secrets are stored client-side.

## Adding documentation

As specifications are implemented, capture design notes, API contracts, and
decision records here. Prefer linking to the authoritative steering files rather
than duplicating their content.
