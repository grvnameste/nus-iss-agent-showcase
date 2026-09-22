import type { Course } from '@/lib/courses/types';

/**
 * Cross-spec seam for the optional "Add to comparison" affordance (FR-314).
 *
 * Specification 04 owns comparison state and rules; Specification 03 only
 * *consumes* them. This type is the structural subset of Spec 04's documented
 * `useComparison()` interface that the details page needs — it deliberately
 * implements **no** comparison internals (no state, no capacity or duplicate
 * rules), so the page delegates every decision to the provided implementation.
 *
 * The seam is passed in as an optional prop rather than read from a context
 * owned here: when Spec 04 is unavailable the prop can be omitted and the page
 * still works (AC-309). The route host provides the real `useComparison()`
 * implementation when comparison is enabled.
 */
export interface CourseComparisonSeam {
  /** Add a course to the comparison. Duplicate/limit handling belongs to Spec 04. */
  add: (course: Course) => void;
  /** Remove a course from the comparison by shared Course `id`. */
  remove: (courseId: string) => void;
  /** Whether the course is already selected for comparison. */
  has: (courseId: string) => boolean;
  /** Whether the comparison is at capacity. */
  isFull: boolean;
  /** Maximum number of courses the comparison holds (Spec 04 defines the value). */
  max: number;
}
