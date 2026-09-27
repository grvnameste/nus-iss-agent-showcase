# Specification 15 — Agent Testing, Security Validation & Release Readiness · Design

**Project:** EduAgent Connect — WebMCP-Ready Education Website Demonstrator
**Spec ID:** 15-agent-testing
**Status:** Draft for review (Phase 2; SPECIFICATION PHASE)
**Traceability:** `./requirements.md`; all Phase 2 specs `08`–`14`; testing
`.kiro/steering/testing.md`; security `.kiro/steering/security.md`.

> Descriptive/advisory only. No code or tests are written by this spec.

---

## 1. Design goals

- **DG1** Deterministic, network-free tests via the sanctioned seams.
- **DG2** A single, unambiguous release gate.
- **DG3** Honest, documented limitations for a synthetic demonstration.

## 2. Test seams (testing.md)

- **Fake `CapabilityTransport`** — swap for the browser/HTTP transport so
  capabilities are tested without a network.
- **Scripted planner** (Spec 13) — deterministic orchestration, no LLM.
- **supertest** — server endpoint integration (existing pattern).
- **Vitest** — `client`, `server`, and the new `mcp-server` workspaces (each
  `vitest --run` in CI/verification).

## 3. Test matrix (by layer)

| Layer | What | How |
| ----- | ---- | --- |
| Capability contract (09) | schema validation both phases; kinds/scopes | Vitest + fake transport |
| Guardrails (10) | confirmation gate; no speculative writes; dedupe; PII-free audit | Vitest |
| WebMCP (11) | registration; execute via `invoke`; confirmation dialog; **fallback** when unsupported | Vitest + jsdom + fake transport |
| MCP (12) | tool discovery; execute via adapter; **excludes navigation**; fail-closed approval | Vitest + fake transport/services |
| Orchestration (13) | reference journey; transport-agnostic (MCP skips nav); decline-stops; error recovery | Vitest + scripted planner + fake client |
| Demo UI (14) | transcript, tool-status, I/O inspect, approval, result/error/duplicate states, a11y | Vitest + Testing Library |
| Server (Phase 1) | existing course/enquiry endpoints | supertest (unchanged) |
| E2E | full journey find→…→submit→reference | in-process app + scripted planner |

## 4. Security validation (Spec 10 / security.md)

Each checklist item (requirements §6) maps to at least one test or a documented
manual check:
- WRITE re-validated server-side → server enquiry tests + capability test.
- Approval required / fail-closed → WebMCP dialog test + MCP approval test.
- No speculative writes → orchestration test asserting submit only post-confirm.
- No PII in logs/outputs/transcripts → audit-shape test + output-shape assertions.
- Sanitised errors → error-mapping tests.
- Origin/transport allow-list → config tests + documented manual check.
- Dedupe → duplicate-submit test.

## 5. Regression strategy (FR-1506)

- Run the full Phase 1 client + server suites unchanged; they must stay green.
- Assert the agent layer is **additive**: with the demo panel hidden, existing
  page/journey tests are unaffected; mounting providers does not change existing
  component behaviour.

## 6. Browser compatibility (FR-1508)

- WebMCP is emerging: validate (a) the **supported** path via a mocked/feature-
  detected surface in jsdom, and (b) the **unsupported** path (detection returns
  null → no registration, normal site, no errors). Document the real-browser
  support matrix as it stabilises; the fallback is the compatibility guarantee.

## 7. Release-readiness gate (FR-1509.1)

All must hold:
1. Vitest green in `client`, `server`, `mcp-server` (`--run`).
2. `typecheck` and `lint` clean in all three workspaces (zero warnings).
3. `build` succeeds (client + server) and the MCP server compiles.
4. App boots; `GET /api/health` → `{ "status": "ok" }`.
5. MCP server starts and shuts down cleanly.
6. Security checklist (§4) all pass.
7. Phase 1 human-website suites unchanged and green (regression).

## 8. Known limitations (FR-1509.2)

- Synthetic data only; no real institution, PII, email, or CRM.
- No authentication, no database; in-memory persistence resets on restart.
- WebMCP is an emerging capability; support varies — hence detection + fallback.
- MCP demonstrated with a compatible client; not a hardened public deployment.
- Duplicate protection is session/idempotency-scoped, not a distributed guarantee.
- No load, performance, or penetration testing in scope.

## 9. Constraints recap

Spec 15 only; specification-only; no code/tests. Deterministic seams (fake
transport + scripted planner); Vitest across all workspaces; supertest for
endpoints. Regression mandatory; single release gate; limitations documented.
Synthetic data only; RP inspiration only. **Final Phase 2 spec — do not create
Spec 16.**
