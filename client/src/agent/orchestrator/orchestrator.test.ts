import { describe, expect, it, vi } from 'vitest';
import { ConfirmationDeniedError } from '@/lib/webmcp';
import { runOrchestration } from './orchestrator';
import { createScriptedPlanner, type ScriptedJourney } from './scripted-planner';
import type { CapabilityClient, CapabilityInfo } from './capability-client';
import type { Planner } from './planner';

/**
 * Spec 13 orchestration tests. A scripted planner + a fake capability client keep
 * them deterministic (no network, no LLM). They assert the reference journey, the
 * transport-agnostic navigation-skip, and the guardrail behaviours (no speculative
 * writes; a declined confirmation stops cleanly).
 */

const WEBMCP_CAPS: CapabilityInfo[] = [
  { name: 'find_courses', description: '', kind: 'READ' },
  { name: 'get_course_details', description: '', kind: 'READ' },
  { name: 'compare_courses', description: '', kind: 'READ' },
  { name: 'navigate_to_course', description: '', kind: 'NAVIGATION' },
  { name: 'prepare_enquiry', description: '', kind: 'READ' },
  { name: 'validate_enquiry', description: '', kind: 'READ' },
  { name: 'submit_enquiry', description: '', kind: 'WRITE' },
];

const MCP_CAPS: CapabilityInfo[] = WEBMCP_CAPS.filter((c) => c.name !== 'navigate_to_course');

const journey: ScriptedJourney = {
  keyword: 'cloud',
  compareIds: ['c1', 'c2'],
  chosenCourseId: 'c1',
  enquiry: {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    enquiryType: 'general',
    message: 'I would like to know more about this course please.',
  },
};

/** Fake client that records invocations and returns canned outputs. */
function fakeClient(
  caps: CapabilityInfo[],
  overrides: { onSubmit?: () => Promise<unknown> } = {},
): CapabilityClient & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    list: () => caps,
    invoke: async (name: string) => {
      calls.push(name);
      if (name === 'submit_enquiry') {
        if (overrides.onSubmit) return overrides.onSubmit();
        return { reference: 'ENQ-2027-000001', courseId: 'c1' };
      }
      return { ok: true };
    },
  };
}

describe('reference journey (FR-1303)', () => {
  it('runs find→details→compare→navigate→prepare→validate→submit in order (WebMCP)', async () => {
    const client = fakeClient(WEBMCP_CAPS);
    const result = await runOrchestration('help me enquire', createScriptedPlanner(journey), client);
    expect(result.stopped).toBe('done');
    expect(client.calls).toEqual([
      'find_courses',
      'get_course_details',
      'compare_courses',
      'navigate_to_course',
      'prepare_enquiry',
      'validate_enquiry',
      'submit_enquiry',
    ]);
  });

  it('skips navigation when the interface lacks it (MCP subset, FR-1302.2)', async () => {
    const client = fakeClient(MCP_CAPS);
    const result = await runOrchestration('help me enquire', createScriptedPlanner(journey), client);
    expect(result.stopped).toBe('done');
    expect(client.calls).not.toContain('navigate_to_course');
    expect(client.calls[0]).toBe('find_courses');
    expect(client.calls.at(-1)).toBe('submit_enquiry');
  });
});

describe('guardrails (FR-1304)', () => {
  it('a declined confirmation stops cleanly with no retry and no completion', async () => {
    const client = fakeClient(WEBMCP_CAPS, {
      onSubmit: async () => {
        throw new ConfirmationDeniedError('submit_enquiry');
      },
    });
    const result = await runOrchestration('help me enquire', createScriptedPlanner(journey), client);
    expect(result.stopped).toBe('declined');
    // submit was attempted exactly once; no retry.
    expect(client.calls.filter((c) => c === 'submit_enquiry')).toHaveLength(1);
  });

  it('no speculative writes: submit only occurs as the final explicit step', async () => {
    const client = fakeClient(WEBMCP_CAPS);
    await runOrchestration('help me enquire', createScriptedPlanner(journey), client);
    const submitIndex = client.calls.indexOf('submit_enquiry');
    // submit is last, and preceded by prepare + validate.
    expect(submitIndex).toBe(client.calls.length - 1);
    expect(client.calls).toContain('prepare_enquiry');
    expect(client.calls).toContain('validate_enquiry');
  });
});

describe('bounded loop (FR-1305)', () => {
  it('stops at the step budget when a planner never finishes', async () => {
    const loopingPlanner: Planner = {
      next: () => ({ type: 'call', capability: 'find_courses', input: {} }),
    };
    const client = fakeClient(WEBMCP_CAPS);
    const result = await runOrchestration('loop', loopingPlanner, client, { maxSteps: 3 });
    expect(result.stopped).toBe('budget');
    expect(client.calls).toHaveLength(3);
  });

  it('surfaces a sanitised error step without throwing, then can finish', async () => {
    const client: CapabilityClient & { calls: string[] } = {
      calls: [],
      list: () => WEBMCP_CAPS,
      invoke: async (name: string) => {
        (client.calls as string[]).push(name);
        throw new Error('internal detail that must not leak');
      },
    };
    // Planner: one call then done.
    let called = false;
    const planner: Planner = {
      next: () => {
        if (!called) {
          called = true;
          return { type: 'call', capability: 'find_courses', input: {} };
        }
        return { type: 'done' };
      },
    };
    const result = await runOrchestration('x', planner, client);
    const step = result.history[0];
    expect(step?.error).toBe('The action could not be completed.');
    expect(JSON.stringify(result)).not.toContain('internal detail');
  });
});
