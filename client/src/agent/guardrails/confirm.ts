/**
 * Human-consent helpers (Spec 10 §4, FR-1001).
 *
 * The registry already enforces confirmation for capabilities whose permissions
 * require it (it calls `ctx.confirm` before `execute`). These helpers give each
 * interface a consistent, PII-aware way to describe *what* will be submitted.
 *
 * The confirmation summary lists the FIELD NAMES being sent (so the human knows
 * personal details are included) — it never routes those values into audit/logs
 * (FR-1004/FR-1007). Values may be shown to the human for review by the UI layer,
 * but this builder deals only in field names.
 */
import type { ConfirmationRequest } from '@/lib/webmcp';

/** Minimal shape needed to summarise a submit confirmation. */
export interface EnquirySummaryInput {
  courseId: string;
  courseTitle?: string;
  enquiryType: string;
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
}

/** Human-readable list of the personal fields a submit will send. */
export function personalFieldsBeingSent(input: EnquirySummaryInput): string[] {
  const fields: string[] = [];
  if (input.name !== undefined) fields.push('name');
  if (input.email !== undefined) fields.push('email');
  if (input.phone !== undefined && input.phone.length > 0) fields.push('phone');
  if (input.message !== undefined) fields.push('message');
  return fields;
}

/**
 * Build a `ConfirmationRequest` for an enquiry submission. `summary` is a short,
 * human-readable sentence; `details` carries only NON-PII metadata (course,
 * enquiry type, and the list of field NAMES being sent) so it is safe to surface
 * or log. It deliberately excludes the field values.
 */
export function buildSubmitConfirmation(
  capabilityName: string,
  input: EnquirySummaryInput,
): ConfirmationRequest {
  const course = input.courseTitle ?? input.courseId;
  const fields = personalFieldsBeingSent(input);
  return {
    capabilityName,
    summary:
      `Submit a "${input.enquiryType}" enquiry about ${course}? ` +
      `Your ${fields.join(', ')} will be sent.`,
    details: {
      courseId: input.courseId,
      ...(input.courseTitle !== undefined ? { courseTitle: input.courseTitle } : {}),
      enquiryType: input.enquiryType,
      fieldsBeingSent: fields,
    },
  };
}
