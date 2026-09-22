import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { coursesApi } from '@/lib/courses/api';
import { enquiriesApi } from '@/lib/enquiries/api';
import { CATALOGUE_HREF } from '@/components/courses/details/routes';
import { makeCourse } from '@/components/comparison/test-courses';
import type { EnquiryConfirmationResult } from '@/lib/enquiries/types';
import { CourseEnquiry } from './CourseEnquiry';

/**
 * Enquiry → Confirmation → return-path seam (TASK-613, FR-609, FR-610, AC-608).
 *
 * Confirmation-only: Specification 05 owns the enquiry form, the API client, and
 * the confirmation view. This test does not re-implement any of them. It locks
 * the integration seam — that a successful submission ends in the confirmation
 * state showing the server-issued reference, and that the confirmation offers a
 * clear path back to a relevant location (the course details route and the
 * catalogue). If either half of the seam breaks, this test fails.
 *
 * Both the course client and the enquiry client are faked at the transport seam
 * (NFR-609), so the flow is deterministic and touches no network, timers, or
 * shared state.
 */

// next/navigation is stubbed defensively so nothing in the render tree can reach
// the real App Router in a test; the confirmation renders next/link elements,
// which do not need a live router.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
  usePathname: () => '/lifelong-learning/courses/data-analytics/enquire',
}));

const COURSE = makeCourse({ id: 'data-analytics', title: 'Data Analytics' });

const CONFIRMATION: EnquiryConfirmationResult = {
  reference: 'ENQ-2026-000042',
  courseId: COURSE.id,
  courseTitle: COURSE.title,
  status: 'received',
  createdAt: '2026-05-01T09:30:00.000Z',
};

// The details route the "Back to course details" link must target (C4 shape).
const EXPECTED_COURSE_HREF = `/lifelong-learning/courses/${COURSE.id}`;

beforeEach(() => {
  // Course loads without a network round-trip.
  vi.spyOn(coursesApi, 'getById').mockResolvedValue(COURSE);
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function submitValidEnquiry(): Promise<void> {
  const user = userEvent.setup();
  render(<CourseEnquiry courseId={COURSE.id} />);

  await screen.findByRole('form', { name: /enquire about this course/i });

  await user.type(screen.getByLabelText(/your name/i), 'Alex Tan');
  await user.type(screen.getByLabelText(/email/i), 'alex.tan@example.com');
  await user.selectOptions(
    screen.getByLabelText(/what is your enquiry about/i),
    'fees_funding',
  );
  await user.type(
    screen.getByLabelText('Your enquiry'),
    'Is subsidised funding available for this course?',
  );
  await user.click(screen.getByRole('button', { name: /send enquiry/i }));
}

describe('Enquiry → Confirmation → return path (FR-609, FR-610)', () => {
  it('ends a successful submission in the confirmation state with the server reference', async () => {
    const submit = vi.spyOn(enquiriesApi, 'submit').mockResolvedValue(CONFIRMATION);

    await submitValidEnquiry();

    const confirmation = await screen.findByRole('region', { name: /enquiry received/i });
    expect(confirmation).toHaveTextContent(CONFIRMATION.reference);
    expect(confirmation).toHaveTextContent(COURSE.title);

    // The seam delegated to the enquiry client (no business logic re-implemented).
    expect(submit).toHaveBeenCalledOnce();

    // The submit control is gone once confirmed, so the enquiry is not resubmittable.
    expect(
      screen.queryByRole('button', { name: /send enquiry/i }),
    ).not.toBeInTheDocument();
  });

  it('offers a clear return path back to the course details and the catalogue', async () => {
    vi.spyOn(enquiriesApi, 'submit').mockResolvedValue(CONFIRMATION);

    await submitValidEnquiry();

    const confirmation = await screen.findByRole('region', { name: /enquiry received/i });

    const backToCourse = within(confirmation).getByRole('link', {
      name: /back to course details/i,
    });
    expect(backToCourse).toHaveAttribute('href', EXPECTED_COURSE_HREF);

    const browseMore = within(confirmation).getByRole('link', {
      name: /browse more courses/i,
    });
    expect(browseMore).toHaveAttribute('href', CATALOGUE_HREF);
  });
});
