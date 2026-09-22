import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CourseCard } from '@/components/courses/CourseCard';
import { ComparisonBar } from './ComparisonBar';
import { ComparisonProvider, useComparison } from './comparison-context';
import { COMPARISON_HREF } from './routes';
import { makeCourse } from './test-courses';

/**
 * Catalogue → Comparison seam (TASK-609, FR-602, FR-623).
 *
 * Confirmation-only: Specification 04 owns the compare control, the comparison
 * context, and the comparison bar. This test does not re-implement any of them.
 * It locks the integration seam — that adding from a catalogue card updates the
 * shared comparison state and that the shell's ComparisonBar then exposes a link
 * to open the comparison view (AC-602). If either half of the seam breaks, this
 * test fails.
 */

// The ComparisonBar reads usePathname; return the catalogue path so the bar
// renders (it steps aside on the comparison view itself). The card renders a
// next/link and Spec 04's compare control, which touch no navigation state, but
// the module is stubbed so nothing reaches the real App Router in a test.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
  usePathname: () => '/lifelong-learning/courses',
}));

const course = makeCourse({ id: 'data-analytics', title: 'Data Analytics' });

/**
 * A minimal probe that reports whether the shared interface, under the same
 * provider the seam uses, considers the course selected. It reads state only —
 * no side effects — so it never influences the seam it observes.
 */
function ComparisonProbe({
  courseId,
}: {
  courseId: string;
}): React.JSX.Element {
  const { has } = useComparison();
  return <span data-testid="probe-has">{has(courseId) ? 'yes' : 'no'}</span>;
}

function renderSeam(): void {
  render(
    <ComparisonProvider>
      <CourseCard course={course} />
      <ComparisonBar />
      <ComparisonProbe courseId={course.id} />
    </ComparisonProvider>,
  );
}

describe('Catalogue → Comparison seam (FR-602, FR-623)', () => {
  it('has no comparison bar link and reports nothing selected initially', () => {
    renderSeam();

    expect(screen.queryByRole('link', { name: /compare/i })).not.toBeInTheDocument();
    expect(screen.getByTestId('probe-has')).toHaveTextContent('no');
  });

  it('adds from the card, updating shared state and opening the comparison view (AC-602)', async () => {
    const user = userEvent.setup();
    renderSeam();

    await user.click(
      screen.getByRole('button', { name: /add data analytics to comparison/i }),
    );

    // The shell's bar now offers a link to the comparison view, count = 1.
    const link = screen.getByRole('link', { name: /compare 1 selected course$/i });
    expect(link).toHaveAttribute('href', COMPARISON_HREF);
    expect(link).toHaveTextContent('Compare (1)');

    // The same provider now considers the added course part of the comparison,
    // so it will appear in the comparison view (FR-623).
    expect(screen.getByTestId('probe-has')).toHaveTextContent('yes');
  });
});
