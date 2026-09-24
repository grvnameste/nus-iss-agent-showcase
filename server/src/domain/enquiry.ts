import { z } from 'zod';

/**
 * Enquiry domain model — server-authoritative (design §4, FR-504, FR-505).
 *
 * Mirrors the Course domain pattern: enumerations are declared as `const`
 * arrays so the Zod schema and every downstream consumer (client labels, tests)
 * derive from one list with no drift. This module is the trust boundary's
 * single source of truth — the client's own validation is advisory only
 * (FR-507, SR-501).
 */

export const ENQUIRY_TYPES = [
  'general',
  'course_content',
  'fees_funding',
  'admissions',
  'other',
] as const;

export type EnquiryType = (typeof ENQUIRY_TYPES)[number];

/** Submission status. The MVP records receipt only — nothing is dispatched. */
export const ENQUIRY_STATUSES = ['received'] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

/**
 * Field bounds (FR-509, SR-505). Exported so the API tests, the client's
 * advisory validation, and the form's helper text all cite the same numbers
 * instead of restating them.
 */
export const NAME_MAX_LENGTH = 100;
export const EMAIL_MAX_LENGTH = 254; // RFC 5321 practical maximum
export const PHONE_MAX_LENGTH = 32;
export const COURSE_ID_MAX_LENGTH = 200;
export const MESSAGE_MIN_LENGTH = 10;
export const MESSAGE_MAX_LENGTH = 2000;

/**
 * Permissive international phone shape: digits with optional leading `+` and
 * common separators. Deliberately loose — the goal is to bound and sanity-check
 * input, not to reject legitimate numbering plans.
 */
const PHONE_PATTERN = /^\+?[0-9][0-9\s()./-]*$/;

/**
 * Authoritative enquiry schema (FR-508, FR-509, SR-502, SR-505).
 *
 * Every string is trimmed and length-bounded so a request cannot grow
 * unbounded, and unknown keys are stripped (Zod's default for objects) so a
 * client cannot smuggle extra fields into storage.
 */
export const enquiryInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(NAME_MAX_LENGTH),
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .max(EMAIL_MAX_LENGTH)
    .email('Enter a valid email address')
    .toLowerCase(),
  // Trim before validating, and treat a blank string as "not provided" rather
  // than as an invalid number, so an untouched optional field never blocks a
  // submission (FR-504).
  phone: z.preprocess(
    (value) => {
      if (typeof value !== 'string') return value;
      const trimmed = value.trim();
      return trimmed.length === 0 ? undefined : trimmed;
    },
    z
      .string()
      .max(PHONE_MAX_LENGTH)
      .regex(PHONE_PATTERN, 'Enter a valid phone number')
      .optional(),
  ),
  courseId: z.string().trim().min(1).max(COURSE_ID_MAX_LENGTH),
  enquiryType: z.enum(ENQUIRY_TYPES),
  message: z.string().trim().min(MESSAGE_MIN_LENGTH).max(MESSAGE_MAX_LENGTH),
});

/** Input the client submits, after authoritative server validation. */
export type EnquiryInput = z.infer<typeof enquiryInputSchema>;

/**
 * Stored enquiry record. `courseTitle` is captured at submission time so the
 * confirmation stays meaningful even if the catalogue changes later.
 */
export interface Enquiry extends EnquiryInput {
  id: string;
  reference: string;
  status: EnquiryStatus;
  courseTitle: string;
  createdAt: string;
}
