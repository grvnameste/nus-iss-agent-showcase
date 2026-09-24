import {
  COURSE_AVAILABILITIES,
  COURSE_LEVELS,
  COURSE_TYPES,
  DELIVERY_MODES,
  DISCIPLINES,
  type CourseSortField,
  type SortDirection,
} from '@/lib/courses/types';
import { EMPTY_FILTERS, type CourseFilterState } from './CourseFilters';

/**
 * URL <-> catalogue query-state mapping (FR-215, progressive enhancement).
 *
 * Pure serialisation helpers so the catalogue state is deep-linkable. No
 * business logic — the backend still computes results; this only preserves the
 * user's selections across reloads and sharing.
 */

export interface CatalogueQueryState {
  keyword: string;
  filters: CourseFilterState;
  sort: CourseSortField;
  direction: SortDirection;
  page: number;
}

const SORT_FIELDS: readonly CourseSortField[] = [
  'relevance',
  'title',
  'duration',
  'fee',
  'startDate',
];

function readAll<T extends string>(
  params: URLSearchParams,
  key: string,
  allowed: readonly T[],
): T[] {
  return params
    .getAll(key)
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter((value): value is T => (allowed as readonly string[]).includes(value));
}

/** Parse a URLSearchParams (or ReadonlyURLSearchParams) into query state. */
export function parseCatalogueState(
  params: Pick<URLSearchParams, 'get' | 'getAll'>,
): CatalogueQueryState {
  const get = (key: string): string | null => params.get(key);

  const keyword = get('keyword')?.trim() ?? '';

  const filters: CourseFilterState = {
    discipline: readAll(params as URLSearchParams, 'discipline', DISCIPLINES),
    courseType: readAll(params as URLSearchParams, 'courseType', COURSE_TYPES),
    level: readAll(params as URLSearchParams, 'level', COURSE_LEVELS),
    deliveryMode: readAll(params as URLSearchParams, 'deliveryMode', DELIVERY_MODES),
    availability: readAll(
      params as URLSearchParams,
      'availability',
      COURSE_AVAILABILITIES,
    ),
  };

  const rawSort = get('sort');
  const sort: CourseSortField =
    rawSort && SORT_FIELDS.includes(rawSort as CourseSortField)
      ? (rawSort as CourseSortField)
      : keyword.length > 0
        ? 'relevance'
        : 'title';

  const rawDirection = get('direction');
  const direction: SortDirection =
    rawDirection === 'desc'
      ? 'desc'
      : rawDirection === 'asc'
        ? 'asc'
        : sort === 'relevance'
          ? 'desc'
          : 'asc';

  const rawPage = Number(get('page'));
  const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1;

  return { keyword, filters, sort, direction, page };
}

/** Serialise query state back into URLSearchParams (only non-defaults). */
export function toSearchParams(state: CatalogueQueryState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.keyword) params.set('keyword', state.keyword);
  for (const value of state.filters.discipline) params.append('discipline', value);
  for (const value of state.filters.courseType) params.append('courseType', value);
  for (const value of state.filters.level) params.append('level', value);
  for (const value of state.filters.deliveryMode) params.append('deliveryMode', value);
  for (const value of state.filters.availability) {
    params.append('availability', value);
  }
  params.set('sort', state.sort);
  params.set('direction', state.direction);
  if (state.page > 1) params.set('page', String(state.page));
  return params;
}

export { EMPTY_FILTERS };
