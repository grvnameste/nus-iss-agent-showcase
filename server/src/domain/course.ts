import { z } from 'zod';

/**
 * Course domain model — single source of truth (design §3–§4).
 *
 * Enumerations are declared as `const` arrays so that both the Zod schema and
 * downstream consumers (filter validation, UI controls) derive from the same
 * lists with no drift. Status (offering lifecycle) is modelled separately from
 * availability (whether a learner can currently act) per FR-260.
 */

export const DISCIPLINES = [
  'Artificial Intelligence',
  'Data Analytics',
  'Cybersecurity',
  'Cloud Computing',
  'Software Development',
  'DevOps',
  'Digital Transformation',
  'Business',
  'Engineering',
  'Design',
  'Healthcare',
  'Hospitality',
] as const;

export const COURSE_TYPES = [
  'full_time',
  'part_time',
  'short_course',
  'micro_credential',
] as const;

export const DELIVERY_MODES = ['on_campus', 'online', 'blended'] as const;

export const COURSE_LEVELS = [
  'beginner',
  'intermediate',
  'advanced',
  'diploma',
  'post_diploma',
] as const;

export const COURSE_STATUSES = ['published', 'draft', 'archived'] as const;

export const COURSE_AVAILABILITIES = [
  'open',
  'closing_soon',
  'closed',
  'waitlist',
] as const;

export type Discipline = (typeof DISCIPLINES)[number];
export type CourseType = (typeof COURSE_TYPES)[number];
export type DeliveryMode = (typeof DELIVERY_MODES)[number];
export type CourseLevel = (typeof COURSE_LEVELS)[number];
export type CourseStatus = (typeof COURSE_STATUSES)[number];
export type CourseAvailability = (typeof COURSE_AVAILABILITIES)[number];

/** ISO 8601 calendar date (YYYY-MM-DD). */
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected an ISO date (YYYY-MM-DD)')
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid calendar date');

/**
 * Authoritative Course schema and validation rules (FR-203).
 */
export const courseSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  title: z.string().min(1),
  shortDescription: z.string().min(1),
  description: z.string().min(1),
  discipline: z.enum(DISCIPLINES),
  category: z.string().min(1),
  courseType: z.enum(COURSE_TYPES),
  level: z.enum(COURSE_LEVELS),
  durationWeeks: z.number().int().positive(),
  deliveryMode: z.enum(DELIVERY_MODES),
  intake: z.string().min(1),
  startDate: isoDate,
  applicationDeadline: isoDate,
  fee: z.number().nonnegative(),
  currency: z.string().min(1),
  eligibility: z.string().min(1),
  entryRequirements: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  status: z.enum(COURSE_STATUSES),
  availability: z.enum(COURSE_AVAILABILITIES),
  tags: z.array(z.string()).default([]),
});

export type Course = z.infer<typeof courseSchema>;

/** Validate a single course record, throwing on failure. */
export function parseCourse(input: unknown): Course {
  return courseSchema.parse(input);
}
