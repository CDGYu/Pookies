import { NavLink, Outlet } from 'react-router';
import { BarChart3, Package, Calculator } from 'lucide-react';

const tabs = [
  { to: '/manager/sales',   label: 'Sales & Reports', icon: BarChart3 },
  { to: '/manager/stock',   label: 'Stock',           icon: Package },
  { to: '/manager/costing', label: 'Product Costing', icon: Calculator },
];

export function ManagerLayout() {
  return (
    <>
      <div style={{ background: 'var(--matcha-800)' }} className="px-6">
        <div className="max-w-7xl mx-auto flex gap-1">
          {tabs.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-3 text-sm rounded-t-lg mt-1 transition-colors ${
                  isActive ? 'bg-[var(--cream)] text-[var(--matcha-800)] font-semibold'
                           : 'text-white/70 hover:text-white hover:bg-white/10'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </div>
      </div>
      <main className="max-w-7xl mx-auto px-6 py-6">
        <Outlet />
      </main>
    </>
  );
}
