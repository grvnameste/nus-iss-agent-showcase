/**
 * Agent orchestrator (Spec 13 §5, §7, §8).
 *
 * Runs a bounded plan→invoke loop: it asks the {@link Planner} for the next
 * action, invokes the chosen capability through the transport-agnostic
 * {@link CapabilityClient}, feeds the result back, and repeats until the planner
 * says `done` (or the step budget is exhausted).
 *
 * It holds NO business logic — capabilities (and the backend behind them) own
 * that. Guardrails are enforced by the client's pipeline, not re-implemented here:
 * a WRITE only happens when the planner explicitly calls `submit_enquiry`, and the
 * pipeline requests human confirmation before executing it. A declined
 * confirmation (`ConfirmationDeniedError`) ends the run cleanly — the orchestrator
 * never retries a WRITE (FR-1304, FR-1305).
 */
import { ConfirmationDeniedError } from '@/lib/webmcp';
import type { CapabilityClient } from './capability-client';
import type { Planner, PastStep } from './planner';

export interface OrchestratorOptions {
  /** Max plan→invoke turns before stopping (guards against runaway loops). */
  readonly maxSteps?: number;
}

export type TranscriptEntry =
  | { readonly type: 'message'; readonly text: string }
  | { readonly type: 'step'; readonly step: PastStep }
  | { readonly type: 'stopped'; readonly reason: 'done' | 'declined' | 'budget'; readonly text?: string };

export interface OrchestrationResult {
  readonly transcript: readonly TranscriptEntry[];
  readonly history: readonly PastStep[];
  readonly stopped: 'done' | 'declined' | 'budget';
}

const DEFAULT_MAX_STEPS = 12;

function toSafeMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === 'CapabilityValidationError') return 'The request was invalid.';
    if (error.name === 'DuplicateSubmissionError') return 'This enquiry was already submitted.';
  }
  return 'The action could not be completed.';
}

export async function runOrchestration(
  request: string,
  planner: Planner,
  client: CapabilityClient,
  options: OrchestratorOptions = {},
): Promise<OrchestrationResult> {
  const maxSteps = options.maxSteps ?? DEFAULT_MAX_STEPS;
  const capabilities = client.list();
  const history: PastStep[] = [];
  const transcript: TranscriptEntry[] = [];

  for (let turn = 0; turn < maxSteps; turn += 1) {
    const action = await planner.next({ request, capabilities, history });

    if (action.type === 'done') {
      transcript.push({ type: 'stopped', reason: 'done', ...(action.text ? { text: action.text } : {}) });
      return { transcript, history, stopped: 'done' };
    }

    if (action.type === 'message') {
      transcript.push({ type: 'message', text: action.text });
      continue;
    }

    // action.type === 'call'
    try {
      const output = await client.invoke(action.capability, action.input);
      const step: PastStep = { capability: action.capability, input: action.input, output };
      history.push(step);
      transcript.push({ type: 'step', step });
    } catch (error) {
      // A declined confirmation is a normal stop — never retry a WRITE (FR-1304.2).
      if (error instanceof ConfirmationDeniedError) {
        transcript.push({ type: 'stopped', reason: 'declined', text: 'Submission was declined.' });
        return { transcript, history, stopped: 'declined' };
      }
      // Other errors are surfaced sanitised; the planner may adjust or finish.
      const step: PastStep = {
        capability: action.capability,
        input: action.input,
        error: toSafeMessage(error),
      };
      history.push(step);
      transcript.push({ type: 'step', step });
    }
  }

  transcript.push({ type: 'stopped', reason: 'budget', text: 'Step budget reached.' });
  return { transcript, history, stopped: 'budget' };
}
