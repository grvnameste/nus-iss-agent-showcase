import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Course } from '@/lib/courses/types';
import type { EnquiryConfirmationResult, EnquiryInput } from '@/lib/enquiries/types';

/**
 * Enquiry → global notification adoption test (Spec 06, FR-621, TASK-615).
 *
 * Drives a real submission through Spec 05's form inside the real
 * `NotificationProvider`, with both API clients faked at the transport seam
 * (testing steering — no network, no globally-mocked `fetch`). It proves the
 * cross-feature "enquiry submitted" case surfaces a global, accessible,
 * colour-independent notification while the local confirmation state remains.
 */

const { getByIdMock, submitMock, CourseApiError, EnquiryApiError } = vi.hoisted(() => {
  class CourseApiError extends Error {
    status?: number;
    constructor(message: string, status?: number) {
      super(message);
      this.name = 'CourseApiError';
      this.status = status;
    }
  }
  class EnquiryApiError extends Error {
    status?: number;
    code?: string;
    fieldErrors?: Record<string, string>;
    constructor(
      message: string,
      status?: number,
      code?: string,
      fieldErrors?: Record<string, string>,
    ) {
      super(message);
      this.name = 'EnquiryApiError';
      this.status = status;
      this.code = code;
      this.fieldErrors = fieldErrors;
    }
  }
  return {
    getByIdMock: vi.fn<(courseId: string, signal?: AbortSignal) => Promise<Course>>(),
    submitMock:
      vi.fn<(input: EnquiryInput, signal?: AbortSignal) => Promise<EnquiryConfirmationResult>>(),
    CourseApiError,
    EnquiryApiError,
  };
});

vi.mock('@/lib/courses/api', () => ({
  CourseApiError,
  coursesApi: {
    list: vi.fn(),
    getById: (courseId: string, signal?: AbortSignal) => getByIdMock(courseId, signal),
  },
}));

vi.mock('@/lib/enquiries/api', () => ({
  EnquiryApiError,
  enquiriesApi: {
    submit: (input: EnquiryInput, signal?: AbortSignal) => submitMock(input, signal),
  },
}));

import { EnquiryWithNotification } from './EnquiryWithNotification';
import { NotificationProvider } from '@/components/notifications/notification-context';

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

const CONFIRMATION: EnquiryConfirmationResult = {
  reference: 'ENQ-2026-000042',
  courseId: COURSE.id,
  courseTitle: COURSE.title,
  status: 'received',
  createdAt: '2026-05-01T09:00:00.000Z',
};

const MESSAGE = 'How much prior experience do I need for this course?';

beforeEach(() => {
  getByIdMock.mockReset();
  submitMock.mockReset();
  getByIdMock.mockResolvedValue(COURSE);
  submitMock.mockResolvedValue(CONFIRMATION);
});

async function fillValidEnquiry(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.type(screen.getByLabelText(/your name/i), 'Alex Tan');
  await user.type(screen.getByLabelText(/email/i), 'alex.tan@example.com');
  await user.selectOptions(screen.getByLabelText(/what is your enquiry about/i), 'course_content');
  await user.type(screen.getByLabelText('Your enquiry'), MESSAGE);
}

describe('enquiry submission notification (FR-621)', () => {
  it('surfaces a global notification with the reference on a successful enquiry', async () => {
    const user = userEvent.setup();
    render(
      <NotificationProvider>
        <EnquiryWithNotification courseId={COURSE.id} />
      </NotificationProvider>,
    );
    await screen.findByRole('form', { name: /enquire about this course/i });
    await fillValidEnquiry(user);

    await user.click(screen.getByRole('button', { name: /send enquiry/i }));

    const polite = screen.getByTestId('notification-region-polite');
    await waitFor(() => {
      expect(within(polite).getByText(new RegExp(CONFIRMATION.reference))).toBeInTheDocument();
    });
    // Colour-independent: severity conveyed by a textual tone label.
    expect(within(polite).getByText('Success:')).toBeInTheDocument();
    expect(within(polite).getByText(/enquiry submitted — reference/i)).toBeInTheDocument();
  });

  it('keeps the local confirmation state — the notification is additive', async () => {
    const user = userEvent.setup();
    render(
      <NotificationProvider>
        <EnquiryWithNotification courseId={COURSE.id} />
      </NotificationProvider>,
    );
    await screen.findByRole('form', { name: /enquire about this course/i });
    await fillValidEnquiry(user);

    await user.click(screen.getByRole('button', { name: /send enquiry/i }));

    // The Spec 05 confirmation region still renders alongside the notification.
    const confirmation = await screen.findByRole('region', { name: /enquiry received/i });
    expect(within(confirmation).getByText(CONFIRMATION.reference)).toBeInTheDocument();
  });

  it('does not notify on a failed submission', async () => {
    const user = userEvent.setup();
    submitMock.mockRejectedValue(new EnquiryApiError('Unable to reach the enquiry service.'));
    render(
      <NotificationProvider>
        <EnquiryWithNotification courseId={COURSE.id} />
      </NotificationProvider>,
    );
    await screen.findByRole('form', { name: /enquire about this course/i });
    await fillValidEnquiry(user);

    await user.click(screen.getByRole('button', { name: /send enquiry/i }));

    // The submission was attempted and rejected; the success notification must
    // never fire — only a confirmed enquiry notifies.
    await waitFor(() => expect(submitMock).toHaveBeenCalledTimes(1));
    const polite = screen.getByTestId('notification-region-polite');
    expect(within(polite).queryByText(/enquiry submitted/i)).not.toBeInTheDocument();
  });
});
