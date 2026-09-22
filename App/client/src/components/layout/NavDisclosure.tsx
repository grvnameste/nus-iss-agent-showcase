'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

/**
 * Shared, accessible navigation disclosure (Spec 06, design §9; NFR-606, AC-614).
 *
 * Renders a list of client-side nav links using one shared Tailwind convention so
 * the primary nav and the Lifelong-Learning sub-nav stay visually consistent:
 *
 * - On larger screens (`md`+) the links show as an inline flex-wrap row — the
 *   established desktop pattern.
 * - On small screens (< `md`, i.e. mobile ~320–480px and small tablets) the row
 *   collapses behind an accessible disclosure: a focusable "Menu" toggle button
 *   with `aria-expanded`/`aria-controls`, revealing the links when opened. This is
 *   a genuine mobile pattern, not a shrunken desktop bar.
 *
 * Accessibility:
 * - The toggle is a real <button>, so Enter/Space activate it natively.
 * - `aria-expanded` reflects the open state and `aria-controls` points at the
 *   menu container (`id`), so assistive tech can associate the two.
 * - Escape closes the menu and returns focus to the toggle.
 * - Visible focus rings match the rest of the shell.
 * - The toggle is `md:hidden`; the inline row is `hidden md:flex`, so exactly one
 *   representation is exposed at each breakpoint.
 *
 * This is a shell component: no business logic. Active-state detection is supplied
 * by the caller so each nav keeps its own precedence rules.
 */
export interface NavDisclosureItem {
  readonly label: string;
  readonly href: string;
}

interface NavDisclosureProps {
  /** Accessible name for the nav landmark, e.g. "Primary". */
  readonly ariaLabel: string;
  /** Label for the small-screen disclosure toggle, e.g. "Menu". */
  readonly toggleLabel: string;
  readonly items: readonly NavDisclosureItem[];
  /** Caller-supplied active-state rule (each nav has its own precedence). */
  readonly isActive: (href: string) => boolean;
}

const LINK_CLASS_BASE =
  'rounded-md px-3 py-2 text-sm font-medium transition-colors ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600';

const linkClass = (active: boolean): string =>
  cn(
    LINK_CLASS_BASE,
    active
      ? 'bg-sky-100 text-sky-900'
      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900',
  );

export function NavDisclosure({
  ariaLabel,
  toggleLabel,
  items,
  isActive,
}: NavDisclosureProps): React.JSX.Element {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Close the disclosure after a client-side route change so it never lingers
  // open over the newly navigated page.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const closeAndRefocus = (): void => {
    setOpen(false);
    toggleRef.current?.focus();
  };

  return (
    <nav aria-label={ariaLabel} className="w-full sm:w-auto">
      {/* Small-screen disclosure toggle: hidden once the inline row shows (md+). */}
      <button
        ref={toggleRef}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && open) {
            event.preventDefault();
            setOpen(false);
          }
        }}
        className={cn(
          'inline-flex w-full items-center justify-between gap-2 rounded-md px-3 py-2',
          'text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600',
          'md:hidden',
        )}
      >
        <span>{toggleLabel}</span>
        <span aria-hidden="true">{open ? '\u2715' : '\u2630'}</span>
      </button>

      {/*
        Menu container. On small screens it is a stacked column that is only
        present when `open`; on md+ it is always shown as the inline flex-wrap
        row (the desktop pattern), with the disclosure toggle hidden.
      */}
      <div
        id={menuId}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && open) {
            event.preventDefault();
            closeAndRefocus();
          }
        }}
        className={cn(
          open ? 'flex' : 'hidden',
          'mt-2 flex-col gap-y-1',
          'md:mt-0 md:flex md:flex-row md:flex-wrap md:gap-x-1 md:gap-y-1',
        )}
      >
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              onClick={() => setOpen(false)}
              className={linkClass(active)}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
