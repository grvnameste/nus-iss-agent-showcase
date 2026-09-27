import { describe, expect, it } from 'vitest';
import { SqliteEnquiryRepository } from './sqlite-enquiry-repository.js';
import type { Enquiry } from '../domain/enquiry.js';

/**
 * SQLite enquiry repository tests (Spec 16, FR-1601). Uses an in-memory SQLite
 * database (`:memory:`) so tests are deterministic and touch no disk — the same
 * code path as a file-backed DB, minus the file.
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

describe('SqliteEnquiryRepository', () => {
  it('creates and reads back an enquiry by reference', async () => {
    const repo = new SqliteEnquiryRepository(':memory:');
    await repo.create(makeEnquiry());

    const found = await repo.findByReference('ENQ-2026-000001');
    expect(found).toMatchObject({
      reference: 'ENQ-2026-000001',
      name: 'Alex Tan',
      status: 'received',
    });
  });

  it('returns null for an unknown reference', async () => {
    const repo = new SqliteEnquiryRepository(':memory:');
    await expect(repo.findByReference('ENQ-2026-999999')).resolves.toBeNull();
  });

  it('persists an optional phone and reads it back (present)', async () => {
    const repo = new SqliteEnquiryRepository(':memory:');
    await repo.create(makeEnquiry({ phone: '+65 8123 4567' }));
    const found = await repo.findByReference('ENQ-2026-000001');
    expect(found?.phone).toBe('+65 8123 4567');
  });

  it('omits phone when it was not provided', async () => {
    const repo = new SqliteEnquiryRepository(':memory:');
    await repo.create(makeEnquiry());
    const found = await repo.findByReference('ENQ-2026-000001');
    expect(found && 'phone' in found).toBe(false);
  });

  it('lists stored enquiries newest first by createdAt', async () => {
    const repo = new SqliteEnquiryRepository(':memory:');
    await repo.create(
      makeEnquiry({
        id: 'enq-1',
        reference: 'ENQ-2026-000001',
        createdAt: '2026-05-01T09:00:00.000Z',
      }),
    );
    await repo.create(
      makeEnquiry({
        id: 'enq-2',
        reference: 'ENQ-2026-000002',
        createdAt: '2026-05-02T09:00:00.000Z',
      }),
    );

    const all = await repo.list();
    expect(all.map((e) => e.reference)).toEqual([
      'ENQ-2026-000002',
      'ENQ-2026-000001',
    ]);
  });

  it('enforces a unique reference (rejects a duplicate)', async () => {
    const repo = new SqliteEnquiryRepository(':memory:');
    await repo.create(makeEnquiry());
    await expect(repo.create(makeEnquiry())).rejects.toBeTruthy();
  });
});
