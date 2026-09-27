# Specification 10 — Agent Permissions, Consent & Guardrails · Requirements

**Project:** EduAgent Connect — WebMCP-Ready Education Website Demonstrator
**Spec ID:** 10-agent-guardrails
**Title:** Agent Permissions, Consent & Guardrails
**Status:** Draft for review (Phase 2 — Agent-Ready Transformation; SPECIFICATION PHASE)
**Builds on:** `.kiro/specs/08-website-analysis/`, `.kiro/specs/09-agent-capability-model/`
**Related steering:** `.kiro/steering/security.md`, `product.md`, `architecture.md`,
`coding-standards.md`, `testing.md`

---

## 0. Phase note

Phase 2, security-design phase. This spec defines **how an agent is permitted to
interact** with EduAgent Connect's capabilities. It is the security contract that
**both** WebMCP (Spec 11) and MCP (Spec 12) must honour. It builds on the
capability model (Spec 09) and the `security.md` trust model.

> **The backend is the trust boundary.** Guardrails at the agent/interface layer
> improve safety and UX, but they **never replace** server-side validation. Every
> WRITE is independently re-validated on the backend regardless of agent behaviour.

**Spec 10 is specification-only. No application code is written here.** The three
files under `.kiro/specs/10-agent-guardrails/` are the only artefacts.

Sequence: 08 → 09 → **10 Guardrails** → 11 WebMCP → 12 MCP → 13 → 14 → 15. **Do
not create Spec 16.**

## 1. Purpose

Specify the permission classification, human-consent model, and safety guardrails
that govern agent access to the Spec 09 capabilities — so agents can read freely,
prepare/validate safely, and write **only** with explicit human approval, with no
way to bypass the backend trust boundary.

## 2. Background (from Specs 08–09)

- Capabilities are classified `READ | NAVIGATION | WRITE` with explicit
  `requiresHumanConfirmation`. `submit_enquiry` is the only WRITE.
- The `CapabilityRegistry.invoke` pipeline already enforces: validate input →
  confirm (if required) → execute → validate output; a decline throws
  `ConfirmationDeniedError`.
- The backend re-validates every enquiry via `enquiryInputSchema` and never echoes
  PII. Errors are sanitised through a shared envelope.
- There is **no** confirmation-requester implementation wired yet, and **no**
  duplicate-submission protection.

## 3. Scope

### 3.1 In scope

- The **permission model**: how `kind` + `scopes` + `requiresHumanConfirmation`
  govern what an agent may do.
- **Human consent / confirmation** semantics for WRITE (what is shown, how
  approval/decline/cancel behave).
- **No speculative writes** rule and its enforcement point.
- **Input validation** expectations at both the interface and the trust boundary.
- **Sensitive-data handling** (PII in prepare/validate/submit; never logged).
- **Duplicate-submission protection** approach for agent-driven enquiries.
- **Error, cancellation, and timeout behaviour** for capabilities.
- **Audit logging** of agent capability invocations (what to log, what never to).
- **Security boundaries** between agent, interface layers, and application.

### 3.2 Out of scope / Non-goals

- **No** application code, no auth system, no real user accounts (synthetic
  prototype).
- **No** interface-specific wiring (WebMCP registration is Spec 11; MCP transport/
  server is Spec 12) — this spec states the policy both must implement.
- **No** changes to backend business rules; guardrails wrap, not replace, them.

## 4. Personas

| ID | Persona | Need |
| -- | ------- | ---- |
| P1 | Security Reviewer | A clear, enforceable guardrail contract. |
| P2 | WebMCP/MCP Implementers | Precise consent/validation/audit rules to build. |
| P3 | Human user | Assurance nothing is submitted without explicit approval. |
| P4 | Agent | Deterministic, safe rules for what it can and cannot do. |

## 5. Permission model

- Every capability carries `permissions: { kind, requiresHumanConfirmation,
  scopes }` (Spec 09). There is **no ambient authority** — a capability can do
  only what it declares.
- **READ / NAVIGATION** may be invoked without human approval.
- **WRITE** (`submit_enquiry`) requires `requiresHumanConfirmation: true` and an
  explicit approval before execution.

## 6. Functional Requirements (EARS-style)

### 6.1 Confirmation for writes — FR-1001

- **FR-1001.1** When a WRITE capability is invoked, the system **shall** request
  explicit human confirmation **before** execution, via the registry's
  `ConfirmationRequester`.
- **FR-1001.2** The confirmation **shall** present a human-readable summary of
  exactly what will be submitted (course, enquiry type, and that personal details
  will be sent) so approval is informed.
- **FR-1001.3** If the human **declines or cancels**, the capability **shall
  abort** with `ConfirmationDeniedError` and **nothing** is submitted.
- **FR-1001.4** An agent **shall not** be able to auto-approve, pre-approve, or
  suppress the confirmation (no ambient authority).

### 6.2 No speculative writes — FR-1002

- **FR-1002.1** Agents **may** invoke READ/NAVIGATION capabilities freely.
- **FR-1002.2** A WRITE **shall never** be triggered without a confirmed human
  decision in the same interaction (no "prepare then silently submit").

### 6.3 Input validation & trust boundary — FR-1003

- **FR-1003.1** Capability input **shall** be schema-validated at the interface
  (Spec 09 schemas) **and** independently re-validated by the backend on every
  WRITE (`enquiryInputSchema`).
- **FR-1003.2** Interface-layer validation **shall not** be treated as sufficient;
  the backend remains authoritative (security.md).
- **FR-1003.3** All external/agent input **shall** be treated as untrusted.

### 6.4 Sensitive-data handling — FR-1004

- **FR-1004.1** Enquiry PII (name, email, phone, message) **shall** be handled only
  as needed to prepare/validate/submit and **shall not** be logged by agent or
  interface layers.
- **FR-1004.2** Capability outputs **shall not** echo PII back (submission result
  returns reference/course/status/timestamp only, per Spec 09).
- **FR-1004.3** Only synthetic data is used; no real PII enters the system.

### 6.5 Duplicate-submission protection — FR-1005

- **FR-1005.1** The design **shall** specify a mechanism to prevent an agent (or a
  retried invocation) from submitting the **same enquiry twice** — e.g. an
  idempotency key or a short-lived client-side submitted-draft guard — without
  requiring backend persistence changes if avoidable.
- **FR-1005.2** A duplicate attempt **shall** be reported clearly and **shall not**
  create a second record.

### 6.6 Error & cancellation behaviour — FR-1006

- **FR-1006.1** Validation failures **shall** surface as `CapabilityValidationError`;
  declines as `ConfirmationDeniedError`; backend failures as sanitised capability
  errors that never leak internals.
- **FR-1006.2** Cancellation (user aborts mid-flow, or an `AbortSignal` fires)
  **shall** leave no partial state and no submission.
- **FR-1006.3** Errors surfaced to the human **shall** be actionable and free of
  stack traces/internal identifiers.

### 6.7 Audit logging — FR-1007

- **FR-1007.1** The design **shall** specify an **audit record** per capability
  invocation: capability name, kind, timestamp, outcome (success/validation-error/
  declined/error), and (for WRITE) whether confirmation was granted — **without**
  any PII or message content.
- **FR-1007.2** Audit logging **shall** reuse the existing structured logger where
  practical and **shall not** duplicate PII into logs.

### 6.8 Security boundaries — FR-1008

- **FR-1008.1** The design **shall** define the boundary between the agent, the
  interface layer (WebMCP/MCP), and the application, and state that agents reach
  business logic **only** through declared capabilities → services (never direct
  data/repository access).
- **FR-1008.2** CORS/origin and transport-exposure concerns **shall** be flagged
  for the interface specs (WebMCP origin, MCP transport) to implement within the
  existing allow-list model.

## 7. Acceptance Criteria (Given / When / Then)

- **AC-1001 (Write confirmation) — FR-1001**
  *Given* `submit_enquiry`, *when* invoked, *then* an informed confirmation is
  requested before execution and a decline aborts with `ConfirmationDeniedError`
  and no submission.
- **AC-1002 (No speculative writes) — FR-1002**
  *Given* any agent flow, *when* reviewed, *then* no path performs a WRITE without
  a confirmed human decision.
- **AC-1003 (Trust boundary) — FR-1003**
  *Given* a WRITE, *when* it reaches the backend, *then* it is re-validated
  server-side regardless of interface validation.
- **AC-1004 (PII) — FR-1004**
  *Given* enquiry handling, *when* reviewed, *then* PII is never logged and never
  echoed in outputs.
- **AC-1005 (Duplicates) — FR-1005**
  *Given* a repeated submit, *when* attempted, *then* it is prevented/reported and
  no second record is created.
- **AC-1006 (Errors/cancel) — FR-1006**
  *Given* validation/decline/cancel/backend errors, *when* they occur, *then* they
  surface as the specified sanitised errors with no partial state.
- **AC-1007 (Audit) — FR-1007**
  *Given* an invocation, *when* logged, *then* the audit record is present and
  contains no PII.
- **AC-1008 (No code) — §0**
  *Given* the completed spec, *when* the repo is inspected, *then* only the three
  `10-agent-guardrails` files are added; no application code changes.

## 8. Constraints

Spec 10 only; specification-only; no application code. Backend remains the trust
boundary; interface guardrails never replace it. `submit_enquiry` is the only
WRITE and requires explicit human confirmation; no speculative writes; no PII in
logs/outputs. Synthetic data only; RP inspiration only. Do not create Spec 16.
