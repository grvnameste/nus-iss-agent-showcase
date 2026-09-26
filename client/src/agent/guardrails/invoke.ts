/**
 * Guarded invocation (Spec 10).
 *
 * Wraps `CapabilityRegistry.invoke` with the cross-cutting guardrails that both
 * interfaces share: duplicate-submission protection and PII-free audit. It does
 * NOT re-implement confirmation or schema validation — those are already enforced
 * inside `invoke` (validate → confirm → execute → validate). This wrapper adds the
 * dedupe check around the single WRITE and records a metadata-only audit entry for
 * every outcome.
 *
 * The backend remains the trust boundary; this is a first line only (Spec 10 §2).
 */
import {
  CapabilityValidationError,
  ConfirmationDeniedError,
  type CapabilityContext,
  type CapabilityRegistry,
} from '@/lib/webmcp';
import { CAPABILITY_NAMES } from '@/agent/capabilities';
import { type AuditSink, noopAuditSink, type AuditOutcome } from './audit';
import {
  DuplicateSubmissionError,
  type DuplicateSubmissionGuard,
  type DedupeKeyInput,
} from './duplicate-guard';

export interface GuardrailOptions {
  /** Audit sink; defaults to a no-op. */
  readonly audit?: AuditSink;
  /** Duplicate guard; when provided, protects `submit_enquiry`. */
  readonly duplicateGuard?: DuplicateSubmissionGuard;
}

/** Minimal shape of a successful submit result (for dedupe bookkeeping). */
interface SubmitResultLike {
  reference: string;
}

function auditOutcomeFor(error: unknown): AuditOutcome {
  if (error instanceof CapabilityValidationError) return 'validation_error';
  if (error instanceof ConfirmationDeniedError) return 'declined';
  if (error instanceof DuplicateSubmissionError) return 'duplicate';
  return 'error';
}

/**
 * Invoke a capability through the registry with guardrails applied.
 *
 * - For `submit_enquiry`: consult the duplicate guard BEFORE invoking; a repeat of
 *   an already-submitted draft throws `DuplicateSubmissionError` (no second write).
 *   On success, remember the draft → reference mapping.
 * - Always: emit exactly one PII-free audit record (success/validation_error/
 *   declined/duplicate/error), including `confirmationGranted` for WRITEs.
 */
export async function invokeWithGuardrails<TOutput = unknown>(
  registry: CapabilityRegistry,
  name: string,
  input: unknown,
  ctx: CapabilityContext,
  options: GuardrailOptions = {},
): Promise<TOutput> {
  const audit = options.audit ?? noopAuditSink;
  const definition = registry.get(name);
  const kind = definition?.permissions.kind ?? 'READ';
  const isSubmit = name === CAPABILITY_NAMES.submitEnquiry;

  // Track whether confirmation was granted, purely for the audit record. We wrap
  // the caller's confirm so we never inspect or store the confirmation payload.
  let confirmationGranted: boolean | undefined;
  const guardedCtx: CapabilityContext = definition?.permissions.requiresHumanConfirmation
    ? {
        ...ctx,
        confirm: async (request) => {
          const approved = await ctx.confirm(request);
          confirmationGranted = approved;
          return approved;
        },
      }
    : ctx;

  try {
    // Duplicate protection for the single WRITE (Spec 10 §8).
    if (isSubmit && options.duplicateGuard) {
      const check = options.duplicateGuard.check(input as DedupeKeyInput);
      if (check.duplicate) {
        throw new DuplicateSubmissionError(check.reference);
      }
    }

    const result = await registry.invoke<TOutput>(name, input, guardedCtx);

    // Remember a successful submission so identical resubmits are blocked.
    if (isSubmit && options.duplicateGuard) {
      const reference = (result as unknown as SubmitResultLike).reference;
      if (typeof reference === 'string') {
        options.duplicateGuard.remember(input as DedupeKeyInput, reference);
      }
    }

    audit.record({
      capability: name,
      kind,
      outcome: 'success',
      ...(confirmationGranted !== undefined ? { confirmationGranted } : {}),
      at: new Date().toISOString(),
    });
    return result;
  } catch (error) {
    audit.record({
      capability: name,
      kind,
      outcome: auditOutcomeFor(error),
      ...(confirmationGranted !== undefined ? { confirmationGranted } : {}),
      at: new Date().toISOString(),
    });
    throw error;
  }
}
