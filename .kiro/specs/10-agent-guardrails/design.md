# Specification 10 — Agent Permissions, Consent & Guardrails · Design

**Project:** EduAgent Connect — WebMCP-Ready Education Website Demonstrator
**Spec ID:** 10-agent-guardrails
**Status:** Draft for review (Phase 2; SPECIFICATION PHASE)
**Traceability:** `./requirements.md`; capability model
`../09-agent-capability-model/design.md`; trust model `.kiro/steering/security.md`;
pipeline `client/src/lib/webmcp/registry.ts`.

> Descriptive/advisory only. No code is written by this spec.

---

## 1. Design goals

- **DG1** Read freely, write only with explicit human approval.
- **DG2** Never let interface guardrails substitute for the backend trust
  boundary.
- **DG3** Make consent, error, cancellation, dedupe, and audit behaviour uniform
  across WebMCP and MCP.

## 2. Trust model (recap, security.md)

```
Agent → [interface guardrails] → capability → transport → REST API → service
                                                              └─ authoritative Zod re-validation (WRITE)
```

Interface guardrails (consent, interface-side validation, dedupe, audit) are a
first line only. The backend independently validates and owns the outcome.

## 3. Permission enforcement

- Enforcement point is `CapabilityRegistry.invoke`: it reads
  `permissions.requiresHumanConfirmation` and calls `ctx.confirm(...)` before
  `execute`. Guardrails do not add ambient authority; a capability does only what
  it declares (`kind`, `scopes`).
- READ/NAVIGATION: no confirmation. WRITE (`submit_enquiry`): confirmation
  mandatory.

## 4. Human consent model (FR-1001)

- **ConfirmationRequester** (existing type) is implemented per interface:
  - **WebMCP (Spec 11):** a visible confirmation dialog in the human UI showing a
    submission summary (course title, enquiry type, note that personal details
    will be sent). Approve → proceed; Decline/Cancel/close → `ConfirmationDeniedError`.
  - **MCP (Spec 12):** confirmation is surfaced to the human via the MCP client's
    approval mechanism; if the client cannot obtain human approval, the WRITE is
    refused (fail-closed). MCP never self-approves.
- The confirmation summary is built from validated input only; it lists **fields
  being sent** but the audit/log path records **no values** (FR-1004/FR-1007).

## 5. No speculative writes (FR-1002)

- `prepare_enquiry` and `validate_enquiry` are READ and produce a draft / a
  verdict; neither can transition to a submission implicitly.
- Only an explicit `submit_enquiry` invocation, gated by confirmation, writes.
  Orchestration (Spec 13) must route prepare → validate → **human confirm** →
  submit, never prepare → submit.

## 6. Validation & trust boundary (FR-1003)

- Interface-side: Spec 09 input schemas run in `invoke` (fail →
  `CapabilityValidationError('input')`).
- Backend: `enquiryInputSchema` re-validates on `POST /api/enquiries` regardless.
- Divergence is safe by design: the backend is authoritative; a stricter/looser
  interface schema cannot widen what the backend accepts.

## 7. Sensitive-data handling (FR-1004)

- PII flows only through `prepare/validate/submit` inputs and the submission body.
- Outputs carry no PII (submission result = reference/course/status/timestamp).
- Logs/audit capture metadata only (see §9). No name/email/phone/message is ever
  logged or echoed.

## 8. Duplicate-submission protection (FR-1005)

Options (Spec 12/13 pick, preferring no backend change):
- **Client-side submitted guard (preferred for demo):** once `submit_enquiry`
  succeeds for a given draft (hash of normalized input), further identical submits
  within the session are blocked and report the existing reference.
- **Idempotency key:** attach a per-draft key; a repeat with the same key returns
  the prior result. Requires a small backend affordance — deferred unless needed.
- A duplicate attempt returns a clear "already submitted (reference …)" message and
  creates **no** second record.

## 9. Audit logging (FR-1007)

- One structured audit record per invocation:
  `{ capability, kind, outcome, confirmationGranted?, at }` where `outcome ∈
  { success, validation_error, declined, error }`. **No PII, no message text, no
  input values.**
- Reuse the existing `pino` logger on the server side for MCP; the WebMCP side logs
  via a minimal, PII-free client audit sink (details in Spec 11).

## 10. Error & cancellation (FR-1006)

| Situation | Surface |
| --------- | ------- |
| Bad input | `CapabilityValidationError('input')` |
| Declined/cancelled confirmation | `ConfirmationDeniedError` (no write) |
| Unavailable course on submit | sanitised not-found capability error |
| Backend/envelope error | sanitised message; no internals |
| `AbortSignal` / mid-flow cancel | no partial state, no submission |

## 11. Security boundaries (FR-1008)

- Agents reach logic **only** through declared capabilities → transport →
  services. No direct repository/data access, no arbitrary endpoints.
- Interface exposure surfaces to lock down in later specs: **WebMCP** runs in the
  page origin (Spec 11); **MCP** transport/origin/allow-list (Spec 12) within the
  existing `corsOrigins()` model. `security.md` advisories (e.g. bundled postcss)
  are unchanged by Phase 2.

## 12. Constraints recap

Spec 10 only; specification-only; no code. Backend is the trust boundary; consent
required for the single WRITE; no speculative writes; no PII in logs/outputs;
duplicate protection specified; audit is metadata-only. Synthetic data only; RP
inspiration only. Do not create Spec 16.
