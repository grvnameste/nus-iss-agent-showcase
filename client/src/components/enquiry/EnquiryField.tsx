import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * One labelled form control with its error and hint wiring (NFR-504).
 *
 * The accessibility contract lives here rather than being repeated per field:
 * a real `<label htmlFor>`, `aria-invalid` when the field is in error, and an
 * `aria-describedby` that points at the hint and the error message so a screen
 * reader announces them with the control.
 */
export function EnquiryField({
  id,
  label,
  hint,
  error,
  optional = false,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  /** Renders the control, given the ids it must reference. */
  children: (props: {
    id: string;
    'aria-invalid': boolean;
    'aria-describedby': string | undefined;
    className: string;
  }) => ReactNode;
}): React.JSX.Element {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-slate-900">
        {label}
        {optional && <span className="ml-1 font-normal text-slate-500">(optional)</span>}
      </label>

      {hint && (
        <p id={hintId} className="text-sm text-slate-600">
          {hint}
        </p>
      )}

      {children({
        id,
        'aria-invalid': error !== undefined,
        'aria-describedby': describedBy,
        className: cn(
          'block w-full rounded-md border px-3 py-2 text-slate-900 shadow-sm',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600',
          error
            ? 'border-red-400 bg-red-50/40'
            : 'border-slate-300 bg-white hover:border-slate-400',
        ),
      })}

      {error && (
        <p id={errorId} className="text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
