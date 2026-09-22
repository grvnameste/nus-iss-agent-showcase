import { CATALOGUE_HREF } from '@/components/courses/details/routes';
import type { Breadcrumb } from './Breadcrumbs';

/**
 * Breadcrumb trails for the course routes (FR-617, design §4).
 *
 * A single source of truth for the shared prefix and per-route trails so every
 * course route stays consistent and follows the canonical route constants
 * ({@link CATALOGUE_HREF}) rather than hard-coded paths. These are pure trail
 * builders — no data fetching; a course title is supplied by the caller from the
 * course already loaded on the route.
 */

/** Lifelong Learning landing route. */
const LIFELONG_LEARNING_HREF = '/lifelong-learning';

/**
 * The shared prefix every course route begins with:
 * `Lifelong Learning › Course Catalogue`.
 */
const COURSE_TRAIL_PREFIX: readonly Breadcrumb[] = [
  { label: 'Lifelong Learning', href: LIFELONG_LEARNING_HREF },
  { label: 'Course Catalogue', href: CATALOGUE_HREF },
];

/** Catalogue: `Lifelong Learning › Course Catalogue`. */
export const catalogueBreadcrumbs: readonly Breadcrumb[] = [
  { label: 'Lifelong Learning', href: LIFELONG_LEARNING_HREF },
  { label: 'Course Catalogue' },
];

/** Comparison: `Lifelong Learning › Course Catalogue › Compare`. */
export const comparisonBreadcrumbs: readonly Breadcrumb[] = [
  ...COURSE_TRAIL_PREFIX,
  { label: 'Compare' },
];

/** Details: `Lifelong Learning › Course Catalogue › {Course title}`. */
export function courseDetailsBreadcrumbs(courseTitle: string): readonly Breadcrumb[] {
  return [...COURSE_TRAIL_PREFIX, { label: courseTitle }];
}

/**
 * Enquiry: `Lifelong Learning › Course Catalogue › {Course title} › Enquire`.
 *
 * The course-title crumb links back to that course's details page so the trail
 * is fully navigable, while the current "Enquire" crumb stays plain text.
 */
export function courseEnquiryBreadcrumbs(
  courseTitle: string,
  courseDetailsHref: string,
): readonly Breadcrumb[] {
  return [
    ...COURSE_TRAIL_PREFIX,
    { label: courseTitle, href: courseDetailsHref },
    { label: 'Enquire' },
  ];
}
