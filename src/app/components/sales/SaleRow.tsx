import { SaleListItem } from '../../services/salesApi';
import { formatPeso } from '../common/Money';

const PAY_ICON: Record<string, string> = { cash: '💵', gcash: '📱', card: '💳', split: '⚡' };

export function SaleRow({ sale, onClick }: { sale: SaleListItem; onClick: () => void }) {
  const time = new Date(sale.createdAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
  return (
    <button onClick={onClick}
      className="w-full grid grid-cols-[1fr_1fr_1fr_auto] gap-2 px-4 py-2.5 text-sm text-left hover:bg-[var(--cream)] border-b border-[var(--cream)]">
      <span className="text-[var(--cocoa)]">#{String(sale.id).padStart(6, '0')}</span>
      <span className="text-[var(--sand)]">{time}</span>
      <span className="capitalize">{PAY_ICON[sale.paymentMethod] ?? ''} {sale.paymentMethod}</span>
      <span className="font-semibold text-[var(--cocoa)]">{formatPeso(sale.total)}</span>
    </button>
  );
}
