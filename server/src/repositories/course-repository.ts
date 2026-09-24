import { COURSES } from '../data/course-data.js';
import type { Course } from '../domain/course.js';

/**
 * Course data-access contract (design §5, FR-204, NFR-208).
 *
 * The repository is the ONLY component that knows the data source. It exposes
 * raw data access (retrieve all, retrieve by id) and contains **no** business
 * rules — no search, filter, sort, or listability logic lives here. Because it
 * is an interface, tests can inject an in-memory fake and a future database
 * implementation can replace the JSON fixture without touching the Service.
 */
export interface CourseRepository {
  /** Return every course record, unfiltered. */
  findAll(): Promise<readonly Course[]>;
  /** Return the course with the given id, or null if none matches. */
  findById(id: string): Promise<Course | null>;
}

/**
 * In-memory repository backed by the validated synthetic dataset loaded and
 * cached by `course-data.ts`. No per-request I/O; the dataset is already frozen.
 */
export class InMemoryCourseRepository implements CourseRepository {
  constructor(private readonly courses: readonly Course[] = COURSES) {}

  findAll(): Promise<readonly Course[]> {
    return Promise.resolve(this.courses);
  }

  findById(id: string): Promise<Course | null> {
    const match = this.courses.find((course) => course.id === id);
    return Promise.resolve(match ?? null);
  }
}

/** Shared default repository instance over the synthetic dataset. */
export const courseRepository: CourseRepository = new InMemoryCourseRepository();
