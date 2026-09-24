import type { PaginationMeta } from '@/lib/courses/types';

/**
 * Result count in an aria-live region (FR-212, NFR-214). Announces how many
 * courses match and which slice is shown, so state changes are conveyed to
 * screen-reader users, not by visual layout alone.
 */
export function CourseCount({
  pagination,
}: {
  pagination: PaginationMeta;
}): React.JSX.Element {
  const { page, pageSize, totalItems } = pagination;

  const message = ((): string => {
    if (totalItems === 0) return 'No courses match your search.';
    const first = (page - 1) * pageSize + 1;
    const last = Math.min(page * pageSize, totalItems);
    const noun = totalItems === 1 ? 'course' : 'courses';
    return `Showing ${first}–${last} of ${totalItems} ${noun}`;
  })();

  return (
    <p className="text-sm text-slate-600" role="status" aria-live="polite">
      {message}
    </p>
  );
}
