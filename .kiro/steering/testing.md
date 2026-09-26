# Testing — EduAgent Connect

## Philosophy

- Tests are added **alongside features**, driven by specifications. The
  foundation intentionally ships without a test suite; do not add tests unless a
  spec or the user requests them.
- When tests are introduced, favour fast, deterministic unit tests plus a thin
  layer of integration tests around the REST boundary.

## What to test (as features land)

- **Backend services**: business logic and Zod validation, including that every
  write is rejected on invalid/malicious input. The backend must be tested
  independently of the client.
- **WebMCP capabilities**: that permissions are declared correctly, that
  `requiresHumanConfirmation` is honoured (write capabilities abort when
  confirmation is declined), and that input/output schema validation triggers as
  expected.
- **Capability registry**: the invoke pipeline — input validation → confirmation
  → execute → output validation — behaves and errors correctly
  (`CapabilityValidationError`, `ConfirmationDeniedError`).
- **Transport adapter**: can be replaced by a fake in tests so capabilities are
  testable without a network. Use this seam instead of mocking `fetch` globally.

## Recommended tooling (when needed)

- Prefer a single, standard runner across the repo. Suggested:
  - **Vitest** for both `client` and `server` unit tests (fast, TS-native).
  - **supertest** for Express endpoint integration tests.
- Do not introduce a testing dependency until it is actually used. Pin exact
  versions.

## Conventions

- Co-locate unit tests as `*.test.ts` / `*.test.tsx` next to the code under test,
  or under a `__tests__` folder — pick one and stay consistent.
- Tests must be deterministic: no real network, no reliance on wall-clock time,
  no shared mutable state between tests.
- Run modes: use single-run (non-watch) in CI/verification, e.g. `vitest --run`.

## Verification gates (every task)

Independent of automated tests, each task must pass:

- `npm run typecheck` — TypeScript strict, zero errors.
- `npm run lint` — zero warnings/errors.
- The app must **build and boot**: backend starts, frontend starts, and
  `GET /api/health` returns `{ "status": "ok" }`.

## Manual verification (foundation)

1. `npm install` at the repository root.
2. `npm run dev` (starts client on :3000 and server on :4000).
3. Confirm `curl http://localhost:4000/api/health` returns status `ok`.
4. Open `http://localhost:3000` and confirm the health panel shows `ok`.
