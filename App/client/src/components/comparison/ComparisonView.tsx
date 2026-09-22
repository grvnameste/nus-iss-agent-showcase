'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useComparison } from './comparison-context';
import { ComparisonTable } from './ComparisonTable';
import { CATALOGUE_HREF } from './routes';

/**
 * Comparison view body (FR-409, FR-413, FR-414).
 *
 * Renders entirely from the selection captured on add (AD-403) — the shared
 * Course model is already in hand, so there is no fetch, no loading state, and
 * no duplicated catalogue querying (FR-415, NFR-401).
 */
export function ComparisonView(): React.JSX.Element {
  const { items, remove, clear, count, max } = useComparison();

  if (count === 0) {
    return (
      <Card className="text-center">
        <h2 className="text-lg font-semibold text-slate-900">
          No courses to compare yet
        </h2>
        <p className="mx-auto mt-2 max-w-prose text-sm text-slate-600">
          Add up to {max} courses from the catalogue using the “Compare” button on a
          course card, then return here to see them side by side.
        </p>
        <Link
          href={CATALOGUE_HREF}
          className="mt-4 inline-flex items-center justify-center rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
        >
          Browse the Course Catalogue
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Comparing {count} of {max} courses. Attributes are shown in the same order for
          every course.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" onClick={clear}>
            Clear comparison
          </Button>
          <Link
            href={CATALOGUE_HREF}
            className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-sky-800 ring-1 ring-inset ring-sky-300 transition-colors hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
          >
            Back to Course Catalogue
          </Link>
        </div>
      </div>

      <ComparisonTable courses={items} onRemove={remove} />
    </div>
  );
}
