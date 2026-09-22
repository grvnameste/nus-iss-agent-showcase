import Link from 'next/link';
import { AddToCompareButton } from '@/components/comparison/AddToCompareButton';
import { Card } from '@/components/ui/Card';
import { CATALOGUE_HREF } from './details/routes';
import { AvailabilityBadge } from './AvailabilityBadge';
import { formatFee, formatDuration } from '@/lib/courses/format';
import {
  COURSE_TYPE_LABELS,
  DELIVERY_MODE_LABELS,
  type Course,
} from '@/lib/courses/types';

/**
 * Course card (FR-213): presents the key attributes a learner needs to assess a
 * course from the catalogue — title, discipline, type, delivery mode, duration,
 * next intake, fee, and availability — with a clear "View Details" action.
 * Presentation only; no business logic. Semantic <article> with a heading so the
 * grid is navigable by assistive technology.
 *
 * The comparison control is Specification 04's `AddToCompareButton`, rendered
 * through that specification's shared interface — the card holds no comparison
 * state and none of its duplicate or capacity rules.
 */
export function CourseCard({ course }: { course: Course }): React.JSX.Element {
  // Derive the details href from the canonical catalogue route constant (Spec 06
  // seam, FR-601) rather than a hard-coded string, so the Catalogue → Details
  // seam follows the single source of truth. The course identity is URL-encoded.
  const detailsHref = `${CATALOGUE_HREF}/${encodeURIComponent(course.id)}`;

  return (
    <Card as="article" className="flex h-full flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
          {course.discipline}
        </p>
        <AvailabilityBadge availability={course.availability} />
      </div>

      <h3 className="text-lg font-semibold leading-snug text-slate-900">
        <Link
          href={detailsHref}
          className="rounded-sm hover:text-sky-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
        >
          {course.title}
        </Link>
      </h3>

      <p className="text-sm text-slate-600">{course.shortDescription}</p>

      <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <dt className="text-slate-500">Type</dt>
          <dd className="text-slate-800">{COURSE_TYPE_LABELS[course.courseType]}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Delivery</dt>
          <dd className="text-slate-800">
            {DELIVERY_MODE_LABELS[course.deliveryMode]}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Duration</dt>
          <dd className="text-slate-800">{formatDuration(course.durationWeeks)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Next intake</dt>
          <dd className="text-slate-800">{course.intake}</dd>
        </div>
      </dl>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
        <p className="text-sm font-semibold text-slate-900">
          {formatFee(course.fee, course.currency)}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <AddToCompareButton course={course} />
          <Link
            href={detailsHref}
            className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-semibold text-sky-800 ring-1 ring-inset ring-sky-300 transition-colors hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
            aria-label={`View details for ${course.title}`}
          >
            View details
          </Link>
        </div>
      </div>
    </Card>
  );
}
