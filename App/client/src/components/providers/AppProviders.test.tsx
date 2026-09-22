import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { act, render, renderHook, screen } from '@testing-library/react';
import { AppProviders } from './AppProviders';
import { useComparison } from '@/components/comparison/comparison-context';
import { useNotify } from '@/components/notifications/notification-context';
import { makeCourse } from '@/components/comparison/test-courses';

function wrapper({ children }: { children: ReactNode }): React.JSX.Element {
  return <AppProviders>{children}</AppProviders>;
}

describe('AppProviders', () => {
  it('renders its children (composition wrapper only)', () => {
    render(
      <AppProviders>
        <p>shell content</p>
      </AppProviders>,
    );

    expect(screen.getByText('shell content')).toBeInTheDocument();
  });

  it('makes comparison state available to descendants (FR-623)', () => {
    // useComparison throws outside a ComparisonProvider, so a successful add
    // proves the Spec 04 provider is mounted under AppProviders.
    const { result } = renderHook(() => useComparison(), { wrapper });
    const course = makeCourse({ id: 'data-analytics' });

    expect(result.current.count).toBe(0);

    act(() => {
      expect(result.current.add(course)).toBe('added');
    });

    expect(result.current.count).toBe(1);
    expect(result.current.has('data-analytics')).toBe(true);
  });

  it('shares one comparison state across sibling consumers (FR-623)', () => {
    // Two hooks rendered under the same provider must observe the same state.
    const { result } = renderHook(
      () => ({ a: useComparison(), b: useComparison() }),
      { wrapper },
    );

    act(() => {
      result.current.a.add(makeCourse({ id: 'shared-course' }));
    });

    expect(result.current.b.has('shared-course')).toBe(true);
    expect(result.current.b.count).toBe(1);
  });

  it('provides a global notification channel to descendants (FR-621)', () => {
    // useNotify throws outside a NotificationProvider; reaching it proves the
    // shell-level notification provider is mounted under AppProviders.
    const { result } = renderHook(() => useNotify(), { wrapper });

    expect(result.current.notifications).toEqual([]);

    act(() => {
      result.current.notify({ message: 'Enquiry submitted' });
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0]?.message).toBe('Enquiry submitted');
  });
});
