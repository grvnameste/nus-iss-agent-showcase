import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import EducationPage, { metadata } from './page';

/**
 * Education section page (Spec 07, design §6). Verifies the user-facing
 * structure required by AC-701 / FR-701 / FR-706 / FR-707 / FR-708: a single
 * H1, programme-area and academic-pathways sections, a synthetic-data caption,
 * a Lifelong Learning CTA with the correct href, and conventional metadata.
 */
describe('EducationPage (FR-701, FR-706, FR-708)', () => {
  it('renders exactly one H1 for the section', () => {
    render(<EducationPage />);
    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent(/learning pathways/i);
  });

  it('renders the programme-areas section with fictional programme cards', () => {
    render(<EducationPage />);
    expect(
      screen.getByRole('heading', { level: 2, name: /programme areas/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: /computing & digital/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: /business & enterprise/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: /design & media/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 3,
        name: /engineering & applied technology/i,
      }),
    ).toBeInTheDocument();
  });

  it('renders the academic-pathways section', () => {
    render(<EducationPage />);
    expect(
      screen.getByRole('heading', { level: 2, name: /academic pathways/i }),
    ).toBeInTheDocument();
  });

  it('renders the illustrative synthetic-data caption', () => {
    render(<EducationPage />);
    expect(screen.getByText(/illustrative synthetic data/i)).toBeInTheDocument();
  });

  it('links to the Lifelong Learning journey via a descriptive CTA', () => {
    render(<EducationPage />);
    const ctas = screen.getAllByRole('link', {
      name: /explore lifelong learning/i,
    });
    expect(ctas.length).toBeGreaterThan(0);
    for (const cta of ctas) {
      expect(cta).toHaveAttribute('href', '/lifelong-learning');
    }
  });
});

describe('Education page metadata (FR-707)', () => {
  it('uses the conventional "{Section} — EduAgent Connect" title', () => {
    expect(metadata.title).toBe('Education — EduAgent Connect');
  });
});
