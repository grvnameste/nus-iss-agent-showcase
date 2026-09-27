import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatStrip, type StatItem } from './StatStrip';

const items: readonly StatItem[] = [
  { value: '4', label: 'Programme areas' },
  { value: '3', label: 'Learning formats' },
];

describe('StatStrip', () => {
  it('renders each stat value and label', () => {
    render(<StatStrip items={items} />);

    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('Programme areas')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Learning formats')).toBeInTheDocument();
  });

  it('always renders the default illustrative caption', () => {
    render(<StatStrip items={items} />);

    expect(screen.getByText('Illustrative synthetic data')).toBeInTheDocument();
  });

  it('renders a custom caption when provided', () => {
    render(<StatStrip items={items} caption="Illustrative figures only" />);

    expect(screen.getByText('Illustrative figures only')).toBeInTheDocument();
    expect(
      screen.queryByText('Illustrative synthetic data'),
    ).not.toBeInTheDocument();
  });

  it('renders the caption even with no items', () => {
    render(<StatStrip items={[]} />);

    expect(screen.getByText('Illustrative synthetic data')).toBeInTheDocument();
  });
});
