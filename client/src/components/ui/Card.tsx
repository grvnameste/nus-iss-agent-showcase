import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Card primitive (FR-011): a bordered, padded surface for grouping content.
 * Presentation only; reused by later specifications (e.g. course cards).
 */
export function Card({
  children,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'article' | 'section' | 'li';
}): React.JSX.Element {
  return (
    <Tag
      className={cn(
        'rounded-lg border border-slate-200 bg-white p-6 shadow-sm',
        className,
      )}
    >
      {children}
    </Tag>
  );
}
