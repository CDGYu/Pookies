import { useState } from 'react';
import { SaleListItem } from '../../services/salesApi';
import { Card } from '../common/Card';
import { SaleRow } from './SaleRow';
import { SaleDetailModal } from './SaleDetailModal';

export function SalesHistory({ sales }: { sales: SaleListItem[] }) {
  const [openId, setOpenId] = useState<number | null>(null);
  return (
    <Card className="overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--cream)] font-semibold text-[var(--cocoa)]">Recent Sales</div>
      {sales.length === 0 ? (
        <p className="p-4 text-sm text-[var(--sand)]">No sales for this day.</p>
      ) : (
        sales.map(s => <SaleRow key={s.id} sale={s} onClick={() => setOpenId(s.id)} />)
      )}
      {openId != null && <SaleDetailModal id={openId} onClose={() => setOpenId(null)} />}
    </Card>
  );
}
