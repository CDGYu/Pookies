import { useEffect, useState } from 'react';
import { getDailyReport, listSales, DailyReport as Report, SaleListItem } from '../../services/salesApi';
import { SectionHeader } from '../../components/common/SectionHeader';
import { SummaryCards } from '../../components/sales/SummaryCards';
import { DailyReport } from '../../components/sales/DailyReport';
import { SalesHistory } from '../../components/sales/SalesHistory';

const todayStr = () => new Date().toISOString().slice(0, 10);

export function SalesReportPage() {
  const [date, setDate] = useState(todayStr());
  const [report, setReport] = useState<Report | null>(null);
  const [sales, setSales] = useState<SaleListItem[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all([getDailyReport(date), listSales(date)])
      .then(([r, s]) => { if (active) { setReport(r); setSales(s.sales); } })
      .catch(err => console.error('[SalesReportPage]', err));
    return () => { active = false; };
  }, [date]);

  return (
    <>
      <SectionHeader
        title="Sales & Reports"
        subtitle="Daily totals, history and end-of-day breakdown"
        action={
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="border border-[var(--cookie-100)] rounded-xl px-3 py-2 bg-[var(--cream)] text-sm" />
        }
      />
      {report && <SummaryCards report={report} />}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4">
        <SalesHistory sales={sales} />
        {report && <DailyReport report={report} />}
      </div>
    </>
  );
}
