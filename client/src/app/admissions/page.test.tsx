import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import AdmissionsPage, { metadata } from './page';

/**
 * Admissions section page (Spec 07, design §7). Verifies the user-facing
 * structure required by AC-702 / FR-702 / FR-706.4 / FR-707 / FR-708: a single
 * H1, an application-journey section, a semantic ordered list (`<ol>`) of the
 * five conceptual steps, clearly-illustrative key dates, a catalogue/enquiry
 * CTA with the correct href, and conventional metadata.
 */
describe('AdmissionsPage (FR-702, FR-706, FR-708)', () => {
  it('renders exactly one H1 for the section', () => {
    render(<AdmissionsPage />);
    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent(/application journey/i);
  });

  it('renders the "How to apply" application-journey section', () => {
    render(<AdmissionsPage />);
    expect(
      screen.getByRole('heading', { level: 2, name: /how to apply/i }),
    ).toBeInTheDocument();
  });

  it('presents the application steps as a semantic ordered list of five items', () => {
    render(<AdmissionsPage />);
    // Exactly one list should have the ARIA `list` role (the `<ol>`); the key
    // dates use a `<dl>`, which does not expose the `list` role.
    const list = screen.getByRole('list');
    expect(list.tagName).toBe('OL');
    expect(within(list).getAllByRole('listitem')).toHaveLength(5);
  });

  it('renders the expected conceptual application steps', () => {
    render(<AdmissionsPage />);
    expect(
      screen.getByRole('heading', { level: 3, name: /explore your options/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: /compare pathways/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: /prepare your application/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: /review and submit/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: /plan your next step/i }),
    ).toBeInTheDocument();
  });

  it('renders a clearly-illustrative key-dates section', () => {
    render(<AdmissionsPage />);
    expect(
      screen.getByRole('heading', { level: 2, name: /key dates/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/illustrative synthetic data — not real admissions dates/i),
    ).toBeInTheDocument();
  });

  it('links into the catalogue/enquiry journey via descriptive CTAs', () => {
    render(<AdmissionsPage />);
    const ctas = screen.getAllByRole('link', {
      name: /browse the course catalogue/i,
    });
    expect(ctas.length).toBeGreaterThan(0);
    for (const cta of ctas) {
      expect(cta).toHaveAttribute('href', '/lifelong-learning/courses');
    }
  });
});

describe('Admissions page metadata (FR-707)', () => {
  it('uses the conventional "{Section} — EduAgent Connect" title', () => {
    expect(metadata.title).toBe('Admissions — EduAgent Connect');
  });
});
