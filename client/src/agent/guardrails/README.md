# Agent Guardrails (Spec 10)

Cross-cutting safety applied **around** capability invocation, shared by the
WebMCP integration (Spec 11) and the MCP server (Spec 12). These are a **first
line only** — the backend remains the trust boundary and re-validates every write
regardless of anything here (`security.md`).

## What this adds (and what it does NOT)

The `CapabilityRegistry.invoke` pipeline already enforces **schema validation** and
**human confirmation** (it calls `ctx.confirm` before `execute` for any capability
with `requiresHumanConfirmation`). This module does **not** re-implement those. It
layers on the remaining guardrails:

| File | Guardrail | FR |
| ---- | --------- | -- |
| `audit.ts` | PII-free audit record + sink (`{ capability, kind, outcome, confirmationGranted?, at }`) | FR-1007 |
| `duplicate-guard.ts` | Session-scoped duplicate-submission protection (hash of normalized draft) | FR-1005 |
| `confirm.ts` | Consent summary helper — lists field **names** being sent, never values | FR-1001/FR-1004 |
| `invoke.ts` | `invokeWithGuardrails` — ties dedupe + audit around `registry.invoke` | all |

## Key rules enforced

- **Write consent:** `submit_enquiry` (the only WRITE) requires confirmation; a
  decline throws `ConfirmationDeniedError` and nothing is written.
- **No speculative writes:** `prepare_enquiry`/`validate_enquiry` are READ and never
  transition to a submit; only an explicit, confirmed `submit_enquiry` writes.
- **No duplicates:** an identical resubmission within the session throws
  `DuplicateSubmissionError` (carrying the prior reference) and performs **no**
  second write.
- **No PII in audit/logs:** audit records and the confirmation `details` payload
  carry metadata and field **names** only — never name/email/phone/message values.

## Usage

```ts
import { invokeWithGuardrails, InMemoryAuditSink, DuplicateSubmissionGuard }
  from '@/agent/guardrails';

const audit = new InMemoryAuditSink();
const duplicateGuard = new DuplicateSubmissionGuard();

const result = await invokeWithGuardrails(registry, 'submit_enquiry', input, ctx, {
  audit,
  duplicateGuard,
});
```

## Testing

`guardrails.test.ts` wraps the real Spec 09 registry with a fake transport and
asserts: PII-free success/declined audit, no write on decline, duplicate blocking
(prior reference, no second write), and consent summaries that expose field names
but not values.
