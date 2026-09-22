import { useEffect, useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ComparisonTable } from './ComparisonTable';
import { ComparisonView } from './ComparisonView';
import { ComparisonProvider, useComparison } from './comparison-context';
import { CATALOGUE_HREF, courseDetailsHref, enquiryHref } from './routes';
import { makeCourse } from './test-courses';
import type { Course } from '@/lib/courses/types';

/**
 * Comparison → Details / → Enquiry / → Catalogue seam (TASK-612;
 * FR-606, FR-607, FR-608, FR-613; AC-606, AC-607).
 *
 * Confirmation-only. Specification 04 owns the comparison table, view, and
 * context; this test re-implements none of them. It locks the cross-feature
 * navigation seam so a learner leaving the comparison view always lands on the
 * right target carrying the right course identity:
 *   - "View details" (and the course title) → the C4 details route.
 *   - "Enquire" → the C7 enquiry route, carrying the course id.
 *   - "Back to Course Catalogue" → the catalogue route.
 *
 * The hrefs are asserted against the shared route helpers rather than hard-coded
 * strings, so this test tracks the single-sourced contract instead of freezing a
 * literal that a route change would silently diverge from.
 */

// ComparisonTable/ComparisonView navigate purely through next/link and touch no
// App Router state. The module is stubbed defensively so nothing in the render
// tree can reach the real router in a test.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
  usePathname: () => '/lifelong-learning/courses/compare',
}));

const analytics = makeCourse({
  id: 'data-analytics',
  title: 'Data Analytics Essentials',
});

// A deliberately awkward id (space + slash) proves the identity is URL-encoded
// on the way into both the details and enquiry routes (FR-613): the segment must
// survive as one opaque id, not split the path or leak raw characters.
const AWKWARD_ID = 'data analytics/2026';
const awkward = makeCourse({
  id: AWKWARD_ID,
  title: 'Special Characters Course',
});

/** Seeds the provider with a selection once, then renders the view. */
function renderViewWithSelection(courses: Course[]): void {
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

describe('Comparison → Details seam (FR-607, AC-606)', () => {
  it('points each "View details" action at that course\'s details route', () => {
    render(<ComparisonTable courses={[analytics, awkward]} onRemove={vi.fn()} />);

    expect(
      screen.getByRole('link', {
        name: /view details for data analytics essentials/i,
      }),
    ).toHaveAttribute('href', courseDetailsHref(analytics.id));
    expect(
      screen.getByRole('link', { name: /view details for special characters course/i }),
    ).toHaveAttribute('href', courseDetailsHref(awkward.id));
  });

  it('points each course title at the same details route as its action', () => {
    render(<ComparisonTable courses={[analytics, awkward]} onRemove={vi.fn()} />);

    expect(
      screen.getByRole('link', { name: /^data analytics essentials$/i }),
    ).toHaveAttribute('href', courseDetailsHref(analytics.id));
    expect(
      screen.getByRole('link', { name: /^special characters course$/i }),
    ).toHaveAttribute('href', courseDetailsHref(awkward.id));
  });
});

describe('Comparison → Enquiry seam (FR-608, FR-613, AC-607)', () => {
  it('points each "Enquire" action at that course\'s enquiry route', () => {
    render(<ComparisonTable courses={[analytics, awkward]} onRemove={vi.fn()} />);

    expect(
      screen.getByRole('link', { name: /enquire about data analytics essentials/i }),
    ).toHaveAttribute('href', enquiryHref(analytics.id));
  });

  it('carries an awkward course id into the enquiry route URL-encoded (FR-613)', () => {
    render(<ComparisonTable courses={[awkward]} onRemove={vi.fn()} />);

    const enquire = screen.getByRole('link', {
      name: /enquire about special characters course/i,
    });
    // The identity is preserved as one encoded segment, not split by the slash
    // or leaked as a raw space.
    expect(enquire).toHaveAttribute(
      'href',
      '/lifelong-learning/courses/data%20analytics%2F2026/enquire',
    );
    expect(enquire).toHaveAttribute('href', enquiryHref(AWKWARD_ID));
  });
});

describe('Comparison → Catalogue seam (FR-606)', () => {
  it('returns the user to the catalogue from the populated view', () => {
    renderViewWithSelection([analytics]);

    expect(
      screen.getByRole('link', { name: /back to course catalogue/i }),
    ).toHaveAttribute('href', CATALOGUE_HREF);
  });

  it('returns the user to the catalogue from the empty view', () => {
    renderViewWithSelection([]);

    expect(
      screen.getByRole('link', { name: /browse the course catalogue/i }),
    ).toHaveAttribute('href', CATALOGUE_HREF);
  });
});
