# Specification 13 — AI Agent Integration & Orchestration · Requirements

**Project:** EduAgent Connect — WebMCP-Ready Education Website Demonstrator
**Spec ID:** 13-agent-integration
**Title:** AI Agent Integration & Orchestration
**Status:** Draft for review (Phase 2 — Agent-Ready Transformation; SPECIFICATION PHASE)
**Builds on:** `09-agent-capability-model`, `10-agent-guardrails`,
`11-webmcp-integration`, `12-mcp-server`
**Related steering:** `.kiro/steering/product.md`, `architecture.md`,
`security.md`, `coding-standards.md`, `testing.md`

---

## 0. Phase note

Phase 2C. This spec designs how an **AI agent** is connected to the capabilities
exposed through **WebMCP** (Spec 11) or **MCP** (Spec 12) and how it **orchestrates**
them to complete education tasks — while honouring the Spec 10 guardrails.

> **Orchestration is separate from business logic.** The agent selects and
> sequences capabilities; it never contains catalogue/enquiry rules. Those stay in
> the backend services, reached only through the declared capabilities.

**Specification-only. No application code is written here.** Only the three files
under `.kiro/specs/13-agent-integration/`.

Sequence: 08 → 09 → 10 → 11 → 12 → **13 Agent Integration** → 14 Demo UI →
15 Testing. **Do not create Spec 16.**

## 1. Purpose

Define the agent-orchestration layer: how the agent discovers available
capabilities, selects tools for a user's request, sequences the end-to-end journey
(discover → compare → navigate → prepare → validate → **confirm** → submit →
report), and remains guardrail-compliant and transport-agnostic (the same
orchestration works whether capabilities are reached via WebMCP or MCP).

## 2. Background (from Specs 09–12)

- The capability contract (Spec 09) and guardrails (Spec 10) are fixed; WebMCP
  (Spec 11) and MCP (Spec 12) each expose the applicable subset.
- `submit_enquiry` is the only WRITE and requires explicit human confirmation.
- `navigate_to_course` exists only over WebMCP (browser); MCP orchestration skips
  it.

## 3. Scope

### 3.1 In scope

- The **orchestration model**: request interpretation → capability selection →
  sequencing → result synthesis.
- A **transport-agnostic capability interface** the agent calls, so the same
  orchestration runs over WebMCP or MCP (navigation available only when browser
  transport is present).
- **Guardrail adherence** in orchestration: no speculative writes; explicit human
  confirmation before `submit_enquiry`; cancellation handling.
- **The reference demo journey** (§6) expressed as an orchestration plan.
- **Error recovery** (a failed/invalid tool call is surfaced and the agent can
  retry/adjust or stop) and **conversation/turn state** boundaries.
- **Placement:** `client/src/agent/` orchestration modules (D5), separate from any
  LLM provider specifics.

### 3.2 Out of scope / Non-goals

- **No** application code (design only).
- **No** business logic in the agent (lives in services).
- **No** demo chat UI (Spec 14) or test suite (Spec 15) — this spec is the
  orchestration contract they build on.
- **No** new capabilities, endpoints, or model changes.
- **No** hard dependency on a specific LLM vendor; the design keeps the model
  provider behind an interface (a scripted/deterministic "agent" must be able to
  drive the same orchestration for tests/demo).

## 4. Personas

| ID | Persona | Need |
| -- | ------- | ---- |
| P1 | End user | State an intent in natural language and reach a confirmed outcome. |
| P2 | Agent (LLM or scripted) | A clear tool interface + sequencing contract. |
| P3 | Implementer | A transport-agnostic orchestration design. |
| P4 | Security reviewer | Assurance guardrails hold across the whole journey. |

## 5. Functional Requirements (EARS-style)

### 5.1 Capability discovery & selection — FR-1301

- **FR-1301.1** The agent layer **shall** obtain the list of available capabilities
  (name, description, input/output schema) from the active interface (WebMCP or
  MCP) rather than a hard-coded list.
- **FR-1301.2** The agent **shall** select capabilities appropriate to the user's
  request and **shall not** invoke capabilities outside the declared set.

### 5.2 Transport-agnostic invocation — FR-1302

- **FR-1302.1** Orchestration **shall** call capabilities through a single
  interface that works over **either** WebMCP or MCP.
- **FR-1302.2** When the active transport lacks a capability (e.g. MCP lacks
  `navigate_to_course`), the agent **shall** proceed without it (skip/annotate),
  not fail the journey.

### 5.3 Journey sequencing — FR-1303

- **FR-1303.1** The agent **shall** support the reference journey (§6):
  `find_courses` → `get_course_details` → `compare_courses` →
  (`navigate_to_course` if WebMCP) → `prepare_enquiry` → `validate_enquiry` →
  **human confirmation** → `submit_enquiry` → report the reference.
- **FR-1303.2** The agent **shall** present factual course information and **shall
  leave the choice of course to the user** (no autonomous selection of what to
  enquire about).

### 5.4 Guardrail adherence — FR-1304

- **FR-1304.1** The agent **shall not** trigger a WRITE without a confirmed human
  decision (no speculative writes; Spec 10).
- **FR-1304.2** The agent **shall** treat a declined confirmation
  (`ConfirmationDeniedError`) as a normal stop — no retry-around, no resubmission.
- **FR-1304.3** The agent **shall not** attempt to bypass validation or call the
  backend directly; it uses declared capabilities only.

### 5.5 Errors, recovery & cancellation — FR-1305

- **FR-1305.1** A `CapabilityValidationError` **shall** be surfaced so the agent
  can correct input (e.g. re-run `validate_enquiry`) or stop.
- **FR-1305.2** A backend/tool error **shall** be surfaced with a sanitised message;
  the agent **may** retry a READ but **shall not** silently retry a WRITE.
- **FR-1305.3** User cancellation mid-journey **shall** stop orchestration with no
  partial submission.

### 5.6 State & separation — FR-1306

- **FR-1306.1** Orchestration/turn state **shall** be kept separate from the
  application's domain state and from business logic.
- **FR-1306.2** The model provider **shall** sit behind an interface so a
  deterministic/scripted driver can run the same orchestration for demo/tests
  (supports Spec 15 determinism).

## 6. Reference demo journey (normative)

> "Find three courses related to cloud computing, compare them, and help me submit
> an enquiry for the course that matches my interests."

| Step | Agent action | Capability |
| ---- | ------------ | ---------- |
| 1 | Search cloud-related courses | `find_courses` |
| 2 | Retrieve details | `get_course_details` |
| 3 | Compare selected | `compare_courses` |
| 4 | Open selected course (browser) | `navigate_to_course` (WebMCP only) |
| 5 | Prepare an enquiry | `prepare_enquiry` |
| 6 | Validate the enquiry | `validate_enquiry` |
| 7 | Ask user to review & confirm | human confirmation |
| 8 | Submit | `submit_enquiry` |
| 9 | Return the confirmation reference | submission result |

## 7. Acceptance Criteria (Given / When / Then)

- **AC-1301 (Discovery/selection) — FR-1301**
  *Given* an active interface, *when* the agent starts, *then* it enumerates the
  available capabilities and only uses declared ones.
- **AC-1302 (Transport-agnostic) — FR-1302**
  *Given* WebMCP or MCP, *when* the journey runs, *then* the same orchestration
  works, skipping navigation under MCP.
- **AC-1303 (Journey) — FR-1303**
  *Given* the reference request, *when* orchestrated, *then* the steps run in order
  and the user chooses the course.
- **AC-1304 (Guardrails) — FR-1304**
  *Given* the journey, *when* reaching submit, *then* no WRITE occurs without a
  confirmed human decision and a decline stops cleanly.
- **AC-1305 (Errors/cancel) — FR-1305**
  *Given* validation/backend errors or cancellation, *when* they occur, *then* they
  are surfaced sanitised, WRITEs are never silently retried, and no partial submit
  remains.
- **AC-1306 (Separation) — FR-1306**
  *Given* the design, *when* reviewed, *then* orchestration is separate from
  business logic and the model provider is behind an interface.
- **AC-1307 (No code) — §0**
  *Given* the completed spec, *when* the repo is inspected, *then* only the three
  `13-agent-integration` files are added; no application code changes.

## 8. Constraints

Spec 13 only; specification-only; no application code. Orchestration separate from
business logic; transport-agnostic over WebMCP/MCP; no speculative writes; user
chooses the course; model provider behind an interface. Reuse the Spec 09 contract
and Spec 10 guardrails. Synthetic data only; RP inspiration only. Do not create
Spec 16.
