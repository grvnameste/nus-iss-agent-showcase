import Link from 'next/link';
import { cn } from '@/lib/cn';

/**
 * A single breadcrumb entry (FR-617, design §4).
 *
 * A crumb with an `href` renders as a client-side link; the final crumb (and any
 * crumb without an `href`) renders as plain text. The registry treats the last
 * crumb as the current page regardless of whether it carries an `href`.
 */
export interface Breadcrumb {
  readonly label: string;
  readonly href?: string;
}

/**
 * Reusable, accessible breadcrumb trail (FR-617, AD-604, NFR-605).
 *
 * A shell component — no business logic. It renders a semantic
 * `<nav aria-label="Breadcrumb">` wrapping an ordered list, so assistive
 * technology conveys both the landmark and the ordered position of each crumb.
 * Every crumb except the last is a keyboard-operable `next/link` with a visible
 * focus ring (reusing the project's Tailwind conventions); the last crumb is
 * plain, non-interactive text marked `aria-current="page"` so screen-reader
 * users know where they are.
 *
 * Labels are supplied by the caller (derived from data already loaded on the
 * route) — this component never fetches.
 */
export function Breadcrumbs({
  items,
  className,
}: {
  readonly items: readonly Breadcrumb[];
  readonly className?: string;
}): React.JSX.Element | null {
  if (items.length === 0) return null;

  const lastIndex = items.length - 1;

  return (
    <nav aria-label="Breadcrumb" className={cn('text-sm', className)}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-slate-600">
        {items.map((item, index) => {
          const isLast = index === lastIndex;

          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-x-2">
              {index > 0 && (
                <span aria-hidden="true" className="text-slate-400">
                  ›
                </span>
              )}

              {isLast || item.href === undefined ? (
                <span
                  // The last crumb is the current page: plain text, not a link,
                  // and announced as the current location (NFR-605).
                  {...(isLast ? { 'aria-current': 'page' as const } : {})}
                  className={cn(isLast ? 'font-medium text-slate-900' : undefined)}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="rounded-sm font-medium text-sky-800 transition-colors hover:text-sky-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
