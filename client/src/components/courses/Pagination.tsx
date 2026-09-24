'use client';

import type { PaginationMeta } from '@/lib/courses/types';

/**
 * Accessible pagination (FR-250, FR-254, NFR-216). A labelled navigation region
 * with previous/next controls, current-page indication (`aria-current`), and
 * disabled states at the boundaries. Bound to the `page` query param.
 */
export function Pagination({
  pagination,
  onPageChange,
}: {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
}): React.JSX.Element | null {
  const { page, totalPages } = pagination;
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
  const atStart = page <= 1;
  const atEnd = page >= totalPages;

  const buttonClass =
    'inline-flex min-w-[2.25rem] items-center justify-center rounded-md px-3 py-2 text-sm font-medium ' +
    'ring-1 ring-inset transition-colors focus-visible:outline focus-visible:outline-2 ' +
    'focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <nav aria-label="Course results pages" className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={atStart}
        className={`${buttonClass} bg-white text-slate-700 ring-slate-300 hover:bg-slate-50`}
      >
        <span aria-hidden="true">‹</span>
        <span className="ml-1">Previous</span>
      </button>

      <ol className="flex flex-wrap items-center gap-1">
        {pages.map((pageNumber) => {
          const isCurrent = pageNumber === page;
          return (
            <li key={pageNumber}>
              <button
                type="button"
                onClick={() => onPageChange(pageNumber)}
                aria-current={isCurrent ? 'page' : undefined}
                aria-label={`Page ${pageNumber}${isCurrent ? ', current page' : ''}`}
                className={
                  isCurrent
                    ? `${buttonClass} bg-sky-700 text-white ring-sky-700`
                    : `${buttonClass} bg-white text-slate-700 ring-slate-300 hover:bg-slate-50`
                }
              >
                {pageNumber}
              </button>
            </li>
          );
        })}
      </ol>

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={atEnd}
        className={`${buttonClass} bg-white text-slate-700 ring-slate-300 hover:bg-slate-50`}
      >
        <span className="mr-1">Next</span>
        <span aria-hidden="true">›</span>
      </button>
    </nav>
  );
}
