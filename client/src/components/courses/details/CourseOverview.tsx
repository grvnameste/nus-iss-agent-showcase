import type { Course } from '@/lib/courses/types';

/**
 * Course description block (FR-305). The short description leads as a summary;
 * the full description follows as the main body. Presentation only.
 */
export function CourseOverview({ course }: { course: Course }): React.JSX.Element {
  return (
    <section aria-labelledby="course-overview-heading" className="space-y-3">
      <h2 id="course-overview-heading" className="text-xl font-semibold text-slate-900">
        About this course
      </h2>
      <p className="text-lg leading-relaxed text-slate-700">{course.shortDescription}</p>
      <p className="leading-relaxed text-slate-700">{course.description}</p>
    </section>
  );
}
