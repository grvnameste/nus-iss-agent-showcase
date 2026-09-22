import type { Course } from '@/lib/courses/types';

/**
 * Test-only course fixtures for the comparison feature.
 *
 * Shared by the comparison unit/component tests so each test states only the
 * attributes it cares about. Not imported by production code.
 */
export function makeCourse(overrides: Partial<Course> & { id: string }): Course {
  return {
    code: `CODE-${overrides.id}`,
    title: `Course ${overrides.id}`,
    shortDescription: 'A concise summary.',
    description: 'Full description.',
    discipline: 'Data Analytics',
    category: 'Analytics',
    courseType: 'part_time',
    level: 'intermediate',
    durationWeeks: 12,
    deliveryMode: 'blended',
    intake: 'May 2026',
    startDate: '2026-05-01',
    applicationDeadline: '2026-04-01',
    fee: 2400,
    currency: 'SGD',
    eligibility: 'Open to working adults.',
    entryRequirements: [],
    skills: [],
    status: 'published',
    availability: 'open',
    tags: [],
    ...overrides,
  };
}
