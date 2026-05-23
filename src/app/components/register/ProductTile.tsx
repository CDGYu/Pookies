import { CatalogProduct } from '../../data/catalog';
import { formatPeso } from '../common/Money';

export function ProductTile({ product, onSelect }: {
  product: CatalogProduct; onSelect: (p: CatalogProduct) => void;
}) {
  const prices = product.variants.map(v => v.price);
  const min = Math.min(...prices);
  const single = product.variants.length === 1;
  return (
    <button
      onClick={() => onSelect(product)}
      className="bg-white border border-[var(--cookie-100)] rounded-2xl p-4 text-center hover:shadow-md hover:border-[var(--matcha-600)]/40 transition-all"
    >
      <div className="text-4xl mb-1">{product.icon}</div>
      <div className="text-sm font-semibold text-[var(--cocoa)]">{product.name}</div>
      <div className="text-xs font-semibold text-[var(--matcha-600)] mt-0.5">
        {single ? formatPeso(min) : `from ${formatPeso(min)}`}
      </div>
    </button>
  );
}
