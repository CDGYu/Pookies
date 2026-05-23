import { describe, it, expect } from 'vitest';
import { cartReducer, cartTotal, NewLine } from './CartContext';

const classicBox5: NewLine = {
  productId: 'classic', variantId: 'classic-box5', name: 'Classic · Box of 5',
  unitPrice: 135, recipeSku: 'c1_box5',
};
const matcha16: NewLine = {
  productId: 'matcha', variantId: 'matcha-16', name: 'Matcha Latte · 16 oz',
  unitPrice: 160, recipeSku: 'm1_16oz',
};

describe('cartReducer', () => {
  it('adds a line', () => {
    const s = cartReducer([], { type: 'ADD', line: classicBox5 });
    expect(s).toHaveLength(1);
    expect(s[0].quantity).toBe(1);
  });

  it('merges identical variant by incrementing quantity', () => {
    let s = cartReducer([], { type: 'ADD', line: classicBox5 });
    s = cartReducer(s, { type: 'ADD', line: classicBox5 });
    expect(s).toHaveLength(1);
    expect(s[0].quantity).toBe(2);
  });

  it('keeps distinct variants as separate lines and totals correctly', () => {
    let s = cartReducer([], { type: 'ADD', line: classicBox5 });
    s = cartReducer(s, { type: 'ADD', line: matcha16 });
    s = cartReducer(s, { type: 'ADD', line: matcha16 });
    expect(s).toHaveLength(2);
    expect(cartTotal(s)).toBe(135 + 320);
  });

  it('decrements and removes at zero', () => {
    let s = cartReducer([], { type: 'ADD', line: classicBox5 });
    const id = s[0].lineId;
    s = cartReducer(s, { type: 'DEC', lineId: id });
    expect(s).toHaveLength(0);
  });

  it('does not merge mixed boxes with different customization labels', () => {
    const a: NewLine = { ...classicBox5, productId: 'mixed-box', variantId: 'mixed-box-5', recipeSku: 'c4', customizationLabel: 'c1,c1,c1,c1,c1' };
    const b: NewLine = { ...a, customizationLabel: 'c1,c2,c3,c1,c2' };
    let s = cartReducer([], { type: 'ADD', line: a });
    s = cartReducer(s, { type: 'ADD', line: b });
    expect(s).toHaveLength(2);
  });
});
