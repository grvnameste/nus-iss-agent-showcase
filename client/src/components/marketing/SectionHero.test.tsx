import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SectionHero } from './SectionHero';

describe('SectionHero', () => {
  it('renders the title as an <h1> by default with the intro', () => {
    render(
      <SectionHero
        headingId="hero-heading"
        title="Education"
        intro="Explore learning pathways."
      />,
    );

    const heading = screen.getByRole('heading', { level: 1, name: 'Education' });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveAttribute('id', 'hero-heading');
    expect(screen.getByText('Explore learning pathways.')).toBeInTheDocument();
  });

  it('renders as an <h2> when headingLevel is "h2"', () => {
    render(
      <SectionHero
        headingId="section-heading"
        title="Partnership models"
        intro="Ways to collaborate."
        headingLevel="h2"
      />,
    );

    expect(
      screen.getByRole('heading', { level: 2, name: 'Partnership models' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { level: 1 }),
    ).not.toBeInTheDocument();
  });

  it('renders the optional eyebrow when provided', () => {
    render(
      <SectionHero
        eyebrow="Admissions"
        headingId="hero-heading"
        title="Apply with confidence"
        intro="Your application journey."
      />,
    );

    expect(screen.getByText('Admissions')).toBeInTheDocument();
  });

  it('omits the eyebrow when not provided', () => {
    render(
      <SectionHero
        headingId="hero-heading"
        title="About"
        intro="A demonstration site."
      />,
    );

    expect(screen.queryByText('Admissions')).not.toBeInTheDocument();
  });

  it('renders the CTA slot (children)', () => {
    render(
      <SectionHero
        headingId="hero-heading"
        title="Education"
        intro="Explore learning pathways."
      >
        <a href="/lifelong-learning">Explore lifelong learning</a>
      </SectionHero>,
    );

    const cta = screen.getByRole('link', { name: 'Explore lifelong learning' });
    expect(cta).toHaveAttribute('href', '/lifelong-learning');
  });
});
