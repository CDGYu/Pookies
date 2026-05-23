import { Link, useLocation } from 'react-router';
import { Cookie } from 'lucide-react';

export function AppHeader() {
  const { pathname } = useLocation();
  const onManager = pathname.startsWith('/manager');
  const pill = (active: boolean) =>
    `rounded-lg px-4 py-1.5 text-sm transition-colors ${
      active ? 'bg-white text-[var(--matcha-800)] font-semibold' : 'text-white/80 hover:text-white'
    }`;

  return (
    <header style={{ background: 'var(--matcha-600)' }} className="px-6 py-4 shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 rounded-xl p-2"><Cookie className="w-6 h-6 text-white" /></div>
          <div>
            <h1 className="text-white" style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.5rem', lineHeight: 1.2 }}>
              Pookies
            </h1>
            <p className="text-white/70 text-xs">{onManager ? 'Manager' : 'Point of Sale'}</p>
          </div>
        </div>
        <nav className="flex items-center gap-1 bg-black/10 rounded-xl p-1">
          <Link to="/" className={pill(!onManager)}>Register</Link>
          <Link to="/manager" className={pill(onManager)}>Manager</Link>
        </nav>
      </div>
    </header>
  );
}
