'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { coursesApi, CourseApiError } from '@/lib/courses/api';
import {
  type CourseListResponse,
  type CourseQueryParams,
  type CourseSortField,
  type SortDirection,
} from '@/lib/courses/types';
import { CourseSearchBar } from './CourseSearchBar';
import {
  CourseFilters,
  EMPTY_FILTERS,
  filtersAreEmpty,
  type CourseFilterState,
} from './CourseFilters';
import { CourseSortControl } from './CourseSortControl';
import { CourseGrid } from './CourseGrid';
import { CourseCount } from './CourseCount';
import { Pagination } from './Pagination';
import {
  CatalogueEmpty,
  CatalogueError,
  CatalogueLoading,
} from './CatalogueStates';
import {
  parseCatalogueState,
  toSearchParams,
  type CatalogueQueryState,
} from './catalogue-query';

/**
 * Course catalogue orchestrator (design §14–§15).
 *
 * Holds the structured query state (keyword, filters, sort, page) and a
 * discriminated-union request state (loading | success | empty | error) — the
 * Spec 01 `HealthState` pattern. It contains **no** business logic; all
 * search/filter/sort/pagination is computed by the backend via `coursesApi`.
 * Query state is reflected in the URL for shareable results (FR-215, progressive
 * enhancement).
 */

type RequestState =
  | { phase: 'loading' }
  | { phase: 'success'; response: CourseListResponse }
  | { phase: 'error'; message: string };

const PAGE_SIZE = 12;

function buildParams(state: CatalogueQueryState): CourseQueryParams {
  const params: CourseQueryParams = {
    page: state.page,
    pageSize: PAGE_SIZE,
    sort: state.sort,
    direction: state.direction,
  };
  if (state.keyword) params.keyword = state.keyword;
  if (state.filters.discipline.length) params.discipline = state.filters.discipline;
  if (state.filters.courseType.length) params.courseType = state.filters.courseType;
  if (state.filters.level.length) params.level = state.filters.level;
  if (state.filters.deliveryMode.length) {
    params.deliveryMode = state.filters.deliveryMode;
  }
  if (state.filters.availability.length) {
    params.availability = state.filters.availability;
  }
  return params;
}

export function CourseCatalogue(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialise the query state from the URL so results are deep-linkable.
  const [query, setQuery] = useState<CatalogueQueryState>(() =>
    parseCatalogueState(searchParams),
  );
  const [request, setRequest] = useState<RequestState>({ phase: 'loading' });
  const [reloadToken, setReloadToken] = useState(0);

  // Reflect query state into the URL (replace, so it doesn't spam history).
  useEffect(() => {
    const qs = toSearchParams(query).toString();
    router.replace(qs ? `?${qs}` : '?', { scroll: false });
  }, [query, router]);

  // Fetch whenever the query (or an explicit retry) changes.
  const requestSeq = useRef(0);
  useEffect(() => {
    const seq = ++requestSeq.current;
    const controller = new AbortController();
    setRequest({ phase: 'loading' });

    coursesApi
      .list(buildParams(query), controller.signal)
      .then((response) => {
        if (seq === requestSeq.current) {
          setRequest({ phase: 'success', response });
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || seq !== requestSeq.current) return;
        const message =
          error instanceof CourseApiError
            ? error.message
            : 'Something went wrong. Please try again.';
        setRequest({ phase: 'error', message });
      });

    return () => controller.abort();
  }, [query, reloadToken]);

  const updateQuery = useCallback((patch: Partial<CatalogueQueryState>): void => {
    setQuery((current) => {
      const next = { ...current, ...patch };
      // Any change other than an explicit page change resets to page 1.
      if (!('page' in patch)) next.page = 1;
      return next;
    });
  }, []);

  const handleKeyword = useCallback(
    (keyword: string) => updateQuery({ keyword }),
    [updateQuery],
  );
  const handleFilters = useCallback(
    (filters: CourseFilterState) => updateQuery({ filters }),
    [updateQuery],
  );
  const handleSort = useCallback(
    (next: { sort: CourseSortField; direction: SortDirection }) =>
      updateQuery({ sort: next.sort, direction: next.direction }),
    [updateQuery],
  );
  const handlePage = useCallback(
    (page: number) => updateQuery({ page }),
    [updateQuery],
  );

  const reset = useCallback(() => {
    setQuery({
      keyword: '',
      filters: EMPTY_FILTERS,
      sort: 'title',
      direction: 'asc',
      page: 1,
    });
  }, []);

  const retry = useCallback(() => setReloadToken((token) => token + 1), []);

  const hasActiveQuery = useMemo(
    () => query.keyword.length > 0 || !filtersAreEmpty(query.filters),
    [query],
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
      <aside aria-label="Filter courses" className="lg:sticky lg:top-4 lg:self-start">
        <details className="group rounded-lg border border-slate-200 bg-white lg:open" open>
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-slate-800 lg:cursor-default">
            Filters
          </summary>
          <div className="px-4 pb-4">
            <CourseFilters filters={query.filters} onChange={handleFilters} />
          </div>
        </details>
      </aside>

      <section aria-label="Course catalogue" className="space-y-5">
        <CourseSearchBar value={query.keyword} onChange={handleKeyword} />

        <div className="flex flex-wrap items-end justify-between gap-4">
          <CourseSortControl
            sort={query.sort}
            direction={query.direction}
            onChange={handleSort}
          />
          {request.phase === 'success' && (
            <CourseCount pagination={request.response.pagination} />
          )}
        </div>

        {request.phase === 'loading' && <CatalogueLoading />}

        {request.phase === 'error' && (
          <CatalogueError message={request.message} onRetry={retry} />
        )}

        {request.phase === 'success' &&
          (request.response.data.length === 0 ? (
            <CatalogueEmpty onReset={reset} canReset={hasActiveQuery} />
          ) : (
            <>
              <CourseGrid courses={request.response.data} />
              <Pagination
                pagination={request.response.pagination}
                onPageChange={handlePage}
              />
            </>
          ))}
      </section>
    </div>
  );
}
