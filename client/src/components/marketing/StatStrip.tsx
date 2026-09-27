import { cn } from '@/lib/cn';

/**
 * A single synthetic figure: a prominent value with a supporting label
 * (design §5.2).
 */
export interface StatItem {
  value: string;
  label: string;
}

/**
 * Shared, presentation-only strip of synthetic figures (design §5.2). The
 * illustrative caption is ALWAYS rendered as visible text (never colour-only)
 * so figures can never read as real institutional data (FR-708.2).
 *
 * Server-compatible: no `'use client'`, no browser APIs, no data access.
 */
export interface StatStripProps {
  items: readonly StatItem[];
  /** Defaults to the mandatory synthetic-data caption (FR-708.2). */
  caption?: string;
  'aria-labelledby'?: string;
}

const DEFAULT_CAPTION = 'Illustrative synthetic data';

export function StatStrip({
  items,
  caption = DEFAULT_CAPTION,
  'aria-labelledby': ariaLabelledby,
}: StatStripProps): React.JSX.Element {
  return (
    <div className="space-y-3" aria-labelledby={ariaLabelledby}>
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <div
            key={`${item.value}-${item.label}`}
            className={cn(
              'rounded-lg border border-slate-200 bg-white p-6 shadow-sm',
            )}
          >
            <dt className="text-sm text-slate-600">{item.label}</dt>
            <dd className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
      {/* Textual, not colour-only, so the synthetic nature is unmissable. */}
      <p className="text-sm text-slate-400">{caption}</p>
    </div>
  );
}
