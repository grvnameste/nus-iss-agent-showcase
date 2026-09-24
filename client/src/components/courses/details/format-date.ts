/**
 * Presentation-only date formatting for the details page.
 *
 * Kept local to the details feature (Team A ownership) so the shared Spec 02
 * `format.ts` stays untouched. Dates are formatted in UTC so the same course id
 * always renders the same date regardless of the viewer's timezone (NFR-309).
 */
const DATE_FORMAT = new Intl.DateTimeFormat('en-SG', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/** Format an ISO `YYYY-MM-DD` date as e.g. "6 April 2026". */
export function formatCourseDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  // Fall back to the raw value rather than rendering "Invalid Date".
  return Number.isNaN(date.getTime()) ? isoDate : DATE_FORMAT.format(date);
}
