import { describe, expect, it, vi, beforeEach } from 'vitest';
import { StrictMode } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Course } from '@/lib/courses/types';
import type { EnquiryConfirmationResult, EnquiryInput } from '@/lib/enquiries/types';

/**
 * Course enquiry behaviour tests (Spec 05, TASK-519).
 *
 * Both API clients are faked at the transport seam so the flow is testable
 * without a network (testing steering). Assertions map to AC-501–AC-512.
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

import { CourseEnquiry } from './CourseEnquiry';

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
  reference: 'ENQ-2026-000001',
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

/** Render the page and wait for the course to load. */
async function renderForm(): Promise<void> {
  render(<CourseEnquiry courseId={COURSE.id} />);
  await screen.findByRole('form', { name: /enquire about this course/i });
}

async function fillValidEnquiry(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.type(screen.getByLabelText(/your name/i), 'Alex Tan');
  await user.type(screen.getByLabelText(/email/i), 'alex.tan@example.com');
  await user.selectOptions(screen.getByLabelText(/what is your enquiry about/i), 'course_content');
  await user.type(screen.getByLabelText('Your enquiry'), MESSAGE);
}

describe('course association (AC-501)', () => {
  it('loads the course named by the route', async () => {
    await renderForm();

    expect(getByIdMock).toHaveBeenCalledWith(COURSE.id, expect.anything());
  });

  it('displays the associated course so the learner can confirm it', async () => {
    await renderForm();

    expect(screen.getByText(COURSE.title)).toBeInTheDocument();
  });

  it('does not let the learner retype the course', async () => {
    await renderForm();

    expect(screen.queryByRole('textbox', { name: /course/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /course/i })).not.toBeInTheDocument();
  });

  it('shows an unavailable-course message instead of the form when the course is unknown (AC-505)', async () => {
    getByIdMock.mockRejectedValue(new CourseApiError('Course not found.', 404));

    render(<CourseEnquiry courseId="ghost" />);

    expect(await screen.findByRole('heading', { name: /course is not available/i })).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: /enquire about this course/i })).not.toBeInTheDocument();
  });

  it('offers a way back to the catalogue when the course is unavailable', async () => {
    getByIdMock.mockRejectedValue(new CourseApiError('Course not found.', 404));

    render(<CourseEnquiry courseId="ghost" />);

    expect(await screen.findByRole('link', { name: /course catalogue/i })).toBeInTheDocument();
  });

  it('offers a retry when the course could not be loaded for another reason', async () => {
    getByIdMock.mockRejectedValueOnce(new CourseApiError('Unable to reach the course service.'));

    render(<CourseEnquiry courseId={COURSE.id} />);
    const retry = await screen.findByRole('button', { name: /try again/i });
    getByIdMock.mockResolvedValue(COURSE);
    await userEvent.setup().click(retry);

    expect(await screen.findByRole('form', { name: /enquire about this course/i })).toBeInTheDocument();
  });
});

describe('client validation (AC-502)', () => {
  it('shows field-level errors and sends no request when required fields are missing', async () => {
    const user = userEvent.setup();
    await renderForm();

    await user.click(screen.getByRole('button', { name: /send enquiry/i }));

    expect(await screen.findByText(/enter your name/i)).toBeInTheDocument();
    expect(screen.getByText(/enter your email address/i)).toBeInTheDocument();
    expect(submitMock).not.toHaveBeenCalled();
  });

  it('rejects a malformed email without contacting the API', async () => {
    const user = userEvent.setup();
    await renderForm();
    await fillValidEnquiry(user);
    await user.clear(screen.getByLabelText(/email/i));
    await user.type(screen.getByLabelText(/email/i), 'not-an-email');

    await user.click(screen.getByRole('button', { name: /send enquiry/i }));

    expect(await screen.findByText(/valid email address/i)).toBeInTheDocument();
    expect(submitMock).not.toHaveBeenCalled();
  });

  it('associates each error with its control for assistive technology (AC-512)', async () => {
    const user = userEvent.setup();
    await renderForm();

    await user.click(screen.getByRole('button', { name: /send enquiry/i }));

    const nameInput = await screen.findByLabelText(/your name/i);
    expect(nameInput).toHaveAttribute('aria-invalid', 'true');
    const describedBy = nameInput.getAttribute('aria-describedby') ?? '';
    const ids = describedBy.split(/\s+/).filter(Boolean);
    const messages = ids.map((id) => document.getElementById(id)?.textContent ?? '').join(' ');
    expect(messages).toMatch(/enter your name/i);
  });

  it('announces a form-level problem and moves focus to the first invalid control', async () => {
    const user = userEvent.setup();
    await renderForm();

    await user.click(screen.getByRole('button', { name: /send enquiry/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/check the highlighted fields/i);
    expect(screen.getByLabelText(/your name/i)).toHaveFocus();
  });

  it('clears a field error once the learner fixes it', async () => {
    const user = userEvent.setup();
    await renderForm();
    await user.click(screen.getByRole('button', { name: /send enquiry/i }));
    await screen.findByText(/enter your name/i);

    await user.type(screen.getByLabelText(/your name/i), 'Alex Tan');

    await waitFor(() => {
      expect(screen.queryByText(/enter your name/i)).not.toBeInTheDocument();
    });
  });
});

describe('successful submission (AC-503)', () => {
  it('sends the enquiry with the associated course id', async () => {
    const user = userEvent.setup();
    await renderForm();
    await fillValidEnquiry(user);

    await user.click(screen.getByRole('button', { name: /send enquiry/i }));

    await waitFor(() => expect(submitMock).toHaveBeenCalledTimes(1));
    expect(submitMock.mock.calls[0]?.[0]).toMatchObject({
      name: 'Alex Tan',
      email: 'alex.tan@example.com',
      courseId: COURSE.id,
      enquiryType: 'course_content',
      message: MESSAGE,
    });
  });

  it('omits an untouched optional phone from the request', async () => {
    const user = userEvent.setup();
    await renderForm();
    await fillValidEnquiry(user);

    await user.click(screen.getByRole('button', { name: /send enquiry/i }));

    await waitFor(() => expect(submitMock).toHaveBeenCalled());
    expect(submitMock.mock.calls[0]?.[0]).not.toHaveProperty('phone');
  });

  it('includes the phone number when one is given', async () => {
    const user = userEvent.setup();
    await renderForm();
    await fillValidEnquiry(user);
    await user.type(screen.getByLabelText(/phone/i), '+65 9123 4567');

    await user.click(screen.getByRole('button', { name: /send enquiry/i }));

    await waitFor(() => expect(submitMock).toHaveBeenCalled());
    expect(submitMock.mock.calls[0]?.[0]).toMatchObject({ phone: '+65 9123 4567' });
  });

  it('shows the confirmation with reference, course, status and next steps', async () => {
    const user = userEvent.setup();
    await renderForm();
    await fillValidEnquiry(user);

    await user.click(screen.getByRole('button', { name: /send enquiry/i }));

    const confirmation = await screen.findByRole('region', { name: /enquiry received/i });
    expect(within(confirmation).getByText(CONFIRMATION.reference)).toBeInTheDocument();
    // The title appears in the summary and again in the next-steps copy.
    expect(within(confirmation).getAllByText(COURSE.title).length).toBeGreaterThan(0);
    // The status value, distinct from the "Enquiry received" heading.
    expect(within(confirmation).getByText('Received')).toBeInTheDocument();
    expect(within(confirmation).getByRole('heading', { name: /what happens next/i })).toBeInTheDocument();
  });

  it('replaces the form so a confirmed enquiry cannot be resubmitted (AC-508)', async () => {
    const user = userEvent.setup();
    await renderForm();
    await fillValidEnquiry(user);

    await user.click(screen.getByRole('button', { name: /send enquiry/i }));

    await screen.findByRole('region', { name: /enquiry received/i });
    expect(screen.queryByRole('button', { name: /send enquiry/i })).not.toBeInTheDocument();
  });

  it('announces the outcome in a live region (AC-512)', async () => {
    const user = userEvent.setup();
    await renderForm();
    await fillValidEnquiry(user);

    await user.click(screen.getByRole('button', { name: /send enquiry/i }));

    const status = await screen.findByRole('status');
    await waitFor(() => expect(status.textContent ?? '').toMatch(/ENQ-2026-000001/));
  });
});

describe('duplicate-submit protection (AC-508)', () => {
  it('disables the submit control while a submission is in flight', async () => {
    const user = userEvent.setup();
    let release: (value: EnquiryConfirmationResult) => void = () => {};
    submitMock.mockImplementation(
      () => new Promise<EnquiryConfirmationResult>((resolve) => (release = resolve)),
    );
    await renderForm();
    await fillValidEnquiry(user);

    await user.click(screen.getByRole('button', { name: /sending|send enquiry/i }));

    const button = screen.getByRole('button', { name: /sending|send enquiry/i });
    await waitFor(() => expect(button).toBeDisabled());
    release(CONFIRMATION);
  });

  it('sends one request under StrictMode, whose double-invoked renders must not double-submit', async () => {
    const user = userEvent.setup();
    render(
      <StrictMode>
        <CourseEnquiry courseId={COURSE.id} />
      </StrictMode>,
    );
    await screen.findByRole('form', { name: /enquire about this course/i });
    await fillValidEnquiry(user);

    await user.click(screen.getByRole('button', { name: /send enquiry/i }));

    await waitFor(() => expect(submitMock).toHaveBeenCalledTimes(1));
  });

  it('sends only one request when submit is clicked repeatedly', async () => {
    const user = userEvent.setup();
    let release: (value: EnquiryConfirmationResult) => void = () => {};
    submitMock.mockImplementation(
      () => new Promise<EnquiryConfirmationResult>((resolve) => (release = resolve)),
    );
    await renderForm();
    await fillValidEnquiry(user);

    const button = screen.getByRole('button', { name: /send enquiry/i });
    await user.click(button);
    await user.click(button);
    await user.click(button);

    expect(submitMock).toHaveBeenCalledTimes(1);
    release(CONFIRMATION);
  });
});

describe('submission errors (AC-509)', () => {
  it('shows a retryable message when the network fails', async () => {
    const user = userEvent.setup();
    submitMock.mockRejectedValue(
      new EnquiryApiError('Unable to reach the enquiry service. Please check your connection and try again.'),
    );
    await renderForm();
    await fillValidEnquiry(user);

    await user.click(screen.getByRole('button', { name: /send enquiry/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/unable to reach the enquiry service/i);
    expect(screen.getByRole('button', { name: /send enquiry/i })).toBeEnabled();
  });

  it('never shows raw internals in the error state (SR-503)', async () => {
    const user = userEvent.setup();
    submitMock.mockRejectedValue(new Error('TypeError: fetch failed at Object.<anonymous>'));
    await renderForm();
    await fillValidEnquiry(user);

    await user.click(screen.getByRole('button', { name: /send enquiry/i }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent ?? '').not.toMatch(/TypeError|at Object/);
    expect(alert).toHaveTextContent(/could not submit your enquiry/i);
  });

  it('maps server validation issues back onto the offending field', async () => {
    const user = userEvent.setup();
    submitMock.mockRejectedValue(
      new EnquiryApiError('Invalid request parameters', 400, 'VALIDATION_ERROR', {
        email: 'Enter a valid email address',
      }),
    );
    await renderForm();
    await fillValidEnquiry(user);

    await user.click(screen.getByRole('button', { name: /send enquiry/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toHaveAttribute('aria-invalid', 'true');
    });
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
  });

  it('clears a server field error as soon as the learner edits that field', async () => {
    const user = userEvent.setup();
    submitMock.mockRejectedValue(
      new EnquiryApiError('Invalid request parameters', 400, 'VALIDATION_ERROR', {
        email: 'Enter a valid email address',
      }),
    );
    await renderForm();
    await fillValidEnquiry(user);
    await user.click(screen.getByRole('button', { name: /send enquiry/i }));
    await screen.findByText('Enter a valid email address');

    await user.type(screen.getByLabelText(/email/i), '.sg');

    await waitFor(() => {
      expect(screen.queryByText('Enter a valid email address')).not.toBeInTheDocument();
    });
  });

  it('shows the unavailable-course message when the course disappears mid-flow (AC-505)', async () => {
    const user = userEvent.setup();
    submitMock.mockRejectedValue(
      new EnquiryApiError('The selected course is not available for enquiries.', 404, 'NOT_FOUND'),
    );
    await renderForm();
    await fillValidEnquiry(user);

    await user.click(screen.getByRole('button', { name: /send enquiry/i }));

    expect(await screen.findByRole('heading', { name: /course is not available/i })).toBeInTheDocument();
  });

  it('lets the learner retry after a failure without retyping the enquiry', async () => {
    const user = userEvent.setup();
    submitMock.mockRejectedValueOnce(new EnquiryApiError('Unable to reach the enquiry service.'));
    await renderForm();
    await fillValidEnquiry(user);
    await user.click(screen.getByRole('button', { name: /send enquiry/i }));
    await screen.findByRole('alert');

    submitMock.mockResolvedValue(CONFIRMATION);
    await user.click(screen.getByRole('button', { name: /send enquiry/i }));

    expect(await screen.findByRole('region', { name: /enquiry received/i })).toBeInTheDocument();
    expect(submitMock).toHaveBeenCalledTimes(2);
  });
});

describe('privacy and demonstration notice (AC-511)', () => {
  it('shows a synthetic-data notice on the form', async () => {
    await renderForm();

    expect(screen.getByText(/synthetic/i)).toBeInTheDocument();
  });

  it('repeats the notice on the confirmation so it cannot be missed', async () => {
    const user = userEvent.setup();
    await renderForm();
    await fillValidEnquiry(user);

    await user.click(screen.getByRole('button', { name: /send enquiry/i }));

    const confirmation = await screen.findByRole('region', { name: /enquiry received/i });
    expect(within(confirmation).getByText(/no real institution has been contacted/i)).toBeInTheDocument();
  });

  it('asks only for the justified fields (FR-504, FR-519)', async () => {
    await renderForm();

    const form = screen.getByRole('form', { name: /enquire about this course/i });
    const labels = within(form)
      .getAllByRole('textbox')
      .concat(within(form).getAllByRole('combobox'))
      .map((control) => control.getAttribute('name'));
    expect(new Set(labels)).toEqual(new Set(['name', 'email', 'phone', 'enquiryType', 'message']));
  });

  it('marks the optional field as optional', async () => {
    await renderForm();

    expect(screen.getByLabelText(/phone/i)).not.toBeRequired();
  });
});
