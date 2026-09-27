import { describe, expect, it, vi } from 'vitest';
import {
  CapabilityRegistry,
  ConfirmationDeniedError,
  type CapabilityContext,
  type CapabilityTransport,
} from '@/lib/webmcp';
import { registerWebMcpCapabilities } from '@/agent/capabilities';
import {
  invokeWithGuardrails,
  InMemoryAuditSink,
  DuplicateSubmissionGuard,
  DuplicateSubmissionError,
  dedupeKey,
  personalFieldsBeingSent,
  buildSubmitConfirmation,
} from './index';

/**
 * Spec 10 guardrail tests. They wrap the real capability registry (Spec 09) with
 * `invokeWithGuardrails` and a fake transport, asserting consent, no-speculative-
 * writes, duplicate protection, and PII-free audit.
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

function makeTransport(): CapabilityTransport & { writeCount: () => number } {
  let writes = 0;
  return {
    writeCount: () => writes,
    read: async <T>(): Promise<T> =>
      ({
        data: [],
        pagination: { page: 1, pageSize: 12, totalItems: 0, totalPages: 0 },
      }) as T,
    write: async <T>(): Promise<T> => {
      writes += 1;
      return submitResult as T;
    },
  };
}

function setup(confirm: CapabilityContext['confirm'] = async () => true) {
  const registry = new CapabilityRegistry();
  registerWebMcpCapabilities(registry, { navigateToCourse: (id) => `/x/${id}` });
  const transport = makeTransport();
  const ctx: CapabilityContext = { transport, confirm };
  const audit = new InMemoryAuditSink();
  const duplicateGuard = new DuplicateSubmissionGuard();
  return { registry, transport, ctx, audit, duplicateGuard };
}

const goodEnquiry = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  courseId: 'c1',
  enquiryType: 'general',
  message: 'I would like to know more about this course please.',
};

describe('confirmation & audit (FR-1001, FR-1007)', () => {
  it('records a PII-free success audit for a confirmed submit', async () => {
    const { registry, ctx, audit, duplicateGuard } = setup(async () => true);
    await invokeWithGuardrails(registry, 'submit_enquiry', goodEnquiry, ctx, {
      audit,
      duplicateGuard,
    });
    const entries = audit.list();
    expect(entries).toHaveLength(1);
    const entry = entries[0]!;
    expect(entry).toMatchObject({
      capability: 'submit_enquiry',
      kind: 'WRITE',
      outcome: 'success',
      confirmationGranted: true,
    });
    // Audit must contain NO PII / values.
    const serialized = JSON.stringify(entry);
    expect(serialized).not.toContain('ada@example.com');
    expect(serialized).not.toContain('Ada Lovelace');
    expect(serialized).not.toContain(goodEnquiry.message);
  });

  it('declined confirmation aborts (ConfirmationDeniedError) and writes nothing', async () => {
    const { registry, ctx, transport, audit, duplicateGuard } = setup(async () => false);
    await expect(
      invokeWithGuardrails(registry, 'submit_enquiry', goodEnquiry, ctx, {
        audit,
        duplicateGuard,
      }),
    ).rejects.toBeInstanceOf(ConfirmationDeniedError);
    expect(transport.writeCount()).toBe(0);
    expect(audit.list()[0]).toMatchObject({ outcome: 'declined', confirmationGranted: false });
  });

  it('READ capabilities are not confirmed and audit has no confirmationGranted', async () => {
    const confirm = vi.fn(async () => true);
    const { registry, ctx, audit } = setup(confirm);
    await invokeWithGuardrails(registry, 'find_courses', {}, ctx, { audit });
    expect(confirm).not.toHaveBeenCalled();
    expect(audit.list()[0]).toMatchObject({ kind: 'READ', outcome: 'success' });
    expect(audit.list()[0]).not.toHaveProperty('confirmationGranted');
  });
});

describe('duplicate-submission protection (FR-1005)', () => {
  it('blocks an identical resubmission and reports the prior reference', async () => {
    const { registry, ctx, transport, duplicateGuard, audit } = setup(async () => true);
    const first = await invokeWithGuardrails<{ reference: string }>(
      registry,
      'submit_enquiry',
      goodEnquiry,
      ctx,
      { audit, duplicateGuard },
    );
    expect(first.reference).toBe('ENQ-2027-000001');
    expect(transport.writeCount()).toBe(1);

    // Second identical submit is blocked — no second write.
    await expect(
      invokeWithGuardrails(registry, 'submit_enquiry', goodEnquiry, ctx, {
        audit,
        duplicateGuard,
      }),
    ).rejects.toMatchObject({ reference: 'ENQ-2027-000001' });
    expect(transport.writeCount()).toBe(1);
    expect(audit.list().map((e) => e.outcome)).toEqual(['success', 'duplicate']);
  });

  it('allows a different enquiry through', async () => {
    const { registry, ctx, transport, duplicateGuard } = setup(async () => true);
    await invokeWithGuardrails(registry, 'submit_enquiry', goodEnquiry, ctx, { duplicateGuard });
    await invokeWithGuardrails(
      registry,
      'submit_enquiry',
      { ...goodEnquiry, message: 'A different message entirely, thank you.' },
      ctx,
      { duplicateGuard },
    );
    expect(transport.writeCount()).toBe(2);
  });

  it('dedupeKey normalizes email case and trims', () => {
    const a = dedupeKey({ ...goodEnquiry });
    const b = dedupeKey({ ...goodEnquiry, email: '  ADA@example.com ' });
    expect(a).toBe(b);
  });

  it('DuplicateSubmissionError carries the reference', () => {
    const err = new DuplicateSubmissionError('ENQ-2027-000009');
    expect(err.reference).toBe('ENQ-2027-000009');
    expect(err.name).toBe('DuplicateSubmissionError');
  });
});

describe('confirmation summary (FR-1004 — field names, not values)', () => {
  it('lists personal field names being sent, not values', () => {
    const req = buildSubmitConfirmation('submit_enquiry', {
      courseId: 'c1',
      courseTitle: 'Cloud Foundations',
      enquiryType: 'general',
      name: 'Ada',
      email: 'ada@example.com',
      message: 'Hello there team.',
    });
    expect(req.summary).toContain('Cloud Foundations');
    // Field names appear; values do not leak into the non-PII details payload.
    expect(req.details).toMatchObject({
      fieldsBeingSent: expect.arrayContaining(['name', 'email', 'message']),
    });
    expect(JSON.stringify(req.details)).not.toContain('ada@example.com');
  });

  it('personalFieldsBeingSent omits absent/empty fields', () => {
    expect(
      personalFieldsBeingSent({ courseId: 'c1', enquiryType: 'general', phone: '' }),
    ).toEqual([]);
  });
});
