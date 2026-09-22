import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageContainer } from './PageContainer';

describe('PageContainer (FR-008, AD-609, NFR-605)', () => {
  it('renders a single <main> landmark that wraps its children', () => {
    render(
      <PageContainer>
        <h1>Course Catalogue</h1>
      </PageContainer>,
    );

    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
    expect(main).toContainElement(screen.getByRole('heading', { level: 1 }));
  });

  it('exposes the main landmark by the id the skip link targets', () => {
    render(
      <PageContainer>
        <p>content</p>
      </PageContainer>,
    );

    // The skip link (`href="#main-content"`) and RouteFocus both target this id.
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  });

  it('makes the main landmark programmatically focusable for route-change focus management', () => {
    render(
      <PageContainer>
        <p>content</p>
      </PageContainer>,
    );

    const main = screen.getByRole('main');
    // tabIndex=-1: focusable via script (RouteFocus / skip link) but not added
    // to the natural tab order.
    expect(main).toHaveAttribute('tabindex', '-1');

    main.focus();
    expect(document.activeElement).toBe(main);
  });
});
