import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router';
import { toPng } from 'html-to-image';
import { getSale, uploadSaleReceipt, Sale } from '../services/salesApi';
import { Receipt } from '../components/receipt/Receipt';
import { Button } from '../components/common/Button';

export function ReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const [sale, setSale] = useState<Sale | null>(null);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { if (id) getSale(id).then(r => setSale(r.sale)).catch(() => setSale(null)); }, [id]);

  const saveImage = async () => {
    if (!ref.current || !sale) return;
    setSaving(true);
    try {
      const dataUrl = await toPng(ref.current, { pixelRatio: 2 });
      const blob = await (await fetch(dataUrl)).blob();
      await uploadSaleReceipt(sale.id, blob);
      alert('Receipt image saved.');
    } catch (e) {
      alert(`Could not save image: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="max-w-md mx-auto px-6 py-8">
      {!sale ? (
        <p className="text-[var(--taupe)]">Receipt not found. <Link className="text-[var(--matcha-600)]" to="/manager/sales">Back to sales</Link></p>
      ) : (
        <div className="bg-white rounded-2xl border border-[var(--cookie-100)] p-4 shadow-sm">
          <div className="border border-[var(--cookie-100)] rounded-xl overflow-hidden mb-3 flex justify-center">
            <Receipt ref={ref} sale={sale} />
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => window.print()}>Print</Button>
            <Button variant="secondary" onClick={saveImage} disabled={saving}>{saving ? 'Saving…' : 'Save image'}</Button>
            <Link to="/manager/sales"><Button variant="ghost">Back</Button></Link>
          </div>
        </div>
      )}
    </main>
  );
}
