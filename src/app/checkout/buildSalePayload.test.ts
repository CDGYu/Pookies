import { describe, it, expect } from 'vitest';
import { buildSalePayload } from './buildSalePayload';
import type { CartLine } from '../state/CartContext';

const lines: CartLine[] = [
  { lineId: 'a', productId: 'matcha', variantId: 'matcha-16', name: 'Matcha Latte · 16 oz', unitPrice: 160, recipeSku: 'm1_16oz', quantity: 2 },
];

describe('buildSalePayload', () => {
  it('builds items, totals, deductions and costTotal', () => {
    const costMap = { adoleafMatcha: 12.644, oatside: 0.13, condensada: 0.18349, seaSalt: 0.4, cup16oz: 5, straw: 0.48 };
    const payload = buildSalePayload({
      saleNumber: 'X-1',
      lines,
      payment: { method: 'cash', amountTendered: 400, changeDue: 80 },
      costMap,
    });
    expect(payload.total).toBe(320);
    expect(payload.items[0].lineTotal).toBe(320);
    expect(payload.deductions.length).toBeGreaterThan(0);
    expect(payload.costTotal).toBeGreaterThan(0);
  });
});
