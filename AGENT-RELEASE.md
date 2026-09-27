# Agent-Ready Release Record (Spec 15)

Release-readiness record for the Phase 2 Agent-Ready transformation (Specs 09–14),
validated per Spec 15. This documents the security-validation checklist, the
release gate outcome, and the known limitations of the demonstration.

## 1. Scope validated

| Layer | Spec | Covering tests |
| ----- | ---- | -------------- |
| Capability contract | 09 | `client/src/agent/capabilities/capabilities.test.ts` |
| Permissions & guardrails | 10 | `client/src/agent/guardrails/guardrails.test.ts` |
| WebMCP integration | 11 | `client/src/agent/webmcp/**/*.test.ts(x)` |
| MCP server | 12 | `mcp-server/src/**/*.test.ts` |
| Orchestration | 13 | `client/src/agent/orchestrator/orchestrator.test.ts` |
| Demo UI | 14 | `client/src/agent/demo/*.test.tsx` |
| End-to-end journey | 15 | `client/src/agent/e2e.test.ts` |
| Human website (regression) | 01–07 | existing client + server suites |

## 2. Security-validation checklist (Spec 10 / security.md)

| Requirement | How it is enforced | Covered by |
| ----------- | ------------------ | ---------- |
| Backend is the trust boundary; every WRITE re-validated server-side | `enquiryService.submit` re-validates `enquiryInputSchema` regardless of agent-side checks | server enquiry tests; MCP adapter test |
| Human approval required for writes; **fail-closed** | Registry requests confirmation before `submit_enquiry`; MCP defaults to `DenyingApproval` | WebMCP adapter test (decline → `ConfirmationDeniedError`); MCP adapter test (deny → no write); e2e decline test |
| No speculative writes | Only an explicit, confirmed `submit_enquiry` writes | orchestrator test; e2e test (submit is final, post-confirm) |
| No PII in logs / outputs / transcripts | Audit is metadata-only; outputs carry no PII; transcripts not persisted | guardrails audit test; e2e audit assertion; MCP audit shape |
| Sanitised errors (no internals leak) | Typed errors mapped to user-safe messages | webmcp/MCP error tests; orchestrator sanitised-error test |
| Duplicate-submission protection | Session-scoped guard; repeat blocked, prior reference returned | guardrails + MCP duplicate tests |
| Origin / transport allow-list | Server `corsOrigins()`; MCP stdio (local) | server config; documented (manual for network transport) |
| No ambient authority | Every capability declares kind + `requiresHumanConfirmation` | capability model test (kinds/scopes) |
| MCP set excludes browser-only navigation | `navigate_to_course` not registered as an MCP tool | MCP `register-tools` test; e2e/orchestrator MCP-subset test |

## 3. Release-readiness gate (Spec 15 §7) — outcome

| # | Gate | Result |
| - | ---- | ------ |
| 1 | Vitest `--run` green in `client`, `server`, `mcp-server` | **PASS** — client 43 files/283, server 97, mcp-server 10 (390 total) |
| 2 | `typecheck` + `lint` clean (zero warnings) in all three workspaces | **PASS** (client typecheck includes the strict test-file config) |
| 3 | `build` succeeds (client + server) and MCP server compiles | **PASS** — `/agent-demo` prerenders static; MCP `tsc` clean |
| 4 | App boots; `GET /api/health` → `{ "status": "ok" }` | **PASS** |
| 5 | MCP server starts over stdio and stops cleanly | **PASS** — `tools/list` returns the 6 tools; clean start/stop |
| 6 | Security checklist (§2) | **PASS** — each item covered by a test or documented check |
| 7 | Phase 1 human-website suites unchanged and green (regression) | **PASS** — existing suites untouched; agent layer is additive |

## 4. Known limitations

- **Synthetic data only** — no real institution, PII, email, or CRM; nothing is
  dispatched anywhere.
- **No authentication, no database** — in-memory persistence; state resets on
  server restart.
- **WebMCP is emerging** — browser support varies; the layer feature-detects and
  degrades gracefully to the normal human website. The fallback is the
  compatibility guarantee; a real-browser support matrix will firm up over time.
- **MCP** is demonstrated with a compatible client over stdio; it is not a hardened
  public deployment, and `submit_enquiry` is fail-closed (refused) unless a human
  approval channel is wired.
- **Duplicate protection** is session/idempotency-scoped, not a distributed
  guarantee.
- **No load, performance, or penetration testing** is in scope for this
  demonstration.
- **Dev-tooling advisory**: `tsx`→`esbuild` carries a build-time-only advisory
  (not a runtime/production concern), consistent across workspaces. The MCP SDK
  (`@modelcontextprotocol/sdk@1.30.1`) reports no advisories.

## 5. How to run the demonstration

- **Human website + agent demo (browser):** `npm run dev`, then open
  `/agent-demo`. The agent completes the reference journey with an explicit
  confirmation before submitting.
- **MCP server (external clients):** `npm run build --workspace mcp-server` then
  `npm run start --workspace mcp-server` (stdio). Wire a human-approval channel to
  enable `submit_enquiry`; otherwise writes are refused by design. See
  `mcp-server/README.md` and `DEPLOYMENT.md`.
