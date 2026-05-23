import { describe, it, expect } from 'vitest';
import { previewCartDeductions, RECIPE_BOOK } from './useInventorySync';

describe('pack6 SKUs', () => {
  it('exist for all three cookie flavors', () => {
    expect(RECIPE_BOOK.c1_pack6).toBeDefined();
    expect(RECIPE_BOOK.c2_pack6).toBeDefined();
    expect(RECIPE_BOOK.c3_pack6).toBeDefined();
  });

  it('Pack of 6 uses 240g dough worth of flour (250 * 240/720 = 83.3333) + 1 box', () => {
    const ded = previewCartDeductions([{ skuId: 'c1_pack6', quantity: 1 }]);
    const flour = ded.find(d => d.ingredientId === 'flour');
    const box = ded.find(d => d.ingredientId === 'packagingBox');
    expect(flour?.totalAmount).toBeCloseTo(83.3333, 3);
    expect(box?.totalAmount).toBe(1);
  });
});
