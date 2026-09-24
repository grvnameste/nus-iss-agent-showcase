import { useEffect, useRef } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComparisonProvider, useComparison } from './comparison-context';
import { ComparisonView } from './ComparisonView';
import { makeCourse } from './test-courses';
import type { Course } from '@/lib/courses/types';

const analytics = makeCourse({
  id: 'data-analytics',
  title: 'Data Analytics Essentials',
  discipline: 'Data Analytics',
  category: 'Analytics',
  courseType: 'part_time',
  deliveryMode: 'blended',
  durationWeeks: 12,
  intake: 'May 2026',
  fee: 2400,
  currency: 'SGD',
  eligibility: 'Open to working adults.',
  availability: 'open',
});

const security = makeCourse({
  id: 'cyber-defence',
  title: 'Cyber Defence Foundations',
  discipline: 'Cybersecurity',
  category: 'Security Operations',
  courseType: 'short_course',
  deliveryMode: 'online',
  durationWeeks: 6,
  intake: 'July 2026',
  fee: 1800,
  currency: 'SGD',
  eligibility: 'No prior experience required.',
  status: 'draft',
  availability: 'closing_soon',
});

/** Seeds the provider with a selection once, then renders the view. */
function renderWithSelection(courses: Course[]): void {
  function Seed(): null {
    const { add } = useComparison();
    const seeded = useRef(false);

    useEffect(() => {
      if (seeded.current) return;
      seeded.current = true;
      for (const course of courses) add(course);
    }, [add]);

    return null;
  }

  render(
    <ComparisonProvider>
      <Seed />
      <ComparisonView />
    </ComparisonProvider>,
  );
}

describe('ComparisonView with no selection', () => {
  it('guides the user back to the catalogue (AC-408)', () => {
    renderWithSelection([]);

    expect(
      screen.getByRole('heading', { name: /no courses to compare/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /browse the course catalogue/i }),
    ).toHaveAttribute('href', '/lifelong-learning/courses');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

describe('ComparisonView with a selection', () => {
  it('compares the shared attributes side by side (AC-405)', () => {
    renderWithSelection([analytics, security]);

    const table = screen.getByRole('table', { name: /compare selected courses/i });

    // One column per selected course, in the order they were added.
    const columnHeaders = within(table)
      .getAllByRole('columnheader')
      .map((header) => header.textContent ?? '');
    expect(columnHeaders[1]).toMatch(/data analytics essentials/i);
    expect(columnHeaders[2]).toMatch(/cyber defence foundations/i);

    // Attribute rows are keyed by a row header, so values stay associated.
    const feeRow = within(table).getByRole('row', { name: /^fee/i });
    expect(within(feeRow).getByText('SGD 2,400')).toBeInTheDocument();
    expect(within(feeRow).getByText('SGD 1,800')).toBeInTheDocument();

    const durationRow = within(table).getByRole('row', { name: /^duration/i });
    expect(within(durationRow).getByText('12 weeks')).toBeInTheDocument();
    expect(within(durationRow).getByText('6 weeks')).toBeInTheDocument();

    const deliveryRow = within(table).getByRole('row', { name: /^delivery mode/i });
    expect(within(deliveryRow).getByText('Blended')).toBeInTheDocument();
    expect(within(deliveryRow).getByText('Online')).toBeInTheDocument();

    const statusRow = within(table).getByRole('row', { name: /^status/i });
    expect(within(statusRow).getByText('Published')).toBeInTheDocument();
    expect(within(statusRow).getByText('Draft')).toBeInTheDocument();

    const eligibilityRow = within(table).getByRole('row', { name: /^eligibility/i });
    expect(
      within(eligibilityRow).getByText('Open to working adults.'),
    ).toBeInTheDocument();
  });

  it('shows availability as text, never colour alone (NFR-404)', () => {
    renderWithSelection([analytics, security]);

    const row = screen.getByRole('row', { name: /^availability/i });
    expect(within(row).getByText(/open for applications/i)).toBeInTheDocument();
    expect(within(row).getByText(/closing soon/i)).toBeInTheDocument();
  });

  it('keeps the attribute order stable regardless of the courses chosen (NFR-406)', () => {
    renderWithSelection([security, analytics]);

    const rowHeaders = screen
      .getAllByRole('rowheader')
      .map((header) => header.textContent);
    expect(rowHeaders).toEqual([
      'Availability',
      'Status',
      'Course type',
      'Discipline',
      'Category',
      'Level',
      'Delivery mode',
      'Duration',
      'Intake',
      'Fee',
      'Eligibility',
      'Next step',
    ]);
  });

  it('links each course to its details page (AC-406)', () => {
    renderWithSelection([analytics, security]);

    expect(
      screen.getByRole('link', {
        name: /view details for data analytics essentials/i,
      }),
    ).toHaveAttribute('href', '/lifelong-learning/courses/data-analytics');
  });

  it('links each course to its enquiry entry point (AC-407)', () => {
    renderWithSelection([analytics, security]);

    expect(
      screen.getByRole('link', { name: /enquire about cyber defence foundations/i }),
    ).toHaveAttribute('href', '/lifelong-learning/courses/cyber-defence/enquire');
  });

  it('returns the user to the catalogue (AC-407)', () => {
    renderWithSelection([analytics]);

    expect(
      screen.getByRole('link', { name: /back to course catalogue/i }),
    ).toHaveAttribute('href', '/lifelong-learning/courses');
  });

  it('removes a course from the comparison (AC-402)', async () => {
    const user = userEvent.setup();
    renderWithSelection([analytics, security]);

    await user.click(
      screen.getByRole('button', {
        name: /remove data analytics essentials from comparison/i,
      }),
    );

    expect(screen.queryByText(/data analytics essentials/i)).not.toBeInTheDocument();
    expect(screen.getByText(/cyber defence foundations/i)).toBeInTheDocument();
  });

  it('falls back to the empty state once the last course is removed (AC-408)', async () => {
    const user = userEvent.setup();
    renderWithSelection([analytics]);

    await user.click(
      screen.getByRole('button', { name: /remove data analytics essentials/i }),
    );

    expect(
      screen.getByRole('heading', { name: /no courses to compare/i }),
    ).toBeInTheDocument();
  });

  it('lets the user clear the whole comparison', async () => {
    const user = userEvent.setup();
    renderWithSelection([analytics, security]);

    await user.click(screen.getByRole('button', { name: /clear comparison/i }));

    expect(
      screen.getByRole('heading', { name: /no courses to compare/i }),
    ).toBeInTheDocument();
  });

  it('keeps the wide table usable on narrow screens via a scrollable region (AC-410)', () => {
    renderWithSelection([analytics, security]);

    const region = screen.getByRole('region', { name: /course comparison table/i });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(region.className).toMatch(/overflow-x-auto/);
    expect(region).toContainElement(screen.getByRole('table'));
  });
});
