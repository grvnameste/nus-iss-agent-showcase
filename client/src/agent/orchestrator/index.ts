/**
 * Agent orchestration — public entry point (Spec 13).
 *
 * The transport-agnostic capability client, the planner seam (with a deterministic
 * scripted planner), and the bounded orchestration loop for the reference journey.
 * Orchestration is separate from business logic and from any model provider.
 */
export { type CapabilityClient, type CapabilityInfo } from './capability-client';
export { createWebMcpCapabilityClient } from './webmcp-capability-client';
export {
  type Planner,
  type PlannerAction,
  type PlannerState,
  type PastStep,
} from './planner';
export { createScriptedPlanner, type ScriptedJourney } from './scripted-planner';
export {
  runOrchestration,
  type OrchestrationResult,
  type OrchestratorOptions,
  type TranscriptEntry,
} from './orchestrator';
