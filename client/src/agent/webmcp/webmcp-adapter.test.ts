import { describe, expect, it, vi } from 'vitest';
import { ConfirmationDeniedError, type CapabilityTransport } from '@/lib/webmcp';
import { DuplicateSubmissionGuard, InMemoryAuditSink } from '@/agent/guardrails';
import { initWebMcp } from './webmcp-adapter';
import type { WebMcpSurface } from './detect';

/**
 * Spec 11 adapter tests. A fake transport + fake surface keep them deterministic
 * and network-free; they assert registration, graceful fallback, guardrailed
 * invocation, and status tracking.
 */

const submitResult = {
  data: {
    reference: 'ENQ-2027-000001',
    courseId: 'c1',
    courseTitle: 'Cloud Foundations',
    status: 'received',
    createdAt: '2027-01-01T00:00:00.000Z',
  },
};

function fakeTransport(): CapabilityTransport & { writes: number } {
  const t = {
    writes: 0,
    read: async <T>(): Promise<T> =>
      ({
        data: [],
        pagination: { page: 1, pageSize: 12, totalItems: 0, totalPages: 0 },
      }) as T,
    write: async <T>(): Promise<T> => {
      t.writes += 1;
      return submitResult as T;
    },
  };
  return t;
}

function recordingSurface(): WebMcpSurface & { tools: string[] } {
  const tools: string[] = [];
  return {
    tools,
    registerTool: (descriptor) => {
      tools.push(descriptor.name);
    },
  };
}

const goodEnquiry = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  courseId: 'c1',
  enquiryType: 'general',
  message: 'I would like to know more about this course please.',
};

describe('initWebMcp — detection & fallback (FR-1101)', () => {
  it('is a graceful no-op when no surface is present (available=false)', () => {
    const handle = initWebMcp({
      confirm: async () => true,
      navigateToCourse: (id) => `/x/${id}`,
      transport: fakeTransport(),
      surface: null,
    });
    expect(handle.available).toBe(false);
    // Capabilities are still registered for potential in-app use.
    expect(handle.registry.list().length).toBe(7);
  });

  it('advertises all capabilities to a detected surface (available=true)', () => {
    const surface = recordingSurface();
    const handle = initWebMcp({
      confirm: async () => true,
      navigateToCourse: (id) => `/x/${id}`,
      transport: fakeTransport(),
      surface,
    });
    expect(handle.available).toBe(true);
    expect(surface.tools).toContain('find_courses');
    expect(surface.tools).toContain('submit_enquiry');
    expect(surface.tools).toHaveLength(7);
  });
});

describe('initWebMcp — guardrailed invocation', () => {
  it('routes READs through invoke and records success status', async () => {
    const handle = initWebMcp({
      confirm: async () => true,
      navigateToCourse: (id) => `/x/${id}`,
      transport: fakeTransport(),
      surface: null,
    });
    await handle.invoke('find_courses', { keyword: 'cloud' });
    const entries = handle.statusStore.list();
    expect(entries.at(-1)).toMatchObject({ capability: 'find_courses', status: 'success' });
  });

  it('submit requires confirmation; decline aborts and marks error status', async () => {
    const transport = fakeTransport();
    const handle = initWebMcp({
      confirm: async () => false,
      navigateToCourse: (id) => `/x/${id}`,
      transport,
      surface: null,
      audit: new InMemoryAuditSink(),
      duplicateGuard: new DuplicateSubmissionGuard(),
    });
    await expect(handle.invoke('submit_enquiry', goodEnquiry)).rejects.toBeInstanceOf(
      ConfirmationDeniedError,
    );
    expect(transport.writes).toBe(0);
    expect(handle.statusStore.list().at(-1)).toMatchObject({
      capability: 'submit_enquiry',
      status: 'error',
      error: 'Confirmation was declined.',
    });
  });

  it('confirmed submit writes once and records success', async () => {
    const transport = fakeTransport();
    const handle = initWebMcp({
      confirm: async () => true,
      navigateToCourse: (id) => `/x/${id}`,
      transport,
      surface: null,
      duplicateGuard: new DuplicateSubmissionGuard(),
    });
    const out = (await handle.invoke('submit_enquiry', goodEnquiry)) as {
      reference: string;
    };
    expect(out.reference).toBe('ENQ-2027-000001');
    expect(transport.writes).toBe(1);
    expect(handle.statusStore.list().at(-1)).toMatchObject({ status: 'success' });
  });

  it('navigate_to_course delegates to the injected navigator', async () => {
    const navigate = vi.fn((id: string) => `/lifelong-learning/courses/${id}`);
    const handle = initWebMcp({
      confirm: async () => true,
      navigateToCourse: navigate,
      transport: fakeTransport(),
      surface: null,
    });
    const out = (await handle.invoke('navigate_to_course', {
      courseId: 'c1',
    })) as { href: string };
    expect(navigate).toHaveBeenCalledWith('c1');
    expect(out.href).toBe('/lifelong-learning/courses/c1');
  });
});
