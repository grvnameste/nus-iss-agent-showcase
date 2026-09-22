import { useEffect, useRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ComparisonBar } from './ComparisonBar';
import { ComparisonProvider, useComparison } from './comparison-context';
import { makeCourse } from './test-courses';
import type { Course } from '@/lib/courses/types';

const pathname = vi.hoisted(() => ({ current: '/lifelong-learning/courses' }));

vi.mock('next/navigation', () => ({
  usePathname: () => pathname.current,
}));

function renderBar(courses: Course[]): void {
  function Seed(): null {
    const { add } = useComparison();
    const seeded = useRef(false);

    useEffect(() => {
      if (seeded.current) return;
      seeded.current = true;
      for (const course of courses) add(course);
    }, [add]);

    return null;
  }

  render(
    <ComparisonProvider>
      <Seed />
      <ComparisonBar />
    </ComparisonProvider>,
  );
}

describe('ComparisonBar', () => {
  beforeEach(() => {
    pathname.current = '/lifelong-learning/courses';
  });

  it('stays out of the way while nothing is selected', () => {
    renderBar([]);

    expect(screen.queryByRole('link', { name: /compare/i })).not.toBeInTheDocument();
  });

  it('shows the current count and links to the comparison view (AC-401, FR-408)', () => {
    renderBar([makeCourse({ id: 'a' }), makeCourse({ id: 'b' })]);

    const link = screen.getByRole('link', { name: /compare 2 selected courses/i });
    expect(link).toHaveAttribute('href', '/lifelong-learning/courses/compare');
    expect(link).toHaveTextContent('Compare (2)');
  });

  it('uses the singular form for one course', () => {
    renderBar([makeCourse({ id: 'only' })]);

    expect(
      screen.getByRole('link', { name: /compare 1 selected course$/i }),
    ).toHaveTextContent('Compare (1)');
  });

  it('steps aside on the comparison view itself, which already shows the count', () => {
    pathname.current = '/lifelong-learning/courses/compare';

    renderBar([makeCourse({ id: 'a' }), makeCourse({ id: 'b' })]);

    expect(screen.queryByRole('link', { name: /compare/i })).not.toBeInTheDocument();
  });
});
