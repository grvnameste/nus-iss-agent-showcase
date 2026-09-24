'use client';

import Link from 'next/link';
import { AvailabilityBadge } from '@/components/courses/AvailabilityBadge';
import { formatDuration, formatFee } from '@/lib/courses/format';
import {
  COURSE_LEVEL_LABELS,
  COURSE_STATUS_LABELS,
  COURSE_TYPE_LABELS,
  DELIVERY_MODE_LABELS,
  type Course,
} from '@/lib/courses/types';
import { courseDetailsHref, enquiryHref } from './routes';

/**
 * Side-by-side comparison table (FR-410, FR-411, FR-412).
 *
 * Attributes are rows and courses are columns, so a learner scans one attribute
 * across every course in a single line. Presentation is deliberately neutral:
 * no value is ranked, scored, highlighted as "best", or recommended — the table
 * only lays the shared Course model out for a human to judge.
 *
 * Every value is read from the shared Spec 02 model through the Spec 02 label
 * maps and formatters; nothing is invented or derived here.
 */

/**
 * The compared attributes, in a fixed order. Declaring them as data keeps the
 * order identical for any selection (NFR-406) and keeps the row markup single-
 * sourced.
 */
const ATTRIBUTES: { label: string; render: (course: Course) => React.ReactNode }[] = [
  {
    label: 'Availability',
    render: (course) => <AvailabilityBadge availability={course.availability} />,
  },
  { label: 'Status', render: (course) => COURSE_STATUS_LABELS[course.status] },
  { label: 'Course type', render: (course) => COURSE_TYPE_LABELS[course.courseType] },
  { label: 'Discipline', render: (course) => course.discipline },
  { label: 'Category', render: (course) => course.category },
  { label: 'Level', render: (course) => COURSE_LEVEL_LABELS[course.level] },
  {
    label: 'Delivery mode',
    render: (course) => DELIVERY_MODE_LABELS[course.deliveryMode],
  },
  { label: 'Duration', render: (course) => formatDuration(course.durationWeeks) },
  { label: 'Intake', render: (course) => course.intake },
  { label: 'Fee', render: (course) => formatFee(course.fee, course.currency) },
  { label: 'Eligibility', render: (course) => course.eligibility },
];

const ROW_HEADER_CLASS =
  'sticky left-0 z-10 w-40 min-w-40 bg-slate-50 px-4 py-3 text-left align-top text-sm font-semibold text-slate-700';
const CELL_CLASS = 'w-56 min-w-56 px-4 py-3 align-top text-sm text-slate-800';

export function ComparisonTable({
  courses,
  onRemove,
}: {
  courses: Course[];
  onRemove: (courseId: string) => void;
}): React.JSX.Element {
  return (
    /*
     * A bounded, focusable scroll container (NFR-405): the table keeps its
     * side-by-side shape at every width instead of collapsing, and narrow
     * screens scroll it horizontally. `tabIndex` makes that scrolling reachable
     * without a pointer, which is why it is exposed as a labelled region.
     */
    <div
      role="region"
      aria-label="Course comparison table"
      tabIndex={0}
      className="overflow-x-auto rounded-lg border border-slate-200 bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
    >
      {/*
        No `aria-label` on the table: it would suppress the caption as the
        accessible name and lose the orientation the caption gives.
      */}
      <table className="w-full border-collapse">
        <caption className="sr-only">
          Compare selected courses attribute by attribute. Courses are columns;
          attributes are rows.
        </caption>

        <thead>
          <tr className="border-b border-slate-200">
            <th scope="col" className={ROW_HEADER_CLASS}>
              Attribute
            </th>
            {courses.map((course) => (
              <th
                key={course.id}
                scope="col"
                className={`${CELL_CLASS} text-left font-semibold text-slate-900`}
              >
                <Link
                  href={courseDetailsHref(course.id)}
                  className="rounded-sm text-base leading-snug hover:text-sky-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
                >
                  {course.title}
                </Link>
                <p className="mt-1 text-xs font-normal text-slate-500">{course.code}</p>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {ATTRIBUTES.map((attribute) => (
            <tr key={attribute.label} className="border-b border-slate-100">
              <th scope="row" className={ROW_HEADER_CLASS}>
                {attribute.label}
              </th>
              {courses.map((course) => (
                <td key={course.id} className={CELL_CLASS}>
                  {attribute.render(course)}
                </td>
              ))}
            </tr>
          ))}

          <tr>
            <th scope="row" className={ROW_HEADER_CLASS}>
              Next step
            </th>
            {courses.map((course) => (
              <td key={course.id} className={CELL_CLASS}>
                <div className="flex flex-col items-start gap-2">
                  <Link
                    href={courseDetailsHref(course.id)}
                    aria-label={`View details for ${course.title}`}
                    className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-semibold text-sky-800 ring-1 ring-inset ring-sky-300 transition-colors hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
                  >
                    View details
                  </Link>
                  <Link
                    href={enquiryHref(course.id)}
                    aria-label={`Enquire about ${course.title}`}
                    className="inline-flex items-center justify-center rounded-md bg-sky-700 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
                  >
                    Enquire
                  </Link>
                  <button
                    type="button"
                    onClick={() => onRemove(course.id)}
                    aria-label={`Remove ${course.title} from comparison`}
                    className="rounded-md px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
                  >
                    Remove
                  </button>
                </div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
