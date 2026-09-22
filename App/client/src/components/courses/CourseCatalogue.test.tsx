import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {
  Course,
  CourseListResponse,
  CourseQueryParams,
} from '@/lib/courses/types';

/**
 * Frontend catalogue behaviour tests. The API client is faked so the UI is
 * testable without a network (the transport seam), per the testing steering.
 * next/navigation is stubbed so URL sync does not require a router.
 */

// --- Router stub -----------------------------------------------------------
const replaceMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}));

// --- API fake --------------------------------------------------------------
// Hoisted so the mock factory (also hoisted) can reference them safely.
const { listMock, CourseApiError } = vi.hoisted(() => {
  class CourseApiError extends Error {
    status?: number;
    constructor(message: string, status?: number) {
      super(message);
      this.name = 'CourseApiError';
      this.status = status;
    }
  }
  return {
    listMock:
      vi.fn<
        (params: CourseQueryParams, signal?: AbortSignal) => Promise<CourseListResponse>
      >(),
    CourseApiError,
  };
});

vi.mock('@/lib/courses/api', () => ({
  CourseApiError,
  coursesApi: {
    list: (params: CourseQueryParams, signal?: AbortSignal) =>
      listMock(params, signal),
    getById: vi.fn(),
  },
}));

import { CourseCatalogue } from './CourseCatalogue';
import { ComparisonProvider } from '@/components/comparison/comparison-context';

/**
 * Course cards render Spec 04's compare control, which reads the comparison
 * state mounted in the app shell — so the catalogue is exercised inside it.
 */
function renderCatalogue(): void {
  render(
    <ComparisonProvider>
      <CourseCatalogue />
    </ComparisonProvider>,
  );
}

function makeCourse(overrides: Partial<Course> & { id: string }): Course {
  return {
    code: `CODE-${overrides.id}`,
    title: 'A Course',
    shortDescription: 'A short description',
    description: 'Full description',
    discipline: 'Cybersecurity',
    category: 'General',
    courseType: 'short_course',
    level: 'beginner',
    durationWeeks: 8,
    deliveryMode: 'online',
    intake: 'Apr 2026',
    startDate: '2026-04-01',
    applicationDeadline: '2026-03-01',
    fee: 1500,
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

function listResponse(
  data: Course[],
  pagination?: Partial<CourseListResponse['pagination']>,
): CourseListResponse {
  return {
    data,
    pagination: {
      page: 1,
      pageSize: 12,
      totalItems: data.length,
      totalPages: 1,
      ...pagination,
    },
  };
}

beforeEach(() => {
  listMock.mockReset();
  replaceMock.mockReset();
});

describe('CourseCatalogue', () => {
  it('shows a loading state then renders results', async () => {
    listMock.mockResolvedValueOnce(
      listResponse([makeCourse({ id: 'a', title: 'Alpha Course' })]),
    );
    renderCatalogue();

    expect(screen.getByText(/loading courses/i)).toBeInTheDocument();

    expect(
      await screen.findByRole('heading', { name: /alpha course/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/showing 1–1 of 1 course/i)).toBeInTheDocument();
  });

  it('shows an empty state with a reset action after searching', async () => {
    listMock.mockResolvedValueOnce(listResponse([makeCourse({ id: 'a' })]));
    renderCatalogue();
    await screen.findByText(/showing/i);

    // Subsequent calls return no matches (debounce + submit may each fire).
    listMock.mockResolvedValue(listResponse([], { totalItems: 0, totalPages: 1 }));
    await userEvent.type(screen.getByLabelText(/search courses/i), 'zzzz{enter}');

    expect(
      await screen.findByRole('heading', { name: /no courses match/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /clear search and filters/i }),
    ).toBeInTheDocument();
  });

  it('shows an error state with retry, and retries on click', async () => {
    listMock.mockRejectedValueOnce(new CourseApiError('Unable to reach the course service.'));
    renderCatalogue();

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn.t load/i);

    listMock.mockResolvedValueOnce(
      listResponse([makeCourse({ id: 'a', title: 'Recovered Course' })]),
    );
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(
      await screen.findByRole('heading', { name: /recovered course/i }),
    ).toBeInTheDocument();
  });

  it('sends the keyword to the API when searching', async () => {
    listMock.mockResolvedValue(listResponse([makeCourse({ id: 'a' })]));
    renderCatalogue();
    await screen.findByText(/showing/i);

    await userEvent.type(screen.getByLabelText(/search courses/i), 'security{enter}');

    await waitFor(() => {
      expect(listMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ keyword: 'security', page: 1 }),
        expect.anything(),
      );
    });
  });

  it('sends a selected discipline filter to the API', async () => {
    listMock.mockResolvedValue(listResponse([makeCourse({ id: 'a' })]));
    renderCatalogue();
    await screen.findByText(/showing/i);

    await userEvent.click(screen.getByLabelText('Cybersecurity'));

    await waitFor(() => {
      expect(listMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ discipline: ['Cybersecurity'] }),
        expect.anything(),
      );
    });
  });

  it('sends sort selections to the API', async () => {
    listMock.mockResolvedValue(listResponse([makeCourse({ id: 'a' })]));
    renderCatalogue();
    await screen.findByText(/showing/i);

    await userEvent.selectOptions(screen.getByLabelText(/sort by/i), 'fee');

    await waitFor(() => {
      expect(listMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ sort: 'fee' }),
        expect.anything(),
      );
    });
  });

  it('paginates and requests the next page', async () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      makeCourse({ id: `c-${i}`, title: `Course ${i}` }),
    );
    listMock.mockResolvedValue(
      listResponse(many, { totalItems: 24, totalPages: 2 }),
    );
    renderCatalogue();
    await screen.findByText(/showing/i);

    const nav = await screen.findByRole('navigation', { name: /results pages/i });
    await userEvent.click(within(nav).getByRole('button', { name: /page 2/i }));

    await waitFor(() => {
      expect(listMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 }),
        expect.anything(),
      );
    });
  });

  it('links each course card to its details route', async () => {
    listMock.mockResolvedValueOnce(
      listResponse([makeCourse({ id: 'cyber-101', title: 'Cyber 101' })]),
    );
    renderCatalogue();

    const link = await screen.findByRole('link', {
      name: /view details for cyber 101/i,
    });
    expect(link).toHaveAttribute(
      'href',
      '/lifelong-learning/courses/cyber-101',
    );
  });
});
