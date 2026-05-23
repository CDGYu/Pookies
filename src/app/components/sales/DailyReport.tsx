import { DailyReport as Report } from '../../services/salesApi';
import { Card } from '../common/Card';
import { formatPeso } from '../common/Money';

export function DailyReport({ report }: { report: Report }) {
  return (
    <Card className="overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--cream)] font-semibold text-[var(--cocoa)]">End-of-Day Breakdown</div>
      <div className="p-4 text-sm text-[var(--cocoa)]">
        <div className="text-xs uppercase tracking-wide text-[var(--sand)] mb-1">By payment</div>
        {report.byPayment.length === 0 && <p className="text-[var(--sand)]">No sales yet.</p>}
        {report.byPayment.map(p => (
          <div key={p.method} className="flex justify-between mb-0.5">
            <span className="capitalize">{p.method} ({p.count})</span><span>{formatPeso(p.amount)}</span>
          </div>
        ))}
        <div className="text-xs uppercase tracking-wide text-[var(--sand)] mt-3 mb-1">By product</div>
        {report.byProduct.map(p => (
          <div key={p.name} className="flex justify-between mb-0.5">
            <span className="truncate pr-2">{p.name} ×{p.qty}</span><span>{formatPeso(p.revenue)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
