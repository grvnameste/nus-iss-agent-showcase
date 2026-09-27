/**
 * Client-side enquiry types (Spec 05, design §10, NFR-502).
 *
 * Structurally compatible with the server's authoritative model in
 * `server/src/domain/enquiry.ts`, which owns the Zod schema. Nothing here is a
 * security control: the backend re-validates every submission regardless
 * (FR-507, SR-501). These values exist so the form can give immediate feedback
 * and label its controls.
 */

export const ENQUIRY_TYPES = [
  'general',
  'course_content',
  'fees_funding',
  'admissions',
  'other',
] as const;

export type EnquiryType = (typeof ENQUIRY_TYPES)[number];

export type EnquiryStatus = 'received';

/** Field bounds mirrored from the server schema so helper text stays truthful. */
export const NAME_MAX_LENGTH = 100;
export const EMAIL_MAX_LENGTH = 254;
export const PHONE_MAX_LENGTH = 32;
export const MESSAGE_MIN_LENGTH = 10;
export const MESSAGE_MAX_LENGTH = 2000;

/** Human-readable labels for the enquiry categories, for display in controls. */
export const ENQUIRY_TYPE_LABELS: Record<EnquiryType, string> = {
  general: 'General enquiry',
  course_content: 'Course content',
  fees_funding: 'Fees and funding',
  admissions: 'Admissions',
  other: 'Something else',
};

/** Request body for `POST /api/enquiries`. */
export interface EnquiryInput {
  name: string;
  email: string;
  phone?: string;
  courseId: string;
  enquiryType: EnquiryType;
  message: string;
}

/** Successful `201` payload — deliberately free of the submitted personal fields. */
export interface EnquiryConfirmationResult {
  reference: string;
  courseId: string;
  courseTitle: string;
  status: EnquiryStatus;
  createdAt: string;
}

export interface EnquiryResponse {
  data: EnquiryConfirmationResult;
}

/**
 * A persisted enquiry as returned by `GET /api/enquiries`.
 *
 * Unlike {@link EnquiryConfirmationResult}, this carries the full submitted
 * record — including the personal fields — because the dashboard reviews stored
 * enquiries. This is safe here only because the data is **synthetic demonstration
 * data**: no real learner PII is ever stored (see product/security steering), so
 * the dashboard displays every field without masking.
 *
 * Structurally compatible with the server's stored enquiry model; the backend
 * remains the source of truth.
 */
export interface StoredEnquiry {
  reference: string;
  courseId: string;
  courseTitle: string;
  name: string;
  email: string;
  phone?: string;
  enquiryType: EnquiryType;
  message: string;
  status: EnquiryStatus;
  createdAt: string;
}

/** Successful payload for `GET /api/enquiries` — newest first. */
export interface EnquiryListResponse {
  data: StoredEnquiry[];
}
