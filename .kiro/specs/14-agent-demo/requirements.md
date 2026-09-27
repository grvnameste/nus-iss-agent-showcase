# Specification 14 — Agent Demo UI & Interaction Experience · Requirements

**Project:** EduAgent Connect — WebMCP-Ready Education Website Demonstrator
**Spec ID:** 14-agent-demo
**Title:** Agent Demo UI & Interaction Experience
**Status:** Draft for review (Phase 2 — Agent-Ready Transformation; SPECIFICATION PHASE)
**Builds on:** `11-webmcp-integration`, `13-agent-integration` (and `09`, `10`, `12`)
**Related steering:** `.kiro/steering/design.md`, `product.md`, `architecture.md`,
`security.md`, `coding-standards.md`, `testing.md`

---

## 0. Phase note

Phase 2C. This spec designs a **demonstration interface** that shows an AI agent
interacting with the existing website through the exposed capabilities. It is a
**visible, human-supervised** experience: the human watches tool calls, inspects
inputs/outputs, and **approves the write**.

> **The human website remains fully available.** The demo UI is additive — an
> agent panel alongside the normal site, not a replacement for it.

**Specification-only. No application code is written here.** Only the three files
under `.kiro/specs/14-agent-demo/`.

Sequence: 08 → 09 → 10 → 11 → 12 → 13 → **14 Demo UI** → 15 Testing. **Do not
create Spec 16.**

## 1. Purpose

Give a reviewer/stakeholder a clear window into the agent-ready transformation: a
panel where a user states a request, the agent's tool executions are shown with
status and inspectable I/O, human approval is requested for the enquiry
submission, and the confirmation reference (plus error/cancellation states) is
displayed — all reusing the Phase 1 design system and accessibility conventions.

## 2. Background (from Specs 11, 13)

- Spec 11 provides the WebMCP layer, a PII-free per-invocation status signal, and
  the `ConfirmationRequester` dialog.
- Spec 13 provides the orchestration (bounded loop, transport-agnostic, scripted or
  LLM planner) that the UI drives and observes.
- The demo runs over WebMCP in the browser (navigation available); an MCP demo is a
  separate, client-side-out-of-scope concern here.

## 3. Scope

### 3.1 In scope

- **Agent interaction panel** mounted alongside the human site (e.g. a dockable
  panel / route under the app), not replacing any page.
- **User request input** (natural-language intent) and a transcript of the
  exchange.
- **Tool execution status** (pending / success / error) per capability call.
- **Tool input/output inspection** (expandable, PII-aware — see §5.4).
- **Human approval dialog** for `submit_enquiry` (reuse Spec 11 confirmation).
- **Submission confirmation** display (reference, course, status, timestamp).
- **Error & cancellation states** (validation, declined, backend, cancelled).
- **A toggle** so the panel can be shown/hidden; the site works normally when hidden.
- Reuse of the **Phase 1 design system** (`design.md`) and **a11y** conventions.

### 3.2 Out of scope / Non-goals

- **No** application code (design only).
- **No** business logic or capability definitions (Specs 09/11/13 own those).
- **No** MCP-client UI (MCP is exercised by external clients, Spec 12) — this demo
  is the **browser/WebMCP** experience.
- **No** change to existing human pages beyond mounting the optional panel/provider.
- **No** persistence of transcripts or any PII.

## 4. Personas

| ID | Persona | Need |
| -- | ------- | ---- |
| P1 | Demo stakeholder | See the agent complete a real journey, transparently. |
| P2 | Human user | Understand each step; approve the write; stay in control. |
| P3 | Accessibility reviewer | An accessible, keyboard-operable panel. |
| P4 | Implementer | A concrete, design-system-consistent UI spec. |

## 5. Functional Requirements (EARS-style)

### 5.1 Panel & coexistence — FR-1401

- **FR-1401.1** The demo **shall** present an agent interaction panel that
  coexists with the human website; the site **shall** remain fully usable with the
  panel hidden or shown.
- **FR-1401.2** Mounting the panel **shall not** regress existing human journeys or
  tests (additive only).

### 5.2 Request & transcript — FR-1402

- **FR-1402.1** The user **shall** be able to enter a natural-language request.
- **FR-1402.2** The panel **shall** show a readable transcript of user messages,
  agent messages, and tool calls in order.

### 5.3 Tool status — FR-1403

- **FR-1403.1** Each capability invocation **shall** display a status
  (pending / success / error) sourced from the Spec 11 status signal.
- **FR-1403.2** Status updates **shall** be announced accessibly (e.g. `aria-live`)
  without stealing focus.

### 5.4 I/O inspection & PII — FR-1404

- **FR-1404.1** The panel **shall** allow inspecting a tool call's input and output
  (expandable), so the interaction is transparent.
- **FR-1404.2** Displayed enquiry PII (name/email/phone/message) **shall** be shown
  to the human for review only and **shall not** be persisted or logged
  (Spec 10 FR-1004).

### 5.5 Human approval — FR-1405

- **FR-1405.1** Before `submit_enquiry`, the panel **shall** present the Spec 11
  confirmation dialog with a submission summary.
- **FR-1405.2** Approve **shall** proceed; Decline/Cancel/close **shall** abort with
  no submission (`ConfirmationDeniedError` surfaced as a friendly cancelled state).

### 5.6 Confirmation & errors — FR-1406

- **FR-1406.1** On success, the panel **shall** display the confirmation reference,
  course, status, and timestamp.
- **FR-1406.2** Validation, declined, backend, and cancelled states **shall** each
  render a clear, sanitised message (no internals / stack traces).
- **FR-1406.3** A duplicate submission (Spec 10) **shall** be shown as an
  already-submitted state referencing the prior confirmation.

### 5.7 Design system & accessibility — FR-1407

- **FR-1407.1** The UI **shall** reuse the Phase 1 design system (`design.md`):
  slate/sky palette, `buttonClasses`, cards, focus rings, spacing scale.
- **FR-1407.2** The panel **shall** meet the site's a11y bar: keyboard operable,
  labelled controls, visible focus, `aria-live` for async status, dialog focus
  management. Client interactivity is justified (`'use client'`).

## 6. Acceptance Criteria (Given / When / Then)

- **AC-1401 (Coexistence) — FR-1401**
  *Given* the panel, *when* shown or hidden, *then* the human site works normally
  and existing tests pass.
- **AC-1402 (Request/transcript) — FR-1402**
  *Given* a request, *when* submitted, *then* an ordered transcript of messages and
  tool calls appears.
- **AC-1403 (Status) — FR-1403**
  *Given* a tool call, *when* it runs, *then* pending/success/error is shown and
  announced accessibly.
- **AC-1404 (Inspection/PII) — FR-1404**
  *Given* a tool call, *when* inspected, *then* its I/O is viewable and PII is
  neither persisted nor logged.
- **AC-1405 (Approval) — FR-1405**
  *Given* `submit_enquiry`, *when* reached, *then* the confirmation dialog appears
  and a decline aborts with no submission.
- **AC-1406 (Confirmation/errors) — FR-1406**
  *Given* success/validation/declined/backend/duplicate states, *when* they occur,
  *then* each renders a clear sanitised result.
- **AC-1407 (Design/a11y) — FR-1407**
  *Given* the panel, *when* audited, *then* it reuses the design system and meets
  the a11y conventions.
- **AC-1408 (No code) — §0**
  *Given* the completed spec, *when* the repo is inspected, *then* only the three
  `14-agent-demo` files are added; no application code changes.

## 7. Constraints

Spec 14 only; specification-only; no application code. Additive panel; human site
always available; reuse Spec 11 confirmation + Spec 13 orchestration; reuse the
Phase 1 design system and a11y; no PII persistence/logging; write requires
approval. Synthetic data only; RP inspiration only. Do not create Spec 16.
