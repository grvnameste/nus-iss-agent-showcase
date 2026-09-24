import type { Course } from '@/lib/courses/types';
import { AvailabilityBadge } from '../AvailabilityBadge';

/**
 * Course identity block (FR-304, FR-309, FR-310).
 *
 * Renders the discipline eyebrow, the page's single H1 (the course title), the
 * course code and category, and the Spec 02 `AvailabilityBadge` — which carries
 * a text label and a glyph, so availability is never conveyed by colour alone.
 * Presentation only.
 */
export function CourseDetailHeader({ course }: { course: Course }): React.JSX.Element {
  return (
    <header className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
          {course.discipline}
        </p>
        <AvailabilityBadge availability={course.availability} />
      </div>

      <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
        {course.title}
      </h1>

      <dl className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-slate-600">
        <div className="flex items-center gap-1.5">
          <dt className="text-slate-500">Course code</dt>
          <dd className="font-medium text-slate-800">{course.code}</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <dt className="text-slate-500">Category</dt>
          <dd className="font-medium text-slate-800">{course.category}</dd>
        </div>
      </dl>
    </header>
  );
}
