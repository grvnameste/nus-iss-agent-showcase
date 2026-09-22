'use client';

import { usePathname } from 'next/navigation';
import { CATALOGUE_HREF } from '@/components/courses/details/routes';
import { COMPARISON_HREF } from '@/components/comparison/routes';
import { NavDisclosure, type NavDisclosureItem } from './NavDisclosure';

/**
 * Lifelong-Learning sub-navigation (FR-615, design §4, §9; NFR-606, AC-614).
 *
 * A shared, secondary navigation shown within the Lifelong-Learning area so a
 * user can reach the Course Catalogue and the Comparison view from any LL route.
 * It is a shell component — no business logic — and reuses the same responsive
 * disclosure pattern as the primary {@link Navigation} via {@link NavDisclosure}:
 * an inline row on larger screens and an accessible "Lifelong Learning menu"
 * disclosure on small screens (FR-618, AC-614).
 *
 * Routes come from the single source-of-truth constants
 * ({@link CATALOGUE_HREF}, {@link COMPARISON_HREF}) rather than hard-coded paths,
 * so the sub-nav follows any future route change made by the owning specs.
 */
const LL_NAV_ITEMS: readonly NavDisclosureItem[] = [
  { label: 'Course Catalogue', href: CATALOGUE_HREF },
  { label: 'Compare', href: COMPARISON_HREF },
];

export function LifelongLearningNav(): React.JSX.Element {
  const pathname = usePathname();

  // The comparison route is a sibling of the catalogue's dynamic `[courseId]`
  // segment, so an exact/`compare`-prefixed match must win over the catalogue's
  // prefix match to avoid both items appearing active on the comparison view.
  const isActive = (href: string): boolean => {
    if (href === COMPARISON_HREF) {
      return pathname === COMPARISON_HREF || pathname.startsWith(`${COMPARISON_HREF}/`);
    }
    if (pathname === COMPARISON_HREF || pathname.startsWith(`${COMPARISON_HREF}/`)) {
      return false;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <NavDisclosure
      ariaLabel="Lifelong Learning"
      toggleLabel="Lifelong Learning menu"
      items={LL_NAV_ITEMS}
      isActive={isActive}
    />
  );
}
