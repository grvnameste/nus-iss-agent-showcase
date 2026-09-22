'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useComparison } from './comparison-context';
import { COMPARISON_HREF } from './routes';

/**
 * Persistent "Compare (n)" affordance (FR-408).
 *
 * Mounted in the app shell so the running count is visible wherever a learner
 * is shortlisting — catalogue, details, or the comparison view itself. It is
 * absent, not merely hidden, while nothing is selected, so it never adds noise
 * for assistive technology before there is anything to compare. It also steps
 * aside on the comparison view, which states the count itself — a sticky link
 * to the page you are already on is only clutter.
 */
export function ComparisonBar(): React.JSX.Element | null {
  const { count, max } = useComparison();
  const pathname = usePathname();

  if (count === 0 || pathname === COMPARISON_HREF) return null;

  const noun = count === 1 ? 'course' : 'courses';

  return (
    <div className="sticky bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <p className="text-sm text-slate-600">
          {count} of {max} courses selected for comparison.
        </p>
        <Link
          href={COMPARISON_HREF}
          aria-label={`Compare ${count} selected ${noun}`}
          className="inline-flex items-center justify-center rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
        >
          Compare ({count})
        </Link>
      </div>
    </div>
  );
}
