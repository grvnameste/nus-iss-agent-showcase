import { describe, expect, it, vi } from 'vitest';
import {
  CapabilityRegistry,
  CapabilityValidationError,
  ConfirmationDeniedError,
  type CapabilityContext,
  type CapabilityTransport,
} from '@/lib/webmcp';
import {
  registerWebMcpCapabilities,
  registerMcpCapabilities,
  CAPABILITY_NAMES,
} from './register';
import { createCapabilities } from './definitions';

/**
 * Spec 09 capability model tests. They exercise the capabilities through the
 * REAL `CapabilityRegistry.invoke` pipeline (validate → confirm → execute →
 * validate) using a FAKE transport — the sanctioned seam (testing.md), so tests
 * are deterministic with no network.
 */

const sampleCourse = {
  id: 'c1',
  code: 'CLD-101',
  title: 'Cloud Foundations',
  shortDescription: 'Intro to cloud.',
  description: 'A synthetic cloud course.',
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

/** A configurable fake transport capturing calls and returning canned data. */
function makeTransport(
  overrides: Partial<CapabilityTransport> = {},
): CapabilityTransport & { readCalls: string[]; writeCalls: Array<[string, unknown]> } {
  const readCalls: string[] = [];
  const writeCalls: Array<[string, unknown]> = [];
  return {
    readCalls,
    writeCalls,
    read:
      overrides.read ??
      (async <T>(path: string): Promise<T> => {
        readCalls.push(path);
        if (path.startsWith('/api/courses/')) return { data: sampleCourse } as T;
        if (path === '/api/courses') {
          return {
            data: [sampleCourse],
            pagination: { page: 1, pageSize: 12, totalItems: 1, totalPages: 1 },
          } as T;
        }
        throw new Error(`unexpected read ${path}`);
      }),
    write:
      overrides.write ??
      (async <T>(path: string, body: unknown): Promise<T> => {
        writeCalls.push([path, body]);
        return {
          data: {
            reference: 'ENQ-2027-000001',
            courseId: (body as { courseId: string }).courseId,
            courseTitle: 'Cloud Foundations',
            status: 'received',
            createdAt: '2027-01-01T00:00:00.000Z',
          },
        } as T;
      }),
  };
}

function makeContext(
  transport: CapabilityTransport,
  confirm: CapabilityContext['confirm'] = async () => true,
): CapabilityContext {
  return { transport, confirm };
}

function buildRegistry(confirmAll = true): {
  registry: CapabilityRegistry;
  transport: ReturnType<typeof makeTransport>;
  navigate: ReturnType<typeof vi.fn>;
  ctx: CapabilityContext;
} {
  const registry = new CapabilityRegistry();
  const navigate = vi.fn((id: string) => `/lifelong-learning/courses/${id}`);
  registerWebMcpCapabilities(registry, { navigateToCourse: navigate });
  const transport = makeTransport();
  const ctx = makeContext(transport, async () => confirmAll);
  return { registry, transport, navigate, ctx };
}

describe('capability registration (Spec 09)', () => {
  it('registers all seven WebMCP capabilities with correct kinds', () => {
    const { registry } = buildRegistry();
    const names = registry.list().map((c) => c.name).sort();
    expect(names).toEqual(
      [
        'compare_courses',
        'find_courses',
        'get_course_details',
        'navigate_to_course',
        'prepare_enquiry',
        'submit_enquiry',
        'validate_enquiry',
      ].sort(),
    );
    expect(registry.get('submit_enquiry')?.permissions).toMatchObject({
      kind: 'WRITE',
      requiresHumanConfirmation: true,
    });
    expect(registry.get('navigate_to_course')?.permissions.kind).toBe('NAVIGATION');
    expect(registry.get('find_courses')?.permissions.kind).toBe('READ');
  });

  it('MCP subset excludes navigate_to_course (Spec 09 D2)', () => {
    const registry = new CapabilityRegistry();
    registerMcpCapabilities(registry);
    const names = registry.list().map((c) => c.name);
    expect(names).not.toContain(CAPABILITY_NAMES.navigateToCourse);
    expect(names).toHaveLength(6);
  });
});

describe('READ capabilities', () => {
  it('find_courses reads /api/courses and validates output', async () => {
    const { registry, ctx, transport } = buildRegistry();
    const out = await registry.invoke('find_courses', { keyword: 'cloud' }, ctx);
    expect(transport.readCalls).toContain('/api/courses');
    expect(out).toMatchObject({ data: [{ id: 'c1' }] });
  });

  it('get_course_details reads the course by id', async () => {
    const { registry, ctx } = buildRegistry();
    const out = await registry.invoke<{ data: { id: string } }>(
      'get_course_details',
      { courseId: 'c1' },
      ctx,
    );
    expect(out.data.id).toBe('c1');
  });

  it('compare_courses composes over get details (no endpoint)', async () => {
    const { registry, ctx, transport } = buildRegistry();
    const out = await registry.invoke<{ courses: unknown[]; fields: string[] }>(
      'compare_courses',
      { courseIds: ['c1', 'c2'] },
      ctx,
    );
    // Two per-course detail reads, composed client-side.
    expect(transport.readCalls.filter((p) => p.startsWith('/api/courses/'))).toHaveLength(2);
    expect(out.courses).toHaveLength(2);
    expect(out.fields).toContain('fee');
  });

  it('READ capabilities never request confirmation', async () => {
    const confirm = vi.fn(async () => true);
    const registry = new CapabilityRegistry();
    const navigate = vi.fn((id: string) => `/lifelong-learning/courses/${id}`);
    registerWebMcpCapabilities(registry, { navigateToCourse: navigate });
    const ctx = makeContext(makeTransport(), confirm);
    await registry.invoke('find_courses', {}, ctx);
    await registry.invoke('get_course_details', { courseId: 'c1' }, ctx);
    expect(confirm).not.toHaveBeenCalled();
  });
});

describe('navigate_to_course (NAVIGATION, WebMCP-only)', () => {
  it('delegates to the injected navigate collaborator and returns href', async () => {
    const { registry, ctx, navigate } = buildRegistry();
    const out = await registry.invoke<{ href: string }>(
      'navigate_to_course',
      { courseId: 'c1' },
      ctx,
    );
    expect(navigate).toHaveBeenCalledWith('c1');
    expect(out.href).toBe('/lifelong-learning/courses/c1');
  });
});

describe('prepare_enquiry / validate_enquiry (READ)', () => {
  it('prepare_enquiry reports missing required fields and attaches courseTitle', async () => {
    const { registry, ctx } = buildRegistry();
    const out = await registry.invoke<{
      draft: { courseTitle?: string };
      missingFields: string[];
    }>('prepare_enquiry', { courseId: 'c1', name: 'Ada' }, ctx);
    expect(out.draft.courseTitle).toBe('Cloud Foundations');
    expect(out.missingFields).toEqual(
      expect.arrayContaining(['email', 'enquiryType', 'message']),
    );
    expect(out.missingFields).not.toContain('name');
  });

  it('validate_enquiry returns fieldErrors for a bad candidate (no throw)', async () => {
    const { registry, ctx } = buildRegistry();
    const out = await registry.invoke<{
      valid: boolean;
      fieldErrors?: Record<string, string>;
    }>(
      'validate_enquiry',
      { name: 'Ada', email: 'not-an-email', courseId: 'c1', enquiryType: 'general', message: 'short' },
      ctx,
    );
    expect(out.valid).toBe(false);
    expect(out.fieldErrors).toHaveProperty('email');
    expect(out.fieldErrors).toHaveProperty('message');
  });

  it('validate_enquiry returns valid:true for a good candidate', async () => {
    const { registry, ctx } = buildRegistry();
    const out = await registry.invoke<{ valid: boolean }>(
      'validate_enquiry',
      {
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        courseId: 'c1',
        enquiryType: 'general',
        message: 'I would like to know more about this course please.',
      },
      ctx,
    );
    expect(out.valid).toBe(true);
  });
});

describe('submit_enquiry (WRITE, confirmation required)', () => {
  const goodInput = {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    courseId: 'c1',
    enquiryType: 'general',
    message: 'I would like to know more about this course please.',
  };

  it('submits after confirmation and returns a reference (no PII echoed)', async () => {
    const { registry, ctx, transport } = buildRegistry(true);
    const out = await registry.invoke<{ reference: string; courseId: string }>(
      'submit_enquiry',
      goodInput,
      ctx,
    );
    expect(transport.writeCalls).toHaveLength(1);
    expect(out.reference).toBe('ENQ-2027-000001');
    expect(out).not.toHaveProperty('email');
    expect(out).not.toHaveProperty('name');
  });

  it('aborts with ConfirmationDeniedError when declined — nothing written', async () => {
    const { registry, transport } = buildRegistry(false);
    const ctx = makeContext(transport, async () => false);
    await expect(registry.invoke('submit_enquiry', goodInput, ctx)).rejects.toBeInstanceOf(
      ConfirmationDeniedError,
    );
    expect(transport.writeCalls).toHaveLength(0);
  });
});

describe('schema validation (Spec 09 FR-906)', () => {
  it('throws CapabilityValidationError on bad input (input phase)', async () => {
    const { registry, ctx } = buildRegistry();
    // compare_courses requires 2..4 unique ids; one id fails min(2).
    await expect(
      registry.invoke('compare_courses', { courseIds: ['only-one'] }, ctx),
    ).rejects.toBeInstanceOf(CapabilityValidationError);
  });

  it('throws CapabilityValidationError on malformed output (output phase)', async () => {
    // Transport returns a shape that fails the output schema.
    const registry = new CapabilityRegistry();
    registerWebMcpCapabilities(registry, { navigateToCourse: (id) => `/x/${id}` });
    const badTransport = makeTransport({
      read: async <T>(): Promise<T> => ({ data: { not: 'a course' } }) as T,
    });
    const ctx = makeContext(badTransport);
    await expect(
      registry.invoke('get_course_details', { courseId: 'c1' }, ctx),
    ).rejects.toBeInstanceOf(CapabilityValidationError);
  });
});
