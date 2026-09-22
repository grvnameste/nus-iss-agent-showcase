'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  COURSE_SCHEMA,
  type Course,
} from '@/lib/courses/types';

/**
 * Comparison state and the shared comparison interface (Specification 04,
 * FR-406, FR-407, FR-416).
 *
 * Specification 04 owns comparison selection and its rules; other features
 * (the catalogue card, the details page) consume this interface and never
 * re-implement the duplicate or capacity rules. State is client-only — there is
 * no persistence layer, no backend call, and no course business logic here: the
 * selected `Course` items are the shared Spec 02 model, captured at add time so
 * the comparison view renders without a round-trip (AD-403).
 */

/** Maximum number of courses that can be compared at once (FR-404, AD-404). */
export const MAX_COMPARISON_COURSES = 4;

/** Outcome of an `add` attempt, so callers can surface an accessible reason. */
export type AddToComparisonResult = 'added' | 'duplicate' | 'full';

export interface ComparisonApi {
  /** Selected courses, in the order they were added (NFR-406). */
  items: Course[];
  /** Add a course; a no-op when already selected or at capacity. */
  add: (course: Course) => AddToComparisonResult;
  /** Remove a course by its shared Course `id` (FR-405). */
  remove: (courseId: string) => void;
  /** Whether a course is currently selected. */
  has: (courseId: string) => boolean;
  /** Remove every selected course. */
  clear: () => void;
  /** Number of selected courses (FR-408). */
  count: number;
  /** Whether the selection is at capacity. */
  isFull: boolean;
  /** The capacity itself, so consumers can word their own messages. */
  max: number;
  /**
   * Human-readable description of the last selection change, for an
   * `aria-live` region (NFR-404). Empty until the first change.
   */
  status: string;
}

const ComparisonContext = createContext<ComparisonApi | null>(null);

/** Where the selection is mirrored for the current browsing session (FR-407). */
const STORAGE_KEY = 'eduagent.comparison';

/*
 * Session storage is external input, so it is validated rather than trusted
 * (coding-standards: "use Zod for all external input"). Validation reuses the
 * shared client Course schema from `lib/courses/types`, so comparison storage
 * cannot drift into an alternate course model definition (NFR-401).
 */
const STORED_SELECTION_SCHEMA = COURSE_SCHEMA.array().max(MAX_COMPARISON_COURSES);

/**
 * Read the selection mirrored for this session. Any unreadable, malformed, or
 * oversized payload is discarded in full rather than partially restored, so the
 * user never sees a silently truncated comparison.
 */
function readStoredSelection(): Course[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    const result = STORED_SELECTION_SCHEMA.safeParse(JSON.parse(raw));
    return result.success ? result.data : [];
  } catch {
    // Storage disabled, quota errors, or invalid JSON — start empty.
    return [];
  }
}

function writeStoredSelection(items: Course[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Persistence is a progressive enhancement; losing it must not break the UI.
  }
}

function selectionSummary(count: number): string {
  return `${count} of ${MAX_COMPARISON_COURSES} courses selected for comparison.`;
}

export function ComparisonProvider({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const [items, setItems] = useState<Course[]>([]);
  const [status, setStatus] = useState('');

  /*
   * `itemsRef` mirrors the selection synchronously. `add` has to answer
   * "added / duplicate / full" immediately, and several adds can happen before
   * React re-renders (a loop, or two clicks in one batch); reading the state
   * variable would consult a stale closure and let the rules be bypassed.
   */
  const itemsRef = useRef<Course[]>(items);

  const commit = useCallback((next: Course[]): void => {
    itemsRef.current = next;
    setItems(next);
    writeStoredSelection(next);
  }, []);

  /*
   * Hydrate after mount rather than in the initial state, so the server-rendered
   * markup and the first client render match. Persistence is imperative (inside
   * `commit`) so no effect can write an empty selection back before this runs.
   */
  useEffect(() => {
    if (itemsRef.current.length > 0) return;
    const stored = readStoredSelection();
    if (stored.length > 0) commit(stored);
  }, [commit]);

  const has = useCallback(
    (courseId: string): boolean => itemsRef.current.some((item) => item.id === courseId),
    [],
  );

  const add = useCallback(
    (course: Course): AddToComparisonResult => {
      const current = itemsRef.current;

      if (current.some((item) => item.id === course.id)) {
        setStatus(`${course.title} is already selected for comparison.`);
        return 'duplicate';
      }

      if (current.length >= MAX_COMPARISON_COURSES) {
        setStatus(
          `You can compare up to ${MAX_COMPARISON_COURSES} courses at a time. ` +
            `Remove a course before adding ${course.title}.`,
        );
        return 'full';
      }

      const next = [...current, course];
      commit(next);
      setStatus(`${course.title} added to comparison. ${selectionSummary(next.length)}`);
      return 'added';
    },
    [commit],
  );

  const remove = useCallback(
    (courseId: string): void => {
      const current = itemsRef.current;
      const removed = current.find((item) => item.id === courseId);
      if (!removed) return;

      const next = current.filter((item) => item.id !== courseId);
      commit(next);
      setStatus(
        `${removed.title} removed from comparison. ${selectionSummary(next.length)}`,
      );
    },
    [commit],
  );

  const clear = useCallback((): void => {
    if (itemsRef.current.length === 0) return;
    commit([]);
    setStatus(`Comparison cleared. ${selectionSummary(0)}`);
  }, [commit]);

  const value = useMemo<ComparisonApi>(
    () => ({
      items,
      add,
      remove,
      has,
      clear,
      count: items.length,
      isFull: items.length >= MAX_COMPARISON_COURSES,
      max: MAX_COMPARISON_COURSES,
      status,
    }),
    [items, add, remove, has, clear, status],
  );

  return (
    <ComparisonContext.Provider value={value}>{children}</ComparisonContext.Provider>
  );
}

/**
 * The shared comparison interface (FR-416). Throws outside a
 * `ComparisonProvider` so a missing mount surfaces immediately instead of
 * silently discarding the user's selection.
 */
export function useComparison(): ComparisonApi {
  const context = useContext(ComparisonContext);
  if (context === null) {
    throw new Error('useComparison must be used within a ComparisonProvider.');
  }
  return context;
}
