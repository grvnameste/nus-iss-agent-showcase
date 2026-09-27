'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import type { PastStep } from '@/agent/orchestrator';

/**
 * Tool-call card (Spec 14 §4, FR-1403/FR-1404).
 *
 * Renders one orchestrator step transparently: the capability name, a kind badge,
 * a status, and an expandable view of the validated input/output. Following the
 * `AvailabilityBadge` pattern, both kind and status carry a text label AND a glyph
 * — never colour alone (design.md §8). PII in the I/O is shown for human review
 * only; it is never persisted or logged (Spec 10 FR-1004).
 */
export type ToolCallStatus = 'pending' | 'success' | 'error';

export interface ToolCallView {
  readonly capability: string;
  readonly kind: 'READ' | 'NAVIGATION' | 'WRITE';
  readonly status: ToolCallStatus;
  readonly input?: unknown;
  readonly output?: unknown;
  /** Sanitised, user-safe error message (no internals/PII). */
  readonly error?: string;
}

const KIND_STYLE: Record<ToolCallView['kind'], { className: string; glyph: string }> = {
  READ: { className: 'bg-sky-50 text-sky-800 ring-sky-200', glyph: '◎' },
  NAVIGATION: { className: 'bg-slate-100 text-slate-700 ring-slate-300', glyph: '➜' },
  WRITE: { className: 'bg-amber-50 text-amber-800 ring-amber-200', glyph: '✎' },
};

const STATUS_STYLE: Record<ToolCallStatus, { className: string; glyph: string; label: string }> = {
  pending: { className: 'text-slate-600', glyph: '◐', label: 'Pending' },
  success: { className: 'text-emerald-700', glyph: '✓', label: 'Success' },
  error: { className: 'text-rose-700', glyph: '✕', label: 'Error' },
};

function KindBadge({ kind }: { kind: ToolCallView['kind'] }): React.JSX.Element {
  const s = KIND_STYLE[kind];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        s.className,
      )}
    >
      <span aria-hidden="true">{s.glyph}</span>
      {kind}
    </span>
  );
}

/** Build a display view from an orchestrator step (status inferred). */
export function toToolCallView(step: PastStep, kind: ToolCallView['kind']): ToolCallView {
  return {
    capability: step.capability,
    kind,
    status: step.error !== undefined ? 'error' : 'success',
    input: step.input,
    ...(step.output !== undefined ? { output: step.output } : {}),
    ...(step.error !== undefined ? { error: step.error } : {}),
  };
}

export function ToolCallCard({ view }: { view: ToolCallView }): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const status = STATUS_STYLE[view.status];

  return (
    <Card as="li" className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <KindBadge kind={view.kind} />
          <span className="font-mono text-sm text-slate-900">{view.capability}</span>
        </div>
        {/* Status is announced politely so screen readers hear updates. */}
        <span
          aria-live="polite"
          className={cn('inline-flex items-center gap-1 text-sm font-medium', status.className)}
        >
          <span aria-hidden="true">{status.glyph}</span>
          {status.label}
        </span>
      </div>

      {view.error !== undefined ? (
        <p className="text-sm text-rose-700">{view.error}</p>
      ) : null}

      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="text-sm font-medium text-sky-700 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
      >
        {open ? 'Hide details' : 'Show details'}
      </button>

      {open ? (
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-slate-500">Input</dt>
            <dd>
              <pre className="mt-1 overflow-x-auto rounded-md bg-slate-50 p-3 text-xs text-slate-800">
                {safeStringify(view.input)}
              </pre>
            </dd>
          </div>
          {view.output !== undefined ? (
            <div>
              <dt className="text-slate-500">Output</dt>
              <dd>
                <pre className="mt-1 overflow-x-auto rounded-md bg-slate-50 p-3 text-xs text-slate-800">
                  {safeStringify(view.output)}
                </pre>
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </Card>
  );
}

/** Pretty-print for display only. Shown to the human; never persisted/logged. */
function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
