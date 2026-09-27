import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import IndustryPage, { metadata } from './page';

/**
 * Industry section page (Spec 07, design §8). Verifies the user-facing
 * structure required by AC-703 / FR-703 / FR-706 / FR-707 / FR-708: a single
 * H1, a partnership section with the four fictional partnership cards, a
 * synthetic-data caption, a Lifelong Learning CTA with the correct href, and
 * conventional metadata.
 */
describe('IndustryPage (FR-703, FR-706, FR-708)', () => {
  it('renders exactly one H1 for the section', () => {
    render(<IndustryPage />);
    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent(/partnerships that grow capability/i);
  });

  it('renders the partnership-models section', () => {
    render(<IndustryPage />);
    expect(
      screen.getByRole('heading', { level: 2, name: /partnership models/i }),
    ).toBeInTheDocument();
  });

  it('renders the four fictional partnership-model cards', () => {
    render(<IndustryPage />);
    expect(
      screen.getByRole('heading', { level: 3, name: /work-study collaboration/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: /custom skills programmes/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 3,
        name: /capstone & challenge projects/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 3,
        name: /talent & capability development/i,
      }),
    ).toBeInTheDocument();
  });

  it('renders the illustrative synthetic-data caption', () => {
    render(<IndustryPage />);
    expect(screen.getByText(/illustrative synthetic data/i)).toBeInTheDocument();
  });

  it('links to the Lifelong Learning journey via a descriptive CTA', () => {
    render(<IndustryPage />);
    const ctas = screen.getAllByRole('link', {
      name: /explore lifelong learning/i,
    });
    expect(ctas.length).toBeGreaterThan(0);
    for (const cta of ctas) {
      expect(cta).toHaveAttribute('href', '/lifelong-learning');
    }
  });
});

describe('Industry page metadata (FR-707)', () => {
  it('uses the conventional "{Section} — EduAgent Connect" title', () => {
    expect(metadata.title).toBe('Industry — EduAgent Connect');
  });
});
