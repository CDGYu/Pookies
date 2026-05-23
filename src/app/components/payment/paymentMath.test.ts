import { describe, it, expect } from 'vitest';
import { changeDue, isPaymentValid } from './paymentMath';

describe('changeDue', () => {
  it('is tendered minus total, never negative', () => {
    expect(changeDue(490, 500)).toBe(10);
    expect(changeDue(490, 400)).toBe(0);
  });
});

describe('isPaymentValid', () => {
  it('cash requires tendered >= total', () => {
    expect(isPaymentValid({ method: 'cash', total: 100, tendered: 100 })).toBe(true);
    expect(isPaymentValid({ method: 'cash', total: 100, tendered: 90 })).toBe(false);
  });
  it('gcash/card are valid (reference optional)', () => {
    expect(isPaymentValid({ method: 'gcash', total: 100 })).toBe(true);
    expect(isPaymentValid({ method: 'card', total: 100 })).toBe(true);
  });
  it('split must sum to total', () => {
    expect(isPaymentValid({ method: 'split', total: 100, cash: 60, ewallet: 40 })).toBe(true);
    expect(isPaymentValid({ method: 'split', total: 100, cash: 60, ewallet: 30 })).toBe(false);
  });
});
