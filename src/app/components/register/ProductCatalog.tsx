import { useState } from 'react';
import { CATALOG, CatalogCategory, CatalogProduct, ProductVariant } from '../../data/catalog';
import { useCart } from '../../state/CartContext';
import { CategoryTabs } from './CategoryTabs';
import { ProductTile } from './ProductTile';
import { VariantPicker } from './VariantPicker';
import { MixedBoxBuilder } from './MixedBoxBuilder';

export function ProductCatalog() {
  const { add } = useCart();
  const [category, setCategory] = useState<CatalogCategory>('cookies');
  const [picking, setPicking] = useState<CatalogProduct | null>(null);
  const [building, setBuilding] = useState<CatalogProduct | null>(null);

  const products = CATALOG.filter(p => p.category === category);

  const select = (p: CatalogProduct) => {
    if (p.isMixedBox) { setBuilding(p); return; }
    if (p.variants.length === 1) { addVariant(p, p.variants[0]); return; }
    setPicking(p);
  };

  const addVariant = (p: CatalogProduct, v: ProductVariant) => {
    add({ productId: p.id, variantId: v.id, name: `${p.name} · ${v.label}`, unitPrice: v.price, recipeSku: v.recipeSku });
    setPicking(null);
  };

  return (
    <div>
      <CategoryTabs active={category} onChange={setCategory} />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {products.map(p => <ProductTile key={p.id} product={p} onSelect={select} />)}
      </div>

      {picking && <VariantPicker product={picking} onPick={v => addVariant(picking, v)} onClose={() => setPicking(null)} />}
      {building && (
        <MixedBoxBuilder
          product={building}
          onConfirm={(label, summary) => {
            add({ productId: building.id, variantId: building.variants[0].id,
                  name: `Mixed Box · ${summary}`, unitPrice: building.variants[0].price,
                  recipeSku: 'c4', customizationLabel: label });
            setBuilding(null);
          }}
          onClose={() => setBuilding(null)}
        />
      )}
    </div>
  );
}
