import { forwardRef } from 'react';
import { Sale } from '../../services/salesApi';
import { formatPeso } from '../common/Money';

export const Receipt = forwardRef<HTMLDivElement, { sale: Sale }>(({ sale }, ref) => {
  const time = new Date(sale.createdAt).toLocaleString('en-PH', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const num = String(sale.id).padStart(6, '0');
  return (
    <div ref={ref} className="bg-white p-5 font-mono text-xs text-[var(--cocoa)]" style={{ width: 280 }}>
      <div className="text-center font-bold">🍪 POOKIES</div>
      <div className="text-center text-[var(--sand)] mb-2">Sale #{num} · {time}</div>
      <div className="border-t border-dashed border-[var(--sand)] my-2" />
      {sale.items.map((it, i) => (
        <div key={i} className="flex justify-between">
          <span className="truncate pr-2">{it.name} ×{it.quantity}</span>
          <span>{it.lineTotal.toFixed(2)}</span>
        </div>
      ))}
      <div className="border-t border-dashed border-[var(--sand)] my-2" />
      <div className="flex justify-between font-bold"><span>TOTAL</span><span>{formatPeso(sale.total)}</span></div>
      <div className="flex justify-between"><span>{sale.payment.method.toUpperCase()}</span>
        <span>{sale.payment.amountTendered != null ? sale.payment.amountTendered.toFixed(2) : sale.total.toFixed(2)}</span></div>
      {sale.payment.changeDue ? (
        <div className="flex justify-between"><span>Change</span><span>{sale.payment.changeDue.toFixed(2)}</span></div>
      ) : null}
      {sale.payment.referenceNo ? (
        <div className="flex justify-between"><span>Ref</span><span>{sale.payment.referenceNo}</span></div>
      ) : null}
      <div className="text-center text-[var(--sand)] mt-2">Salamat! 💚</div>
    </div>
  );
});
Receipt.displayName = 'Receipt';
