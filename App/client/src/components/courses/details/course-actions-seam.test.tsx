import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Course } from '@/lib/courses/types';

/**
 * Details → Catalogue / Details → Comparison seam (TASK-610, FR-603, FR-604,
 * FR-624, FR-623).
 *
 * Confirmation-only. Specification 03 owns the details action bar; Specification
 * 04 owns comparison state and its capacity/duplicate rules. This test does not
 * re-implement either — it locks the two integration seams:
 *
 *  - "Back to Course Catalogue" returns to the bare catalogue route
 *    (`CATALOGUE_HREF`). Prior catalogue query state is restored by the browser
 *    Back control against the catalogue's URL-encoded state, not by this link —
 *    the in-page link is a deliberate reset (documented in TASK-602). Asserting
 *    the href therefore proves the reset contract without contradicting FR-624.
 *  - The optional add-to-compare affordance delegates every decision to the
 *    supplied `CourseComparisonSeam`. Driving it against a fake seam proves the
 *    delegation wiring (FR-604) without duplicating Spec 04 rules; a small
 *    render test then proves the real route host wires a working shared provider
 *    so an add on Details is reflected in shared state (FR-623, FR-604).
 */

// --- API fake (shared with CourseDetails, faked at the transport seam) -------
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

import { CourseActions } from './CourseActions';
import { CATALOGUE_HREF, enquiryHref } from './routes';
import type { CourseComparisonSeam } from './comparison-seam';
import { CourseDetailsPageClient } from '@/app/lifelong-learning/courses/[courseId]/CourseDetailsPageClient';
import { ComparisonProvider, useComparison } from '@/components/comparison/comparison-context';

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
    entryRequirements: [],
    skills: [],
    status: 'published',
    availability: 'open',
    tags: [],
    ...overrides,
  };
}

function makeSeam(overrides: Partial<CourseComparisonSeam> = {}): CourseComparisonSeam {
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

describe('Details → Catalogue seam (FR-603, FR-624)', () => {
  it('links "Back to Course Catalogue" to the catalogue route (AC-603)', () => {
    render(<CourseActions course={makeCourse()} />);

    const back = screen.getByRole('link', { name: /back to course catalogue/i });
    // Deliberate reset to the bare catalogue; query-state restoration is via the
    // browser Back control against the catalogue URL (TASK-602). No change here.
    expect(back).toHaveAttribute('href', CATALOGUE_HREF);
  });
});

describe('Details → Enquiry seam (TASK-611, FR-605, FR-613)', () => {
  /**
   * Confirmation-only. Specification 05 owns the enquiry entry route; Spec 03's
   * `enquiryHref` encodes the agreed contract (CQ-1: nested
   * `/lifelong-learning/courses/:courseId/enquire`). This locks that the Details
   * "Enquire" action navigates to that route carrying the *same* course id, so
   * the enquiry form is associated with that course (AC-605).
   */
  it('links "Enquire" to the confirmed enquiry route for the course id (AC-605)', () => {
    const course = makeCourse();
    render(<CourseActions course={course} />);

    const enquire = screen.getByRole('link', { name: /enquire/i });
    // The link target is exactly the confirmed enquiry entry route for this id,
    // so the enquiry page (which reads the `courseId` segment) is associated
    // with the same course reached from Details (FR-605, FR-613).
    expect(enquire).toHaveAttribute('href', enquiryHref(course.id));
    expect(enquire).toHaveAttribute(
      'href',
      `${CATALOGUE_HREF}/${course.id}/enquire`,
    );
  });

  it('carries the course identity URL-encoded for ids with special characters (FR-613)', () => {
    // A slug-like id that contains characters needing encoding proves the id is
    // safely carried in the path segment and not corrupted en route to enquiry.
    const course = makeCourse({ id: 'data & ai/foundations' });
    render(<CourseActions course={course} />);

    const enquire = screen.getByRole('link', { name: /enquire/i });
    expect(enquire).toHaveAttribute('href', enquiryHref(course.id));
    expect(enquire).toHaveAttribute(
      'href',
      `${CATALOGUE_HREF}/${encodeURIComponent('data & ai/foundations')}/enquire`,
    );
    // Sanity: decoding the final path segment recovers the original id exactly.
    const encodedSegment = enquiryHref(course.id)
      .replace(`${CATALOGUE_HREF}/`, '')
      .replace('/enquire', '');
    expect(decodeURIComponent(encodedSegment)).toBe(course.id);
  });
});

describe('Details → Comparison seam delegates to the shared interface (FR-604)', () => {
  it('adds the course through the seam when it is not yet selected (AC-604)', async () => {
    const user = userEvent.setup();
    const course = makeCourse();
    const seam = makeSeam();

    render(<CourseActions course={course} comparison={seam} />);

    await user.click(screen.getByRole('button', { name: /add to comparison/i }));

    expect(seam.add).toHaveBeenCalledWith(course);
    expect(seam.remove).not.toHaveBeenCalled();
  });

  it('renders a Remove action and delegates removal when has(id) is true', async () => {
    const user = userEvent.setup();
    const course = makeCourse();
    const seam = makeSeam({ has: () => true });

    render(<CourseActions course={course} comparison={seam} />);

    const remove = screen.getByRole('button', { name: /remove from comparison/i });
    await user.click(remove);

    expect(seam.remove).toHaveBeenCalledWith(course.id);
    expect(seam.add).not.toHaveBeenCalled();
  });

  it('omits the affordance entirely when no seam is supplied', () => {
    render(<CourseActions course={makeCourse()} />);

    expect(
      screen.queryByRole('button', { name: /comparison/i }),
    ).not.toBeInTheDocument();
    // The rest of the action bar still works without comparison.
    expect(screen.getByRole('link', { name: /enquire/i })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /back to course catalogue/i }),
    ).toBeInTheDocument();
  });
});

describe('Details route host wires a working shared provider (FR-623, FR-604)', () => {
  /**
   * Reads the shared interface under the same provider the page uses and reports
   * whether the course is selected. State only — no side effects — so it never
   * influences the seam it observes.
   */
  function ComparisonProbe({ courseId }: { courseId: string }): React.JSX.Element {
    const { has } = useComparison();
    return <span data-testid="probe-has">{has(courseId) ? 'yes' : 'no'}</span>;
  }

  it('reflects an add-from-Details in the shared comparison state (AC-604)', async () => {
    const user = userEvent.setup();
    const course = makeCourse();
    getByIdMock.mockResolvedValue(course);

    render(
      <ComparisonProvider>
        <CourseDetailsPageClient courseId={course.id} />
        <ComparisonProbe courseId={course.id} />
      </ComparisonProvider>,
    );

    // Nothing selected before the user acts.
    expect(screen.getByTestId('probe-has')).toHaveTextContent('no');

    await user.click(await screen.findByRole('button', { name: /add to comparison/i }));

    // The same provider now considers the course selected, so it is reflected
    // everywhere that reads the shared state (catalogue, bar, comparison view).
    expect(screen.getByTestId('probe-has')).toHaveTextContent('yes');
    // The Details affordance itself reflects the shared state (now removable).
    expect(
      screen.getByRole('button', { name: /remove from comparison/i }),
    ).toBeInTheDocument();
  });
});
