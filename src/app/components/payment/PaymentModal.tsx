import { useState } from 'react';
import { PaymentMethod, changeDue, isPaymentValid } from './paymentMath';
import { PaymentPayload } from '../../services/salesApi';
import { formatPeso } from '../common/Money';
import { Button } from '../common/Button';

const METHODS: { id: PaymentMethod; label: string }[] = [
  { id: 'cash', label: '💵 Cash' }, { id: 'gcash', label: '📱 GCash' },
  { id: 'card', label: '💳 Card' }, { id: 'split', label: '⚡ Split' },
];

export function PaymentModal({ total, busy, onConfirm, onClose }: {
  total: number;
  busy: boolean;
  onConfirm: (payment: PaymentPayload) => void;
  onClose: () => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [tendered, setTendered] = useState('');
  const [cash, setCash] = useState('');
  const [ewallet, setEwallet] = useState('');
  const [reference, setReference] = useState('');

  const t = parseFloat(tendered) || 0;
  const c = parseFloat(cash) || 0;
  const e = parseFloat(ewallet) || 0;
  const valid = isPaymentValid({ method, total, tendered: t, cash: c, ewallet: e });

  const submit = () => {
    if (!valid || busy) return;
    const payment: PaymentPayload = { method };
    if (method === 'cash') { payment.amountTendered = t; payment.changeDue = changeDue(total, t); }
    if (method === 'gcash' || method === 'card') { payment.referenceNo = reference || undefined; }
    if (method === 'split') {
      payment.cashAmount = c; payment.ewalletAmount = e;
      payment.referenceNo = reference || undefined;
      payment.changeDue = 0;
    }
    onConfirm(payment);
  };

  const field = 'w-full border border-[var(--cookie-100)] rounded-xl px-3 py-2 bg-[var(--cream)] text-[var(--cocoa)] focus:outline-none focus:ring-2 focus:ring-[var(--matcha-600)]/40';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={ev => ev.stopPropagation()}>
        <p className="text-center text-xs text-[var(--sand)]">Amount due</p>
        <p className="text-center text-3xl font-extrabold text-[var(--cocoa)] mb-4">{formatPeso(total)}</p>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {METHODS.map(m => (
            <button key={m.id} onClick={() => setMethod(m.id)}
              className={`rounded-xl py-2 text-sm border transition-colors ${
                method === m.id ? 'border-[var(--matcha-600)] bg-[var(--mint)] text-[var(--matcha-800)] font-semibold'
                                : 'border-[var(--cookie-100)] text-[var(--taupe)]'}`}>
              {m.label}
            </button>
          ))}
        </div>

        {method === 'cash' && (
          <div className="space-y-2">
            <label className="text-xs text-[var(--sand)]">Cash tendered</label>
            <input className={field} type="number" inputMode="decimal" value={tendered} onChange={ev => setTendered(ev.target.value)} placeholder="0.00" />
            <div className="flex justify-between bg-[var(--mint)] rounded-xl px-3 py-2 font-semibold text-[var(--matcha-800)]">
              <span>Change</span><span>{formatPeso(changeDue(total, t))}</span>
            </div>
          </div>
        )}

        {(method === 'gcash' || method === 'card') && (
          <div className="space-y-2">
            <label className="text-xs text-[var(--sand)]">Reference no. (optional)</label>
            <input className={field} value={reference} onChange={ev => setReference(ev.target.value)} placeholder="e.g. GCash ref" />
          </div>
        )}

        {method === 'split' && (
          <div className="space-y-2">
            <label className="text-xs text-[var(--sand)]">Cash portion</label>
            <input className={field} type="number" inputMode="decimal" value={cash} onChange={ev => setCash(ev.target.value)} placeholder="0.00" />
            <label className="text-xs text-[var(--sand)]">E-wallet / card portion</label>
            <input className={field} type="number" inputMode="decimal" value={ewallet} onChange={ev => setEwallet(ev.target.value)} placeholder="0.00" />
            <input className={field} value={reference} onChange={ev => setReference(ev.target.value)} placeholder="Reference no. (optional)" />
            <p className={`text-xs ${valid ? 'text-[var(--matcha-600)]' : 'text-[var(--critical)]'}`}>
              Cash + e-wallet must equal {formatPeso(total)} (now {formatPeso(c + e)})
            </p>
          </div>
        )}

        <div className="flex gap-2 mt-5">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button className="flex-1" onClick={submit} disabled={!valid || busy}>
            {busy ? 'Processing…' : 'Complete sale'}
          </Button>
        </div>
      </div>
    </div>
  );
}
