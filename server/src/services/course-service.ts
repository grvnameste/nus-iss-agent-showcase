import type {
  Course,
  CourseAvailability,
  CourseLevel,
  CourseStatus,
  CourseType,
  DeliveryMode,
} from '../domain/course.js';
import {
  courseRepository,
  type CourseRepository,
} from '../repositories/course-repository.js';

/**
 * Course Service — the single home of all catalogue business logic (design §6,
 * FR-205). It is transport-agnostic: no Express, no React, no HTTP or browser
 * types leak in. This is standard clean design (keeping logic out of
 * controllers and components); it also happens to make the capability reusable
 * and independently testable (NFR-204).
 *
 * Pipeline inside `search` (deterministic order): listability → keyword →
 * filters → sort → paginate (FR-224, FR-244, NFR-209).
 */

export type CourseSortField =
  | 'relevance'
  | 'title'
  | 'duration'
  | 'fee'
  | 'startDate';
export type SortDirection = 'asc' | 'desc';

/** Multi-valued filters: a course matches if it satisfies ANY provided value. */
export interface CourseFilters {
  discipline?: string[];
  category?: string[];
  courseType?: CourseType[];
  level?: CourseLevel[];
  deliveryMode?: DeliveryMode[];
  status?: CourseStatus[];
  availability?: CourseAvailability[];
}

/** Transport-agnostic query contract consumed by `search` (design §6). */
export interface CourseQuery {
  keyword?: string;
  filters?: CourseFilters;
  sort?: { field: CourseSortField; direction: SortDirection };
  page: number; // 1-based
  pageSize: number; // 1..48
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface CourseListResult {
  data: Course[];
  pagination: PaginationMeta;
}

export interface CourseService {
  search(query: CourseQuery): Promise<CourseListResult>;
  getById(id: string): Promise<Course | null>;
}

/**
 * The status values that make a course publicly listable by default (FR-261,
 * FR-263). Listability is a business rule and therefore lives here, not in the
 * UI or the repository.
 */
const LISTABLE_STATUSES: readonly CourseStatus[] = ['published'];

/** Relevance field weights (FR-242). Deterministic; no ML. */
const RELEVANCE_WEIGHTS = {
  title: 3,
  skills: 2,
  tags: 2,
  discipline: 1,
  category: 1,
  shortDescription: 1,
  description: 1,
} as const;

function isListable(course: Course, requestedStatuses?: CourseStatus[]): boolean {
  // When the caller explicitly filters by status, honour it (still only over
  // real records); otherwise default to publicly listable statuses.
  const allowed = requestedStatuses ?? LISTABLE_STATUSES;
  return allowed.includes(course.status);
}

/** Lowercase haystack of the searchable fields for substring matching (§10). */
function searchHaystack(course: Course): string {
  return [
    course.title,
    course.shortDescription,
    course.description,
    course.discipline,
    course.category,
    ...course.skills,
    ...course.tags,
  ]
    .join(' ')
    .toLowerCase();
}

function matchesKeyword(course: Course, keyword: string): boolean {
  if (keyword.length === 0) return true; // empty keyword = match all (FR-222)
  return searchHaystack(course).includes(keyword);
}

/** AND across fields, OR within a multi-valued field (FR-232, FR-233). */
function matchesFilters(course: Course, filters: CourseFilters): boolean {
  const fieldMatches = <T>(values: T[] | undefined, actual: T): boolean =>
    values === undefined || values.length === 0 || values.includes(actual);

  return (
    fieldMatches(filters.discipline, course.discipline) &&
    fieldMatches(filters.category, course.category) &&
    fieldMatches(filters.courseType, course.courseType) &&
    fieldMatches(filters.level, course.level) &&
    fieldMatches(filters.deliveryMode, course.deliveryMode) &&
    fieldMatches(filters.availability, course.availability)
  );
}

/**
 * Deterministic relevance score: weighted count of fields whose value contains
 * the keyword (FR-242). Meaningful only when a keyword is present.
 */
function relevanceScore(course: Course, keyword: string): number {
  if (keyword.length === 0) return 0;
  const has = (text: string): boolean => text.toLowerCase().includes(keyword);
  let score = 0;
  if (has(course.title)) score += RELEVANCE_WEIGHTS.title;
  if (course.skills.some(has)) score += RELEVANCE_WEIGHTS.skills;
  if (course.tags.some(has)) score += RELEVANCE_WEIGHTS.tags;
  if (has(course.discipline)) score += RELEVANCE_WEIGHTS.discipline;
  if (has(course.category)) score += RELEVANCE_WEIGHTS.category;
  if (has(course.shortDescription)) score += RELEVANCE_WEIGHTS.shortDescription;
  if (has(course.description)) score += RELEVANCE_WEIGHTS.description;
  return score;
}

/** Stable tiebreak: title asc, then id asc (FR-242, FR-244). */
function tiebreak(a: Course, b: Course): number {
  const byTitle = a.title.localeCompare(b.title);
  if (byTitle !== 0) return byTitle;
  return a.id.localeCompare(b.id);
}

function applySort(
  courses: Course[],
  keyword: string,
  sort: { field: CourseSortField; direction: SortDirection },
): Course[] {
  const dir = sort.direction === 'desc' ? -1 : 1;
  const sorted = [...courses];

  sorted.sort((a, b) => {
    let primary = 0;
    switch (sort.field) {
      case 'relevance':
        // Higher score first for the requested direction; default desc.
        primary = (relevanceScore(a, keyword) - relevanceScore(b, keyword)) * dir;
        break;
      case 'title':
        primary = a.title.localeCompare(b.title) * dir;
        break;
      case 'duration':
        primary = (a.durationWeeks - b.durationWeeks) * dir;
        break;
      case 'fee':
        primary = (a.fee - b.fee) * dir;
        break;
      case 'startDate':
        primary = a.startDate.localeCompare(b.startDate) * dir;
        break;
    }
    if (primary !== 0) return primary;
    return tiebreak(a, b); // stable, direction-independent
  });

  return sorted;
}

/** Resolve the effective sort, applying documented defaults (FR-240, FR-243). */
function resolveSort(query: CourseQuery, keyword: string): {
  field: CourseSortField;
  direction: SortDirection;
} {
  if (query.sort) return query.sort;
  // No keyword ⇒ relevance is meaningless ⇒ default title asc (FR-243).
  return keyword.length > 0
    ? { field: 'relevance', direction: 'desc' }
    : { field: 'title', direction: 'asc' };
}

export class DefaultCourseService implements CourseService {
  constructor(private readonly repository: CourseRepository = courseRepository) {}

  async search(query: CourseQuery): Promise<CourseListResult> {
    const all = await this.repository.findAll();
    const keyword = (query.keyword ?? '').trim().toLowerCase();
    const filters = query.filters ?? {};

    // 1. Listability (FR-261, FR-263) → 2. keyword (FR-220–222) →
    // 3. filters (FR-232–234).
    const matched = all.filter(
      (course) =>
        isListable(course, filters.status) &&
        matchesKeyword(course, keyword) &&
        matchesFilters(course, filters),
    );

    // 4. Sort (FR-240–244).
    const sort = resolveSort(query, keyword);
    const sorted = applySort(matched, keyword, sort);

    // 5. Paginate (FR-250–255).
    const totalItems = sorted.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / query.pageSize));
    const start = (query.page - 1) * query.pageSize;
    const data = sorted.slice(start, start + query.pageSize);

    return {
      data,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems,
        totalPages,
      },
    };
  }

  async getById(id: string): Promise<Course | null> {
    const course = await this.repository.findById(id);
    // Honour listability: non-listable records are treated as not found for the
    // public catalogue, keeping one consistent rule (FR-260–262).
    if (course === null || !isListable(course)) return null;
    return course;
  }
}

/** Shared default service instance over the default repository. */
export const courseService: CourseService = new DefaultCourseService();
