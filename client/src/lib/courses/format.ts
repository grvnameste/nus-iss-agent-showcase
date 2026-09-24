import type { Course } from './types';

/** Format a fee as a currency amount, e.g. "SGD 2,400". */
export function formatFee(fee: number, currency: string): string {
  const amount = new Intl.NumberFormat('en-SG', {
    maximumFractionDigits: 0,
  }).format(fee);
  return `${currency} ${amount}`;
}

/** Format a duration in weeks into a readable label. */
export function formatDuration(weeks: number): string {
  return weeks === 1 ? '1 week' : `${weeks} weeks`;
}

/** A short, human-readable summary line for a course card's meta row. */
export function courseMetaLine(course: Course): string {
  return [course.discipline, formatDuration(course.durationWeeks)].join(' · ');
}
