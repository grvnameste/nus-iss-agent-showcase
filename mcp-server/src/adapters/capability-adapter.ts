/**
 * Capability adapter (Spec 12 §3, §5, FR-1202).
 *
 * Maps the MCP-applicable capabilities to the backend business services by
 * importing the **transport-agnostic services directly** (Spec 12 Option B). No
 * business logic is duplicated and there is no direct data/repository access — the
 * services own search/listability/enquiry rules and re-validate every write with
 * the authoritative domain schema.
 *
 * The MCP set excludes `navigate_to_course` (browser-only, Spec 09 D2).
 */
import { courseService } from '../../../server/src/services/course-service.js';
import {
  enquiryService,
  CourseUnavailableError,
} from '../../../server/src/services/enquiry-service.js';
import { enquiryInputSchema } from '../../../server/src/domain/enquiry.js';
import type { Course } from '../../../server/src/domain/course.js';
import { z } from 'zod';
import {
  findCoursesInput,
  getCourseDetailsInput,
  compareCoursesInput,
  enquiryCandidate,
  type FindCoursesInput,
  type CompareCoursesInput,
} from './schemas.js';
import { HumanApproval } from './approval.js';
import { DuplicateSubmissionGuard } from './duplicate-guard.js';
import type { AuditSink } from './audit.js';

/** Sanitised error surfaced to MCP clients — never leaks internals (FR-1205). */
export class McpToolError extends Error {
  constructor(
    message: string,
    public readonly code: 'validation_error' | 'not_found' | 'declined' | 'duplicate' | 'error',
  ) {
    super(message);
    this.name = 'McpToolError';
  }
}

export interface AdapterDeps {
  /** Obtains explicit human approval for a WRITE; fail-closed (Spec 10). */
  readonly approval: HumanApproval;
  readonly duplicateGuard: DuplicateSubmissionGuard;
  readonly audit: AuditSink;
  /** Overridable for tests (defaults to the real backend services). */
  readonly courses?: typeof courseService;
  readonly enquiries?: typeof enquiryService;
}

const COMPARE_FIELDS = [
  'title',
  'fee',
  'durationWeeks',
  'deliveryMode',
  'intake',
  'availability',
] as const;

/**
 * Build the adapter. Each method validates input with the shared schema, calls
 * the reused service, and records a PII-free audit entry. Business rules stay in
 * the services.
 */
export function createAdapter(deps: AdapterDeps) {
  const courses = deps.courses ?? courseService;
  const enquiries = deps.enquiries ?? enquiryService;

  function parse<T>(schema: z.ZodType<T>, input: unknown, cap: string): T {
    const result = schema.safeParse(input);
    if (!result.success) {
      deps.audit.record({ capability: cap, kind: 'READ', outcome: 'validation_error' });
      throw new McpToolError('The request was invalid.', 'validation_error');
    }
    return result.data;
  }

  async function findCourses(input: unknown): Promise<{ data: Course[]; pagination: unknown }> {
    const q = parse(findCoursesInput, input, 'find_courses');
    const result = await courses.search(toServiceQuery(q));
    deps.audit.record({ capability: 'find_courses', kind: 'READ', outcome: 'success' });
    return { data: [...result.data], pagination: result.pagination };
  }

  async function getCourseDetails(input: unknown): Promise<{ data: Course }> {
    const { courseId } = parse(getCourseDetailsInput, input, 'get_course_details');
    const course = await courses.getById(courseId);
    if (course === null) {
      deps.audit.record({ capability: 'get_course_details', kind: 'READ', outcome: 'not_found' });
      throw new McpToolError('Course not found.', 'not_found');
    }
    deps.audit.record({ capability: 'get_course_details', kind: 'READ', outcome: 'success' });
    return { data: course };
  }

  async function compareCourses(
    input: unknown,
  ): Promise<{ courses: Course[]; fields: string[] }> {
    const { courseIds } = parse(compareCoursesInput, input, 'compare_courses');
    // Composed over the details READ (Spec 09 D1) — no dedicated service method.
    const found = await Promise.all(courseIds.map((id) => courses.getById(id)));
    const missing = found.some((c) => c === null);
    if (missing) {
      deps.audit.record({ capability: 'compare_courses', kind: 'READ', outcome: 'not_found' });
      throw new McpToolError('One or more courses were not found.', 'not_found');
    }
    deps.audit.record({ capability: 'compare_courses', kind: 'READ', outcome: 'success' });
    return { courses: found as Course[], fields: [...COMPARE_FIELDS] };
  }

  async function validateEnquiry(
    input: unknown,
  ): Promise<{ valid: boolean; fieldErrors?: Record<string, string> }> {
    // Advisory pre-check reusing the authoritative schema; never throws on bad data.
    const result = enquiryInputSchema.safeParse(input);
    deps.audit.record({ capability: 'validate_enquiry', kind: 'READ', outcome: 'success' });
    if (result.success) return { valid: true };
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0];
      if (typeof field === 'string' && fieldErrors[field] === undefined) {
        fieldErrors[field] = issue.message;
      }
    }
    return { valid: false, fieldErrors };
  }

  async function prepareEnquiry(
    input: unknown,
  ): Promise<{ draft: Record<string, unknown>; missingFields: string[] }> {
    const partial = z
      .object({
        courseId: z.string().min(1),
        name: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        enquiryType: z.string().optional(),
        message: z.string().optional(),
      })
      .safeParse(input);
    if (!partial.success) {
      deps.audit.record({ capability: 'prepare_enquiry', kind: 'READ', outcome: 'validation_error' });
      throw new McpToolError('The request was invalid.', 'validation_error');
    }
    const draft = partial.data;
    let courseTitle: string | undefined;
    const course = await courses.getById(draft.courseId);
    if (course) courseTitle = course.title;

    const required = ['name', 'email', 'enquiryType', 'message'] as const;
    const missingFields = required.filter((f) => {
      const v = draft[f];
      return v === undefined || v.trim().length === 0;
    });
    deps.audit.record({ capability: 'prepare_enquiry', kind: 'READ', outcome: 'success' });
    return {
      draft: { ...draft, ...(courseTitle !== undefined ? { courseTitle } : {}) },
      missingFields,
    };
  }

  async function submitEnquiry(input: unknown): Promise<{
    reference: string;
    courseId: string;
    courseTitle: string;
    status: string;
    createdAt: string;
  }> {
    // 1. Validate with the shared candidate schema (backend re-validates too).
    const candidate = parse(enquiryCandidate, input, 'submit_enquiry');

    // The server schema types `phone` as `unknown` (it uses z.preprocess), so
    // build a string-typed dedupe key explicitly for the guard.
    const dedupeInput = {
      name: candidate.name,
      email: candidate.email,
      phone: typeof candidate.phone === 'string' ? candidate.phone : undefined,
      courseId: candidate.courseId,
      enquiryType: candidate.enquiryType,
      message: candidate.message,
    };

    // 2. Duplicate protection (Spec 10 §8) BEFORE any approval or write.
    const dup = deps.duplicateGuard.check(dedupeInput);
    if (dup.duplicate) {
      deps.audit.record({
        capability: 'submit_enquiry',
        kind: 'WRITE',
        outcome: 'duplicate',
      });
      throw new McpToolError(
        `This enquiry was already submitted (reference ${dup.reference}).`,
        'duplicate',
      );
    }

    // 3. Explicit human approval — FAIL CLOSED. The server never self-approves.
    const approved = await deps.approval.request({
      capability: 'submit_enquiry',
      courseId: candidate.courseId,
      enquiryType: candidate.enquiryType,
    });
    if (!approved) {
      deps.audit.record({
        capability: 'submit_enquiry',
        kind: 'WRITE',
        outcome: 'declined',
        confirmationGranted: false,
      });
      throw new McpToolError('Human approval was not granted.', 'declined');
    }

    // 4. Delegate to the reused service (authoritative validation + persistence).
    //    Build a cleanly-typed payload: the schema types `phone` as `unknown`
    //    (z.preprocess input side), but the service expects `string | undefined`.
    const submitInput = {
      name: candidate.name,
      email: candidate.email,
      ...(typeof candidate.phone === 'string' ? { phone: candidate.phone } : {}),
      courseId: candidate.courseId,
      enquiryType: candidate.enquiryType,
      message: candidate.message,
    };
    try {
      const result = await enquiries.submit(submitInput);
      deps.duplicateGuard.remember(dedupeInput, result.reference);
      deps.audit.record({
        capability: 'submit_enquiry',
        kind: 'WRITE',
        outcome: 'success',
        confirmationGranted: true,
      });
      return result;
    } catch (error) {
      if (error instanceof CourseUnavailableError) {
        deps.audit.record({ capability: 'submit_enquiry', kind: 'WRITE', outcome: 'not_found' });
        throw new McpToolError('The selected course is not available.', 'not_found');
      }
      deps.audit.record({ capability: 'submit_enquiry', kind: 'WRITE', outcome: 'error' });
      throw new McpToolError('The enquiry could not be submitted.', 'error');
    }
  }

  return {
    findCourses,
    getCourseDetails,
    compareCourses,
    prepareEnquiry,
    validateEnquiry,
    submitEnquiry,
  };
}

export type CapabilityAdapter = ReturnType<typeof createAdapter>;

/** Map the MCP query shape onto the service's transport-agnostic query. */
function toServiceQuery(q: FindCoursesInput) {
  const filters: Record<string, unknown> = {};
  for (const key of [
    'discipline',
    'category',
    'courseType',
    'level',
    'deliveryMode',
    'availability',
  ] as const) {
    const value = q[key];
    if (value && value.length > 0) filters[key] = value;
  }
  return {
    ...(q.keyword !== undefined ? { keyword: q.keyword } : {}),
    filters,
    ...(q.sort !== undefined
      ? { sort: { field: q.sort, direction: q.direction ?? 'asc' } }
      : {}),
    page: q.page ?? 1,
    pageSize: q.pageSize ?? 12,
  };
}

/** Re-export the compare input type for callers/tests. */
export type { CompareCoursesInput };
