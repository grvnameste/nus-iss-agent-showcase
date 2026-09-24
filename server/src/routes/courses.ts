import { Router } from 'express';
import { validate } from '../http/validate.js';
import { asyncHandler } from '../http/async-handler.js';
import { courseController } from '../controllers/course-controller.js';
import {
  courseListQuerySchema,
  courseParamsSchema,
} from '../controllers/course-query.schema.js';

/**
 * Course catalogue routes (design §8, FR-207, FR-208).
 *
 * Routes contain no logic; they wire the validation boundary to the controller.
 * Both endpoints are classified READ operations (no side effects). Registered
 * under the Spec 01 `/api` composition in `app.ts`.
 */
export const coursesRouter = Router();

// GET /api/courses — search/filter/sort/paginate the catalogue.
coursesRouter.get(
  '/',
  validate('query', courseListQuerySchema),
  asyncHandler(courseController.list),
);

// GET /api/courses/:courseId — retrieve a single course.
coursesRouter.get(
  '/:courseId',
  validate('params', courseParamsSchema),
  asyncHandler(courseController.getById),
);
