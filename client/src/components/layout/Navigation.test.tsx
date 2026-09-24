import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Navigation } from './Navigation';

const pathname = vi.hoisted(() => ({ current: '/' }));

vi.mock('next/navigation', () => ({
  usePathname: () => pathname.current,
}));

describe('Navigation (FR-014, FR-618, NFR-606, AC-614)', () => {
  beforeEach(() => {
    pathname.current = '/';
  });

  it('renders the primary nav landmark and top-level links', () => {
    render(<Navigation />);

    expect(screen.getByRole('navigation', { name: /primary/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^home$/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /lifelong learning/i })).toHaveAttribute(
      'href',
      '/lifelong-learning',
    );
    expect(screen.getByRole('link', { name: /^about$/i })).toHaveAttribute(
      'href',
      '/about',
    );
  });

  it('marks Home active on the home route (exact match)', () => {
    pathname.current = '/';
    render(<Navigation />);

    expect(screen.getByRole('link', { name: /^home$/i })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: /lifelong learning/i })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('keeps the section active on nested routes (prefix match)', () => {
    pathname.current = '/lifelong-learning/courses';
    render(<Navigation />);

    expect(screen.getByRole('link', { name: /lifelong learning/i })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: /^home$/i })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('provides a mobile disclosure toggle for the primary nav', async () => {
    const user = userEvent.setup();
    render(<Navigation />);

    const toggle = screen.getByRole('button', { name: /menu/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });
});
