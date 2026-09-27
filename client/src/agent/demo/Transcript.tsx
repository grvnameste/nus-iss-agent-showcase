'use client';

import { Card } from '@/components/ui/Card';
import type { OrchestrationResult, TranscriptEntry } from '@/agent/orchestrator';
import { ToolCallCard, toToolCallView, type ToolCallView } from './ToolCallCard';

/**
 * Transcript (Spec 14 §4, §6).
 *
 * Renders the orchestration transcript in order — agent/user messages, a
 * {@link ToolCallCard} per capability step, and a final result/stopped state
 * (done / declined / budget). Kinds are looked up from the capability metadata so
 * each card shows the correct READ/NAVIGATION/WRITE badge.
 */
export interface TranscriptProps {
  readonly result: OrchestrationResult | null;
  /** Maps a capability name to its kind for the card badge. */
  readonly kindOf: (capability: string) => ToolCallView['kind'];
}

export function Transcript({ result, kindOf }: TranscriptProps): React.JSX.Element {
  if (result === null) {
    return <p className="text-slate-600">No activity yet. Enter a request to begin.</p>;
  }

  return (
    <div className="space-y-4">
      <ol className="space-y-3">
        {result.transcript.map((entry, index) => (
          <TranscriptItem key={index} entry={entry} kindOf={kindOf} />
        ))}
      </ol>
      <StoppedState result={result} />
    </div>
  );
}

function TranscriptItem({
  entry,
  kindOf,
}: {
  entry: TranscriptEntry;
  kindOf: (capability: string) => ToolCallView['kind'];
}): React.JSX.Element | null {
  if (entry.type === 'message') {
    return (
      <li>
        <p className="text-slate-700">{entry.text}</p>
      </li>
    );
  }
  if (entry.type === 'step') {
    return <ToolCallCard view={toToolCallView(entry.step, kindOf(entry.step.capability))} />;
  }
  // 'stopped' entries are summarised once by StoppedState; skip inline.
  return null;
}

/** Final outcome banner: success reference, declined, or budget-reached. */
function StoppedState({ result }: { result: OrchestrationResult }): React.JSX.Element | null {
  if (result.stopped === 'declined') {
    return (
      <Card as="section" className="border-slate-300 bg-slate-50">
        <p className="text-slate-700">Cancelled — nothing was submitted.</p>
      </Card>
    );
  }
  if (result.stopped === 'budget') {
    return (
      <Card as="section" className="border-amber-200 bg-amber-50">
        <p className="text-amber-800">The step budget was reached before completing.</p>
      </Card>
    );
  }

  // done: surface the submission confirmation if the last step produced one.
  const submit = [...result.history].reverse().find((s) => s.capability === 'submit_enquiry');
  const confirmation = submit?.output as
    | { reference?: string; courseTitle?: string; status?: string; createdAt?: string }
    | undefined;

  if (confirmation?.reference !== undefined) {
    return (
      <Card as="section" className="border-emerald-200 bg-emerald-50">
        <h3 className="text-base font-semibold text-emerald-900">Enquiry submitted</h3>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-emerald-900">
          <dt className="text-emerald-700">Reference</dt>
          <dd className="font-mono">{confirmation.reference}</dd>
          {confirmation.courseTitle !== undefined ? (
            <>
              <dt className="text-emerald-700">Course</dt>
              <dd>{confirmation.courseTitle}</dd>
            </>
          ) : null}
          {confirmation.status !== undefined ? (
            <>
              <dt className="text-emerald-700">Status</dt>
              <dd>{confirmation.status}</dd>
            </>
          ) : null}
        </dl>
      </Card>
    );
  }

  return (
    <Card as="section" className="border-slate-200">
      <p className="text-slate-700">Journey complete.</p>
    </Card>
  );
}
