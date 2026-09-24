/** Catalogue route this page returns to (FR-313). */
export const CATALOGUE_HREF = '/lifelong-learning/courses';

/**
 * Enquiry entry point for a course (FR-312).
 *
 * The concrete enquiry route and params are **owned by Specification 05**; this
 * helper is the single place Spec 03 encodes the agreed navigation contract, so
 * integration (Spec 06) has one line to change if Spec 05 finalises a different
 * target. The course identity is carried as the route's `courseId` segment.
 */
export function enquiryHref(courseId: string): string {
  return `${CATALOGUE_HREF}/${encodeURIComponent(courseId)}/enquire`;
}
