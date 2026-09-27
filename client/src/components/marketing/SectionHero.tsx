import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Shared, presentation-only hero block (design §5.1). Renders an optional
 * eyebrow, a single heading, an intro paragraph, and an optional CTA slot.
 *
 * Server-compatible: no `'use client'`, no browser APIs, no data access — it
 * only composes markup, so it stays a server component like the pages that use
 * it. Business logic lives in the backend, never here (coding-standards).
 */
export interface SectionHeroProps {
  eyebrow?: string;
  title: string;
  /** Ties the heading to the section's `aria-labelledby` (design §11). */
  headingId: string;
  intro: string;
  /** Defaults to 'h1' so each page's hero is the single H1 (FR-706.1). */
  headingLevel?: 'h1' | 'h2';
  /** CTA slot (e.g. button-styled `next/link` elements). */
  children?: ReactNode;
}

// Match the Lifelong Learning area's heading treatment (Task 2 inspection).
const HEADING_CLASSES: Record<'h1' | 'h2', string> = {
  h1: 'text-3xl font-bold tracking-tight text-slate-900',
  h2: 'text-2xl font-semibold text-slate-900',
};

export function SectionHero({
  eyebrow,
  title,
  headingId,
  intro,
  headingLevel = 'h1',
  children,
}: SectionHeroProps): React.JSX.Element {
  const Heading = headingLevel;

  return (
    <div className="space-y-3">
      {eyebrow ? (
        <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">
          {eyebrow}
        </p>
      ) : null}
      <Heading id={headingId} className={cn(HEADING_CLASSES[headingLevel])}>
        {title}
      </Heading>
      <p className="max-w-2xl text-slate-600">{intro}</p>
      {children ? <div className="flex flex-wrap gap-3 pt-1">{children}</div> : null}
    </div>
  );
}
