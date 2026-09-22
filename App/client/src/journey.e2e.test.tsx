import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEffect, useRef } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { coursesApi } from '@/lib/courses/api';
import { enquiriesApi } from '@/lib/enquiries/api';
import type { EnquiryConfirmationResult, EnquiryInput } from '@/lib/enquiries/types';

import { CourseCard } from '@/components/courses/CourseCard';
import { CourseActions } from '@/components/courses/details/CourseActions';
import { ComparisonView } from '@/components/comparison/ComparisonView';
import { CourseEnquiry } from '@/components/enquiry/CourseEnquiry';
import {
  ComparisonProvider,
  useComparison,
  type ComparisonApi,
} from '@/components/comparison/comparison-context';

import { CATALOGUE_HREF } from '@/components/courses/details/routes';
import { courseDetailsHref, enquiryHref } from '@/components/comparison/routes';
import { makeCourse } from '@/components/comparison/test-courses';

/**
 * Seam-level end-to-end human journey (TASK-622; FR-601–FR-610, FR-612, FR-613;
 * AC-608, AC-609).
 *
 * Every individual hop is already locked by its own seam test (Catalogue →
 * Details, Catalogue → Comparison, Details → Enquiry/Comparison, Comparison →
 * Details/Enquiry/Catalogue, Enquiry → Confirmation) and Course-ID continuity is
 * proved in isolation. This test does the one thing those cannot: it walks the
 * WHOLE chain for a SINGLE stable course, proving the identity threads unchanged
 * end to end — catalogue card → details actions → comparison view → enquiry
 * route param → the courseId actually carried in the enquiry submission →
 * confirmation and its return path.
 *
 * Scope guard: this is the SEAM-level journey. Exhaustive click-through e2e (a
 * live App Router, real navigation between separate pages) is owned by Spec 07
 * (design §11). Because the journey spans separate App Router pages, jsdom cannot
 * click from one page to the next; instead the contract chain is asserted
 * deterministically against the shared route helpers (the single source of
 * truth), and the one hop that IS a single rendered flow — the enquiry page:
 * load course → submit → confirmation → return — is rendered end to end.
 *
 * Both API clients are faked at the transport seam (NFR-609), so the journey is
 * deterministic and touches no network, timers, or shared mutable state.
 */

// The rendered components navigate purely through next/link and never touch App
// Router state; the module is stubbed defensively so nothing in the render tree
// can reach the real router during a test.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
  usePathname: () => '/lifelong-learning/courses/data-analytics-essentials',
}));

// One stable course carried through the whole journey (FR-612). Kept in a single
// constant so every hop is asserted against the same identity.
const COURSE = makeCourse({
  id: 'data-analytics-essentials',
  title: 'Data Analytics Essentials',
});

const CONFIRMATION: EnquiryConfirmationResult = {
  reference: 'ENQ-2026-000042',
  courseId: COURSE.id,
  courseTitle: COURSE.title,
  status: 'received',
  createdAt: '2026-05-01T09:30:00.000Z',
};

/**
 * Recovers the raw `courseId` the enquiry route (`[courseId]/enquire`) hands its
 * page, mirroring how Next decodes a dynamic segment. This is the identity the
 * enquiry page reads from `params.courseId`.
 */
function enquiryRouteParam(href: string): string {
  return decodeURIComponent(
    href.replace(`${CATALOGUE_HREF}/`, '').replace(/\/enquire$/, ''),
  );
}

/** Recovers the raw `courseId` a details href resolves to (`[courseId]`). */
function detailsRouteParam(href: string): string {
  return decodeURIComponent(href.replace(`${CATALOGUE_HREF}/`, ''));
}

/** Seeds the comparison provider with a selection, then renders the view. */
function CompareSeed({ api }: { api: (value: ComparisonApi) => void }): null {
  const comparison = useComparison();
  const captured = useRef(false);
  useEffect(() => {
    if (captured.current) return;
    captured.current = true;
    comparison.add(COURSE);
    api(comparison);
  }, [comparison, api]);
  return null;
}

beforeEach(() => {
  // The enquiry page loads the course without a network round-trip.
  vi.spyOn(coursesApi, 'getById').mockResolvedValue(COURSE);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('End-to-end human journey — happy path (FR-601–FR-610, AC-609)', () => {
  it('threads the same stable course id through catalogue, details, comparison and enquiry', async () => {
    // --- Hop 1: Catalogue card → Details (FR-601) --------------------------
    const { unmount: unmountCard } = render(
      <ComparisonProvider>
        <CourseCard course={COURSE} />
      </ComparisonProvider>,
    );

    const catalogueDetailsHref = screen
      .getByRole('link', { name: /view details for data analytics essentials/i })
      .getAttribute('href');
    expect(catalogueDetailsHref).toBe(courseDetailsHref(COURSE.id));
    unmountCard();

    // --- Hop 2: Details actions → Enquiry + Catalogue (FR-603, FR-605) -----
    const { unmount: unmountActions } = render(<CourseActions course={COURSE} />);

    const detailsEnquireHref = screen
      .getByRole('link', { name: /enquire about this course/i })
      .getAttribute('href');
    expect(detailsEnquireHref).toBe(enquiryHref(COURSE.id));
    expect(
      screen.getByRole('link', { name: /back to course catalogue/i }),
    ).toHaveAttribute('href', CATALOGUE_HREF);
    unmountActions();

    // --- Hop 3: Comparison view → Details + Enquiry (FR-604, FR-607, FR-608)
    let comparisonApi: ComparisonApi | undefined;
    const { unmount: unmountCompare } = render(
      <ComparisonProvider>
        <CompareSeed api={(value) => (comparisonApi = value)} />
        <ComparisonView />
      </ComparisonProvider>,
    );

    // Shared comparison state reflects the course added anywhere (FR-623).
    expect(comparisonApi?.has(COURSE.id)).toBe(true);

    const comparisonDetailsHref = screen
      .getByRole('link', { name: /view details for data analytics essentials/i })
      .getAttribute('href');
    const comparisonEnquireHref = screen
      .getByRole('link', { name: /enquire about data analytics essentials/i })
      .getAttribute('href');
    expect(comparisonDetailsHref).toBe(courseDetailsHref(COURSE.id));
    expect(comparisonEnquireHref).toBe(enquiryHref(COURSE.id));
    unmountCompare();

    // --- Continuity assertion: one identity across every reference (FR-612) -
    // Every surface's details/enquiry target resolves back to the SAME raw id,
    // and the enquiry-route param equals the details-route param (FR-613).
    const identities = [
      detailsRouteParam(catalogueDetailsHref ?? ''),
      detailsRouteParam(comparisonDetailsHref ?? ''),
      enquiryRouteParam(detailsEnquireHref ?? ''),
      enquiryRouteParam(comparisonEnquireHref ?? ''),
    ];
    for (const id of identities) expect(id).toBe(COURSE.id);

    // --- Hop 4: Enquiry page rendered end to end → Confirmation → return ----
    // The one hop that is a single rendered flow: load course → submit →
    // confirmation → return link. The submitted payload's courseId is captured
    // so we can prove the enquiry is associated with the SAME id (FR-613).
    let submitted: EnquiryInput | undefined;
    const submit = vi
      .spyOn(enquiriesApi, 'submit')
      .mockImplementation(async (input: EnquiryInput) => {
        submitted = input;
        return CONFIRMATION;
      });

    const user = userEvent.setup();
    // The route param is exactly what every prior hop pointed at.
    const enquiryCourseId = enquiryRouteParam(comparisonEnquireHref ?? '');
    render(<CourseEnquiry courseId={enquiryCourseId} />);

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

    // Enquiry → Confirmation (FR-609): confirmation shows the server reference.
    const confirmation = await screen.findByRole('region', { name: /enquiry received/i });
    expect(confirmation).toHaveTextContent(CONFIRMATION.reference);
    expect(confirmation).toHaveTextContent(COURSE.title);

    // The enquiry carried the SAME course id the journey started with (FR-613).
    expect(submit).toHaveBeenCalledOnce();
    expect(submitted?.courseId).toBe(COURSE.id);

    // Confirmation → return path (FR-610): back to details and to the catalogue.
    expect(
      within(confirmation).getByRole('link', { name: /back to course details/i }),
    ).toHaveAttribute('href', `/lifelong-learning/courses/${COURSE.id}`);
    expect(
      within(confirmation).getByRole('link', { name: /browse more courses/i }),
    ).toHaveAttribute('href', CATALOGUE_HREF);

    // The confirmed enquiry is not resubmittable — no submit control remains.
    expect(
      screen.queryByRole('button', { name: /send enquiry/i }),
    ).not.toBeInTheDocument();
  });
});

describe('End-to-end human journey — alternative paths (FR-628, FR-630, AC-612, AC-613)', () => {
  it('shows a consistent unavailable-course state when the API 404s (FR-628)', async () => {
    // The course vanished (or was never listable): the transport reports a 404,
    // and the enquiry hop must land on the shared unavailable state with a path
    // back into the site — never a raw error.
    const { CourseApiError } = await import('@/lib/courses/api');
    vi.spyOn(coursesApi, 'getById').mockRejectedValue(
      new CourseApiError('Course not found.', 404),
    );

    render(<CourseEnquiry courseId="no-such-course" />);

    expect(
      await screen.findByRole('heading', { name: /course is not available/i }),
    ).toBeInTheDocument();
    // A consistent path back into the site is offered (FR-628).
    expect(
      screen.getByRole('link', { name: /browse the course catalogue/i }),
    ).toHaveAttribute('href', CATALOGUE_HREF);
    // No submit control is offered for a course that cannot be enquired about.
    expect(
      screen.queryByRole('button', { name: /send enquiry/i }),
    ).not.toBeInTheDocument();
  });

  it('shows a consistent empty-comparison state with a path back to the catalogue (FR-630)', () => {
    // Starting the comparison journey with nothing selected must present a clear
    // empty state and a way onward, consistent with the other empty presentations.
    render(
      <ComparisonProvider>
        <ComparisonView />
      </ComparisonProvider>,
    );

    expect(
      screen.getByRole('heading', { name: /no courses to compare yet/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /browse the course catalogue/i }),
    ).toHaveAttribute('href', CATALOGUE_HREF);
  });
});
