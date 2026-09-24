'use client';

import { Button } from '@/components/ui/Button';

/**
 * Catalogue non-success states (FR-214, NFR-211, NFR-214). Loading, empty, and
 * error are rendered clearly and announced via aria-live. Error messages are
 * user-friendly and never expose internals.
 */

/** Loading placeholder — skeleton cards with an announced status. */
export function CatalogueLoading(): React.JSX.Element {
  return (
    <div aria-live="polite" aria-busy="true">
      <p className="sr-only">Loading courses…</p>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, index) => (
          <li
            key={index}
            className="h-52 animate-pulse rounded-lg border border-slate-200 bg-slate-100"
          />
        ))}
      </ul>
    </div>
  );
}

/** Empty state shown when no course matches the search/filters. */
export function CatalogueEmpty({
  onReset,
  canReset,
}: {
  onReset: () => void;
  canReset: boolean;
}): React.JSX.Element {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center"
    >
      <h3 className="text-lg font-semibold text-slate-900">No courses match</h3>
      <p className="mt-1 text-sm text-slate-600">
        Try a different keyword or adjust your filters to see more courses.
      </p>
      {canReset && (
        <div className="mt-4">
          <Button variant="secondary" onClick={onReset}>
            Clear search and filters
          </Button>
        </div>
      )}
    </div>
  );
}

/** Error state with a retry affordance. */
export function CatalogueError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}): React.JSX.Element {
  return (
    <div
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 p-8 text-center"
    >
      <h3 className="text-lg font-semibold text-red-900">
        We couldn&apos;t load the courses
      </h3>
      <p className="mt-1 text-sm text-red-800">{message}</p>
      <div className="mt-4">
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      </div>
    </div>
  );
}
