'use client';

import { useComparison } from './comparison-context';

/**
 * Single polite live region for comparison changes (NFR-404).
 *
 * Mounted once in the app shell and always present in the DOM: a live region
 * inserted at the moment of the change is frequently not announced, so the
 * region outlives every individual add/remove control.
 */
export function ComparisonAnnouncer(): React.JSX.Element {
  const { status } = useComparison();

  return (
    <p role="status" aria-live="polite" className="sr-only">
      {status}
    </p>
  );
}
