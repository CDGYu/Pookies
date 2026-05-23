import { useState } from 'react';
import { CatalogProduct, MIXED_BOX_FLAVORS, MIXED_BOX_SLOTS } from '../../data/catalog';
import { formatPeso } from '../common/Money';
import { Button } from '../common/Button';

export function MixedBoxBuilder({ product, onConfirm, onClose }: {
  product: CatalogProduct;
  onConfirm: (customizationLabel: string, summary: string) => void;
  onClose: () => void;
}) {
  const [slots, setSlots] = useState<string[]>([]); // base SKU ids
  const add = (baseSku: string) => slots.length < MIXED_BOX_SLOTS && setSlots([...slots, baseSku]);
  const undo = () => setSlots(slots.slice(0, -1));
  const full = slots.length === MIXED_BOX_SLOTS;

  const confirm = () => {
    const label = slots.join(',');
    const counts = MIXED_BOX_FLAVORS.map(f => {
      const n = slots.filter(s => s === f.baseSku).length;
      return n ? `${n}× ${f.name}` : null;
    }).filter(Boolean).join(', ');
    onConfirm(label, counts);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-[var(--cocoa)] text-center">{product.icon} Mixed Box — pick 5</h3>
        <p className="text-xs text-[var(--sand)] text-center mb-4">{formatPeso(product.variants[0].price)} · {slots.length}/{MIXED_BOX_SLOTS} chosen</p>

        <div className="flex justify-center gap-2 mb-4">
          {Array.from({ length: MIXED_BOX_SLOTS }).map((_, i) => (
            <div key={i} className="w-9 h-9 rounded-lg border border-[var(--cookie-100)] flex items-center justify-center text-lg bg-[var(--cream)]">
              {slots[i] ? MIXED_BOX_FLAVORS.find(f => f.baseSku === slots[i])?.icon : ''}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {MIXED_BOX_FLAVORS.map(f => (
            <button key={f.baseSku} onClick={() => add(f.baseSku)} disabled={full}
              className="border border-[var(--cookie-100)] rounded-xl py-3 hover:border-[var(--matcha-600)] hover:bg-[var(--mint)] disabled:opacity-40 transition-colors">
              <div className="text-2xl">{f.icon}</div>
              <div className="text-xs text-[var(--cocoa)]">{f.name}</div>
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" onClick={undo} disabled={!slots.length}>Undo</Button>
          <Button className="flex-1" onClick={confirm} disabled={!full}>Add to order</Button>
        </div>
        <Button variant="ghost" className="w-full mt-2" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}
