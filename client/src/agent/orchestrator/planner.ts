/**
 * Planner seam (Spec 13 §4, FR-1306.2).
 *
 * The "brain" that decides the next step is behind this interface, so the same
 * orchestrator runs with either an LLM planner (the live experience) or a
 * deterministic scripted planner (tests + offline demo). The orchestrator is
 * identical regardless; only the planner differs.
 *
 * A planner proposes ONE action per turn given the user's request, the available
 * capabilities, and the results so far. It never executes anything itself and
 * never contains business logic.
 */
import type { CapabilityInfo } from './capability-client';

/** A record of a capability call the orchestrator already made. */
export interface PastStep {
  readonly capability: string;
  readonly input: unknown;
  readonly output?: unknown;
  readonly error?: string;
}

/** What the planner sees each turn. */
export interface PlannerState {
  readonly request: string;
  readonly capabilities: readonly CapabilityInfo[];
  readonly history: readonly PastStep[];
}

/** The next action a planner proposes. */
export type PlannerAction =
  | { readonly type: 'call'; readonly capability: string; readonly input: unknown }
  | { readonly type: 'message'; readonly text: string }
  | { readonly type: 'done'; readonly text?: string };

export interface Planner {
  /** Propose the next action, or `done` to finish. */
  next(state: PlannerState): Promise<PlannerAction> | PlannerAction;
}
