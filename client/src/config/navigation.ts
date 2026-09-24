/**
 * Primary site navigation.
 *
 * Single source of truth for the top-level information architecture, inspired by
 * the functional structure of an education platform. These are placeholder
 * sections in Specification 01; later specifications extend them (e.g. Lifelong
 * Learning gains the Course Catalogue in Specification 02).
 */
export interface NavItem {
  readonly label: string;
  readonly href: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Education', href: '/education' },
  { label: 'Admissions', href: '/admissions' },
  { label: 'Lifelong Learning', href: '/lifelong-learning' },
  { label: 'Industry', href: '/industry' },
  { label: 'About', href: '/about' },
];
