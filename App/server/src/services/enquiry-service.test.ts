import { describe, expect, it } from 'vitest';
import {
  CourseUnavailableError,
  DefaultEnquiryService,
  SequentialEnquiryIdGenerator,
  type EnquiryClock,
  type EnquiryIdGenerator,
} from './enquiry-service.js';
import { InMemoryEnquiryRepository } from '../repositories/enquiry-repository.js';
import type { EnquiryRepository } from '../repositories/enquiry-repository.js';
import type { EnquiryInput } from '../domain/enquiry.js';
import type { Course } from '../domain/course.js';
import type { CourseService } from './course-service.js';

/**
 * Enquiry Service tests (Spec 05, TASK-517).
 *
 * The service is transport-agnostic, so everything here runs without HTTP. An
 * injected clock and sequence make the reference number deterministic
 * (FR-514, NFR-506).
 */

const COURSE: Course = {
  id: 'ai-foundations',
  code: 'AI-101',
  title: 'AI Foundations for Professionals',
  shortDescription: 'A practical introduction to applied AI.',
  description: 'A full description of the AI Foundations course content.',
  discipline: 'Artificial Intelligence',
  category: 'Professional Development',
  courseType: 'short_course',
  level: 'beginner',
  durationWeeks: 8,
  deliveryMode: 'blended',
  intake: 'April 2026',
  startDate: '2026-04-06',
  applicationDeadline: '2026-03-09',
  fee: 2400,
  currency: 'SGD',
  eligibility: 'Open to working adults.',
  entryRequirements: [],
  skills: [],
  status: 'published',
  availability: 'open',
  tags: [],
};

/** Course Service fake: only `getById` is exercised by the Enquiry Service. */
function fakeCourseService(courses: Course[] = [COURSE]): CourseService {
  return {
    search: () => Promise.reject(new Error('search is not used by the Enquiry Service')),
    getById: (id) => Promise.resolve(courses.find((course) => course.id === id) ?? null),
  };
}

const fixedClock: EnquiryClock = { now: () => new Date('2026-05-01T09:00:00.000Z') };

function makeService(
  overrides: {
    repository?: EnquiryRepository;
    courseService?: CourseService;
    clock?: EnquiryClock;
    idGenerator?: EnquiryIdGenerator;
  } = {},
): { service: DefaultEnquiryService; repository: EnquiryRepository } {
  const repository = overrides.repository ?? new InMemoryEnquiryRepository();
  const service = new DefaultEnquiryService({
    repository,
    courseService: overrides.courseService ?? fakeCourseService(),
    clock: overrides.clock ?? fixedClock,
    ...(overrides.idGenerator ? { idGenerator: overrides.idGenerator } : {}),
  });
  return { service, repository };
}

function makeInput(overrides: Partial<EnquiryInput> = {}): EnquiryInput {
  return {
    name: 'Alex Tan',
    email: 'alex.tan@example.com',
    courseId: 'ai-foundations',
    enquiryType: 'general',
    message: 'How much prior experience do I need for this course?',
    ...overrides,
  };
}

describe('DefaultEnquiryService.submit', () => {
  it('returns a deterministic reference for the first submission (FR-514, NFR-506)', async () => {
    const { service } = makeService();

    const result = await service.submit(makeInput());

    expect(result.reference).toBe('ENQ-2026-000001');
  });

  it('issues a unique reference per submission', async () => {
    const { service } = makeService();

    const first = await service.submit(makeInput());
    const second = await service.submit(makeInput());

    expect(second.reference).toBe('ENQ-2026-000002');
    expect(second.reference).not.toBe(first.reference);
  });

  it('derives the reference year from the injected clock', async () => {
    const { service } = makeService({
      clock: { now: () => new Date('2031-01-02T03:04:05.000Z') },
    });

    const result = await service.submit(makeInput());

    expect(result.reference).toBe('ENQ-2031-000001');
  });

  it('captures the course title and status in the result (FR-512)', async () => {
    const { service } = makeService();

    const result = await service.submit(makeInput());

    expect(result).toEqual({
      reference: 'ENQ-2026-000001',
      courseId: 'ai-foundations',
      courseTitle: 'AI Foundations for Professionals',
      status: 'received',
      createdAt: '2026-05-01T09:00:00.000Z',
    });
  });

  it('persists the enquiry so it can be retrieved by reference (FR-513)', async () => {
    const { service, repository } = makeService();

    const result = await service.submit(makeInput());

    const stored = await repository.findByReference(result.reference);
    expect(stored).toMatchObject({
      name: 'Alex Tan',
      email: 'alex.tan@example.com',
      courseId: 'ai-foundations',
      courseTitle: 'AI Foundations for Professionals',
      enquiryType: 'general',
      status: 'received',
      createdAt: '2026-05-01T09:00:00.000Z',
    });
  });

  it('stores an optional phone number when one is supplied', async () => {
    const { service, repository } = makeService();

    const result = await service.submit(makeInput({ phone: '+65 9123 4567' }));

    const stored = await repository.findByReference(result.reference);
    expect(stored?.phone).toBe('+65 9123 4567');
  });

  it('rejects an enquiry for an unknown course with a typed error (FR-510)', async () => {
    const { service } = makeService();

    await expect(service.submit(makeInput({ courseId: 'does-not-exist' }))).rejects.toThrow(
      CourseUnavailableError,
    );
  });

  it('rejects an enquiry for a course the Course Service will not list', async () => {
    // The Course Service already applies the listability rule in `getById`, so a
    // draft/archived course simply reads back as null — no rule is duplicated here.
    const { service } = makeService({ courseService: fakeCourseService([]) });

    await expect(service.submit(makeInput())).rejects.toBeInstanceOf(CourseUnavailableError);
  });

  it('stores nothing when the course is unavailable', async () => {
    const { service, repository } = makeService({ courseService: fakeCourseService([]) });

    await expect(service.submit(makeInput())).rejects.toThrow();

    await expect(repository.findByReference('ENQ-2026-000001')).resolves.toBeNull();
  });

  it('uses an injected id generator so tests fully control identity (NFR-506)', async () => {
    const idGenerator: EnquiryIdGenerator = {
      next: () => ({ id: 'fixed-id', reference: 'ENQ-TEST-0001' }),
    };
    const { service, repository } = makeService({ idGenerator });

    const result = await service.submit(makeInput());

    expect(result.reference).toBe('ENQ-TEST-0001');
    const stored = await repository.findByReference('ENQ-TEST-0001');
    expect(stored?.id).toBe('fixed-id');
  });

  it('names the unavailable course id without leaking anything else', async () => {
    const { service } = makeService();

    await expect(service.submit(makeInput({ courseId: 'ghost-course' }))).rejects.toMatchObject(
      { courseId: 'ghost-course' },
    );
  });
});

describe('SequentialEnquiryIdGenerator', () => {
  it('pairs each record id with the reference issued in the same step', () => {
    const generator = new SequentialEnquiryIdGenerator();

    expect(generator.next(2026)).toEqual({ id: 'enq-1', reference: 'ENQ-2026-000001' });
    expect(generator.next(2026)).toEqual({ id: 'enq-2', reference: 'ENQ-2026-000002' });
  });

  it('zero-pads the sequence to a fixed width', () => {
    const generator = new SequentialEnquiryIdGenerator();

    expect(generator.next(2026).reference).toMatch(/^ENQ-2026-\d{6}$/);
  });
});
