import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LifelongLearningNav } from './LifelongLearningNav';
import { CATALOGUE_HREF } from '@/components/courses/details/routes';
import { COMPARISON_HREF } from '@/components/comparison/routes';

const pathname = vi.hoisted(() => ({ current: '/lifelong-learning' }));

vi.mock('next/navigation', () => ({
  usePathname: () => pathname.current,
}));

describe('LifelongLearningNav', () => {
  beforeEach(() => {
    pathname.current = '/lifelong-learning';
  });

  it('renders a Lifelong Learning nav landmark with Catalogue and Compare links (FR-615)', () => {
    render(<LifelongLearningNav />);

    const nav = screen.getByRole('navigation', { name: /lifelong learning/i });
    expect(nav).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /course catalogue/i })).toHaveAttribute(
      'href',
      CATALOGUE_HREF,
    );
    expect(screen.getByRole('link', { name: /compare/i })).toHaveAttribute(
      'href',
      COMPARISON_HREF,
    );
  });

  it('marks the catalogue link active on the catalogue route (FR-615)', () => {
    pathname.current = CATALOGUE_HREF;
    render(<LifelongLearningNav />);

    expect(screen.getByRole('link', { name: /course catalogue/i })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: /compare/i })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('keeps the catalogue link active on a nested course details route (FR-615)', () => {
    pathname.current = `${CATALOGUE_HREF}/data-analytics-essentials`;
    render(<LifelongLearningNav />);

    expect(screen.getByRole('link', { name: /course catalogue/i })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('marks only Compare active on the comparison route, not the catalogue (FR-615)', () => {
    pathname.current = COMPARISON_HREF;
    render(<LifelongLearningNav />);

    expect(screen.getByRole('link', { name: /compare/i })).toHaveAttribute(
      'aria-current',
      'page',
    );
    // The comparison route is nested under the catalogue path, so the catalogue
    // link must NOT also appear active.
    expect(screen.getByRole('link', { name: /course catalogue/i })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('marks no item active on the Lifelong Learning landing (FR-615)', () => {
    pathname.current = '/lifelong-learning';
    render(<LifelongLearningNav />);

    expect(screen.getByRole('link', { name: /course catalogue/i })).not.toHaveAttribute(
      'aria-current',
    );
    expect(screen.getByRole('link', { name: /compare/i })).not.toHaveAttribute(
      'aria-current',
    );
  });
});
