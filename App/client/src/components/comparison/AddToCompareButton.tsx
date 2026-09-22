'use client';

import { cn } from '@/lib/cn';
import type { Course } from '@/lib/courses/types';
import { useComparison } from './comparison-context';

/**
 * Reusable add / remove comparison control (FR-401–FR-404, FR-416).
 *
 * It owns no rules: every decision (duplicate, capacity) comes from
 * `useComparison()`, so the catalogue card, the details page, and the
 * comparison view all behave identically.
 *
 * The accessible name states the action the control will perform, so it carries
 * no `aria-pressed`: a toggle state alongside a label describing the *next*
 * action reads as a contradiction ("Remove X…, pressed").
 *
 * At capacity the control stays focusable and uses `aria-disabled` rather than
 * `disabled`: a natively disabled button is skipped by keyboard navigation, so
 * the reason it cannot be used would never reach a keyboard or screen-reader
 * user. Activating it is a no-op that announces why (NFR-404).
 */
export function AddToCompareButton({
  course,
  className,
}: {
  course: Course;
  className?: string;
}): React.JSX.Element {
  const { add, remove, has, isFull, max } = useComparison();

  const selected = has(course.id);
  const blocked = !selected && isFull;

  const label = selected
    ? `Remove ${course.title} from comparison`
    : blocked
      ? `Cannot add ${course.title}: you can compare up to ${max} courses at a time. Remove a course first.`
      : `Add ${course.title} to comparison`;

  return (
    <button
      type="button"
      aria-label={label}
      aria-disabled={blocked}
      onClick={() => {
        if (selected) {
          remove(course.id);
          return;
        }
        // Delegates to the interface, which rejects and announces at capacity.
        add(course);
      }}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold',
        'transition-colors focus-visible:outline focus-visible:outline-2',
        'focus-visible:outline-offset-2 focus-visible:outline-sky-600',
        selected
          ? 'bg-sky-50 text-sky-900 ring-1 ring-inset ring-sky-400'
          : 'text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50',
        blocked && 'cursor-not-allowed text-slate-500 hover:bg-transparent',
        className,
      )}
    >
      <span aria-hidden="true">{selected ? '✓' : '+'}</span>
      {selected ? 'In comparison' : 'Compare'}
    </button>
  );
}
