import { describe, it, expect } from 'vitest';
import { CATALOG, CatalogProduct } from './catalog';
import { RECIPE_BOOK } from '../hooks/useInventorySync';

describe('catalog', () => {
  it('every non-mixed variant maps to a real RECIPE_BOOK sku', () => {
    for (const product of CATALOG) {
      if (product.isMixedBox) continue;
      for (const v of product.variants) {
        expect(RECIPE_BOOK[v.recipeSku], `${v.id} -> ${v.recipeSku}`).toBeDefined();
      }
    }
  });

  it('has exactly one mixed-box product mapping to c4', () => {
    const mixed = CATALOG.filter((p: CatalogProduct) => p.isMixedBox);
    expect(mixed).toHaveLength(1);
    expect(mixed[0].variants[0].recipeSku).toBe('c4');
  });

  it('covers the three catalog categories', () => {
    const cats = new Set(CATALOG.map(p => p.category));
    expect(cats).toEqual(new Set(['cookies', 'drinks', 'bundles']));
  });
});
