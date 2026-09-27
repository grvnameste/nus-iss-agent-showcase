import { describe, expect, it } from 'vitest';
import {
  CapabilityRegistry,
  type CapabilityContext,
  type CapabilityTransport,
} from '@/lib/webmcp';
import { registerWebMcpCapabilities } from '@/agent/capabilities';
import {
  invokeWithGuardrails,
  InMemoryAuditSink,
  DuplicateSubmissionGuard,
} from '@/agent/guardrails';
import {
  runOrchestration,
  createScriptedPlanner,
  type CapabilityClient,
  type ScriptedJourney,
} from '@/agent/orchestrator';

/**
 * Spec 15 — end-to-end agent journey (the one gap the layer tests don't cover as
 * a single flow). This wires the REAL stack together: the Spec 09 capability
 * registry, the Spec 10 guardrails (`invokeWithGuardrails`), and the Spec 13
 * orchestration (scripted planner) — over a FAKE `CapabilityTransport`, so the
 * whole journey runs deterministically with no network and no LLM (testing.md).
 *
 * It proves the reference journey (find → details → compare → navigate → prepare
 * → validate → confirm → submit → reference) end to end, and that a declined
 * human confirmation stops the journey with nothing submitted.
 */

const courseA = makeCourse('c1', 'Cloud Foundations');
const courseB = makeCourse('c2', 'Cloud Architecture');

function makeCourse(id: string, title: string) {
  return {
    id,
    code: `CLD-${id}`,
    title,
    shortDescription: 'Synthetic cloud course.',
    description: 'A synthetic cloud course for the demo.',
    discipline: 'Cloud Computing',
    category: 'Cloud',
    courseType: 'short_course',
    level: 'beginner',
    durationWeeks: 6,
    deliveryMode: 'online',
    intake: 'Jan 2027',
    startDate: '2027-01-10',
    applicationDeadline: '2026-12-20',
    fee: 1200,
    currency: 'SGD',
    eligibility: 'Open to all.',
    entryRequirements: [],
    skills: ['cloud'],
    status: 'published',
    availability: 'open',
    tags: ['cloud'],
  } as const;
}

/** Fake transport backed by two synthetic courses; records writes. */
function fakeTransport(): CapabilityTransport & { writes: number } {
  const t = {
    writes: 0,
    read: async <T>(path: string): Promise<T> => {
      if (path.endsWith('/api/courses')) {
        return {
          data: [courseA, courseB],
          pagination: { page: 1, pageSize: 12, totalItems: 2, totalPages: 1 },
        } as T;
      }
      if (path.includes('/api/courses/')) {
        const id = decodeURIComponent(path.split('/api/courses/')[1] ?? '');
        const course = id === 'c2' ? courseB : courseA;
        return { data: course } as T;
      }
      throw new Error(`unexpected read ${path}`);
    },
    write: async <T>(): Promise<T> => {
      t.writes += 1;
      return {
        data: {
          reference: 'ENQ-2027-000042',
          courseId: 'c1',
          courseTitle: 'Cloud Foundations',
          status: 'received',
          createdAt: '2027-01-01T00:00:00.000Z',
        },
      } as T;
    },
  };
  return t;
}

const journey: ScriptedJourney = {
  keyword: 'cloud',
  compareIds: ['c1', 'c2'],
  chosenCourseId: 'c1',
  enquiry: {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    enquiryType: 'general',
    message: 'I would like to know more about this course and its outcomes.',
  },
};

/** Build a real, guardrailed capability client over the fake transport. */
function buildClient(confirm: CapabilityContext['confirm'], transport: CapabilityTransport) {
  const registry = new CapabilityRegistry();
  registerWebMcpCapabilities(registry, { navigateToCourse: (id) => `/lifelong-learning/courses/${id}` });
  const audit = new InMemoryAuditSink();
  const duplicateGuard = new DuplicateSubmissionGuard();
  const ctx: CapabilityContext = { transport, confirm };
  const client: CapabilityClient = {
    list: () =>
      registry.list().map((c) => ({ name: c.name, description: c.description, kind: c.permissions.kind })),
    invoke: (name, input) => invokeWithGuardrails(registry, name, input, ctx, { audit, duplicateGuard }),
  };
  return { client, audit };
}

describe('E2E agent journey (Spec 15, FR-1507)', () => {
  it('completes find → … → submit and returns a confirmation reference (approved)', async () => {
    const transport = fakeTransport();
    const { client, audit } = buildClient(async () => true, transport);

    const result = await runOrchestration('find cloud courses and enquire', createScriptedPlanner(journey), client);

    expect(result.stopped).toBe('done');
    // The full journey ran, ending in a WRITE.
    const calls = result.history.map((s) => s.capability);
    expect(calls).toEqual([
      'find_courses',
      'get_course_details',
      'compare_courses',
      'navigate_to_course',
      'prepare_enquiry',
      'validate_enquiry',
      'submit_enquiry',
    ]);
    // Exactly one write, producing a reference (no PII echoed).
    expect(transport.writes).toBe(1);
    const submit = result.history.find((s) => s.capability === 'submit_enquiry');
    expect((submit?.output as { reference: string }).reference).toBe('ENQ-2027-000042');
    // Audit is PII-free.
    expect(JSON.stringify(audit.list())).not.toContain('ada@example.com');
  });

  it('stops cleanly with no submission when confirmation is declined', async () => {
    const transport = fakeTransport();
    const { client } = buildClient(async () => false, transport);

    const result = await runOrchestration('enquire', createScriptedPlanner(journey), client);

    expect(result.stopped).toBe('declined');
    expect(transport.writes).toBe(0);
  });
});
