import { z } from 'zod';
import { courseSchema, type Course } from '../domain/course.js';
import rawCourses from './courses.json';

/**
 * Synthetic course dataset loader (TASK-204, FR-203, NFR-201).
 *
 * Validates every record in the fixture against the authoritative Course schema
 * at module load. Invalid data fails fast so malformed records can never enter
 * the catalogue. The validated array is frozen and cached for the process
 * lifetime — no per-request file I/O.
 *
 * All data is synthetic and fictional; there is no external or production
 * integration of any kind.
 */
const datasetSchema = z.array(courseSchema);

function loadCourses(): readonly Course[] {
  const result = datasetSchema.safeParse(rawCourses);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid synthetic course dataset:\n${issues}`);
  }
  return Object.freeze(result.data);
}

export const COURSES: readonly Course[] = loadCourses();
