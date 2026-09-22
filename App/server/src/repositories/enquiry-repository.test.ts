import { describe, expect, it } from 'vitest';
import { InMemoryEnquiryRepository } from './enquiry-repository.js';
import type { Enquiry } from '../domain/enquiry.js';

/**
 * Enquiry repository tests (Spec 05, TASK-517). Storage is synthetic and
 * in-memory (FR-513) — these assert the data-access contract only; no business
 * rules live here.
 */

function makeEnquiry(overrides: Partial<Enquiry> = {}): Enquiry {
  return {
    id: 'enq-1',
    reference: 'ENQ-2026-000001',
    name: 'Alex Tan',
    email: 'alex.tan@example.com',
    courseId: 'ai-foundations',
    courseTitle: 'AI Foundations for Professionals',
    enquiryType: 'general',
    message: 'How much prior experience do I need?',
    status: 'received',
    createdAt: '2026-05-01T09:00:00.000Z',
    ...overrides,
  };
}

describe('InMemoryEnquiryRepository', () => {
  it('stores an enquiry and returns it', async () => {
    const repository = new InMemoryEnquiryRepository();
    const enquiry = makeEnquiry();

    await expect(repository.create(enquiry)).resolves.toEqual(enquiry);
  });

  it('finds a stored enquiry by its reference', async () => {
    const repository = new InMemoryEnquiryRepository();
    await repository.create(makeEnquiry());

    const found = await repository.findByReference('ENQ-2026-000001');

    expect(found).toMatchObject({ reference: 'ENQ-2026-000001', status: 'received' });
  });

  it('returns null for an unknown reference', async () => {
    const repository = new InMemoryEnquiryRepository();

    await expect(repository.findByReference('ENQ-2026-999999')).resolves.toBeNull();
  });

  it('keeps each instance isolated so tests never share state', async () => {
    const first = new InMemoryEnquiryRepository();
    const second = new InMemoryEnquiryRepository();
    await first.create(makeEnquiry());

    await expect(second.findByReference('ENQ-2026-000001')).resolves.toBeNull();
  });

  it('does not expose its internal store to mutation through a returned record', async () => {
    const repository = new InMemoryEnquiryRepository();
    const created = await repository.create(makeEnquiry());

    (created as { name: string }).name = 'Mallory';

    const found = await repository.findByReference('ENQ-2026-000001');
    expect(found?.name).toBe('Alex Tan');
  });
});
