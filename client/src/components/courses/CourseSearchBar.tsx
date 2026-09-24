'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Keyword search bar (FR-215, FR-220). Bound to the `keyword` query param.
 * Debounces changes so results update as the learner types without a request
 * per keystroke, and also submits immediately on Enter. Accessible: a labelled
 * search landmark with a native form and submit button.
 */
export function CourseSearchBar({
  value,
  onChange,
  debounceMs = 300,
}: {
  value: string;
  onChange: (keyword: string) => void;
  debounceMs?: number;
}): React.JSX.Element {
  const [draft, setDraft] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the input in sync when the value is reset externally (e.g. clear filters).
  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const scheduleChange = (next: string): void => {
    setDraft(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(next.trim()), debounceMs);
  };

  const submitNow = (): void => {
    if (timer.current) clearTimeout(timer.current);
    onChange(draft.trim());
  };

  return (
    <form
      role="search"
      aria-label="Course search"
      onSubmit={(event) => {
        event.preventDefault();
        submitNow();
      }}
      className="flex gap-2"
    >
      <div className="flex-1">
        <label htmlFor="course-search" className="mb-1 block text-sm font-medium text-slate-700">
          Search courses
        </label>
        <input
          id="course-search"
          type="search"
          value={draft}
          onChange={(event) => scheduleChange(event.target.value)}
          placeholder="Search by title, skill, or keyword"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </div>
      <button
        type="submit"
        className="mt-auto inline-flex items-center justify-center rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
      >
        Search
      </button>
    </form>
  );
}
