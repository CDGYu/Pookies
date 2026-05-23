import { CatalogProduct, ProductVariant } from '../../data/catalog';
import { formatPeso } from '../common/Money';
import { Button } from '../common/Button';

export function VariantPicker({ product, onPick, onClose }: {
  product: CatalogProduct;
  onPick: (v: ProductVariant) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-4">
          <div className="text-4xl">{product.icon}</div>
          <h3 className="text-lg font-semibold text-[var(--cocoa)]">{product.name}</h3>
        </div>
        <div className="flex flex-col gap-2">
          {product.variants.map(v => (
            <button
              key={v.id}
              onClick={() => onPick(v)}
              className="flex justify-between items-center border border-[var(--cookie-100)] rounded-xl px-4 py-3 hover:border-[var(--matcha-600)] hover:bg-[var(--mint)] transition-colors"
            >
              <span className="text-sm text-[var(--cocoa)]">{v.label}</span>
              <span className="text-sm font-semibold text-[var(--matcha-600)]">{formatPeso(v.price)}</span>
            </button>
          ))}
        </div>
        <Button variant="ghost" className="w-full mt-4" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}
