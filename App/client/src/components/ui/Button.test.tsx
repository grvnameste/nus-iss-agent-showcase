import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button, buttonClasses } from './Button';

/**
 * The shared button styling (FR-620, NFR-604): the {@link Button} primitive and
 * the {@link buttonClasses} helper must produce the same class string for a given
 * variant, so a link styled as a button stays visually identical to a real
 * button without hand-duplicating Tailwind classes.
 */
describe('buttonClasses / Button (FR-620)', () => {
  it('defaults to the primary variant', () => {
    const classes = buttonClasses();
    expect(classes).toContain('bg-sky-700');
    expect(classes).toContain('text-white');
    // Shared base is always present regardless of variant.
    expect(classes).toContain('inline-flex');
    expect(classes).toContain('focus-visible:outline-sky-600');
  });

  it('produces distinct styling per variant', () => {
    expect(buttonClasses('secondary')).toContain('ring-sky-300');
    expect(buttonClasses('ghost')).toContain('bg-transparent');
    expect(buttonClasses('secondary')).not.toContain('bg-sky-700');
  });

  it('appends caller-provided classes', () => {
    expect(buttonClasses('primary', 'mt-4')).toContain('mt-4');
  });

  it('renders the Button primitive with the helper output (single source of truth)', () => {
    render(<Button>Go</Button>);
    const button = screen.getByRole('button', { name: 'Go' });
    // The rendered className is exactly what the helper yields for the same variant.
    expect(button.getAttribute('class')).toBe(buttonClasses('primary'));
    expect(button).toHaveAttribute('type', 'button');
  });
});
