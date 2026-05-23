import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Money, formatPeso } from './Money';

describe('formatPeso', () => {
  it('formats with peso sign and 2 decimals', () => {
    expect(formatPeso(490)).toBe('₱490.00');
    expect(formatPeso(1234.5)).toBe('₱1,234.50');
  });
  it('treats negative as zero by default', () => {
    expect(formatPeso(-5)).toBe('₱0.00');
  });
});

describe('Money', () => {
  it('renders formatted amount', () => {
    render(<Money amount={135} />);
    expect(screen.getByText('₱135.00')).toBeInTheDocument();
  });
});
