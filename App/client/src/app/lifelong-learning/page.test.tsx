import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import LifelongLearningPage, { metadata } from './page';
import { metadata as homeMetadata } from '../page';
import { buttonClasses } from '@/components/ui/Button';
import { COMPARISON_HREF } from '@/components/comparison/routes';

/**
 * The Lifelong Learning landing is a shell page (Spec 06 / Spec 01 territory).
 * It must surface the course journeys — the Course Catalogue (Spec 02) and the
 * Comparison view (Spec 04) — so a first-time visitor can reach either
 * (FR-615, FR-625), reusing the shared button styling rather than
 * hand-duplicating Tailwind classes (FR-620, NFR-604).
 */
describe('LifelongLearningPage (FR-615, FR-620, FR-625, NFR-604)', () => {
  it('renders exactly one H1 for the section', () => {
    render(<LifelongLearningPage />);
    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent(/lifelong learning/i);
  });

  it('surfaces the Course Catalogue journey using the shared button styling', () => {
    render(<LifelongLearningPage />);
    const cta = screen.getByRole('link', { name: /browse the course catalogue/i });
    expect(cta).toHaveAttribute('href', '/lifelong-learning/courses');
    // Uses the canonical primary-button class string, not a hand-copied one.
    expect(cta.getAttribute('class')).toBe(buttonClasses());
  });

  it('surfaces the Comparison journey using the shared button styling', () => {
    render(<LifelongLearningPage />);
    const cta = screen.getByRole('link', { name: /view course comparison/i });
    expect(cta).toHaveAttribute('href', COMPARISON_HREF);
    expect(cta.getAttribute('class')).toBe(buttonClasses('secondary'));
  });
});

/**
 * Page metadata/titles must be consistent and descriptive across primary human
 * routes (FR-622), following the "{Page} — EduAgent Connect" convention.
 */
describe('page metadata (FR-622)', () => {
  it('gives the Lifelong Learning landing a descriptive, conventional title', () => {
    expect(metadata.title).toBe('Lifelong Learning — EduAgent Connect');
  });

  it('gives the Home page a descriptive, conventional title', () => {
    expect(homeMetadata.title).toBe('Home — EduAgent Connect');
  });
});
