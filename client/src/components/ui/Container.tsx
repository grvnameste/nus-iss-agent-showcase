import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Container primitive: a centred, max-width, horizontally-padded wrapper used to
 * keep content readable across breakpoints (FR-011). Presentation only.
 */
export function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <div className={cn('mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8', className)}>
      {children}
    </div>
  );
}
