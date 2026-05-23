import { DailyReport as Report } from '../../services/salesApi';
import { formatPeso } from '../common/Money';

export function SummaryCards({ report }: { report: Report }) {
  const cards = [
    { label: "Today's Sales", value: formatPeso(report.totalSales), primary: true },
    { label: 'Orders', value: String(report.orderCount) },
    { label: 'Est. Profit', value: formatPeso(report.estProfit) },
    { label: 'Top Seller', value: report.topSeller ?? '—' },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map(c => (
        <div key={c.label}
          className={`rounded-2xl p-4 border ${c.primary
            ? 'bg-[var(--matcha-600)] text-white border-transparent'
            : 'bg-white border-[var(--cookie-100)]'}`}>
          <div className={`text-xs ${c.primary ? 'text-white/80' : 'text-[var(--sand)]'}`}>{c.label}</div>
          <div className={`text-xl font-extrabold mt-1 ${c.primary ? 'text-white' : 'text-[var(--cocoa)]'}`}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}
