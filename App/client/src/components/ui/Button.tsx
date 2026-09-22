import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-sky-700 text-white hover:bg-sky-800',
  secondary: 'bg-white text-sky-800 ring-1 ring-inset ring-sky-300 hover:bg-sky-50',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-100',
};

const BASE_CLASSES = [
  'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold',
  'transition-colors focus-visible:outline focus-visible:outline-2',
  'focus-visible:outline-offset-2 focus-visible:outline-sky-600',
  'disabled:cursor-not-allowed disabled:opacity-60',
] as const;

/**
 * Canonical button styling as a class string (FR-620, NFR-604).
 *
 * The visual identity of a "button" lives here once, so a native `<button>`
 * (the {@link Button} primitive) and a link that must *look* like a button
 * (e.g. a `next/link` primary call-to-action in a shell page) can share one
 * source of truth instead of hand-duplicating Tailwind classes. Presentation
 * only — it grants no behaviour, and callers using it on a link remain
 * responsible for the correct semantic element.
 */
export function buttonClasses(
  variant: ButtonVariant = 'primary',
  className?: string,
): string {
  return cn(...BASE_CLASSES, VARIANT_CLASSES[variant], className);
}

/**
 * Button primitive (FR-011). Presentation only — accessible focus ring, keyboard
 * operable by default (native <button>). Variants for common emphasis levels.
 */
export function Button({
  children,
  variant = 'primary',
  className,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
}): React.JSX.Element {
  return (
    <button type={type} className={buttonClasses(variant, className)} {...props}>
      {children}
    </button>
  );
}
