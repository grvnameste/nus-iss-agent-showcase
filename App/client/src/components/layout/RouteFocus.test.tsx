import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { RouteFocus } from './RouteFocus';
import { PageContainer } from './PageContainer';

// The pathname is the only navigation input RouteFocus reads. A hoisted ref lets
// each test drive a client-side "route change" deterministically by mutating
// `pathname.current` and re-rendering — no real router or network involved.
const pathname = vi.hoisted(() => ({ current: '/' }));

vi.mock('next/navigation', () => ({
  usePathname: () => pathname.current,
}));

/**
 * Renders the shell seam under test: the focus manager alongside the focusable
 * main landmark it targets, plus a preceding interactive control that stands in
 * for the link a user would have activated to navigate.
 */
function renderShell(): ReturnType<typeof render> {
  return render(
    <>
      <RouteFocus />
      <a href="/somewhere">a nav link</a>
      <PageContainer>
        <h1>Page heading</h1>
      </PageContainer>
    </>,
  );
}

describe('RouteFocus (AD-609, NFR-605, AC-615)', () => {
  beforeEach(() => {
    pathname.current = '/';
  });

  it('does not steal focus on the initial render (first load)', () => {
    renderShell();

    // On first paint the browser's native focus handling is correct; the main
    // landmark must not grab focus.
    const main = document.getElementById('main-content');
    expect(document.activeElement).not.toBe(main);
  });

  it('moves focus to the main landmark on a client-side route change', () => {
    const { rerender } = renderShell();

    // Simulate the user having tabbed to / activated a nav link.
    const link = document.querySelector('a');
    link?.focus();
    expect(document.activeElement).toBe(link);

    // A client-side navigation changes the pathname; re-render to reflect it.
    pathname.current = '/lifelong-learning/courses';
    rerender(
      <>
        <RouteFocus />
        <a href="/somewhere">a nav link</a>
        <PageContainer>
          <h1>Page heading</h1>
        </PageContainer>
      </>,
    );

    const main = document.getElementById('main-content');
    expect(document.activeElement).toBe(main);
  });

  it('re-focuses the main landmark on every subsequent route change', () => {
    const { rerender } = renderShell();
    const main = document.getElementById('main-content');

    const navigateTo = (next: string): void => {
      pathname.current = next;
      rerender(
        <>
          <RouteFocus />
          <a href="/somewhere">a nav link</a>
          <PageContainer>
            <h1>Page heading</h1>
          </PageContainer>
        </>,
      );
    };

    navigateTo('/lifelong-learning/courses');
    expect(document.activeElement).toBe(main);

    // Move focus elsewhere, then navigate again — focus returns to main.
    document.querySelector('a')?.focus();
    navigateTo('/lifelong-learning/courses/data-analytics');
    expect(document.activeElement).toBe(main);
  });

  it('renders nothing itself (behavioural component)', () => {
    const { container } = render(<RouteFocus />);
    expect(container).toBeEmptyDOMElement();
  });
});
