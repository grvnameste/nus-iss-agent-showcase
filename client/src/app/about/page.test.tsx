import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import AboutPage, { metadata } from './page';

/**
 * About section page (Spec 07, design §9). Verifies the user-facing structure
 * required by AC-704 / FR-704 / FR-706 / FR-707: a single H1, a purpose
 * section, a CONCEPTUAL-only Agent-Ready section, a synthetic-data /
 * non-affiliation notice, explore links to existing routes, and conventional
 * metadata.
 */
describe('AboutPage (FR-704, FR-706)', () => {
  it('renders exactly one H1 for the section', () => {
    render(<AboutPage />);
    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent(/demonstration of a learner-focused/i);
  });

  it('renders the purpose & principles section', () => {
    render(<AboutPage />);
    expect(
      screen.getByRole('heading', { level: 2, name: /purpose & principles/i }),
    ).toBeInTheDocument();
  });

  it('renders a conceptual (not implemented) Agent-Ready section', () => {
    render(<AboutPage />);
    expect(
      screen.getByRole('heading', { level: 2, name: /agent-ready thinking/i }),
    ).toBeInTheDocument();
    // The section must stay conceptual: it explicitly disclaims any implemented
    // agent functionality (FR-704.3).
    expect(
      screen.getByText(/does not include any implemented agent functionality/i),
    ).toBeInTheDocument();
  });

  it('renders the synthetic-data and RP non-affiliation notice', () => {
    render(<AboutPage />);
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /synthetic data & non-affiliation/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/not an official republic polytechnic website/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/not affiliated with, operated by, or endorsed by/i),
    ).toBeInTheDocument();
  });

  it('renders explore links to existing routes only', () => {
    render(<AboutPage />);
    const expected: readonly [RegExp, string][] = [
      [/^home$/i, '/'],
      [/^education$/i, '/education'],
      [/^admissions$/i, '/admissions'],
      [/^industry$/i, '/industry'],
      [/^lifelong learning$/i, '/lifelong-learning'],
    ];
    for (const [name, href] of expected) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', href);
    }
  });
});

describe('About page metadata (FR-707)', () => {
  it('uses the conventional "{Section} — EduAgent Connect" title', () => {
    expect(metadata.title).toBe('About — EduAgent Connect');
  });
});
