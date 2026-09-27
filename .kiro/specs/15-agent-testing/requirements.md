# Specification 15 — Agent Testing, Security Validation & Release Readiness · Requirements

**Project:** EduAgent Connect — WebMCP-Ready Education Website Demonstrator
**Spec ID:** 15-agent-testing
**Title:** Agent Testing, Security Validation & Release Readiness
**Status:** Draft for review (Phase 2 — Agent-Ready Transformation; SPECIFICATION PHASE)
**Builds on:** all Phase 2 specs (`08`–`14`)
**Related steering:** `.kiro/steering/testing.md`, `security.md`, `architecture.md`,
`product.md`, `coding-standards.md`, `design.md`

---

## 0. Phase note

Phase 2C — the **final** Phase 2 specification. It defines how the complete
Agent-Ready experience is **tested, security-validated, and judged release-ready**,
and how **known limitations** are documented.

> **Regression first.** The single most important guarantee is that the human
> website continues to work exactly as in Phase 1. Agent capabilities are additive.

**Specification-only. No application code or tests are written here.** Only the
three files under `.kiro/specs/15-agent-testing/`. (Test *code* is produced when
the implementation spec-tasks of Specs 11–14 land — this spec is the test plan and
release gate they satisfy.)

Sequence: 08 → 09 → 10 → 11 → 12 → 13 → 14 → **15 Testing & Release**. **This is
the last Phase 2 spec. Do not create Spec 16.**

## 1. Purpose

Specify the test strategy, security-validation checklist, and release-readiness
gate that prove the WebMCP + MCP agent transformation works, is safe, and has not
regressed the human website — plus the documentation of limitations for a
demonstration prototype.

## 2. Background

- Capabilities (09), guardrails (10), WebMCP (11), MCP (12), orchestration (13),
  and demo UI (14) are designed. Tests use the sanctioned seams: a **fake
  `CapabilityTransport`** and a **scripted planner** for determinism; **supertest**
  for server endpoints; Vitest in both workspaces (and the future `mcp-server/`).

## 3. Scope

### 3.1 In scope

- **Test areas** across the whole agent surface (§5).
- **Security-validation checklist** derived from Spec 10 and `security.md`.
- **Regression** coverage for the Phase 1 human website.
- **End-to-end agent journey** validation (the reference journey).
- **Browser-compatibility** posture for WebMCP (supported + unsupported/fallback).
- **Release-readiness gate** (the pass/fail criteria) and **known-limitations**
  documentation.

### 3.2 Out of scope / Non-goals

- **No** application or test **code** (this is the plan/gate; code lands with the
  implementation of Specs 11–14).
- **No** new capabilities, endpoints, or model changes.
- **No** load/perf/security **penetration** testing beyond the stated checklist
  (documented as a limitation).

## 4. Personas

| ID | Persona | Need |
| -- | ------- | ---- |
| P1 | QA / Test author | A concrete, deterministic test matrix. |
| P2 | Security reviewer | A validation checklist tied to guardrails. |
| P3 | Release owner | A clear go/no-go gate. |
| P4 | Stakeholder | Documented capabilities and honest limitations. |

## 5. Functional Requirements (EARS-style)

### 5.1 WebMCP tests — FR-1501

- **FR-1501.1** Tests **shall** cover WebMCP capability registration and execution
  through `CapabilityRegistry.invoke` using a fake transport.
- **FR-1501.2** Tests **shall** cover the unsupported-browser **fallback** (no
  WebMCP → normal site, no errors).

### 5.2 MCP tests — FR-1502

- **FR-1502.1** Tests **shall** cover MCP **tool discovery** and **execution** via
  the capability adapter (fake transport / fake services).
- **FR-1502.2** Tests **shall** confirm the MCP tool set **excludes**
  `navigate_to_course` and matches the Spec 09 MCP subset.

### 5.3 Mapping & schema validation — FR-1503

- **FR-1503.1** Tests **shall** confirm each capability maps to the correct service/
  endpoint and reuses the shared schemas (no third copy).
- **FR-1503.2** Tests **shall** confirm input/output validation triggers
  `CapabilityValidationError` on bad data (both phases).

### 5.4 Permission & write-approval tests — FR-1504

- **FR-1504.1** Tests **shall** confirm READ/NAVIGATION need no approval.
- **FR-1504.2** Tests **shall** confirm `submit_enquiry` requires confirmation and a
  decline aborts with `ConfirmationDeniedError` and **no submission** (WebMCP UI
  dialog and MCP fail-closed approval).
- **FR-1504.3** Tests **shall** confirm **no speculative writes** across the
  orchestrated journey.

### 5.5 Error, recovery & duplicate tests — FR-1505

- **FR-1505.1** Tests **shall** cover sanitised error surfacing (validation,
  unavailable course, backend error) with no internals leaked.
- **FR-1505.2** Tests **shall** confirm **duplicate-submission prevention** (no
  second record; prior reference reported).
- **FR-1505.3** Tests **shall** confirm cancellation leaves no partial state.

### 5.6 Regression of the human website — FR-1506

- **FR-1506.1** The existing Phase 1 test suites (client + server) **shall**
  continue to pass unchanged.
- **FR-1506.2** Tests **shall** confirm that mounting the agent layer/demo panel
  does not alter existing human journeys.

### 5.7 End-to-end journey — FR-1507

- **FR-1507.1** A deterministic e2e test (scripted planner + fake/in-process
  services) **shall** exercise the reference journey find → details → compare →
  (navigate) → prepare → validate → confirm → submit → reference.

### 5.8 Browser compatibility — FR-1508

- **FR-1508.1** The plan **shall** state the WebMCP browser-support posture and how
  the unsupported path is validated (fallback), given WebMCP is emerging.

### 5.9 Release gate & limitations — FR-1509

- **FR-1509.1** The plan **shall** define a **release-readiness gate**: all Phase 2
  and Phase 1 tests green; `typecheck`, `lint`, `build` clean across `client`,
  `server`, and `mcp-server`; the app boots with `GET /api/health` → `{status:'ok'}`;
  the MCP server starts/stops cleanly; the security checklist passes.
- **FR-1509.2** The deliverable **shall** include a **known-limitations** document
  (synthetic data; no auth/DB; WebMCP emerging; no perf/pen testing; in-memory
  persistence resets on restart; duplicate protection scope).

## 6. Security-validation checklist (from Spec 10 / security.md)

- Backend re-validates every WRITE (trust boundary) — verified.
- `submit_enquiry` requires human approval; decline/fail-closed submits nothing.
- No speculative writes anywhere in orchestration.
- No PII in logs, outputs, or persisted transcripts.
- Errors sanitised; no internals leaked.
- CORS/origin (REST) and MCP transport exposure within the allow-list model.
- Duplicate-submission protection effective.
- No new capability grants ambient authority.

## 7. Acceptance Criteria (Given / When / Then)

- **AC-1501 (WebMCP) — FR-1501** WebMCP registration/execution + fallback are
  covered and green.
- **AC-1502 (MCP) — FR-1502** MCP discovery/execution covered; navigation excluded.
- **AC-1503 (Mapping/validation) — FR-1503** mappings + schema validation verified.
- **AC-1504 (Approval) — FR-1504** write approval + no-speculative-writes verified.
- **AC-1505 (Errors/dupes) — FR-1505** sanitised errors, dedupe, cancellation
  verified.
- **AC-1506 (Regression) — FR-1506** Phase 1 suites still pass; agent layer is
  additive.
- **AC-1507 (E2E) — FR-1507** the reference journey passes deterministically.
- **AC-1508 (Browser) — FR-1508** support posture + fallback validation stated.
- **AC-1509 (Gate/limitations) — FR-1509** the release gate is defined and the
  limitations documented.
- **AC-1510 (No code) — §0** only the three `15-agent-testing` files are added; no
  application code/tests changed by this spec.

## 8. Constraints

Spec 15 only; specification-only; no application code/tests. Deterministic tests via
the fake transport + scripted planner; supertest for endpoints; Vitest across
`client`/`server`/`mcp-server`. Regression of the human website is mandatory.
Release gate covers typecheck/lint/build/boot/health + security checklist.
Limitations documented. Synthetic data only; RP inspiration only. **This is the
final Phase 2 spec — do not create Spec 16.**
