import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CourseCard } from './CourseCard';
import { CATALOGUE_HREF } from './details/routes';
import { ComparisonProvider } from '@/components/comparison/comparison-context';
import type { Course } from '@/lib/courses/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}));

const course: Course = {
  id: 'sample-course',
  code: 'SMP-1000',
  title: 'Sample Course',
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
  eligibility: 'Open',
  entryRequirements: [],
  skills: [],
  status: 'published',
  availability: 'closing_soon',
  tags: [],
};

function renderCard(): void {
  // The card renders Spec 04's compare control, which reads comparison state.
  render(
    <ComparisonProvider>
      <CourseCard course={course} />
    </ComparisonProvider>,
  );
}

describe('CourseCard', () => {
  it('renders key attributes with an accessible heading and details link', () => {
    renderCard();

    expect(screen.getByRole('heading', { name: /sample course/i })).toBeInTheDocument();
    expect(screen.getByText('A concise summary.')).toBeInTheDocument();
    expect(screen.getByText('Part-time')).toBeInTheDocument();
    expect(screen.getByText('Blended')).toBeInTheDocument();
    expect(screen.getByText('12 weeks')).toBeInTheDocument();
    expect(screen.getByText('May 2026')).toBeInTheDocument();
    expect(screen.getByText('SGD 2,400')).toBeInTheDocument();
    // Availability communicated with text, not colour alone.
    expect(screen.getByText(/closing soon/i)).toBeInTheDocument();

    const link = screen.getByRole('link', { name: /view details for sample course/i });
    expect(link).toHaveAttribute('href', `${CATALOGUE_HREF}/${course.id}`);
  });

  it('offers the comparison control for the course (FR-401)', () => {
    renderCard();

    expect(
      screen.getByRole('button', { name: /add sample course to comparison/i }),
    ).toBeInTheDocument();
  });

  // Catalogue → Details seam (FR-601): both the "View details" action and the
  // title link must target the details route for the correct course id, built
  // from the canonical catalogue route constant (C4). Href assertion only.
  describe('Catalogue → Details seam (FR-601)', () => {
    it('points "View details" and the title link at the course details route', () => {
      renderCard();

      const expectedHref = `${CATALOGUE_HREF}/${course.id}`;

      const viewDetails = screen.getByRole('link', {
        name: /view details for sample course/i,
      });
      expect(viewDetails).toHaveAttribute('href', expectedHref);

      const titleLink = screen.getByRole('link', { name: 'Sample Course' });
      expect(titleLink).toHaveAttribute('href', expectedHref);
    });

    it('URL-encodes the course id in the details href', () => {
      const courseWithSpecialId: Course = { ...course, id: 'data & analytics/101' };

      render(
        <ComparisonProvider>
          <CourseCard course={courseWithSpecialId} />
        </ComparisonProvider>,
      );

      const expectedHref = `${CATALOGUE_HREF}/${encodeURIComponent(courseWithSpecialId.id)}`;
      const viewDetails = screen.getByRole('link', {
        name: /view details for sample course/i,
      });
      expect(viewDetails).toHaveAttribute('href', expectedHref);
    });
  });
});
