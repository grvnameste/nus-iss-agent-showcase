import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Header } from './Header';

// The header renders the primary Navigation, which reads the pathname to mark
// the active section. Stub it so the component renders deterministically.
const pathname = vi.hoisted(() => ({ current: '/' }));

vi.mock('next/navigation', () => ({
  usePathname: () => pathname.current,
}));

describe('Header (FR-616)', () => {
  it('renders a semantic header (banner) landmark', () => {
    render(<Header />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('renders the brand linking home', () => {
    render(<Header />);
    const brand = screen.getByRole('link', { name: /eduagent connect/i });
    expect(brand).toHaveAttribute('href', '/');
  });

  it('renders the primary navigation with its top-level sections', () => {
    render(<Header />);

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
});
