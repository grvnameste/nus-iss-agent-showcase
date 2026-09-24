import { Card } from '@/components/ui/Card';
import { formatDuration, formatFee } from '@/lib/courses/format';
import {
  COURSE_STATUS_LABELS,
  COURSE_LEVEL_LABELS,
  COURSE_TYPE_LABELS,
  DELIVERY_MODE_LABELS,
  type Course,
} from '@/lib/courses/types';
import { formatCourseDate } from './format-date';

/**
 * Structured course attributes as a definition list (FR-306, FR-308).
 *
 * Every value comes from the shared Spec 02 Course model and is rendered with
 * the Spec 02 label maps and formatters — no fields are invented and no values
 * are derived here.
 */
export function CourseKeyFacts({ course }: { course: Course }): React.JSX.Element {
  const facts: { term: string; value: string }[] = [
    { term: 'Course type', value: COURSE_TYPE_LABELS[course.courseType] },
    { term: 'Level', value: COURSE_LEVEL_LABELS[course.level] },
    { term: 'Status', value: COURSE_STATUS_LABELS[course.status] },
    { term: 'Delivery mode', value: DELIVERY_MODE_LABELS[course.deliveryMode] },
    { term: 'Duration', value: formatDuration(course.durationWeeks) },
    { term: 'Intake', value: course.intake },
    { term: 'Start date', value: formatCourseDate(course.startDate) },
    {
      term: 'Application deadline',
      value: formatCourseDate(course.applicationDeadline),
    },
    { term: 'Fee', value: formatFee(course.fee, course.currency) },
    { term: 'Eligibility', value: course.eligibility },
  ];

  return (
    <section aria-labelledby="course-key-facts-heading">
      <Card>
        <h2
          id="course-key-facts-heading"
          className="text-lg font-semibold text-slate-900"
        >
          Key facts
        </h2>
        <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-1">
          {facts.map((fact) => (
            <div key={fact.term}>
              <dt className="text-slate-500">{fact.term}</dt>
              <dd className="mt-0.5 font-medium text-slate-800">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </section>
  );
}
