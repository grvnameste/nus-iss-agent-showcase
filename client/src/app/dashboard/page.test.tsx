import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { StoredEnquiry } from '@/lib/enquiries/types';

/**
 * Dashboard page behaviour tests (Spec 16, FR-1604).
 *
 * The enquiry API client is faked so the UI is testable without a network (the
 * transport seam, per the testing steering). Each async state is exercised
 * deterministically, and the populated case asserts a full reference + email are
 * visible — proving the demo shows synthetic data unmasked.
 */

// --- API fake --------------------------------------------------------------
const { listMock, EnquiryApiError } = vi.hoisted(() => {
  class EnquiryApiError extends Error {
    status?: number;
    constructor(message: string, status?: number) {
      super(message);
      this.name = 'EnquiryApiError';
      this.status = status;
    }
  }
  return {
    listMock: vi.fn<(signal?: AbortSignal) => Promise<StoredEnquiry[]>>(),
    EnquiryApiError,
  };
});

vi.mock('@/lib/enquiries/api', () => ({
  EnquiryApiError,
  enquiriesApi: {
    list: (signal?: AbortSignal) => listMock(signal),
    submit: vi.fn(),
  },
}));

import DashboardPage, { metadata } from './page';

function makeEnquiry(overrides: Partial<StoredEnquiry> = {}): StoredEnquiry {
  return {
    reference: 'ENQ-2026-0001',
    courseId: 'course-1',
    courseTitle: 'Foundations of Data Analytics',
    name: 'Alex Learner',
    email: 'alex.learner@example.com',
    phone: '+65 8000 0000',
    enquiryType: 'course_content',
    message: 'Could you tell me more about the prerequisites for this course?',
    status: 'received',
    createdAt: '2026-01-15T09:30:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  listMock.mockReset();
});

describe('DashboardPage (FR-1604)', () => {
  it('shows a loading state, then resolves to a populated table with unmasked fields', async () => {
    let resolveList: (value: StoredEnquiry[]) => void = () => {};
    listMock.mockReturnValue(
      new Promise<StoredEnquiry[]>((resolve) => {
        resolveList = resolve;
      }),
    );

    render(<DashboardPage />);

    expect(screen.getByText(/loading enquiries/i)).toBeInTheDocument();

    resolveList([makeEnquiry()]);

    const table = await screen.findByRole('table');
    // Full reference and full email are visible — no masking of synthetic data.
    expect(screen.getByText('ENQ-2026-0001')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'alex.learner@example.com' }),
    ).toBeInTheDocument();
    // Human-readable enquiry type label is used.
    expect(screen.getByText('Course content')).toBeInTheDocument();
    // Full message is shown in the table.
    expect(
      screen.getByText(/prerequisites for this course/i),
    ).toBeInTheDocument();
    expect(table).toBeInTheDocument();
  });

  it('shows an empty state when there are no enquiries', async () => {
    listMock.mockResolvedValue([]);

    render(<DashboardPage />);

    expect(await screen.findByText(/no enquiries yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows a sanitised error message with a retry affordance', async () => {
    listMock.mockRejectedValue(
      new EnquiryApiError('The enquiry service returned an error.', 500),
    );

    render(<DashboardPage />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/the enquiry service returned an error/i);
    // Generic message only — no internals leaked.
    expect(alert).not.toHaveTextContent(/stack|500|internal/i);

    const retry = screen.getByRole('button', { name: /try again/i });
    listMock.mockResolvedValueOnce([makeEnquiry({ reference: 'ENQ-2026-0002' })]);
    await userEvent.click(retry);

    expect(await screen.findByText('ENQ-2026-0002')).toBeInTheDocument();
  });

  it('renders exactly one H1', async () => {
    listMock.mockResolvedValue([]);
    render(<DashboardPage />);
    await screen.findByText(/no enquiries yet/i);
    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent(/dashboard/i);
  });
});

describe('Dashboard page metadata', () => {
  it('uses the conventional "{Section} — EduAgent Connect" title', () => {
    expect(metadata.title).toBe('Dashboard — EduAgent Connect');
  });
});
