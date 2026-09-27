# Specification 11 — WebMCP Integration Layer · Requirements

**Project:** EduAgent Connect — WebMCP-Ready Education Website Demonstrator
**Spec ID:** 11-webmcp-integration
**Title:** WebMCP Integration Layer
**Status:** Draft for review (Phase 2 — Agent-Ready Transformation; SPECIFICATION PHASE)
**Builds on:** `08-website-analysis`, `09-agent-capability-model`, `10-agent-guardrails`
**Related steering:** `.kiro/steering/architecture.md`, `product.md`,
`security.md`, `coding-standards.md`, `testing.md`, `design.md`

---

## 0. Phase note

Phase 2. This spec designs the **browser-oriented** interface that exposes the
Spec 09 capabilities to an in-browser AI agent through **WebMCP**, honouring the
Spec 10 guardrails. It is the **first of the two integration layers** (WebMCP
before MCP).

> **Reuse, don't rebuild.** WebMCP registers the *same* capabilities (Spec 09)
> against the *existing* `client/src/lib/webmcp/` registry and transport, and
> reuses the *existing* backend services via HTTP. It adds an adapter + wiring +
> a confirmation UI — not new business logic.

**Specification-only. No application code is written here.** Only the three files
under `.kiro/specs/11-webmcp-integration/`.

Sequence: 08 → 09 → 10 → **11 WebMCP** → 12 MCP → 13 → 14 → 15. Specs 11 and 12 may
be implemented in parallel once 09 + 10 are approved. **Do not create Spec 16.**

## 1. Purpose

Make the completed website "Agent-Ready" in the browser: detect WebMCP support,
register the approved capabilities as WebMCP tools, execute them through the
existing capability registry/transport (reaching the same REST services), enforce
permissions and human confirmation, handle results/errors, and **fall back
gracefully** to the existing human UI where WebMCP is unsupported.

## 2. Background (from Specs 08–10)

- `client/src/lib/webmcp/` provides `CapabilityRegistry` (validate → confirm →
  execute → validate), `CapabilityTransport`, `createBrowserTransport`, and the
  error types — currently empty/unwired.
- Capability contract and classifications are fixed by Spec 09; consent/guardrails
  by Spec 10.
- The human website (catalogue/details/compare/enquiry) continues to work
  unchanged.

## 3. Scope

### 3.1 In scope

- **WebMCP capability detection** (feature-detect the browser WebMCP surface).
- A **browser integration adapter** that binds registered capabilities to the
  WebMCP tool surface (and a no-op/fallback path when unsupported).
- **Tool registration & schemas** derived from the Spec 09 capability definitions
  (name, description, input/output schemas).
- **Mapping** each WebMCP tool to a Spec 09 capability → existing service (no new
  logic).
- **Execution & result handling** through `CapabilityRegistry.invoke`.
- **Permission checks & human confirmation UI** — a real `ConfirmationRequester`
  dialog for `submit_enquiry` (Spec 10).
- **Error handling** using the existing error types + sanitised messages.
- **Unsupported-browser fallback**: the human UI remains fully usable; agents
  degrade to manual interaction.
- **Placement:** `client/src/agent/` for WebMCP wiring + confirmation UI (D5),
  reusing `client/src/lib/webmcp/`.

### 3.2 Out of scope / Non-goals

- **No** MCP server (Spec 12), **no** agent orchestration/LLM (Spec 13), **no**
  demo chat UI beyond the confirmation dialog (Spec 14).
- **No** new backend endpoints, **no** Course/Enquiry model changes, **no**
  changes to human-facing pages other than mounting the agent layer/providers.
- **No** duplicated business logic; capabilities dispatch to services via HTTP.
- **No** application code in this spec (design only).

## 4. Personas

| ID | Persona | Need |
| -- | ------- | ---- |
| P1 | In-browser Agent | Discover + invoke website tools safely. |
| P2 | Human user | Review/approve writes; keep using the site normally. |
| P3 | Implementer | A concrete adapter/registration/fallback design. |
| P4 | Reviewer | Assurance of reuse, guardrails, and graceful degradation. |

## 5. Functional Requirements (EARS-style)

### 5.1 Detection & fallback — FR-1101

- **FR-1101.1** The layer **shall** feature-detect WebMCP support at runtime
  without throwing when absent.
- **FR-1101.2** When WebMCP is unsupported, the site **shall** continue to work as
  a normal human website (no errors, no degraded pages) — the agent interface is
  simply absent (graceful fallback).
- **FR-1101.3** The design **shall** treat WebMCP as emerging: support is optional
  and detected, never assumed.

### 5.2 Registration & schemas — FR-1102

- **FR-1102.1** The layer **shall** register the WebMCP-applicable capabilities
  from Spec 09 (`find_courses`, `get_course_details`, `compare_courses`,
  `navigate_to_course`, `prepare_enquiry`, `validate_enquiry`, `submit_enquiry`).
- **FR-1102.2** Each tool's name/description/input/output schema **shall** derive
  from the Spec 09 capability definition (single source of truth).
- **FR-1102.3** Registration **shall** use the existing `capabilityRegistry`
  (`register`) — no parallel registry.

### 5.3 Execution & mapping — FR-1103

- **FR-1103.1** Tool execution **shall** flow through `CapabilityRegistry.invoke`
  (validate → confirm → execute → validate).
- **FR-1103.2** READ/WRITE capabilities **shall** reach the backend via
  `createBrowserTransport` (existing services/endpoints); `navigate_to_course`
  **shall** perform client routing; `compare_courses` **shall** compose over READs.
- **FR-1103.3** No capability **shall** re-implement search/sort/pagination/
  listability or enquiry rules — those stay in the services.

### 5.4 Permissions & confirmation — FR-1104

- **FR-1104.1** The layer **shall** implement a `ConfirmationRequester` that shows
  a human confirmation dialog for any capability with
  `requiresHumanConfirmation` (i.e. `submit_enquiry`), per Spec 10.
- **FR-1104.2** A decline/cancel **shall** abort with `ConfirmationDeniedError`
  and submit nothing.
- **FR-1104.3** READ/NAVIGATION tools **shall not** prompt for confirmation.

### 5.5 Results & errors — FR-1105

- **FR-1105.1** Successful results **shall** be returned in the capability's output
  shape (validated).
- **FR-1105.2** Errors **shall** surface as the existing types
  (`CapabilityValidationError`, `ConfirmationDeniedError`) or sanitised messages;
  no internals leak.
- **FR-1105.3** In-flight tool status (pending/success/error) **shall** be
  observable for the demo UI (Spec 14) without coupling to it here.

### 5.6 Non-regression & placement — FR-1106

- **FR-1106.1** Mounting the WebMCP layer **shall not** alter existing human
  journeys or break existing tests.
- **FR-1106.2** New code (when Spec 11 is implemented) **shall** live under
  `client/src/agent/` and reuse `client/src/lib/webmcp/`; the confirmation dialog
  **shall** follow `design.md` (accessible dialog, focus management).

## 6. Acceptance Criteria (Given / When / Then)

- **AC-1101 (Detection/fallback) — FR-1101**
  *Given* a browser without WebMCP, *when* the site loads, *then* it works normally
  and the agent interface is absent without error.
- **AC-1102 (Registration) — FR-1102**
  *Given* WebMCP support, *when* the layer initialises, *then* the Spec 09
  capabilities are registered with schemas derived from the capability model.
- **AC-1103 (Execution/reuse) — FR-1103**
  *Given* a registered tool, *when* invoked, *then* it runs through
  `CapabilityRegistry.invoke` and reaches the existing service (or composes/
  navigates) with no duplicated logic.
- **AC-1104 (Confirmation) — FR-1104**
  *Given* `submit_enquiry`, *when* invoked, *then* a confirmation dialog appears and
  a decline aborts with `ConfirmationDeniedError`; READs never prompt.
- **AC-1105 (Errors) — FR-1105**
  *Given* invalid input or a backend error, *when* invoked, *then* a sanitised,
  typed error surfaces with no internals.
- **AC-1106 (Non-regression) — FR-1106**
  *Given* the layer mounted, *when* the human site is used, *then* existing
  journeys and tests are unaffected.
- **AC-1107 (No code) — §0**
  *Given* the completed spec, *when* the repo is inspected, *then* only the three
  `11-webmcp-integration` files are added; no application code changes.

## 7. Constraints

Spec 11 only; specification-only; no application code. Reuse the existing
`client/src/lib/webmcp/` registry/transport and the Spec 09 contract; no new
backend endpoints; no model changes. WebMCP support is detected, with graceful
fallback to the human UI. `submit_enquiry` requires confirmation. Synthetic data
only; RP inspiration only. Do not create Spec 16.
