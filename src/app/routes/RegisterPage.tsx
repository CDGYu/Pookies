import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { ProductCatalog } from '../components/register/ProductCatalog';
import { OrderPanel } from '../components/register/OrderPanel';
import { PaymentModal } from '../components/payment/PaymentModal';
import { Receipt } from '../components/receipt/Receipt';
import { Button } from '../components/common/Button';
import { useCart } from '../state/CartContext';
import { buildSalePayload } from '../checkout/buildSalePayload';
import { createSale, uploadSaleReceipt, PaymentPayload, Sale } from '../services/salesApi';
import { getStock } from '../services/inventoryApi';

type Stage = 'cart' | 'payment' | 'receipt';

export function RegisterPage() {
  const { lines, total, clear } = useCart();
  const [stage, setStage] = useState<Stage>('cart');
  const [busy, setBusy] = useState(false);
  const [sale, setSale] = useState<Sale | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const handleConfirm = async (payment: PaymentPayload) => {
    setBusy(true);
    try {
      // cost map from live stock
      const stock = await getStock();
      const costMap: Record<string, number> = {};
      for (const i of stock.ingredients) costMap[i.id] = i.unit_cost;

      const saleNumber =
        (globalThis.crypto?.randomUUID?.() ?? `S-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      const payload = buildSalePayload({ saleNumber, lines, payment, costMap });

      const res = await createSale(payload);
      setSale(res.sale);
      setStage('receipt');
      clear();

      if (res.criticalAlerts.length) {
        console.warn('[checkout] critical stock:', res.criticalAlerts.map(a => a.name).join(', '));
      }

      // Non-blocking receipt capture
      setTimeout(async () => {
        try {
          if (receiptRef.current) {
            const dataUrl = await toPng(receiptRef.current, { pixelRatio: 2 });
            const blob = await (await fetch(dataUrl)).blob();
            await uploadSaleReceipt(res.sale.id, blob);
          }
        } catch (e) {
          console.warn('[checkout] receipt image not saved:', e);
        }
      }, 50);
    } catch (err) {
      alert(`Sale failed: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const newSale = () => { setSale(null); setStage('cart'); };

  return (
    <main className="max-w-7xl mx-auto px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 items-start">
        <ProductCatalog />
        <div className="lg:sticky lg:top-6 h-[calc(100vh-7rem)]">
          <OrderPanel onCharge={() => lines.length && setStage('payment')} />
        </div>
      </div>

      {stage === 'payment' && (
        <PaymentModal total={total} busy={busy} onConfirm={handleConfirm} onClose={() => setStage('cart')} />
      )}

      {stage === 'receipt' && sale && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-4 w-full max-w-xs">
            <div className="border border-[var(--cookie-100)] rounded-xl overflow-hidden mb-3 flex justify-center">
              <Receipt ref={receiptRef} sale={sale} />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={newSale}>New sale</Button>
              <Button variant="secondary" onClick={() => window.print()}>Print</Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
