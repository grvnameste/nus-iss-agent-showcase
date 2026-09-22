import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddToCompareButton } from './AddToCompareButton';
import { ComparisonAnnouncer } from './ComparisonAnnouncer';
import { ComparisonProvider, MAX_COMPARISON_COURSES } from './comparison-context';
import { makeCourse } from './test-courses';

const course = makeCourse({ id: 'data-analytics', title: 'Data Analytics' });

function renderInProvider(children: ReactNode): void {
  render(
    <ComparisonProvider>
      <ComparisonAnnouncer />
      {children}
    </ComparisonProvider>,
  );
}

describe('AddToCompareButton', () => {
  it('names the course it adds, so several cards are distinguishable', () => {
    renderInProvider(<AddToCompareButton course={course} />);

    expect(
      screen.getByRole('button', { name: /add data analytics to comparison/i }),
    ).toBeInTheDocument();
  });

  it('switches to a remove action once the course is selected (AC-401, AC-403)', async () => {
    const user = userEvent.setup();
    renderInProvider(<AddToCompareButton course={course} />);

    await user.click(screen.getByRole('button', { name: /add data analytics/i }));

    expect(
      screen.getByRole('button', { name: /remove data analytics from comparison/i }),
    ).toBeInTheDocument();
  });

  it('removes the course when the control is used again (AC-402)', async () => {
    const user = userEvent.setup();
    renderInProvider(<AddToCompareButton course={course} />);

    await user.click(screen.getByRole('button', { name: /add data analytics/i }));
    await user.click(screen.getByRole('button', { name: /remove data analytics/i }));

    expect(
      screen.getByRole('button', { name: /add data analytics to comparison/i }),
    ).toBeInTheDocument();
  });

  it('announces the selection change in a live region (NFR-404)', async () => {
    const user = userEvent.setup();
    renderInProvider(<AddToCompareButton course={course} />);

    await user.click(screen.getByRole('button', { name: /add data analytics/i }));

    expect(screen.getByRole('status')).toHaveTextContent(
      /data analytics added to comparison\. 1 of 4 courses selected/i,
    );
  });

  it('explains in its own name why it cannot add at the limit (AC-404)', async () => {
    const user = userEvent.setup();
    const others = ['a', 'b', 'c', 'd'].map((id) =>
      makeCourse({ id, title: `Course ${id.toUpperCase()}` }),
    );

    renderInProvider(
      <>
        {others.map((other) => (
          <AddToCompareButton key={other.id} course={other} />
        ))}
        <AddToCompareButton course={course} />
      </>,
    );

    for (const other of others) {
      await user.click(
        screen.getByRole('button', { name: new RegExp(`add ${other.title}`, 'i') }),
      );
    }

    const blocked = screen.getByRole('button', { name: /cannot add data analytics/i });
    expect(blocked).toHaveAccessibleName(
      new RegExp(`compare up to ${MAX_COMPARISON_COURSES} courses`, 'i'),
    );
    // Kept focusable (aria-disabled, not disabled) so the reason is reachable.
    expect(blocked).toHaveAttribute('aria-disabled', 'true');

    await user.click(blocked);

    expect(screen.getByRole('status')).toHaveTextContent(
      /you can compare up to 4 courses at a time/i,
    );
    expect(
      screen.queryByRole('button', { name: /remove data analytics/i }),
    ).not.toBeInTheDocument();
  });

  it('is operable from the keyboard alone (AC-411)', async () => {
    const user = userEvent.setup();
    renderInProvider(<AddToCompareButton course={course} />);

    await user.tab();
    expect(
      screen.getByRole('button', { name: /add data analytics to comparison/i }),
    ).toHaveFocus();

    await user.keyboard('{Enter}');
    const added = screen.getByRole('button', {
      name: /remove data analytics from comparison/i,
    });
    expect(added).toHaveFocus();

    await user.keyboard(' ');
    expect(
      screen.getByRole('button', { name: /add data analytics to comparison/i }),
    ).toBeInTheDocument();
  });
});
