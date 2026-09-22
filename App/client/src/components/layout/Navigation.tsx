'use client';

import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/config/navigation';
import { NavDisclosure } from './NavDisclosure';

/**
 * Primary navigation (FR-009, FR-010, FR-014, FR-618; NFR-606, AC-614).
 *
 * Renders the top-level sections as client-side links (no full reload) and marks
 * the current section with `aria-current="page"` for accessibility (FR-013). The
 * active section is derived from the pathname: exact match for Home, prefix match
 * for the other sections so nested routes stay highlighted.
 *
 * The layout adapts across breakpoints via the shared {@link NavDisclosure}: an
 * inline flex-wrap row on larger screens and an accessible "Menu" disclosure on
 * small screens (a real mobile pattern, not a shrunken desktop bar).
 */
export function Navigation(): React.JSX.Element {
  const pathname = usePathname();

  const isActive = (href: string): boolean =>
    href === '/'
      ? pathname === '/'
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <NavDisclosure
      ariaLabel="Primary"
      toggleLabel="Menu"
      items={NAV_ITEMS}
      isActive={isActive}
    />
  );
}
