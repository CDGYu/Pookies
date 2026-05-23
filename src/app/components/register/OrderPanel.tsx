import { ShoppingCart } from 'lucide-react';
import { useCart } from '../../state/CartContext';
import { OrderLine } from './OrderLine';
import { Money, formatPeso } from '../common/Money';
import { Button } from '../common/Button';

export function OrderPanel({ onCharge }: { onCharge: () => void }) {
  const { lines, inc, dec, remove, total } = useCart();
  return (
    <div className="bg-white rounded-2xl border border-[var(--cookie-100)] shadow-sm flex flex-col h-full">
      <div className="px-4 py-3 border-b border-[var(--cream)] font-semibold text-[var(--cocoa)]">Current Order</div>
      <div className="flex-1 overflow-y-auto px-4">
        {lines.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[var(--sand)] py-12">
            <ShoppingCart className="w-8 h-8 mb-2" />
            <p className="text-sm">Tap a product to start an order</p>
          </div>
        ) : (
          lines.map(l => (
            <OrderLine key={l.lineId} line={l} onInc={() => inc(l.lineId)} onDec={() => dec(l.lineId)} onRemove={() => remove(l.lineId)} />
          ))
        )}
      </div>
      <div className="px-4 py-3 border-t border-[var(--cream)]">
        <div className="flex justify-between text-lg font-bold text-[var(--cocoa)] mb-3">
          <span>Total</span><Money amount={total} />
        </div>
        <Button className="w-full text-base py-3" disabled={lines.length === 0} onClick={onCharge}>
          Charge {total > 0 ? formatPeso(total) : ''}
        </Button>
      </div>
    </div>
  );
}
