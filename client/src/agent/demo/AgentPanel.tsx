'use client';

import { useMemo, useRef, useState } from 'react';
import { buttonClasses } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CapabilityRegistry, createBrowserTransport, resolveApiBaseUrl } from '@/lib/webmcp';
import { registerWebMcpCapabilities, courseDetailsHref } from '@/agent/capabilities';
import { InMemoryAuditSink, DuplicateSubmissionGuard, invokeWithGuardrails } from '@/agent/guardrails';
import {
  ConfirmationController,
  ConfirmationDialog,
  type PendingConfirmation,
} from '@/agent/webmcp';
import {
  runOrchestration,
  createScriptedPlanner,
  type CapabilityClient,
  type CapabilityInfo,
  type OrchestrationResult,
  type ScriptedJourney,
} from '@/agent/orchestrator';
import { Transcript } from './Transcript';
import type { ToolCallView } from './ToolCallCard';

/**
 * Agent demo panel (Spec 14 §3, §5).
 *
 * An additive, transparent view of the agent completing the reference journey
 * over the real WebMCP capability layer (Spec 11) + guardrails (Spec 10), driven
 * by the deterministic scripted planner (Spec 13). The human stays in control: the
 * `submit_enquiry` step raises the Spec 11 confirmation dialog hosted here, and a
 * decline cancels with nothing submitted.
 *
 * This component holds no business logic — it wires existing pieces and renders
 * the transcript. PII entered for the demo enquiry is shown for review but never
 * persisted or logged (Spec 10 FR-1004).
 */

/** A small, fixed synthetic journey for the demonstration. */
const DEMO_JOURNEY: ScriptedJourney = {
  keyword: 'cloud',
  compareIds: [],
  chosenCourseId: '',
  enquiry: {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    enquiryType: 'general',
    message: 'I would like to learn more about this course and its outcomes.',
  },
};

const DEFAULT_REQUEST =
  'Find cloud computing courses, compare a couple, and help me enquire about one.';

/**
 * Optional injection seam. Production uses the real WebMCP-backed client built
 * from the registry + guardrails + browser transport. Tests inject a fake
 * `client` (and matching `kindOf`) plus a scripted `journey` for determinism, so
 * no network or LLM is involved.
 */
export interface AgentPanelProps {
  readonly client?: CapabilityClient;
  readonly kindOf?: (capability: string) => ToolCallView['kind'];
  readonly journey?: ScriptedJourney;
}

export function AgentPanel(props: AgentPanelProps = {}): React.JSX.Element {
  const [request, setRequest] = useState(DEFAULT_REQUEST);
  const [result, setResult] = useState<OrchestrationResult | null>(null);
  const [running, setRunning] = useState(false);
  const [pending, setPending] = useState<PendingConfirmation | null>(null);

  // Stable singletons for the panel's lifetime.
  const controllerRef = useRef<ConfirmationController>();
  if (!controllerRef.current) {
    controllerRef.current = new ConfirmationController();
    controllerRef.current.subscribe(setPending);
  }
  const controller = controllerRef.current;

  // Build the capability client once (real registry + guardrails + transport),
  // unless an injected client is provided (tests).
  const built = useMemo(() => {
    const registry = new CapabilityRegistry();
    registerWebMcpCapabilities(registry, {
      navigateToCourse: (id) => courseDetailsHref(id),
    });
    const transport = createBrowserTransport({ baseUrl: resolveApiBaseUrl() });
    const audit = new InMemoryAuditSink();
    const duplicateGuard = new DuplicateSubmissionGuard();
    const ctx = { transport, confirm: controller.requester };

    const capabilityClient: CapabilityClient = {
      list: () =>
        registry.list().map((c) => ({
          name: c.name,
          description: c.description,
          kind: c.permissions.kind,
        })),
      invoke: (name, input) =>
        invokeWithGuardrails(registry, name, input, ctx, { audit, duplicateGuard }),
    };

    const kinds = new Map<string, CapabilityInfo['kind']>(
      registry.list().map((c) => [c.name, c.permissions.kind]),
    );
    const lookup = (capability: string): ToolCallView['kind'] =>
      kinds.get(capability) ?? 'READ';

    return { client: capabilityClient, kindOf: lookup };
  }, [controller]);

  const client = props.client ?? built.client;
  const kindOf = props.kindOf ?? built.kindOf;

  const run = async (): Promise<void> => {
    setRunning(true);
    setResult(null);
    try {
      // A discovery step first would set compareIds/chosenCourseId from real data;
      // for a deterministic demo we resolve them from the catalogue up front. Tests
      // supply a fixed journey to stay network-free.
      const journey = props.journey ?? (await resolveJourney(client));
      const outcome = await runOrchestration(request, createScriptedPlanner(journey), client);
      setResult(outcome);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card as="section" className="space-y-3">
        <label htmlFor="agent-request" className="block text-sm font-medium text-slate-700">
          Your request
        </label>
        <textarea
          id="agent-request"
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-slate-300 p-3 text-sm text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
        />
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={run}
            disabled={running}
            className={buttonClasses('primary')}
          >
            {running ? 'Running…' : 'Run agent'}
          </button>
        </div>
      </Card>

      <section aria-labelledby="agent-transcript-heading" className="space-y-3">
        <h2 id="agent-transcript-heading" className="text-xl font-semibold text-slate-900">
          Agent activity
        </h2>
        <Transcript result={result} kindOf={kindOf} />
      </section>

      {/* Confirmation dialog for the WRITE step; hosted here, driven by the controller. */}
      <ConfirmationDialog pending={pending} />
    </div>
  );
}

/**
 * Resolve the concrete course ids for the demo by running a real search first, so
 * compare/enquiry target actual catalogue entries. Falls back gracefully if the
 * backend is unreachable (the orchestration will then surface sanitised errors).
 */
async function resolveJourney(client: CapabilityClient): Promise<ScriptedJourney> {
  try {
    const found = (await client.invoke('find_courses', { keyword: 'cloud', pageSize: 3 })) as {
      data: Array<{ id: string }>;
    };
    const ids = found.data.map((c) => c.id);
    if (ids.length >= 1) {
      return {
        ...DEMO_JOURNEY,
        compareIds: ids.slice(0, Math.max(2, Math.min(2, ids.length))),
        chosenCourseId: ids[0] as string,
      };
    }
  } catch {
    // Backend unreachable — proceed with empty ids; the run will show errors.
  }
  return { ...DEMO_JOURNEY, compareIds: [], chosenCourseId: '' };
}
