import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CourseCard } from './CourseCard';
import { CATALOGUE_HREF } from './details/routes';
import { courseDetailsHref, enquiryHref } from '@/components/comparison/routes';
import { ComparisonProvider } from '@/components/comparison/comparison-context';
import { makeCourse } from '@/components/comparison/test-courses';

/**
 * Course-ID continuity seam (TASK-621; FR-612, FR-613; AC-609).
 *
 * The individual navigation seams (Catalogue → Details, Comparison → Details /
 * Enquiry, Details → Enquiry) are each locked by their own seam tests. This test
 * proves the property that ties them together: for a single course, the *same*
 * course id flows unchanged across every journey reference — the catalogue card's
 * details href, the comparison view's `courseDetailsHref`/`enquiryHref`, and the
 * `courseId` route param that the enquiry page ultimately reads.
 *
 * It asserts against the shared route helpers (the single source of truth) rather
 * than hard-coded strings, and round-trips the encoded segment back to the raw id
 * so no feature silently re-slugs, truncates, or double-encodes the identity.
 *
 * Confirmation-only: it renders no feature internals beyond the catalogue card and
 * changes no Course model or route contract.
 */

// The card renders through next/link and never touches App Router state; stub the
// module defensively so the render tree cannot reach the real router.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}));

/**
 * Recovers the raw `courseId` the enquiry route (`[courseId]/enquire`) hands to
 * its page from an enquiry href, mirroring how Next decodes a dynamic segment.
 */
function enquiryRouteParam(href: string): string {
  const segment = href
    .replace(`${CATALOGUE_HREF}/`, '')
    .replace(/\/enquire$/, '');
  return decodeURIComponent(segment);
}

/** Recovers the raw `courseId` a details href resolves to (`[courseId]`). */
function detailsRouteParam(href: string): string {
  return decodeURIComponent(href.replace(`${CATALOGUE_HREF}/`, ''));
}

const CONTINUITY_IDS = [
  'data-analytics-essentials',
  // A deliberately awkward id (space + slash + ampersand) proves the identity is
  // carried as one opaque, URL-encoded segment everywhere rather than reshaped.
  'data & analytics/2026',
];

describe('Course-ID continuity across the journey (FR-612, FR-613, AC-609)', () => {
  it.each(CONTINUITY_IDS)(
    'uses the same course id for catalogue, comparison, and enquiry references (%s)',
    (id) => {
      const course = makeCourse({ id, title: 'Continuity Course' });

      // Catalogue → Details: the id the card links to.
      render(
        <ComparisonProvider>
          <CourseCard course={course} />
        </ComparisonProvider>,
      );
      const catalogueDetailsHref = screen
        .getByRole('link', { name: /view details for continuity course/i })
        .getAttribute('href');

      // The catalogue card and the comparison view must agree on the details URL…
      expect(catalogueDetailsHref).toBe(courseDetailsHref(id));

      // …and every reference must resolve back to the *same* raw course id.
      expect(detailsRouteParam(courseDetailsHref(id))).toBe(id);
      expect(detailsRouteParam(catalogueDetailsHref ?? '')).toBe(id);
      expect(enquiryRouteParam(enquiryHref(id))).toBe(id);

      // The identity the enquiry is associated with is the same one the details
      // route uses (FR-613): reaching enquiry from either surface carries this id.
      expect(enquiryRouteParam(enquiryHref(id))).toBe(detailsRouteParam(courseDetailsHref(id)));
    },
  );

  it('never re-slugs or truncates the id between details and enquiry references', () => {
    const id = 'ai-for-everyone';
    const course = makeCourse({ id, title: 'Continuity Course' });

    render(
      <ComparisonProvider>
        <CourseCard course={course} />
      </ComparisonProvider>,
    );

    const catalogueDetailsHref = screen
      .getByRole('link', { name: /view details for continuity course/i })
      .getAttribute('href');

    // Details id (from catalogue and comparison) === enquiry id, unchanged.
    const detailsId = detailsRouteParam(catalogueDetailsHref ?? '');
    const enquiryId = enquiryRouteParam(enquiryHref(id));
    expect(detailsId).toBe(id);
    expect(enquiryId).toBe(id);
    expect(detailsId).toBe(enquiryId);
  });
});
