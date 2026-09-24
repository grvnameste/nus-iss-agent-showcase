import { cn } from '@/lib/cn';
import { AVAILABILITY_LABELS, type CourseAvailability } from '@/lib/courses/types';

/**
 * Availability badge (NFR-215): communicates availability with a text label and
 * a shape/icon glyph, never by colour alone. Colour is a secondary cue.
 */
const STYLES: Record<CourseAvailability, { className: string; glyph: string }> = {
  open: {
    className: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    glyph: '●',
  },
  closing_soon: {
    className: 'bg-amber-50 text-amber-800 ring-amber-200',
    glyph: '◐',
  },
  waitlist: {
    className: 'bg-sky-50 text-sky-800 ring-sky-200',
    glyph: '◔',
  },
  closed: {
    className: 'bg-slate-100 text-slate-700 ring-slate-300',
    glyph: '○',
  },
};

export function AvailabilityBadge({
  availability,
}: {
  availability: CourseAvailability;
}): React.JSX.Element {
  const style = STYLES[availability];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        style.className,
      )}
    >
      <span aria-hidden="true">{style.glyph}</span>
      {AVAILABILITY_LABELS[availability]}
    </span>
  );
}
