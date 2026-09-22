import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Footer } from './Footer';
import { CATALOGUE_HREF } from '@/components/courses/details/routes';
import { COMPARISON_HREF } from '@/components/comparison/routes';

describe('Footer (FR-616)', () => {
  it('renders a semantic footer landmark', () => {
    render(<Footer />);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('retains the synthetic-data / demonstration notice', () => {
    render(<Footer />);
    expect(screen.getByText(/all content and data are synthetic/i)).toBeInTheDocument();
    expect(
      screen.getByText(/does not integrate with, any real institution/i),
    ).toBeInTheDocument();
  });

  it('retains a copyright line (deterministic, not asserting the current year)', () => {
    render(<Footer />);
    // Match the copyright structure without asserting a wall-clock year, so the
    // test stays deterministic regardless of when it runs.
    expect(
      screen.getByText(/©\s*\d{4}\s+EduAgent Connect — demonstration prototype\./),
    ).toBeInTheDocument();
  });

  it('groups secondary links in a labelled Footer nav landmark', () => {
    render(<Footer />);
    expect(screen.getByRole('navigation', { name: /footer/i })).toBeInTheDocument();
  });

  it('renders useful secondary links with the correct hrefs', () => {
    render(<Footer />);
    const nav = screen.getByRole('navigation', { name: /footer/i });

    expect(screen.getByRole('link', { name: /^home$/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /^lifelong learning$/i })).toHaveAttribute(
      'href',
      '/lifelong-learning',
    );
    expect(screen.getByRole('link', { name: /course catalogue/i })).toHaveAttribute(
      'href',
      CATALOGUE_HREF,
    );
    expect(screen.getByRole('link', { name: /compare courses/i })).toHaveAttribute(
      'href',
      COMPARISON_HREF,
    );
    expect(screen.getByRole('link', { name: /^about$/i })).toHaveAttribute(
      'href',
      '/about',
    );

    // All secondary links live inside the labelled Footer nav.
    expect(nav.querySelectorAll('a').length).toBeGreaterThanOrEqual(5);
  });
});
