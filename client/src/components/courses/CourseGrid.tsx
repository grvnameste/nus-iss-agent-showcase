import { CourseCard } from './CourseCard';
import type { Course } from '@/lib/courses/types';

/**
 * Responsive course grid (FR-212, NFR-212). Renders the current page of results
 * as an accessible list; column count adapts across breakpoints. Presentation
 * only.
 */
export function CourseGrid({ courses }: { courses: Course[] }): React.JSX.Element {
  return (
    <ul
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      aria-label="Course results"
    >
      {courses.map((course) => (
        <li key={course.id} className="h-full">
          <CourseCard course={course} />
        </li>
      ))}
    </ul>
  );
}
