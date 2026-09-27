'use client';

import { useEffect, useRef } from 'react';
import { buttonClasses } from '@/components/ui/Button';
import type { PendingConfirmation } from './confirmation-controller';

/**
 * Accessible confirmation dialog (Spec 11 §6, Spec 10 FR-1001).
 *
 * Renders the pending human-confirmation request for a WRITE capability
 * (`submit_enquiry`). It shows the request summary and the NON-PII detail payload
 * (course, enquiry type, and the list of field names being sent) — values are not
 * surfaced here, so nothing sensitive is rendered from this control.
 *
 * Accessibility (design.md §8): `role="dialog"` + `aria-modal`, labelled by its
 * heading, initial focus on Cancel, Escape declines, and focus returns to the
 * previously focused element on close. Reuses the Phase 1 button styling.
 */
export function ConfirmationDialog({
  pending,
}: {
  pending: PendingConfirmation | null;
}): React.JSX.Element | null {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (pending === null) return;
    // Remember focus, move it into the dialog, restore on unmount/close.
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    return () => {
      previouslyFocused.current?.focus?.();
    };
  }, [pending]);

  if (pending === null) return null;

  const { request, approve, decline } = pending;
  const details = request.details ?? {};
  const fields = Array.isArray((details as Record<string, unknown>).fieldsBeingSent)
    ? ((details as Record<string, unknown>).fieldsBeingSent as string[])
    : [];

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      decline();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      // Clicking the backdrop declines (same as Cancel).
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) decline();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="agent-confirm-title"
        aria-describedby="agent-confirm-summary"
        onKeyDown={onKeyDown}
        className="w-full max-w-md space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-lg"
      >
        <h2 id="agent-confirm-title" className="text-lg font-semibold text-slate-900">
          Confirm submission
        </h2>
        <p id="agent-confirm-summary" className="text-slate-600">
          {request.summary}
        </p>
        {fields.length > 0 ? (
          <p className="text-sm text-slate-500">
            Fields being sent: {fields.join(', ')}.
          </p>
        ) : null}
        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={decline}
            className={buttonClasses('secondary')}
          >
            Cancel
          </button>
          <button type="button" onClick={approve} className={buttonClasses('primary')}>
            Submit enquiry
          </button>
        </div>
      </div>
    </div>
  );
}
