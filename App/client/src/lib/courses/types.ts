/**
 * Client-side course types.
 *
 * These are compatible with the server's authoritative Course model (server owns
 * the Zod schema; the client uses derived, structurally-compatible types). They
 * are plain data shapes for rendering — no business logic lives here (FR-216).
 */
import { z } from 'zod';

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

/**
 * Shared client-side runtime schema for a course payload.
 *
 * This keeps all client consumers (rendering, storage guards, test fixtures)
 * aligned to one model contract instead of repeating object shapes.
 */
export const COURSE_SCHEMA = z.object({
  id: z.string().min(1),
  code: z.string(),
  title: z.string().min(1),
  shortDescription: z.string(),
  description: z.string(),
  discipline: z.enum(DISCIPLINES),
  category: z.string(),
  courseType: z.enum(COURSE_TYPES),
  level: z.enum(COURSE_LEVELS),
  durationWeeks: z.number().finite(),
  deliveryMode: z.enum(DELIVERY_MODES),
  intake: z.string(),
  startDate: z.string(),
  applicationDeadline: z.string(),
  fee: z.number().finite(),
  currency: z.string(),
  eligibility: z.string(),
  entryRequirements: z.array(z.string()),
  skills: z.array(z.string()),
  status: z.enum(COURSE_STATUSES),
  availability: z.enum(COURSE_AVAILABILITIES),
  tags: z.array(z.string()),
});

export type Course = z.infer<typeof COURSE_SCHEMA>;

export type CourseSortField =
  | 'relevance'
  | 'title'
  | 'duration'
  | 'fee'
  | 'startDate';
export type SortDirection = 'asc' | 'desc';

/** Structured query the catalogue UI sends to the API (maps 1:1 to params). */
export interface CourseQueryParams {
  keyword?: string;
  discipline?: string[];
  category?: string[];
  courseType?: CourseType[];
  level?: CourseLevel[];
  deliveryMode?: DeliveryMode[];
  availability?: CourseAvailability[];
  sort?: CourseSortField;
  direction?: SortDirection;
  page?: number;
  pageSize?: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface CourseListResponse {
  data: Course[];
  pagination: PaginationMeta;
}

export interface CourseResponse {
  data: Course;
}

/** Human-readable labels for enum values, for display in controls and cards. */
export const COURSE_TYPE_LABELS: Record<CourseType, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  short_course: 'Short course',
  micro_credential: 'Micro-credential',
};

export const DELIVERY_MODE_LABELS: Record<DeliveryMode, string> = {
  on_campus: 'On campus',
  online: 'Online',
  blended: 'Blended',
};

export const COURSE_LEVEL_LABELS: Record<CourseLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  diploma: 'Diploma',
  post_diploma: 'Post-diploma',
};

export const AVAILABILITY_LABELS: Record<CourseAvailability, string> = {
  open: 'Open for applications',
  closing_soon: 'Closing soon',
  closed: 'Closed',
  waitlist: 'Waitlist',
};

export const COURSE_STATUS_LABELS: Record<CourseStatus, string> = {
  published: 'Published',
  draft: 'Draft',
  archived: 'Archived',
};

export const SORT_LABELS: Record<CourseSortField, string> = {
  relevance: 'Relevance',
  title: 'Title',
  duration: 'Duration',
  fee: 'Fee',
  startDate: 'Start date',
};
