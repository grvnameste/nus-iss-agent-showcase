'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import type { Course } from '@/lib/courses/types';
import type { CourseComparisonSeam } from './comparison-seam';
import { CATALOGUE_HREF, enquiryHref } from './routes';

/**
 * Action bar for the details page (FR-312–FR-314).
 *
 * Navigation uses links (Enquire, Back to catalogue) and the in-page comparison
 * action uses a button, so semantics match behaviour. The comparison affordance
 * renders only when the Spec 04 interface is supplied and delegates entirely to
 * it — capacity and duplicate rules are read from the interface, never computed
 * here.
 */
export function CourseActions({
  course,
  comparison,
}: {
  course: Course;
  comparison?: CourseComparisonSeam;
}): React.JSX.Element {
  const alreadyAdded = comparison?.has(course.id) ?? false;
  const blockedByLimit = comparison !== undefined && comparison.isFull && !alreadyAdded;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Link
          href={enquiryHref(course.id)}
          className="inline-flex items-center justify-center rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
        >
          Enquire about this course
        </Link>

        {comparison && (
          <Button
            variant="secondary"
            onClick={() => {
              if (alreadyAdded) {
                comparison.remove(course.id);
                return;
              }
              comparison.add(course);
            }}
            aria-disabled={blockedByLimit}
            aria-describedby={blockedByLimit ? 'comparison-limit-hint' : undefined}
            className={blockedByLimit ? 'cursor-not-allowed opacity-60' : undefined}
          >
            {alreadyAdded ? 'Remove from comparison' : 'Add to comparison'}
          </Button>
        )}

        <Link
          href={CATALOGUE_HREF}
          className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
        >
          Back to Course Catalogue
        </Link>
      </div>

      {blockedByLimit && comparison && (
        <p id="comparison-limit-hint" className="text-sm text-slate-600">
          You can compare up to {comparison.max} courses at a time. Remove one to add this
          course.
        </p>
      )}
    </div>
  );
}
