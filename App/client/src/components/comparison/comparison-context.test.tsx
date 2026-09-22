import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  ComparisonProvider,
  MAX_COMPARISON_COURSES,
  useComparison,
} from './comparison-context';
import { makeCourse } from './test-courses';

function wrapper({ children }: { children: ReactNode }): React.JSX.Element {
  return <ComparisonProvider>{children}</ComparisonProvider>;
}

function renderComparison() {
  return renderHook(() => useComparison(), { wrapper });
}

describe('useComparison', () => {
  it('starts empty', () => {
    const { result } = renderComparison();

    expect(result.current.items).toEqual([]);
    expect(result.current.count).toBe(0);
    expect(result.current.isFull).toBe(false);
    expect(result.current.max).toBe(MAX_COMPARISON_COURSES);
  });

  it('adds a course and increments the count (AC-401)', () => {
    const { result } = renderComparison();
    const course = makeCourse({ id: 'data-analytics' });

    act(() => {
      expect(result.current.add(course)).toBe('added');
    });

    expect(result.current.items).toEqual([course]);
    expect(result.current.count).toBe(1);
    expect(result.current.has('data-analytics')).toBe(true);
  });

  it('removes a course and decrements the count (AC-402)', () => {
    const { result } = renderComparison();
    const first = makeCourse({ id: 'first' });
    const second = makeCourse({ id: 'second' });

    act(() => {
      result.current.add(first);
      result.current.add(second);
    });
    act(() => {
      result.current.remove('first');
    });

    expect(result.current.items).toEqual([second]);
    expect(result.current.count).toBe(1);
    expect(result.current.has('first')).toBe(false);
  });

  it('ignores removing a course that is not selected', () => {
    const { result } = renderComparison();
    const course = makeCourse({ id: 'only' });

    act(() => {
      result.current.add(course);
    });
    act(() => {
      result.current.remove('never-added');
    });

    expect(result.current.items).toEqual([course]);
  });

  it('does not add the same course twice (AC-403)', () => {
    const { result } = renderComparison();
    const course = makeCourse({ id: 'duplicate' });

    act(() => {
      result.current.add(course);
    });
    act(() => {
      expect(result.current.add(course)).toBe('duplicate');
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.count).toBe(1);
  });

  it('caps the comparison at four courses and keeps the existing selection (AC-404)', () => {
    const { result } = renderComparison();
    const selected = ['a', 'b', 'c', 'd'].map((id) => makeCourse({ id }));

    act(() => {
      for (const course of selected) result.current.add(course);
    });

    expect(result.current.count).toBe(MAX_COMPARISON_COURSES);
    expect(result.current.isFull).toBe(true);

    act(() => {
      expect(result.current.add(makeCourse({ id: 'e' }))).toBe('full');
    });

    expect(result.current.items).toEqual(selected);
    expect(result.current.has('e')).toBe(false);
  });

  it('compares at most four courses', () => {
    expect(MAX_COMPARISON_COURSES).toBe(4);
  });

  it('clears the whole selection', () => {
    const { result } = renderComparison();

    act(() => {
      result.current.add(makeCourse({ id: 'a' }));
      result.current.add(makeCourse({ id: 'b' }));
    });
    act(() => {
      result.current.clear();
    });

    expect(result.current.items).toEqual([]);
    expect(result.current.count).toBe(0);
  });

  it('keeps courses in the order they were added (NFR-406)', () => {
    const { result } = renderComparison();
    const ids = ['charlie', 'alpha', 'bravo'];

    act(() => {
      for (const id of ids) result.current.add(makeCourse({ id }));
    });

    expect(result.current.items.map((item) => item.id)).toEqual(ids);
  });

  it('reports the outcome of the last add for announcement (FR-404, NFR-404)', () => {
    const { result } = renderComparison();
    const course = makeCourse({ id: 'announced', title: 'Announced Course' });

    expect(result.current.status).toBe('');

    act(() => {
      result.current.add(course);
    });
    expect(result.current.status).toMatch(/announced course/i);
    expect(result.current.status).toMatch(/1 of 4/i);

    act(() => {
      result.current.remove('announced');
    });
    expect(result.current.status).toMatch(/removed/i);
  });

  it('announces why an add was rejected at the limit', () => {
    const { result } = renderComparison();

    act(() => {
      for (const id of ['a', 'b', 'c', 'd']) result.current.add(makeCourse({ id }));
    });
    act(() => {
      result.current.add(makeCourse({ id: 'e', title: 'Fifth Course' }));
    });

    expect(result.current.status).toMatch(/compare up to 4 courses/i);
  });
});

describe('useComparison outside a provider', () => {
  it('fails loudly rather than silently losing state', () => {
    // React logs the render error itself; the throw is the assertion here.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(() => renderHook(() => useComparison())).toThrowError(/ComparisonProvider/i);
    } finally {
      consoleError.mockRestore();
    }
  });
});

describe('comparison session persistence (FR-407)', () => {
  it('restores the selection after a reload within the same session', () => {
    const course = makeCourse({ id: 'restored', title: 'Restored Course' });

    const first = renderComparison();
    act(() => {
      first.result.current.add(course);
    });
    first.unmount();

    const second = renderComparison();

    expect(second.result.current.items).toEqual([course]);
    expect(second.result.current.count).toBe(1);
  });

  it('starts empty when the stored selection is unreadable', () => {
    sessionStorage.setItem('eduagent.comparison', 'not json');

    const { result } = renderComparison();

    expect(result.current.items).toEqual([]);
  });

  it('ignores a stored selection that is malformed', () => {
    sessionStorage.setItem(
      'eduagent.comparison',
      JSON.stringify([{ id: 'no-title-here' }]),
    );

    const { result } = renderComparison();

    expect(result.current.items).toEqual([]);
  });

  it('ignores a stored selection larger than the limit', () => {
    sessionStorage.setItem(
      'eduagent.comparison',
      JSON.stringify(['a', 'b', 'c', 'd', 'e'].map((id) => makeCourse({ id }))),
    );

    const { result } = renderComparison();

    expect(result.current.items).toEqual([]);
  });

  it('rejects a stored course missing a field the Course model promises', () => {
    // `items` is a published interface: handing out a partial Course would give
    // a consumer a value TypeScript swore was complete.
    const { skills: _skills, ...withoutSkills } = makeCourse({ id: 'partial' });
    sessionStorage.setItem('eduagent.comparison', JSON.stringify([withoutSkills]));

    const { result } = renderComparison();

    expect(result.current.items).toEqual([]);
  });

  it('rejects a stored course whose enum value is not in the shared model', () => {
    sessionStorage.setItem(
      'eduagent.comparison',
      JSON.stringify([{ ...makeCourse({ id: 'bad-enum' }), courseType: 'nonsense' }]),
    );

    const { result } = renderComparison();

    expect(result.current.items).toEqual([]);
  });
});
