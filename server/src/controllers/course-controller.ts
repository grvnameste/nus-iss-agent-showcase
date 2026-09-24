import type { Request, Response } from 'express';
import { ApiError } from '../http/api-error.js';
import {
  courseService,
  type CourseFilters,
  type CourseQuery,
  type CourseService,
} from '../services/course-service.js';
import {
  PAGE_DEFAULT,
  PAGE_SIZE_DEFAULT,
  type CourseListQuery,
  type CourseParams,
} from './course-query.schema.js';

/**
 * Course Controller — HTTP concerns only (design §7, coding-standards §Structure).
 *
 * It maps validated query/path params onto the transport-agnostic `CourseQuery`,
 * calls the Course Service, and shapes the shared response envelope. It contains
 * **no** business logic (no search/filter/sort/pagination rules) — those live in
 * the Service. Input is already Zod-validated by the `validate` middleware, so
 * these handlers receive typed, sanitised data.
 */

/** Build the Service filter object, omitting undefined fields for exactOptional. */
function toFilters(query: CourseListQuery): CourseFilters | undefined {
  const filters: CourseFilters = {};
  if (query.discipline) filters.discipline = query.discipline;
  if (query.category) filters.category = query.category;
  if (query.courseType) filters.courseType = query.courseType;
  if (query.level) filters.level = query.level;
  if (query.deliveryMode) filters.deliveryMode = query.deliveryMode;
  if (query.status) filters.status = query.status;
  if (query.availability) filters.availability = query.availability;
  return Object.keys(filters).length > 0 ? filters : undefined;
}

export class CourseController {
  constructor(private readonly service: CourseService = courseService) {}

  /** GET /api/courses — list envelope with pagination (FR-207, FR-254). */
  list = async (req: Request, res: Response): Promise<void> => {
    const query = req.query as unknown as CourseListQuery;

    const courseQuery: CourseQuery = {
      page: query.page ?? PAGE_DEFAULT,
      pageSize: query.pageSize ?? PAGE_SIZE_DEFAULT,
    };
    if (query.keyword) courseQuery.keyword = query.keyword;

    const filters = toFilters(query);
    if (filters) courseQuery.filters = filters;

    if (query.sort) {
      // Per-field default direction (design §12): title/duration/fee/startDate
      // default asc; relevance defaults desc.
      const direction =
        query.direction ?? (query.sort === 'relevance' ? 'desc' : 'asc');
      courseQuery.sort = { field: query.sort, direction };
    }

    const result = await this.service.search(courseQuery);
    res.status(200).json(result);
  };

  /** GET /api/courses/:courseId — single-course envelope or 404 (FR-208, FR-210). */
  getById = async (req: Request, res: Response): Promise<void> => {
    const { courseId } = req.params as unknown as CourseParams;
    const course = await this.service.getById(courseId);
    if (course === null) {
      throw ApiError.notFound(`No course found with id "${courseId}"`);
    }
    res.status(200).json({ data: course });
  };
}

export const courseController = new CourseController();
