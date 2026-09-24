'use client';

import {
  SORT_LABELS,
  type CourseSortField,
  type SortDirection,
} from '@/lib/courses/types';

const SORT_FIELDS: readonly CourseSortField[] = [
  'relevance',
  'title',
  'duration',
  'fee',
  'startDate',
];

/**
 * Sort control (FR-240–FR-243). Two labelled selects — field and direction —
 * mapping to the `sort`/`direction` query params. Presentation only.
 */
export function CourseSortControl({
  sort,
  direction,
  onChange,
}: {
  sort: CourseSortField;
  direction: SortDirection;
  onChange: (next: { sort: CourseSortField; direction: SortDirection }) => void;
}): React.JSX.Element {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="course-sort" className="mb-1 block text-sm font-medium text-slate-700">
          Sort by
        </label>
        <select
          id="course-sort"
          value={sort}
          onChange={(event) =>
            onChange({ sort: event.target.value as CourseSortField, direction })
          }
          className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          {SORT_FIELDS.map((field) => (
            <option key={field} value={field}>
              {SORT_LABELS[field]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="course-direction" className="mb-1 block text-sm font-medium text-slate-700">
          Order
        </label>
        <select
          id="course-direction"
          value={direction}
          onChange={(event) =>
            onChange({ sort, direction: event.target.value as SortDirection })
          }
          className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
      </div>
    </div>
  );
}
