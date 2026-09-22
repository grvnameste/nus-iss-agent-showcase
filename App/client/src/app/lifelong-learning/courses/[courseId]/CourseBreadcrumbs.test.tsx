import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { Course } from '@/lib/courses/types';

/**
 * CourseBreadcrumbs host tests (FR-617).
 *
 * The Spec 02 API client is faked at the transport seam so the host is testable
 * without a network (testing steering). The host derives only the course title
 * for the breadcrumb trail; the feature body owns the full request state.
 */
const { getByIdMock } = vi.hoisted(() => ({
  getByIdMock: vi.fn<(courseId: string, signal?: AbortSignal) => Promise<Course>>(),
}));

vi.mock('@/lib/courses/api', () => ({
  CourseApiError: class CourseApiError extends Error {},
  coursesApi: {
    list: vi.fn(),
    getById: (courseId: string, signal?: AbortSignal) => getByIdMock(courseId, signal),
  },
}));

import { CourseBreadcrumbs } from './CourseBreadcrumbs';

function makeCourse(overrides: Partial<Course> = {}): Course {
  return {
    id: 'data-analytics-essentials',
    code: 'DA-101',
    title: 'Data Analytics Essentials',
    shortDescription: 'Learn the essentials of data analytics.',
    description: 'A full description.',
    discipline: 'Data Analytics',
    category: 'Professional Development',
    courseType: 'short_course',
    level: 'beginner',
    durationWeeks: 8,
    deliveryMode: 'online',
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
    ...overrides,
  };
}

describe('CourseBreadcrumbs host (FR-617)', () => {
  beforeEach(() => {
    getByIdMock.mockReset();
  });

  it('renders a complete details trail immediately for a deep link (placeholder title)', () => {
    // Never resolves: simulate the in-flight load on a fresh deep link.
    getByIdMock.mockReturnValue(new Promise<Course>(() => {}));

    render(<CourseBreadcrumbs courseId="data-analytics-essentials" variant="details" />);

    const nav = screen.getByRole('navigation', { name: /breadcrumb/i });
    expect(nav.querySelectorAll('ol > li')).toHaveLength(3);
    expect(screen.getByRole('link', { name: 'Course Catalogue' })).toBeInTheDocument();
  });

  it('shows the loaded course title as the current crumb on the details route', async () => {
    getByIdMock.mockResolvedValue(makeCourse());

    render(<CourseBreadcrumbs courseId="data-analytics-essentials" variant="details" />);

    await waitFor(() =>
      expect(screen.getByText('Data Analytics Essentials')).toHaveAttribute(
        'aria-current',
        'page',
      ),
    );
  });

  it('shows title as a link and Enquire as current on the enquiry route', async () => {
    getByIdMock.mockResolvedValue(makeCourse());

    render(<CourseBreadcrumbs courseId="data-analytics-essentials" variant="enquiry" />);

    await waitFor(() =>
      expect(
        screen.getByRole('link', { name: 'Data Analytics Essentials' }),
      ).toHaveAttribute('href', '/lifelong-learning/courses/data-analytics-essentials'),
    );
    expect(screen.getByText('Enquire')).toHaveAttribute('aria-current', 'page');
  });

  it('keeps a neutral trail when the course fails to load', async () => {
    getByIdMock.mockRejectedValue(new Error('boom'));

    render(<CourseBreadcrumbs courseId="missing" variant="details" />);

    // The breadcrumb never throws; it keeps its neutral placeholder crumb.
    await waitFor(() => expect(getByIdMock).toHaveBeenCalled());
    expect(screen.getByText('Course')).toHaveAttribute('aria-current', 'page');
  });
});
