'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { CATALOGUE_HREF } from '@/components/courses/details/routes';

/**
 * Non-form states for the enquiry page (FR-503, FR-517).
 *
 * The unavailable-course case is the one that matters most: the API returns 404
 * both for an unknown id and for a course that is no longer publicly listable,
 * and either way the learner needs a plain explanation and a way onward — never
 * a raw error.
 */

export function EnquiryLoading(): React.JSX.Element {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <p className="sr-only">Loading the course for your enquiry…</p>
      <div aria-hidden="true" className="space-y-4">
        <div className="h-10 w-3/4 animate-pulse rounded bg-slate-100" />
        <div className="h-28 w-full animate-pulse rounded-lg border border-slate-200 bg-slate-50" />
        <div className="h-64 w-full animate-pulse rounded-lg border border-slate-200 bg-slate-50" />
      </div>
    </div>
  );
}

/** The associated course does not exist or is no longer open to enquiries. */
export function EnquiryCourseUnavailable({
  message,
}: {
  message?: string;
}): React.JSX.Element {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-lg border border-dashed border-slate-300 bg-white p-8"
    >
      <h1 className="text-2xl font-bold text-slate-900">
        This course is not available for enquiries
      </h1>
      <p className="mt-2 max-w-prose text-slate-600">
        {message ??
          'We couldn’t find that course. It may have been removed, or it may not be accepting enquiries at the moment.'}
      </p>
      <p className="mt-4">
        <Link
          href={CATALOGUE_HREF}
          className="inline-flex items-center justify-center rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
        >
          Browse the Course Catalogue
        </Link>
      </p>
    </div>
  );
}

/** The course could not be loaded for some other reason — offer a retry. */
export function EnquiryCourseError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}): React.JSX.Element {
  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-8">
      <h1 className="text-2xl font-bold text-red-900">
        We couldn&apos;t open the enquiry form
      </h1>
      <p className="mt-2 max-w-prose text-red-800">{message}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
        <Link
          href={CATALOGUE_HREF}
          className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
        >
          Back to Course Catalogue
        </Link>
      </div>
    </div>
  );
}
