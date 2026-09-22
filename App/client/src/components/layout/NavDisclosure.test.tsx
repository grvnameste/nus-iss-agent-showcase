import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NavDisclosure, type NavDisclosureItem } from './NavDisclosure';

const pathname = vi.hoisted(() => ({ current: '/' }));

vi.mock('next/navigation', () => ({
  usePathname: () => pathname.current,
}));

const ITEMS: readonly NavDisclosureItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Lifelong Learning', href: '/lifelong-learning' },
  { label: 'About', href: '/about' },
];

function renderNav(active: string = '/'): void {
  render(
    <NavDisclosure
      ariaLabel="Primary"
      toggleLabel="Menu"
      items={ITEMS}
      isActive={(href) => href === active}
    />,
  );
}

describe('NavDisclosure (NFR-606, AC-614, FR-618)', () => {
  beforeEach(() => {
    pathname.current = '/';
  });

  it('renders a nav landmark and all links (desktop row present in DOM)', () => {
    renderNav();

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

  it('marks the active link with aria-current="page"', () => {
    renderNav('/lifelong-learning');

    expect(screen.getByRole('link', { name: /lifelong learning/i })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: /^home$/i })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('exposes a disclosure toggle that starts collapsed and controls the menu', () => {
    const { container } = render(
      <NavDisclosure
        ariaLabel="Primary"
        toggleLabel="Menu"
        items={ITEMS}
        isActive={(href) => href === '/'}
      />,
    );

    const toggle = screen.getByRole('button', { name: /menu/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    const controls = toggle.getAttribute('aria-controls');
    expect(controls).toBeTruthy();
    // aria-controls must point at an element that actually exists in the nav.
    // useId() ids contain colons, so escape before building the selector.
    expect(
      container.querySelector(`[id="${controls}"]`),
    ).not.toBeNull();
  });

  it('toggles aria-expanded when activated (mouse)', async () => {
    const user = userEvent.setup();
    renderNav();

    const toggle = screen.getByRole('button', { name: /menu/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('is keyboard operable: focusable and toggled with Enter/Space', async () => {
    const user = userEvent.setup();
    renderNav();

    const toggle = screen.getByRole('button', { name: /menu/i });

    await user.tab();
    expect(toggle).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await user.keyboard(' ');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps the links reachable when the menu is open', async () => {
    const user = userEvent.setup();
    renderNav();

    await user.click(screen.getByRole('button', { name: /menu/i }));

    // Links remain in the accessibility tree and are activatable.
    expect(screen.getByRole('link', { name: /^home$/i })).toBeVisible();
    expect(screen.getByRole('link', { name: /^about$/i })).toBeVisible();
  });

  it('closes the menu with Escape and returns focus to the toggle', async () => {
    const user = userEvent.setup();
    renderNav();

    const toggle = screen.getByRole('button', { name: /menu/i });
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await user.keyboard('{Escape}');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
  });

  it('collapses the menu after activating a link', async () => {
    const user = userEvent.setup();
    renderNav();

    const toggle = screen.getByRole('button', { name: /menu/i });
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await user.click(screen.getByRole('link', { name: /^about$/i }));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });
});
