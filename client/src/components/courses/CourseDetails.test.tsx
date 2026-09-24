import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Course } from '@/lib/courses/types';

/**
 * Course Details behaviour tests (Spec 03, TASK-314).
 *
 * The API client is faked at the transport seam so the page is testable without
 * a network (testing steering). Assertions map to AC-301–AC-310.
 */

// --- API fake --------------------------------------------------------------
const { getByIdMock, CourseApiError } = vi.hoisted(() => {
  class CourseApiError extends Error {
    status?: number;
    constructor(message: string, status?: number) {
      super(message);
      this.name = 'CourseApiError';
      this.status = status;
    }
  }
  return {
    getByIdMock: vi.fn<(courseId: string, signal?: AbortSignal) => Promise<Course>>(),
    CourseApiError,
  };
});

vi.mock('@/lib/courses/api', () => ({
  CourseApiError,
  coursesApi: {
    list: vi.fn(),
    getById: (courseId: string, signal?: AbortSignal) => getByIdMock(courseId, signal),
  },
}));

import { CourseDetails } from './CourseDetails';
import type { CourseComparisonSeam } from './details/comparison-seam';

function makeCourse(overrides: Partial<Course> = {}): Course {
  return {
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
    eligibility: 'Open to working adults with basic numeracy.',
    entryRequirements: ['Diploma or equivalent', 'Basic spreadsheet literacy'],
    skills: ['Prompt design', 'Model evaluation'],
    status: 'published',
    availability: 'closing_soon',
    tags: ['ai', 'upskilling'],
    ...overrides,
  };
}

function makeComparison(
  overrides: Partial<CourseComparisonSeam> = {},
): CourseComparisonSeam {
  return {
    add: vi.fn(),
    remove: vi.fn(),
    has: () => false,
    isFull: false,
    max: 4,
    ...overrides,
  };
}

beforeEach(() => {
  getByIdMock.mockReset();
});

describe('CourseDetails', () => {
  it('renders the full course information for a found course (AC-301)', async () => {
    const course = makeCourse();
    getByIdMock.mockResolvedValue(course);

    render(<CourseDetails courseId={course.id} />);

    // Identity (FR-304): single H1 = title, plus code, discipline, category.
    const heading = await screen.findByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent(course.title);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByText(/AI-101/)).toBeInTheDocument();
    expect(screen.getByText(course.discipline)).toBeInTheDocument();
    expect(screen.getByText(course.category)).toBeInTheDocument();

    // Descriptions (FR-305).
    expect(screen.getByText(course.shortDescription)).toBeInTheDocument();
    expect(screen.getByText(course.description)).toBeInTheDocument();

    // Structured attributes (FR-306), via Spec 02 label maps and formatters.
    expect(screen.getByText('Short course')).toBeInTheDocument();
    expect(screen.getByText('Beginner')).toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument();
    expect(screen.getByText('Blended')).toBeInTheDocument();
    expect(screen.getByText('8 weeks')).toBeInTheDocument();
    expect(screen.getByText('April 2026')).toBeInTheDocument();
    expect(screen.getByText('SGD 2,400')).toBeInTheDocument();
    expect(screen.getByText(course.eligibility)).toBeInTheDocument();
    expect(screen.getByText(/6 April 2026/)).toBeInTheDocument();
    expect(screen.getByText(/9 March 2026/)).toBeInTheDocument();

    // List attributes (FR-307).
    for (const requirement of course.entryRequirements) {
      expect(screen.getByText(requirement)).toBeInTheDocument();
    }
    for (const skill of course.skills) {
      expect(screen.getByText(skill)).toBeInTheDocument();
    }
    for (const tag of course.tags) {
      expect(screen.getByText(tag)).toBeInTheDocument();
    }
  });

  it('requests the course by the id it is given (AC-302)', async () => {
    getByIdMock.mockResolvedValue(makeCourse({ id: 'cyber-essentials' }));

    render(<CourseDetails courseId="cyber-essentials" />);

    await screen.findByRole('heading', { level: 1 });
    expect(getByIdMock).toHaveBeenCalledWith('cyber-essentials', expect.anything());
  });

  it('conveys availability as text, not colour alone (AC-303)', async () => {
    getByIdMock.mockResolvedValue(makeCourse({ availability: 'closing_soon' }));

    render(<CourseDetails courseId="ai-foundations" />);

    expect(await screen.findByText('Closing soon')).toBeInTheDocument();
  });

  it('links Enquire to the enquiry entry point for the course (AC-304)', async () => {
    getByIdMock.mockResolvedValue(makeCourse());

    render(<CourseDetails courseId="ai-foundations" />);

    const enquire = await screen.findByRole('link', { name: /enquire/i });
    expect(enquire).toHaveAttribute(
      'href',
      '/lifelong-learning/courses/ai-foundations/enquire',
    );
  });

  it('links back to the catalogue (AC-305)', async () => {
    getByIdMock.mockResolvedValue(makeCourse());

    render(<CourseDetails courseId="ai-foundations" />);

    const back = await screen.findAllByRole('link', { name: /catalogue/i });
    expect(back.length).toBeGreaterThan(0);
    for (const link of back) {
      expect(link).toHaveAttribute('href', '/lifelong-learning/courses');
    }
  });

  it('shows a not-found state with a path back to the catalogue on 404 (AC-306)', async () => {
    getByIdMock.mockRejectedValue(new CourseApiError('Course not found.', 404));

    render(<CourseDetails courseId="missing" />);

    expect(await screen.findByText(/not found/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /catalogue/i })).toHaveAttribute(
      'href',
      '/lifelong-learning/courses',
    );
    // A not-found is not an error state.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('announces a loading state while the request is in flight (AC-307)', async () => {
    let resolve: ((course: Course) => void) | undefined;
    getByIdMock.mockReturnValue(
      new Promise<Course>((r) => {
        resolve = r;
      }),
    );

    render(<CourseDetails courseId="ai-foundations" />);

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(/loading/i);

    resolve?.(makeCourse());
    await screen.findByRole('heading', { level: 1 });
  });

  it('shows a sanitised error with a retry that re-requests the course (AC-308)', async () => {
    const user = userEvent.setup();
    getByIdMock.mockRejectedValueOnce(
      new CourseApiError('Unable to reach the course service.'),
    );

    render(<CourseDetails courseId="ai-foundations" />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/unable to reach the course service/i);
    expect(alert).not.toHaveTextContent(/stack|at Object|Error:/i);

    getByIdMock.mockResolvedValueOnce(makeCourse());
    await user.click(screen.getByRole('button', { name: /try again/i }));

    await screen.findByRole('heading', { level: 1 });
    expect(getByIdMock).toHaveBeenCalledTimes(2);
  });

  it('adds to comparison through the shared interface when it is available (AC-309)', async () => {
    const user = userEvent.setup();
    const course = makeCourse();
    getByIdMock.mockResolvedValue(course);
    const add = vi.fn();
    const comparison = makeComparison({ add });

    render(<CourseDetails courseId={course.id} comparison={comparison} />);

    const button = await screen.findByRole('button', { name: /add to comparison/i });
    await user.click(button);

    expect(add).toHaveBeenCalledWith(course);
  });

  it('removes from comparison through the shared interface when already selected', async () => {
    const user = userEvent.setup();
    const course = makeCourse();
    getByIdMock.mockResolvedValue(course);
    const add = vi.fn();
    const remove = vi.fn();
    const comparison = makeComparison({
      add,
      remove,
      has: () => true,
    });

    render(<CourseDetails courseId={course.id} comparison={comparison} />);

    const button = await screen.findByRole('button', { name: /remove from comparison/i });
    await user.click(button);

    expect(remove).toHaveBeenCalledWith(course.id);
    expect(add).not.toHaveBeenCalled();
  });

  it('omits the comparison affordance when the interface is unavailable (AC-309)', async () => {
    getByIdMock.mockResolvedValue(makeCourse());

    render(<CourseDetails courseId="ai-foundations" />);

    await screen.findByRole('heading', { level: 1 });
    expect(
      screen.queryByRole('button', { name: /add to comparison/i }),
    ).not.toBeInTheDocument();
    // The page still works: the primary action is present.
    expect(screen.getByRole('link', { name: /enquire/i })).toBeInTheDocument();
  });

  it('reflects an already-added course and a full comparison (AC-309)', async () => {
    const course = makeCourse();
    getByIdMock.mockResolvedValue(course);

    const { unmount } = render(
      <CourseDetails
        courseId={course.id}
        comparison={makeComparison({ has: () => true })}
      />,
    );
    expect(
      await screen.findByRole('button', { name: /remove from comparison/i }),
    ).toBeEnabled();
    unmount();

    render(
      <CourseDetails
        courseId={course.id}
        comparison={makeComparison({ isFull: true })}
      />,
    );
    const full = await screen.findByRole('button', {
      name: /add to comparison/i,
    });
    expect(full).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText(/compare up to 4 courses/i)).toBeInTheDocument();
  });

  it('meets the accessibility baseline (AC-310)', async () => {
    getByIdMock.mockResolvedValue(makeCourse());

    const { container } = render(<CourseDetails courseId="ai-foundations" />);

    await screen.findByRole('heading', { level: 1 });

    // Exactly one H1, and no heading level is skipped.
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 3 }).length).toBeGreaterThan(0);

    // Semantic containers for the course and its key facts.
    expect(container.querySelector('article')).not.toBeNull();
    expect(container.querySelector('dl')).not.toBeNull();

    // A live region is present for state announcements.
    expect(container.querySelector('[aria-live]')).not.toBeNull();

    // Every action is a focusable link or button with an accessible name.
    for (const link of screen.getAllByRole('link')) {
      expect(link).toHaveAccessibleName();
    }
  });

  it('cancels the in-flight request when unmounted', async () => {
    getByIdMock.mockResolvedValue(makeCourse());

    const { unmount } = render(<CourseDetails courseId="ai-foundations" />);
    await screen.findByRole('heading', { level: 1 });

    const signal = getByIdMock.mock.calls[0]?.[1];
    expect(signal?.aborted).toBe(false);
    unmount();
    await waitFor(() => expect(signal?.aborted).toBe(true));
  });
});
