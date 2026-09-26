/**
 * Capability I/O schemas (Spec 09 §4).
 *
 * Single source of truth for the Zod input/output contracts of the agent
 * capabilities. These **reuse** the existing client domain schemas
 * (`COURSE_SCHEMA`, enquiry constants) rather than restating a third copy — the
 * server remains authoritative and re-validates every write (Spec 10). No
 * business logic lives here; these are pure shape definitions.
 */
import { z } from 'zod';
import {
  COURSE_SCHEMA,
  COURSE_TYPES,
  COURSE_LEVELS,
  DELIVERY_MODES,
  COURSE_AVAILABILITIES,
} from '@/lib/courses/types';
import {
  ENQUIRY_TYPES,
  NAME_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
  PHONE_MAX_LENGTH,
  MESSAGE_MIN_LENGTH,
  MESSAGE_MAX_LENGTH,
} from '@/lib/enquiries/types';

/** Course comparison capacity, mirroring the Phase 1 client-only comparison. */
export const MAX_COMPARE_COURSES = 4;
/** Course id bound, mirroring the server enquiry schema's courseId max. */
const COURSE_ID_MAX_LENGTH = 200;
const KEYWORD_MAX_LENGTH = 200;
const PAGE_SIZE_MAX = 48;

const courseSortField = z.enum([
  'relevance',
  'title',
  'duration',
  'fee',
  'startDate',
]);
const sortDirection = z.enum(['asc', 'desc']);

const pagination = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

// ── find_courses ──────────────────────────────────────────────────────────
export const findCoursesInput = z.object({
  keyword: z.string().max(KEYWORD_MAX_LENGTH).optional(),
  discipline: z.array(z.string()).optional(),
  category: z.array(z.string()).optional(),
  courseType: z.array(z.enum(COURSE_TYPES)).optional(),
  level: z.array(z.enum(COURSE_LEVELS)).optional(),
  deliveryMode: z.array(z.enum(DELIVERY_MODES)).optional(),
  availability: z.array(z.enum(COURSE_AVAILABILITIES)).optional(),
  sort: courseSortField.optional(),
  direction: sortDirection.optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(PAGE_SIZE_MAX).optional(),
});
export const findCoursesOutput = z.object({
  data: z.array(COURSE_SCHEMA),
  pagination,
});
export type FindCoursesInput = z.infer<typeof findCoursesInput>;
export type FindCoursesOutput = z.infer<typeof findCoursesOutput>;

// ── get_course_details ───────────────────────────────────────────────────
export const getCourseDetailsInput = z.object({
  courseId: z.string().min(1).max(COURSE_ID_MAX_LENGTH),
});
export const getCourseDetailsOutput = z.object({ data: COURSE_SCHEMA });
export type GetCourseDetailsInput = z.infer<typeof getCourseDetailsInput>;
export type GetCourseDetailsOutput = z.infer<typeof getCourseDetailsOutput>;

// ── compare_courses ────────────────────────────────────────────────────────
export const compareCoursesInput = z.object({
  courseIds: z
    .array(z.string().min(1).max(COURSE_ID_MAX_LENGTH))
    .min(2)
    .max(MAX_COMPARE_COURSES)
    // Uniqueness: no duplicate ids in a comparison set.
    .refine((ids) => new Set(ids).size === ids.length, {
      message: 'courseIds must be unique',
    }),
});
/** The comparable columns surfaced for a side-by-side view (composed, read-only). */
export const compareCoursesOutput = z.object({
  courses: z.array(COURSE_SCHEMA),
  fields: z.array(z.string()),
});
export type CompareCoursesInput = z.infer<typeof compareCoursesInput>;
export type CompareCoursesOutput = z.infer<typeof compareCoursesOutput>;

// ── navigate_to_course (WebMCP-only NAVIGATION) ─────────────────────────────
export const navigateToCourseInput = z.object({
  courseId: z.string().min(1).max(COURSE_ID_MAX_LENGTH),
});
export const navigateToCourseOutput = z.object({ href: z.string().min(1) });
export type NavigateToCourseInput = z.infer<typeof navigateToCourseInput>;
export type NavigateToCourseOutput = z.infer<typeof navigateToCourseOutput>;

// ── enquiry candidate (shared by validate/submit) ───────────────────────────
/**
 * A candidate enquiry. Mirrors the server `enquiryInputSchema` bounds so the
 * agent-side pre-check matches what the backend will authoritatively enforce.
 */
export const enquiryCandidate = z.object({
  name: z.string().trim().min(1).max(NAME_MAX_LENGTH),
  email: z.string().trim().min(1).max(EMAIL_MAX_LENGTH).email(),
  phone: z.string().trim().max(PHONE_MAX_LENGTH).optional(),
  courseId: z.string().trim().min(1).max(COURSE_ID_MAX_LENGTH),
  enquiryType: z.enum(ENQUIRY_TYPES),
  message: z.string().trim().min(MESSAGE_MIN_LENGTH).max(MESSAGE_MAX_LENGTH),
});
export type EnquiryCandidate = z.infer<typeof enquiryCandidate>;

// ── prepare_enquiry ─────────────────────────────────────────────────────────
/** Partial draft the agent has gathered so far (all fields optional but courseId). */
export const prepareEnquiryInput = z.object({
  courseId: z.string().min(1).max(COURSE_ID_MAX_LENGTH),
  name: z.string().max(NAME_MAX_LENGTH).optional(),
  email: z.string().max(EMAIL_MAX_LENGTH).optional(),
  phone: z.string().max(PHONE_MAX_LENGTH).optional(),
  enquiryType: z.enum(ENQUIRY_TYPES).optional(),
  message: z.string().max(MESSAGE_MAX_LENGTH).optional(),
});
export const prepareEnquiryOutput = z.object({
  draft: z.object({
    courseId: z.string(),
    courseTitle: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    enquiryType: z.enum(ENQUIRY_TYPES).optional(),
    message: z.string().optional(),
  }),
  /** Required fields still missing before the draft can be submitted. */
  missingFields: z.array(z.string()),
});
export type PrepareEnquiryInput = z.infer<typeof prepareEnquiryInput>;
export type PrepareEnquiryOutput = z.infer<typeof prepareEnquiryOutput>;

// ── validate_enquiry ────────────────────────────────────────────────────────
/**
 * The strict candidate shape a valid enquiry must satisfy (used INSIDE execute).
 */
export const validateEnquiryInput = enquiryCandidate;
/**
 * Permissive registry-level input for `validate_enquiry`. The capability must be
 * callable with an incomplete/invalid candidate and report problems as
 * `fieldErrors` rather than throwing at the registry's input-validation phase —
 * so the input schema here accepts any object and the strict check runs in
 * `execute`.
 */
export const validateEnquiryPermissiveInput = z.record(z.string(), z.unknown());
export const validateEnquiryOutput = z.object({
  valid: z.boolean(),
  fieldErrors: z.record(z.string(), z.string()).optional(),
});
export type ValidateEnquiryInput = z.infer<typeof validateEnquiryInput>;
export type ValidateEnquiryOutput = z.infer<typeof validateEnquiryOutput>;

// ── submit_enquiry (WRITE, human confirmation required) ─────────────────────
export const submitEnquiryInput = enquiryCandidate;
/** Confirmation result — deliberately free of the submitted personal fields. */
export const submitEnquiryOutput = z.object({
  reference: z.string(),
  courseId: z.string(),
  courseTitle: z.string(),
  status: z.literal('received'),
  createdAt: z.string(),
});
export type SubmitEnquiryInput = z.infer<typeof submitEnquiryInput>;
export type SubmitEnquiryOutput = z.infer<typeof submitEnquiryOutput>;
