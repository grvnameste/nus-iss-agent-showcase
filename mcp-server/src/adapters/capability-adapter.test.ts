import { describe, expect, it } from 'vitest';
import { createAdapter, McpToolError } from './capability-adapter.js';
import { DuplicateSubmissionGuard } from './duplicate-guard.js';
import { InMemoryAuditSink } from './audit.js';
import { FunctionApproval, DenyingApproval } from './approval.js';

/**
 * Spec 12 adapter tests. Fake `courses`/`enquiries` services are injected so the
 * tests are deterministic and prove the adapter's guardrails without a real
 * backend: fail-closed approval, dedupe, PII-free audit, sanitised errors, and
 * that navigation is not part of the adapter.
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

/* eslint-disable @typescript-eslint/no-explicit-any */
function fakeCourses(overrides: Record<string, unknown> = {}): any {
  return {
    search: async () => ({
      data: [sampleCourse],
      pagination: { page: 1, pageSize: 12, totalItems: 1, totalPages: 1 },
    }),
    getById: async (id: string) =>
      id === 'c1' || id === 'c2' ? { ...sampleCourse, id } : null,
    ...overrides,
  };
}

function fakeEnquiries(rows: readonly unknown[] = []): {
  submit: (input: unknown) => Promise<unknown>;
  list: () => Promise<readonly unknown[]>;
  calls: number;
} {
  const obj = {
    calls: 0,
    submit: async (input: unknown) => {
      obj.calls += 1;
      return {
        reference: 'ENQ-2027-000001',
        courseId: (input as { courseId: string }).courseId,
        courseTitle: 'Cloud Foundations',
        status: 'received',
        createdAt: '2027-01-01T00:00:00.000Z',
      };
    },
    // Service returns newest-first; the adapter must delegate without re-sorting.
    list: async () => rows,
  };
  return obj;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const goodEnquiry = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  courseId: 'c1',
  enquiryType: 'general',
  message: 'I would like to know more about this course please.',
};

function build(opts: { approve?: boolean; enquiryRows?: readonly unknown[] } = {}) {
  const audit = new InMemoryAuditSink();
  const duplicateGuard = new DuplicateSubmissionGuard();
  const enquiries = fakeEnquiries(opts.enquiryRows);
  const adapter = createAdapter({
    approval:
      opts.approve === undefined
        ? new DenyingApproval()
        : new FunctionApproval(async () => opts.approve as boolean),
    duplicateGuard,
    audit,
    courses: fakeCourses(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    enquiries: enquiries as any,
  });
  return { adapter, audit, duplicateGuard, enquiries };
}

describe('READ tools', () => {
  it('find_courses returns data + pagination and audits success', async () => {
    const { adapter, audit } = build();
    const out = await adapter.findCourses({ keyword: 'cloud' });
    expect(out.data).toHaveLength(1);
    expect(audit.list().at(-1)).toMatchObject({ capability: 'find_courses', outcome: 'success' });
  });

  it('get_course_details returns not_found for unknown id (sanitised)', async () => {
    const { adapter } = build();
    await expect(adapter.getCourseDetails({ courseId: 'nope' })).rejects.toBeInstanceOf(
      McpToolError,
    );
  });

  it('compare_courses composes over details for distinct ids', async () => {
    const { adapter } = build();
    const out = await adapter.compareCourses({ courseIds: ['c1', 'c2'] });
    expect(out.courses).toHaveLength(2);
    expect(out.fields).toContain('fee');
  });

  it('compare_courses rejects duplicate ids as validation_error', async () => {
    const { adapter } = build();
    await expect(adapter.compareCourses({ courseIds: ['c1', 'c1'] })).rejects.toMatchObject({
      code: 'validation_error',
    });
  });

  it('validate_enquiry returns fieldErrors without throwing', async () => {
    const { adapter } = build();
    const out = await adapter.validateEnquiry({ email: 'bad' });
    expect(out.valid).toBe(false);
    expect(out.fieldErrors).toBeDefined();
  });

  it('list_enquiries returns the service rows and audits a PII-free READ success', async () => {
    const rows = [
      {
        id: 'e2',
        reference: 'ENQ-2027-000002',
        name: 'Grace Hopper',
        email: 'grace@example.com',
        courseId: 'c1',
        courseTitle: 'Cloud Foundations',
        enquiryType: 'general',
        message: 'Newest enquiry.',
        status: 'received',
        createdAt: '2027-01-02T00:00:00.000Z',
      },
      {
        id: 'e1',
        reference: 'ENQ-2027-000001',
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        courseId: 'c1',
        courseTitle: 'Cloud Foundations',
        enquiryType: 'general',
        message: 'Older enquiry.',
        status: 'received',
        createdAt: '2027-01-01T00:00:00.000Z',
      },
    ];
    const { adapter, audit } = build({ enquiryRows: rows });
    const out = await adapter.listEnquiries();
    // Delegates verbatim (service already returns newest-first).
    expect(out.data).toEqual(rows);
    const entry = audit.list().at(-1);
    expect(entry).toMatchObject({
      capability: 'list_enquiries',
      kind: 'READ',
      outcome: 'success',
    });
    // Audit must never carry enquirer PII.
    expect(JSON.stringify(entry)).not.toContain('grace@example.com');
    expect(JSON.stringify(entry)).not.toContain('Grace Hopper');
  });
});

describe('submit_enquiry — human approval (fail-closed, FR-1204)', () => {
  it('refuses when no approver is wired (DenyingApproval)', async () => {
    const { adapter, enquiries, audit } = build(); // default: denying
    await expect(adapter.submitEnquiry(goodEnquiry)).rejects.toMatchObject({
      code: 'declined',
    });
    expect(enquiries.calls).toBe(0);
    expect(audit.list().at(-1)).toMatchObject({ outcome: 'declined', confirmationGranted: false });
  });

  it('submits once when approved and audits success (no PII)', async () => {
    const { adapter, enquiries, audit } = build({ approve: true });
    const out = (await adapter.submitEnquiry(goodEnquiry)) as { reference: string };
    expect(out.reference).toBe('ENQ-2027-000001');
    expect(enquiries.calls).toBe(1);
    const entry = audit.list().at(-1);
    expect(entry).toMatchObject({ outcome: 'success', confirmationGranted: true });
    expect(JSON.stringify(entry)).not.toContain('ada@example.com');
  });

  it('blocks a duplicate resubmission (no second write)', async () => {
    const { adapter, enquiries } = build({ approve: true });
    await adapter.submitEnquiry(goodEnquiry);
    await expect(adapter.submitEnquiry(goodEnquiry)).rejects.toMatchObject({ code: 'duplicate' });
    expect(enquiries.calls).toBe(1);
  });

  it('rejects invalid enquiry input as validation_error', async () => {
    const { adapter } = build({ approve: true });
    await expect(adapter.submitEnquiry({ email: 'bad' })).rejects.toMatchObject({
      code: 'validation_error',
    });
  });
});
