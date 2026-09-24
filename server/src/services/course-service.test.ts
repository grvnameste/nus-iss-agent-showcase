import { describe, expect, it } from 'vitest';
import { DefaultCourseService } from './course-service.js';
import { InMemoryCourseRepository } from '../repositories/course-repository.js';
import type { Course } from '../domain/course.js';

/** Build a deterministic fixture with known, controllable field values. */
function makeCourse(overrides: Partial<Course> & { id: string }): Course {
  return {
    code: `CODE-${overrides.id}`,
    title: 'Untitled',
    shortDescription: 'Short',
    description: 'Full description',
    discipline: 'Business',
    category: 'General',
    courseType: 'short_course',
    level: 'beginner',
    durationWeeks: 10,
    deliveryMode: 'online',
    intake: 'Apr 2026',
    startDate: '2026-04-01',
    applicationDeadline: '2026-03-01',
    fee: 1000,
    currency: 'SGD',
    eligibility: 'Open',
    entryRequirements: [],
    skills: [],
    status: 'published',
    availability: 'open',
    tags: [],
    ...overrides,
  };
}

const FIXTURE: Course[] = [
  makeCourse({
    id: 'alpha',
    title: 'Alpha Data Course',
    discipline: 'Data Analytics',
    courseType: 'full_time',
    deliveryMode: 'on_campus',
    durationWeeks: 40,
    fee: 5000,
    startDate: '2026-08-01',
    skills: ['Statistics'],
    tags: ['data'],
  }),
  makeCourse({
    id: 'bravo',
    title: 'Bravo Security Course',
    discipline: 'Cybersecurity',
    courseType: 'part_time',
    deliveryMode: 'online',
    durationWeeks: 12,
    fee: 2000,
    startDate: '2026-05-01',
    skills: ['Threat analysis'],
    tags: ['security'],
    availability: 'closing_soon',
  }),
  makeCourse({
    id: 'charlie',
    title: 'Charlie Security Advanced',
    description: 'A deep security programme',
    discipline: 'Cybersecurity',
    courseType: 'part_time',
    deliveryMode: 'blended',
    durationWeeks: 16,
    fee: 3000,
    startDate: '2026-06-01',
    skills: ['Detection'],
    tags: ['security', 'advanced'],
  }),
  makeCourse({
    id: 'delta-draft',
    title: 'Delta Draft Course',
    status: 'draft',
    availability: 'closed',
  }),
  makeCourse({
    id: 'echo-archived',
    title: 'Echo Archived Course',
    status: 'archived',
    availability: 'closed',
  }),
];

function service(courses: Course[] = FIXTURE): DefaultCourseService {
  return new DefaultCourseService(new InMemoryCourseRepository(courses));
}

const FULL_PAGE = { page: 1, pageSize: 48 } as const;

describe('CourseService — listability', () => {
  it('excludes non-published courses by default', async () => {
    const result = await service().search({ ...FULL_PAGE });
    const ids = result.data.map((c) => c.id);
    expect(ids).not.toContain('delta-draft');
    expect(ids).not.toContain('echo-archived');
    expect(result.pagination.totalItems).toBe(3);
  });

  it('getById returns a published course', async () => {
    expect((await service().getById('alpha'))?.id).toBe('alpha');
  });

  it('getById returns null for a draft/archived course', async () => {
    expect(await service().getById('delta-draft')).toBeNull();
    expect(await service().getById('echo-archived')).toBeNull();
  });

  it('getById returns null for an unknown id', async () => {
    expect(await service().getById('nope')).toBeNull();
  });
});

describe('CourseService — search', () => {
  it('is case-insensitive and partial', async () => {
    const result = await service().search({ ...FULL_PAGE, keyword: 'SECUR' });
    expect(result.data.map((c) => c.id).sort()).toEqual(['bravo', 'charlie']);
  });

  it('matches across multiple fields (skills)', async () => {
    const result = await service().search({ ...FULL_PAGE, keyword: 'statistics' });
    expect(result.data.map((c) => c.id)).toEqual(['alpha']);
  });

  it('empty keyword matches all listable courses', async () => {
    const result = await service().search({ ...FULL_PAGE, keyword: '   ' });
    expect(result.pagination.totalItems).toBe(3);
  });

  it('returns an empty result (not an error) when nothing matches', async () => {
    const result = await service().search({ ...FULL_PAGE, keyword: 'zzzzz' });
    expect(result.data).toEqual([]);
    expect(result.pagination.totalItems).toBe(0);
    expect(result.pagination.totalPages).toBe(1);
  });

  it('is deterministic for identical inputs', async () => {
    const a = await service().search({ ...FULL_PAGE, keyword: 'security' });
    const b = await service().search({ ...FULL_PAGE, keyword: 'security' });
    expect(a.data.map((c) => c.id)).toEqual(b.data.map((c) => c.id));
  });
});

describe('CourseService — filters', () => {
  it('filters by a single field', async () => {
    const result = await service().search({
      ...FULL_PAGE,
      filters: { discipline: ['Cybersecurity'] },
    });
    expect(result.data.map((c) => c.id).sort()).toEqual(['bravo', 'charlie']);
  });

  it('ANDs across different fields', async () => {
    const result = await service().search({
      ...FULL_PAGE,
      filters: { discipline: ['Cybersecurity'], deliveryMode: ['online'] },
    });
    expect(result.data.map((c) => c.id)).toEqual(['bravo']);
  });

  it('ORs within a multi-valued field', async () => {
    const result = await service().search({
      ...FULL_PAGE,
      filters: { deliveryMode: ['online', 'blended'] },
    });
    expect(result.data.map((c) => c.id).sort()).toEqual(['bravo', 'charlie']);
  });

  it('combines keyword and filters with AND', async () => {
    const result = await service().search({
      ...FULL_PAGE,
      keyword: 'security',
      filters: { deliveryMode: ['online'] },
    });
    expect(result.data.map((c) => c.id)).toEqual(['bravo']);
  });
});

describe('CourseService — sorting', () => {
  it('sorts by title ascending by default (no keyword)', async () => {
    const result = await service().search({ ...FULL_PAGE });
    // Titles: "Alpha Data Course" < "Bravo Security Course" < "Charlie …".
    expect(result.data.map((c) => c.id)).toEqual(['alpha', 'bravo', 'charlie']);
    const titles = result.data.map((c) => c.title);
    expect([...titles]).toEqual([...titles].sort((a, b) => a.localeCompare(b)));
  });

  it('sorts by fee ascending', async () => {
    const result = await service().search({
      ...FULL_PAGE,
      sort: { field: 'fee', direction: 'asc' },
    });
    expect(result.data.map((c) => c.fee)).toEqual([2000, 3000, 5000]);
  });

  it('sorts by fee descending', async () => {
    const result = await service().search({
      ...FULL_PAGE,
      sort: { field: 'fee', direction: 'desc' },
    });
    expect(result.data.map((c) => c.fee)).toEqual([5000, 3000, 2000]);
  });

  it('sorts by duration ascending', async () => {
    const result = await service().search({
      ...FULL_PAGE,
      sort: { field: 'duration', direction: 'asc' },
    });
    expect(result.data.map((c) => c.durationWeeks)).toEqual([12, 16, 40]);
  });

  it('sorts by startDate ascending', async () => {
    const result = await service().search({
      ...FULL_PAGE,
      sort: { field: 'startDate', direction: 'asc' },
    });
    expect(result.data.map((c) => c.startDate)).toEqual([
      '2026-05-01',
      '2026-06-01',
      '2026-08-01',
    ]);
  });

  it('relevance ranks title matches above description matches', async () => {
    // "security" appears in bravo/charlie titles (weight 3) and in charlie's
    // description too. Both should appear; higher relevance first.
    const result = await service().search({
      ...FULL_PAGE,
      keyword: 'security',
      sort: { field: 'relevance', direction: 'desc' },
    });
    expect(result.data.map((c) => c.id)).toEqual(['charlie', 'bravo']);
  });

  it('applies a stable tiebreak (title then id) for equal keys', async () => {
    const tie = [
      makeCourse({ id: 'b-id', title: 'Same Title', fee: 100 }),
      makeCourse({ id: 'a-id', title: 'Same Title', fee: 100 }),
    ];
    const result = await service(tie).search({
      ...FULL_PAGE,
      sort: { field: 'fee', direction: 'asc' },
    });
    expect(result.data.map((c) => c.id)).toEqual(['a-id', 'b-id']);
  });
});

describe('CourseService — pagination', () => {
  // Zero-padded titles so the default title-asc order equals the numeric order.
  const many = Array.from({ length: 25 }, (_, i) => {
    const n = String(i).padStart(2, '0');
    return makeCourse({ id: `c-${n}`, title: `Course ${n}` });
  });

  it('applies the requested page size and reports totals', async () => {
    const result = await service(many).search({ page: 1, pageSize: 10 });
    expect(result.data.length).toBe(10);
    expect(result.pagination).toEqual({
      page: 1,
      pageSize: 10,
      totalItems: 25,
      totalPages: 3,
    });
  });

  it('returns the correct slice for a middle page', async () => {
    const result = await service(many).search({ page: 2, pageSize: 10 });
    expect(result.data.map((c) => c.id)[0]).toBe('c-10');
    expect(result.data.length).toBe(10);
  });

  it('returns the remainder on the final page', async () => {
    const result = await service(many).search({ page: 3, pageSize: 10 });
    expect(result.data.length).toBe(5);
  });

  it('returns an empty page (not an error) beyond the last page', async () => {
    const result = await service(many).search({ page: 99, pageSize: 10 });
    expect(result.data).toEqual([]);
    expect(result.pagination.totalItems).toBe(25);
    expect(result.pagination.totalPages).toBe(3);
  });
});
