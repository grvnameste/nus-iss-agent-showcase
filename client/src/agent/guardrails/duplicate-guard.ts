/**
 * Duplicate-submission protection (Spec 10 §8, FR-1005).
 *
 * A session-scoped, client-side guard: once an enquiry submission succeeds for a
 * given normalized draft, an identical resubmission within the session is blocked
 * and the prior confirmation reference is reported instead — so an agent (or a
 * retried invocation) cannot create a second record. This is the demo-preferred
 * option and requires NO backend change. It is a first line only; the backend
 * remains authoritative (Spec 10 §2).
 */

/** The fields that identify an enquiry for dedupe purposes. */
export interface DedupeKeyInput {
  name: string;
  email: string;
  phone?: string;
  courseId: string;
  enquiryType: string;
  message: string;
}

/**
 * Build a stable, order-independent key from normalized fields. Trimmed and
 * lower-cased where the backend also normalizes (email lower-cased), so trivial
 * variations map to the same key. This value is a dedupe token, not a log/PII
 * artefact — it is never emitted to audit.
 */
export function dedupeKey(input: DedupeKeyInput): string {
  const norm = (s: string): string => s.trim();
  const parts = [
    norm(input.name),
    norm(input.email).toLowerCase(),
    norm(input.phone ?? ''),
    norm(input.courseId),
    norm(input.enquiryType),
    norm(input.message),
  ];
  // Join with a separator that cannot appear inside the individual fields'
  // meaning ambiguously; a unit separator keeps fields unambiguous.
  return parts.join('\u241F');
}

/** Result of consulting the guard before a submit. */
export type DuplicateCheck =
  | { readonly duplicate: false }
  | { readonly duplicate: true; readonly reference: string };

/**
 * Tracks successful submissions for the current session and answers whether a
 * given draft has already been submitted.
 */
export class DuplicateSubmissionGuard {
  private readonly seen = new Map<string, string>();

  /** Has this exact draft already been submitted? If so, the prior reference. */
  check(input: DedupeKeyInput): DuplicateCheck {
    const reference = this.seen.get(dedupeKey(input));
    return reference === undefined
      ? { duplicate: false }
      : { duplicate: true, reference };
  }

  /** Record a successful submission so future identical drafts are blocked. */
  remember(input: DedupeKeyInput, reference: string): void {
    this.seen.set(dedupeKey(input), reference);
  }

  /** Clear all remembered submissions (e.g. a fresh session). */
  reset(): void {
    this.seen.clear();
  }
}

/** Raised when a duplicate submission is prevented; carries the prior reference. */
export class DuplicateSubmissionError extends Error {
  constructor(public readonly reference: string) {
    super(`This enquiry was already submitted (reference ${reference}).`);
    this.name = 'DuplicateSubmissionError';
  }
}
