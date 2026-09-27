/**
 * Duplicate-submission protection (Spec 12 §7, FR-1205.2; Spec 10 §8).
 *
 * Session-scoped guard: once an enquiry submission succeeds for a normalized
 * draft, an identical resubmission is blocked and the prior reference reported —
 * so a retried/duplicated tool call cannot create a second record. No backend
 * change required; the backend remains authoritative.
 */

export interface DedupeKeyInput {
  name: string;
  email: string;
  phone?: string | undefined;
  courseId: string;
  enquiryType: string;
  message: string;
}

/** Stable key from normalized fields (email lower-cased, all trimmed). */
export function dedupeKey(input: DedupeKeyInput): string {
  const norm = (s: string): string => s.trim();
  return [
    norm(input.name),
    norm(input.email).toLowerCase(),
    norm(input.phone ?? ''),
    norm(input.courseId),
    norm(input.enquiryType),
    norm(input.message),
  ].join('\u241F');
}

export type DuplicateCheck =
  | { readonly duplicate: false }
  | { readonly duplicate: true; readonly reference: string };

export class DuplicateSubmissionGuard {
  private readonly seen = new Map<string, string>();

  check(input: DedupeKeyInput): DuplicateCheck {
    const reference = this.seen.get(dedupeKey(input));
    return reference === undefined
      ? { duplicate: false }
      : { duplicate: true, reference };
  }

  remember(input: DedupeKeyInput, reference: string): void {
    this.seen.set(dedupeKey(input), reference);
  }

  reset(): void {
    this.seen.clear();
  }
}
