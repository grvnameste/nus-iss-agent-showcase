'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { CATALOGUE_HREF } from './routes';

/**
 * Non-success states for the details page (FR-315–FR-318).
 *
 * Each state is announced to assistive technology: loading and not-found via a
 * polite `role="status"`, and errors via `role="alert"`. Error copy comes from
 * the sanitised `CourseApiError` message — internals are never surfaced.
 */

/** Loading placeholder — an announced status plus a decorative skeleton. */
export function CourseDetailsLoading(): React.JSX.Element {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <p className="sr-only">Loading course details…</p>
      <div aria-hidden="true" className="space-y-4">
        <div className="h-5 w-40 animate-pulse rounded bg-slate-100" />
        <div className="h-10 w-3/4 animate-pulse rounded bg-slate-100" />
        <div className="h-24 w-full animate-pulse rounded bg-slate-100" />
        <div className="h-56 w-full animate-pulse rounded-lg border border-slate-200 bg-slate-50" />
      </div>
    </div>
  );
}

/**
 * Not-found / unavailable state (FR-315). The API returns 404 both for unknown
 * ids and for courses that are not publicly listable; the distinction stays
 * server-side (FR-311), so one clear message covers both.
 */
export function CourseDetailsNotFound(): React.JSX.Element {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-lg border border-dashed border-slate-300 bg-white p-8"
    >
      <h1 className="text-2xl font-bold text-slate-900">Course not found</h1>
      <p className="mt-2 max-w-prose text-slate-600">
        We couldn&apos;t find that course. It may have been removed, or it may not be
        available at the moment.
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

/** Error state with a retry affordance (FR-317). */
export function CourseDetailsError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}): React.JSX.Element {
  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-8">
      <h1 className="text-2xl font-bold text-red-900">
        We couldn&apos;t load this course
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
