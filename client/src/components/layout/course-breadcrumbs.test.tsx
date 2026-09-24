import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Breadcrumbs } from './Breadcrumbs';
import {
  catalogueBreadcrumbs,
  comparisonBreadcrumbs,
  courseDetailsBreadcrumbs,
  courseEnquiryBreadcrumbs,
} from './course-breadcrumbs';
import { CATALOGUE_HREF } from '@/components/courses/details/routes';
import { courseDetailsHref } from '@/components/comparison/routes';

/** The visible trail as an ordered array of crumb labels. */
function trailLabels(): string[] {
  return Array.from(
    screen.getByRole('navigation', { name: /breadcrumb/i }).querySelectorAll('ol > li'),
  ).map((li) => li.textContent?.replace(/›/g, '').trim() ?? '');
}

describe('course breadcrumb trails (FR-617)', () => {
  it('catalogue: Lifelong Learning › Course Catalogue (current)', () => {
    render(<Breadcrumbs items={catalogueBreadcrumbs} />);

    expect(trailLabels()).toEqual(['Lifelong Learning', 'Course Catalogue']);
    expect(screen.getByRole('link', { name: 'Lifelong Learning' })).toHaveAttribute(
      'href',
      '/lifelong-learning',
    );
    expect(screen.getByText('Course Catalogue')).toHaveAttribute('aria-current', 'page');
  });

  it('comparison: Lifelong Learning › Course Catalogue › Compare (current)', () => {
    render(<Breadcrumbs items={comparisonBreadcrumbs} />);

    expect(trailLabels()).toEqual(['Lifelong Learning', 'Course Catalogue', 'Compare']);
    expect(screen.getByRole('link', { name: 'Course Catalogue' })).toHaveAttribute(
      'href',
      CATALOGUE_HREF,
    );
    expect(screen.getByText('Compare')).toHaveAttribute('aria-current', 'page');
  });

  it('details: Lifelong Learning › Course Catalogue › {title} (current)', () => {
    render(<Breadcrumbs items={courseDetailsBreadcrumbs('Data Analytics Essentials')} />);

    expect(trailLabels()).toEqual([
      'Lifelong Learning',
      'Course Catalogue',
      'Data Analytics Essentials',
    ]);
    expect(screen.getByText('Data Analytics Essentials')).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('enquiry: Lifelong Learning › Course Catalogue › {title} › Enquire (current)', () => {
    const detailsHref = courseDetailsHref('data-analytics-essentials');
    render(
      <Breadcrumbs
        items={courseEnquiryBreadcrumbs('Data Analytics Essentials', detailsHref)}
      />,
    );

    expect(trailLabels()).toEqual([
      'Lifelong Learning',
      'Course Catalogue',
      'Data Analytics Essentials',
      'Enquire',
    ]);
    // The course-title crumb links back to that course's details page…
    expect(
      screen.getByRole('link', { name: 'Data Analytics Essentials' }),
    ).toHaveAttribute('href', detailsHref);
    // …and the current "Enquire" crumb is plain text.
    expect(screen.getByText('Enquire')).toHaveAttribute('aria-current', 'page');
  });
});
