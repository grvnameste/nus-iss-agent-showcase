import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddToCompareButton } from './AddToCompareButton';
import { ComparisonAnnouncer } from './ComparisonAnnouncer';
import { ComparisonProvider, MAX_COMPARISON_COURSES } from './comparison-context';
import { NotificationProvider } from '@/components/notifications/notification-context';
import { makeCourse } from './test-courses';

const course = makeCourse({ id: 'data-analytics', title: 'Data Analytics' });

/**
 * The button now emits a *global* notification on the 'full' outcome (Spec 06,
 * TASK-615), so it needs the `NotificationProvider` mounted too. The comparison
 * announcer's own live region is unchanged and still asserted below.
 */
function renderInProvider(children: ReactNode): void {
  render(
    <ComparisonProvider>
      <NotificationProvider>
        <ComparisonAnnouncer />
        {children}
      </NotificationProvider>
    </ComparisonProvider>,
  );
}

/** The comparison announcer is the `status` region carrying the selection text. */
function comparisonStatusText(): string {
  const region = screen
    .getAllByRole('status')
    .find((element) => element.className.includes('sr-only'));
  return region?.textContent ?? '';
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

    expect(comparisonStatusText()).toMatch(
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

    expect(comparisonStatusText()).toMatch(
      /you can compare up to 4 courses at a time/i,
    );
    expect(
      screen.queryByRole('button', { name: /remove data analytics/i }),
    ).not.toBeInTheDocument();
  });

  it('surfaces a global notification when an add is rejected at capacity (FR-621)', async () => {
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

    // The rejected add is at capacity: the global (assertive) channel announces
    // it with a colour-independent textual tone label, additive to the
    // comparison announcer's own live region.
    await user.click(screen.getByRole('button', { name: /cannot add data analytics/i }));

    const assertive = screen.getByTestId('notification-region-assertive');
    expect(assertive).toHaveTextContent(/Error:/);
    expect(assertive).toHaveTextContent(
      new RegExp(`comparison is full \\(max ${MAX_COMPARISON_COURSES}\\)`, 'i'),
    );
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
