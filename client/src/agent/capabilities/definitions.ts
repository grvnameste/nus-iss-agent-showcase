/**
 * Agent capability definitions (Spec 09).
 *
 * The seven capabilities expressed as typed `CapabilityDefinition`s against the
 * existing WebMCP contract. Capabilities **describe and dispatch only** — every
 * bit of catalogue/enquiry business logic stays in the backend services, reached
 * through `ctx.transport` (READ/WRITE), a composed READ (`compare_courses`), or an
 * injected browser collaborator (`navigate_to_course`). No rules are duplicated
 * here (architecture.md; Spec 09 §2).
 */
import type { CapabilityDefinition, CapabilityContext } from '@/lib/webmcp';
import {
  findCoursesInput,
  findCoursesOutput,
  getCourseDetailsInput,
  getCourseDetailsOutput,
  compareCoursesInput,
  compareCoursesOutput,
  navigateToCourseInput,
  navigateToCourseOutput,
  prepareEnquiryInput,
  prepareEnquiryOutput,
  validateEnquiryPermissiveInput,
  validateEnquiryOutput,
  submitEnquiryInput,
  submitEnquiryOutput,
  enquiryCandidate,
  type FindCoursesInput,
  type FindCoursesOutput,
  type GetCourseDetailsInput,
  type GetCourseDetailsOutput,
  type CompareCoursesInput,
  type CompareCoursesOutput,
  type NavigateToCourseInput,
  type NavigateToCourseOutput,
  type PrepareEnquiryInput,
  type PrepareEnquiryOutput,
  type ValidateEnquiryOutput,
  type SubmitEnquiryInput,
  type SubmitEnquiryOutput,
} from './schemas';

/**
 * Browser-side collaborators the capability layer must not implement itself
 * (rule 6: browser specifics live behind a seam). Injected so the definitions
 * stay environment-agnostic and testable without `window`.
 */
export interface CapabilityCollaborators {
  /** Perform client-side navigation to a course details route; returns the href. */
  navigateToCourse: (courseId: string) => string;
}

/** The catalogue route the details page lives under (existing Phase 1 route). */
const CATALOGUE_PATH = '/lifelong-learning/courses';

/** Build the details href without importing browser/router specifics here. */
export function courseDetailsHref(courseId: string): string {
  return `${CATALOGUE_PATH}/${encodeURIComponent(courseId)}`;
}

/** Serialise the structured find query into transport query params. */
function toQuery(input: FindCoursesInput): Record<string, unknown> {
  const q: Record<string, unknown> = {};
  if (input.keyword) q.keyword = input.keyword;
  if (input.sort) q.sort = input.sort;
  if (input.direction) q.direction = input.direction;
  if (input.page !== undefined) q.page = input.page;
  if (input.pageSize !== undefined) q.pageSize = input.pageSize;
  // Multi-valued filters are passed through as arrays; the transport encodes them.
  for (const key of [
    'discipline',
    'category',
    'courseType',
    'level',
    'deliveryMode',
    'availability',
  ] as const) {
    const value = input[key];
    if (value && value.length > 0) q[key] = value;
  }
  return q;
}

// ── find_courses (READ) ─────────────────────────────────────────────────────
export const findCourses: CapabilityDefinition<
  FindCoursesInput,
  FindCoursesOutput
> = {
  name: 'find_courses',
  description:
    'Search, filter, sort, and paginate the published course catalogue.',
  permissions: { kind: 'READ', requiresHumanConfirmation: false, scopes: ['courses:read'] },
  inputSchema: findCoursesInput,
  outputSchema: findCoursesOutput,
  execute: (input, ctx) =>
    ctx.transport.read<FindCoursesOutput>('/api/courses', toQuery(input)),
};

// ── get_course_details (READ) ───────────────────────────────────────────────
export const getCourseDetails: CapabilityDefinition<
  GetCourseDetailsInput,
  GetCourseDetailsOutput
> = {
  name: 'get_course_details',
  description: 'Retrieve full details for a single course by id.',
  permissions: { kind: 'READ', requiresHumanConfirmation: false, scopes: ['courses:read'] },
  inputSchema: getCourseDetailsInput,
  outputSchema: getCourseDetailsOutput,
  execute: (input, ctx) =>
    ctx.transport.read<GetCourseDetailsOutput>(
      `/api/courses/${encodeURIComponent(input.courseId)}`,
    ),
};

/** Columns surfaced by the composed comparison (mirrors the Phase 1 view). */
const COMPARE_FIELDS = [
  'title',
  'fee',
  'durationWeeks',
  'deliveryMode',
  'intake',
  'availability',
] as const;

// ── compare_courses (READ, composed — no backend endpoint) ──────────────────
export const compareCourses: CapabilityDefinition<
  CompareCoursesInput,
  CompareCoursesOutput
> = {
  name: 'compare_courses',
  description:
    'Compare a shortlist of courses side by side (composed from course details).',
  permissions: { kind: 'READ', requiresHumanConfirmation: false, scopes: ['courses:read'] },
  inputSchema: compareCoursesInput,
  outputSchema: compareCoursesOutput,
  // Composed over the details READ (Spec 09 D1): no dedicated endpoint. Fetch
  // each course, then shape the comparable columns client-side.
  execute: async (input, ctx) => {
    const results = await Promise.all(
      input.courseIds.map((id) =>
        ctx.transport.read<GetCourseDetailsOutput>(
          `/api/courses/${encodeURIComponent(id)}`,
        ),
      ),
    );
    return { courses: results.map((r) => r.data), fields: [...COMPARE_FIELDS] };
  },
};

// ── navigate_to_course (NAVIGATION, WebMCP-only) ────────────────────────────
export function makeNavigateToCourse(
  collaborators: CapabilityCollaborators,
): CapabilityDefinition<NavigateToCourseInput, NavigateToCourseOutput> {
  return {
    name: 'navigate_to_course',
    description: 'Open a course details page in the browser.',
    permissions: {
      kind: 'NAVIGATION',
      requiresHumanConfirmation: false,
      scopes: ['navigation:course'],
    },
    inputSchema: navigateToCourseInput,
    outputSchema: navigateToCourseOutput,
    // The browser navigation itself is injected (seam); the capability only
    // dispatches and reports the resulting href.
    execute: async (input) => ({
      href: collaborators.navigateToCourse(input.courseId),
    }),
  };
}

/** Required fields a draft needs before it can be submitted. */
const REQUIRED_ENQUIRY_FIELDS = ['name', 'email', 'enquiryType', 'message'] as const;

// ── prepare_enquiry (READ, pure shaping — no side effects) ──────────────────
export const prepareEnquiry: CapabilityDefinition<
  PrepareEnquiryInput,
  PrepareEnquiryOutput
> = {
  name: 'prepare_enquiry',
  description:
    'Assemble a draft enquiry for review and report which required fields remain.',
  permissions: { kind: 'READ', requiresHumanConfirmation: false, scopes: ['enquiry:read'] },
  inputSchema: prepareEnquiryInput,
  outputSchema: prepareEnquiryOutput,
  // Pure shaping: optionally attach the course title for a friendlier review
  // summary via the details READ; never writes.
  execute: async (input, ctx) => {
    let courseTitle: string | undefined;
    try {
      const details = await ctx.transport.read<GetCourseDetailsOutput>(
        `/api/courses/${encodeURIComponent(input.courseId)}`,
      );
      courseTitle = details.data.title;
    } catch {
      // Title is a convenience only; a lookup failure must not block preparation.
      courseTitle = undefined;
    }

    const missingFields = REQUIRED_ENQUIRY_FIELDS.filter((field) => {
      const value = input[field];
      return value === undefined || value.trim().length === 0;
    });

    return {
      draft: {
        courseId: input.courseId,
        ...(courseTitle !== undefined ? { courseTitle } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.enquiryType !== undefined ? { enquiryType: input.enquiryType } : {}),
        ...(input.message !== undefined ? { message: input.message } : {}),
      },
      missingFields,
    };
  },
};

// ── validate_enquiry (READ, advisory pre-check) ─────────────────────────────
// Input generic is the permissive record shape (any object), so an invalid
// candidate is reported as fieldErrors from execute rather than throwing at the
// registry's input phase.
export const validateEnquiry: CapabilityDefinition<
  Record<string, unknown>,
  ValidateEnquiryOutput
> = {
  name: 'validate_enquiry',
  description:
    'Validate a candidate enquiry (advisory; the backend re-validates on submit).',
  permissions: { kind: 'READ', requiresHumanConfirmation: false, scopes: ['enquiry:read'] },
  // The capability input schema is intentionally PERMISSIVE (accepts any object):
  // the strict candidate schema is applied inside execute so a failure returns
  // structured fieldErrors rather than the registry throwing at the input phase.
  // This is what lets the agent guide correction instead of hitting an error.
  inputSchema: validateEnquiryPermissiveInput,
  outputSchema: validateEnquiryOutput,
  execute: async (input) => {
    const parsed = enquiryCandidate.safeParse(input);
    if (parsed.success) return { valid: true };
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === 'string' && fieldErrors[field] === undefined) {
        fieldErrors[field] = issue.message;
      }
    }
    return { valid: false, fieldErrors };
  },
};

// ── submit_enquiry (WRITE, human confirmation required) ─────────────────────
export const submitEnquiry: CapabilityDefinition<
  SubmitEnquiryInput,
  SubmitEnquiryOutput
> = {
  name: 'submit_enquiry',
  description: 'Submit a confirmed enquiry for a course.',
  // The ONLY write. The registry requests explicit human confirmation before
  // execute runs; a decline aborts with ConfirmationDeniedError (Spec 10).
  permissions: { kind: 'WRITE', requiresHumanConfirmation: true, scopes: ['enquiry:write'] },
  inputSchema: submitEnquiryInput,
  outputSchema: submitEnquiryOutput,
  execute: async (input, ctx) => {
    const result = await ctx.transport.write<{ data: SubmitEnquiryOutput }>(
      '/api/enquiries',
      input,
    );
    // The REST layer wraps the confirmation in `{ data }`; unwrap for the output.
    return result.data;
  },
};

/**
 * The full capability catalogue. `navigate_to_course` requires a browser
 * collaborator, so it is produced via {@link makeNavigateToCourse}.
 */
export function createCapabilities(
  collaborators: CapabilityCollaborators,
): ReadonlyArray<CapabilityDefinition<unknown, unknown>> {
  return [
    findCourses,
    getCourseDetails,
    compareCourses,
    makeNavigateToCourse(collaborators),
    prepareEnquiry,
    validateEnquiry,
    submitEnquiry,
  ] as ReadonlyArray<CapabilityDefinition<unknown, unknown>>;
}

/**
 * The MCP-applicable subset (Spec 09 D2): everything except the browser-only
 * navigation capability. Used by the MCP server (Spec 12).
 */
export function createMcpCapabilities(): ReadonlyArray<
  CapabilityDefinition<unknown, unknown>
> {
  return [
    findCourses,
    getCourseDetails,
    compareCourses,
    prepareEnquiry,
    validateEnquiry,
    submitEnquiry,
  ] as ReadonlyArray<CapabilityDefinition<unknown, unknown>>;
}

// Re-export the context type for convenience to registrants/tests.
export type { CapabilityContext };
