import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import NotFound from './not-found';
import { CATALOGUE_HREF } from '@/components/courses/details/routes';

/**
 * Global 404 route test (Spec 06, FR-627). Verifies the not-found page renders a
 * single H1 and offers a working path back into the site (Home + catalogue),
 * built from the canonical route constant. Deterministic — no router or network.
 */
describe('Global not-found page (FR-627)', () => {
  it('renders exactly one H1', () => {
    render(<NotFound />);

    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(/couldn.t find that page/i);
  });

  it('offers a working path back to Home and the Course Catalogue', () => {
    render(<NotFound />);

    const home = screen.getByRole('link', { name: /back to home/i });
    expect(home).toHaveAttribute('href', '/');

    const catalogue = screen.getByRole('link', {
      name: /browse the course catalogue/i,
    });
    expect(catalogue).toHaveAttribute('href', CATALOGUE_HREF);
  });

  it('does not expose internals (no stack traces or status codes beyond a friendly 404 label)', () => {
    render(<NotFound />);

    // A friendly "Error 404" label is fine; raw internals must never appear.
    expect(screen.queryByText(/stack|trace|at .*\(.*:\d+:\d+\)/i)).toBeNull();
  });
});
