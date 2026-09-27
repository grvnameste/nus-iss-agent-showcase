/**
 * Agent guardrails — public entry point (Spec 10).
 *
 * Cross-cutting safety applied around capability invocation: human consent
 * helpers, duplicate-submission protection, PII-free audit, and the
 * `invokeWithGuardrails` wrapper. The backend remains the trust boundary; these
 * are a first line only.
 */
export {
  type AuditOutcome,
  type AuditRecord,
  type AuditSink,
  InMemoryAuditSink,
  noopAuditSink,
} from './audit';
export {
  type DedupeKeyInput,
  type DuplicateCheck,
  dedupeKey,
  DuplicateSubmissionGuard,
  DuplicateSubmissionError,
} from './duplicate-guard';
export {
  type EnquirySummaryInput,
  personalFieldsBeingSent,
  buildSubmitConfirmation,
} from './confirm';
export { type GuardrailOptions, invokeWithGuardrails } from './invoke';
