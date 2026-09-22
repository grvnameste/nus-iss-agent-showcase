import { CATALOGUE_HREF, enquiryHref } from '@/components/courses/details/routes';

/**
 * Navigation targets used by the comparison feature.
 *
 * The catalogue and enquiry targets are re-exported from the single place the
 * project already encodes them, rather than restated here: the enquiry entry
 * point is owned by Specification 05 and must stay changeable in one edit.
 */
export { CATALOGUE_HREF, enquiryHref };

/** The comparison view itself (FR-409, AD-406). */
export const COMPARISON_HREF = '/lifelong-learning/courses/compare';

/** A course's details page, owned by Specification 02/03 (FR-412). */
export function courseDetailsHref(courseId: string): string {
  return `${CATALOGUE_HREF}/${encodeURIComponent(courseId)}`;
}
