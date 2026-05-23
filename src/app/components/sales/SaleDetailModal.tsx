import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { getSale, Sale } from '../../services/salesApi';
import { Receipt } from '../receipt/Receipt';
import { Button } from '../common/Button';

export function SaleDetailModal({ id, onClose }: { id: number; onClose: () => void }) {
  const [sale, setSale] = useState<Sale | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setSale(null);
    setError(false);
    getSale(id)
      .then(r => { if (active) setSale(r.sale); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [id]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-4 w-full max-w-xs" onClick={e => e.stopPropagation()}>
        {error ? (
          <div className="p-6 text-center">
            <p className="text-[var(--critical)] mb-3 text-sm">Failed to load receipt.</p>
            <Button variant="ghost" onClick={onClose}>Close</Button>
          </div>
        ) : !sale ? <p className="text-[var(--taupe)] p-6 text-center">Loading…</p> : (
          <>
            <div className="border border-[var(--cookie-100)] rounded-xl overflow-hidden mb-3 flex justify-center">
              <Receipt sale={sale} />
            </div>
            <div className="flex gap-2">
              <Link to={`/receipt/${sale.id}`} className="flex-1">
                <Button className="w-full">Open receipt</Button>
              </Link>
              <Button variant="ghost" onClick={onClose}>Close</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
