import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Breadcrumbs } from './Breadcrumbs';

describe('Breadcrumbs (FR-617, NFR-605)', () => {
  it('renders a Breadcrumb nav landmark wrapping an ordered list', () => {
    render(
      <Breadcrumbs
        items={[
          { label: 'Lifelong Learning', href: '/lifelong-learning' },
          { label: 'Course Catalogue' },
        ]}
      />,
    );

    const nav = screen.getByRole('navigation', { name: /breadcrumb/i });
    expect(nav).toBeInTheDocument();
    // The list is an ordered list so position is conveyed to assistive tech.
    expect(nav.querySelector('ol')).not.toBeNull();
    expect(nav.querySelectorAll('ol > li')).toHaveLength(2);
  });

  it('renders non-final crumbs as links with the correct hrefs', () => {
    render(
      <Breadcrumbs
        items={[
          { label: 'Lifelong Learning', href: '/lifelong-learning' },
          { label: 'Course Catalogue', href: '/lifelong-learning/courses' },
          { label: 'Data Analytics' },
        ]}
      />,
    );

    expect(screen.getByRole('link', { name: 'Lifelong Learning' })).toHaveAttribute(
      'href',
      '/lifelong-learning',
    );
    expect(screen.getByRole('link', { name: 'Course Catalogue' })).toHaveAttribute(
      'href',
      '/lifelong-learning/courses',
    );
  });

  it('renders the last crumb as plain text marked aria-current="page"', () => {
    render(
      <Breadcrumbs
        items={[
          { label: 'Lifelong Learning', href: '/lifelong-learning' },
          { label: 'Course Catalogue', href: '/lifelong-learning/courses' },
          { label: 'Data Analytics' },
        ]}
      />,
    );

    // The final crumb is not a link…
    expect(
      screen.queryByRole('link', { name: 'Data Analytics' }),
    ).not.toBeInTheDocument();
    // …and it announces the current page.
    const current = screen.getByText('Data Analytics');
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(current.tagName).toBe('SPAN');
  });

  it('marks the last crumb current even when it carries an href', () => {
    render(
      <Breadcrumbs
        items={[
          { label: 'Course Catalogue', href: '/lifelong-learning/courses' },
          { label: 'Enquire', href: '/somewhere' },
        ]}
      />,
    );

    // The final crumb stays plain text (current page) regardless of any href.
    expect(screen.queryByRole('link', { name: 'Enquire' })).not.toBeInTheDocument();
    expect(screen.getByText('Enquire')).toHaveAttribute('aria-current', 'page');
  });

  it('renders nothing when there are no crumbs', () => {
    const { container } = render(<Breadcrumbs items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
