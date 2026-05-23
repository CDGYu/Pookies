import { Minus, Plus, X } from 'lucide-react';
import { CartLine } from '../../state/CartContext';
import { Money } from '../common/Money';

export function OrderLine({ line, onInc, onDec, onRemove }: {
  line: CartLine;
  onInc: () => void; onDec: () => void; onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2 py-2 border-b border-[var(--cream)]">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--cocoa)] truncate">{line.name}</p>
        <Money amount={line.unitPrice * line.quantity} className="text-xs text-[var(--matcha-600)] font-semibold" />
      </div>
      <div className="flex items-center gap-1.5">
        <button onClick={onDec} className="w-6 h-6 rounded-md border border-[var(--cookie-100)] flex items-center justify-center"><Minus className="w-3 h-3" /></button>
        <span className="w-5 text-center text-sm">{line.quantity}</span>
        <button onClick={onInc} className="w-6 h-6 rounded-md border border-[var(--cookie-100)] flex items-center justify-center"><Plus className="w-3 h-3" /></button>
      </div>
      <button onClick={onRemove} className="text-[var(--sand)] hover:text-[var(--critical)]"><X className="w-4 h-4" /></button>
    </div>
  );
}
