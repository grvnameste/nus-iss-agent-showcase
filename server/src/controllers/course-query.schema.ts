import { z } from 'zod';
import {
  COURSE_AVAILABILITIES,
  COURSE_LEVELS,
  COURSE_STATUSES,
  COURSE_TYPES,
  DELIVERY_MODES,
  DISCIPLINES,
} from '../domain/course.js';

/**
 * Zod validation for the `GET /api/courses` query string (design §9, FR-211,
 * FR-235, FR-252, FR-253). Validation happens at the controller boundary; the
 * Service never sees unvalidated input.
 *
 * Filter params accept either a repeated query key (`?discipline=A&discipline=B`)
 * or a comma-separated value (`?discipline=A,B`). Both normalise to a string
 * array with OR-within-field semantics enforced by the Service.
 */

const PAGE_SIZE_MAX = 48;

/**
 * Normalise a repeatable/CSV query param into a string array, then validate each
 * member against the provided enum. Unknown members produce a validation issue
 * (→ HTTP 400), satisfying FR-235.
 */
function enumList<const T extends readonly [string, ...string[]]>(values: T) {
  const member = z.enum(values);
  return z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((raw) => {
      if (raw === undefined) return undefined;
      const parts = (Array.isArray(raw) ? raw : [raw])
        .flatMap((value) => value.split(','))
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
      return parts.length > 0 ? parts : undefined;
    })
    .pipe(z.array(member).nonempty().optional());
}

/** Coerce a positive-integer query param, rejecting non-integers/negatives. */
const positiveInt = z.coerce
  .number({ invalid_type_error: 'Expected a positive integer' })
  .int('Expected an integer')
  .positive('Expected a positive integer');

export const courseListQuerySchema = z.object({
  keyword: z.string().trim().max(200).optional(),
  discipline: enumList(DISCIPLINES),
  category: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((raw) => {
      if (raw === undefined) return undefined;
      const parts = (Array.isArray(raw) ? raw : [raw])
        .flatMap((value) => value.split(','))
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
      return parts.length > 0 ? parts : undefined;
    }),
  courseType: enumList(COURSE_TYPES),
  level: enumList(COURSE_LEVELS),
  deliveryMode: enumList(DELIVERY_MODES),
  status: enumList(COURSE_STATUSES),
  availability: enumList(COURSE_AVAILABILITIES),
  sort: z
    .enum(['relevance', 'title', 'duration', 'fee', 'startDate'])
    .optional(),
  direction: z.enum(['asc', 'desc']).optional(),
  page: positiveInt.optional(),
  pageSize: positiveInt.max(PAGE_SIZE_MAX, `pageSize must be ≤ ${PAGE_SIZE_MAX}`).optional(),
});

export type CourseListQuery = z.infer<typeof courseListQuerySchema>;

/** Validate the `:courseId` path param shape (non-empty) (FR-211). */
export const courseParamsSchema = z.object({
  courseId: z.string().trim().min(1),
});

export type CourseParams = z.infer<typeof courseParamsSchema>;

export const PAGE_DEFAULT = 1;
export const PAGE_SIZE_DEFAULT = 12;
export { PAGE_SIZE_MAX };
