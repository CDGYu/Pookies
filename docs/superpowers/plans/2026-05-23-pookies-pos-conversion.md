# Pookies POS Conversion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the Pookies inventory app into a POS-first application — a cashier Register that rings up sales and deducts ingredients, plus a Manager back office for stock, sales reports, and costing.

**Architecture:** React Router 7 shell with two areas (`/` Register, `/manager/*` Manager, `/receipt/:id`). Selling reuses the existing `RECIPE_BOOK` deduction logic in `useInventorySync.tsx`. A new Express `/api/sales` layer persists sales in new `sales`/`sale_items` SQLite tables (exempt from the 30-day purge) and applies deductions atomically. A visual refresh lifts the matcha/cream palette into tokens + shared primitives.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind v4, shadcn/ui, lucide-react, React Router 7, Express, better-sqlite3, Vitest (frontend) + node:test (backend), html-to-image (receipt capture).

**Reference spec:** `docs/superpowers/specs/2026-05-23-pookies-pos-conversion-design.md`

**Conventions used throughout:**
- Frontend tests: Vitest. Run a single file with `npx vitest run <path>`; one test with `npx vitest run <path> -t "<name>"`.
- Backend tests: node's built-in runner. Run with `node --test backend/__tests__/<file>`.
- Money is pesos (₱), stored as REAL, displayed with 2 decimals. Ingredient amounts use 4-dp precision (`p4`).
- Commit after every task with the message shown in its final step.

---

## Phase 0 — Tooling, cleanup, theme, primitives

### Task 1: Dependencies & test tooling

**Files:**
- Modify: `package.json` (root)
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`

- [ ] **Step 1: Remove unused MUI stack and add new deps**

Run (project root):

```bash
npm uninstall @mui/material @mui/icons-material @emotion/react @emotion/styled @popperjs/core react-popper react-slick
npm install html-to-image@1.11.13
npm install -D vitest@2.1.8 @testing-library/react@16.1.0 @testing-library/jest-dom@6.6.3 jsdom@25.0.1
```

Expected: installs succeed; `node_modules` updates. (`embla-carousel-react` and `vaul` remain — they are used by shadcn `carousel.tsx`/`drawer.tsx`.)

- [ ] **Step 2: Add the test script**

In `package.json`, add to `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
```

- [ ] **Step 4: Create `src/test/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 5: Add a smoke test to prove the runner works**

Create `src/test/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('test runner', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 6: Run the smoke test**

Run: `npx vitest run src/test/smoke.test.ts`
Expected: 1 passed.

- [ ] **Step 7: Verify the build still works after removing MUI**

Run: `npm run build`
Expected: build completes with no "Cannot resolve '@mui/...'" errors.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/test
git commit -m "chore: add Vitest, html-to-image; remove unused MUI stack"
```

---

### Task 2: Theme tokens

**Files:**
- Modify: `src/styles/theme.css`
- Test: `src/styles/theme.test.ts`

- [ ] **Step 1: Write the failing test (tokens are declared)**

Create `src/styles/theme.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve(__dirname, 'theme.css'), 'utf8');

describe('theme tokens', () => {
  it('declares the Pookies palette as CSS variables', () => {
    for (const token of [
      '--matcha-600', '--matcha-800', '--cream', '--cookie-100',
      '--cocoa', '--taupe', '--sand', '--mint', '--alert', '--critical',
    ]) {
      expect(css).toContain(token);
    }
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/styles/theme.test.ts`
Expected: FAIL (tokens not present yet).

- [ ] **Step 3: Add the tokens to `src/styles/theme.css`**

Append (or create the block if absent):

```css
:root {
  --matcha-600: #4A7C59;
  --matcha-700: #3C6A4A;
  --matcha-800: #2D5A3D;
  --cream:      #FEF9F2;
  --cookie-100: #F0DCC0;
  --cocoa:      #2C1810;
  --taupe:      #7A6558;
  --sand:       #9A8F86;
  --mint:       #E8F2EB;
  --mint-border:#B8D9C2;
  --alert:      #7A4F1E;
  --alert-bg:   #FEF3C7;
  --critical:   #922B21;
  --critical-bg:#FEE2E0;
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx vitest run src/styles/theme.test.ts`
Expected: PASS.

- [ ] **Step 5: Ensure theme.css is imported**

Confirm `src/main.tsx` (or `src/styles/index.css`) imports `theme.css`. If not, add `import './styles/theme.css';` to `src/main.tsx`.

- [ ] **Step 6: Commit**

```bash
git add src/styles/theme.css src/styles/theme.test.ts src/main.tsx
git commit -m "feat: add Pookies palette as theme tokens"
```

---

### Task 3: Shared `Money` primitive (+ Button, Card, Badge, SectionHeader)

**Files:**
- Create: `src/app/components/common/Money.tsx`
- Create: `src/app/components/common/Button.tsx`
- Create: `src/app/components/common/Card.tsx`
- Create: `src/app/components/common/Badge.tsx`
- Create: `src/app/components/common/SectionHeader.tsx`
- Test: `src/app/components/common/Money.test.tsx`

- [ ] **Step 1: Write the failing test for peso formatting**

Create `src/app/components/common/Money.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Money, formatPeso } from './Money';

describe('formatPeso', () => {
  it('formats with peso sign and 2 decimals', () => {
    expect(formatPeso(490)).toBe('₱490.00');
    expect(formatPeso(1234.5)).toBe('₱1,234.50');
  });
  it('treats negative as zero by default', () => {
    expect(formatPeso(-5)).toBe('₱0.00');
  });
});

describe('Money', () => {
  it('renders formatted amount', () => {
    render(<Money amount={135} />);
    expect(screen.getByText('₱135.00')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/app/components/common/Money.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `Money.tsx`**

```tsx
export function formatPeso(amount: number, { allowNegative = false } = {}): string {
  const value = allowNegative ? amount : Math.max(amount, 0);
  return `₱${value.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function Money({
  amount,
  allowNegative = false,
  className,
}: {
  amount: number;
  allowNegative?: boolean;
  className?: string;
}) {
  return <span className={className}>{formatPeso(amount, { allowNegative })}</span>;
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx vitest run src/app/components/common/Money.test.tsx`
Expected: PASS.

- [ ] **Step 5: Implement the remaining presentational primitives**

`src/app/components/common/Button.tsx`:

```tsx
import { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary:   'bg-[var(--matcha-600)] text-white hover:bg-[var(--matcha-700)]',
  secondary: 'bg-white text-[var(--matcha-800)] border border-[var(--cookie-100)] hover:bg-[var(--cream)]',
  ghost:     'bg-transparent text-[var(--taupe)] hover:bg-[var(--cream)]',
  danger:    'bg-[var(--critical)] text-white hover:opacity-90',
};

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
    />
  );
}
```

`src/app/components/common/Card.tsx`:

```tsx
import { HTMLAttributes } from 'react';

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={`bg-white rounded-2xl border border-[var(--cookie-100)] shadow-sm ${className}`}
    />
  );
}
```

`src/app/components/common/Badge.tsx`:

```tsx
import { HTMLAttributes } from 'react';

type Tone = 'matcha' | 'alert' | 'critical' | 'neutral';

const TONES: Record<Tone, string> = {
  matcha:   'bg-[var(--mint)] text-[var(--matcha-800)] border-[var(--mint-border)]',
  alert:    'bg-[var(--alert-bg)] text-[var(--alert)] border-[var(--alert)]/40',
  critical: 'bg-[var(--critical-bg)] text-[var(--critical)] border-[var(--critical)]/40',
  neutral:  'bg-stone-100 text-stone-700 border-stone-300',
};

export function Badge({
  tone = 'neutral',
  className = '',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      {...props}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${TONES[tone]} ${className}`}
    />
  );
}
```

`src/app/components/common/SectionHeader.tsx`:

```tsx
import { ReactNode } from 'react';

export function SectionHeader({ title, subtitle, action }: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-[var(--cocoa)] text-xl">
          {title}
        </h2>
        {subtitle && <p className="text-xs text-[var(--sand)] mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
```

- [ ] **Step 6: Run the test again (still green)**

Run: `npx vitest run src/app/components/common/Money.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/components/common
git commit -m "feat: add shared UI primitives (Money, Button, Card, Badge, SectionHeader)"
```

---

## Phase 1 — Router shell & relocating existing screens

### Task 4: Router shell with Register/Manager toggle

**Files:**
- Modify: `src/app/App.tsx`
- Create: `src/app/components/AppHeader.tsx`
- Create: `src/app/routes/RegisterPage.tsx`
- Create: `src/app/routes/ManagerLayout.tsx`
- Create: `src/app/routes/manager/SalesReportPage.tsx` (placeholder, filled in Phase 4)

- [ ] **Step 1: Create `AppHeader.tsx`**

```tsx
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
```

- [ ] **Step 2: Create the Register placeholder `routes/RegisterPage.tsx`**

```tsx
export function RegisterPage() {
  return (
    <main className="max-w-7xl mx-auto px-6 py-6">
      <p className="text-[var(--taupe)]">Register coming soon.</p>
    </main>
  );
}
```

- [ ] **Step 3: Create the Sales placeholder `routes/manager/SalesReportPage.tsx`**

```tsx
export function SalesReportPage() {
  return <p className="text-[var(--taupe)]">Sales &amp; reports coming soon.</p>;
}
```

- [ ] **Step 4: Create `routes/ManagerLayout.tsx` with sub-navigation**

```tsx
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
```

- [ ] **Step 5: Rewrite `src/app/App.tsx` as the router**

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AppHeader } from './components/AppHeader';
import { RegisterPage } from './routes/RegisterPage';
import { ManagerLayout } from './routes/ManagerLayout';
import { SalesReportPage } from './routes/manager/SalesReportPage';
import '../styles/fonts.css';

export default function App() {
  return (
    <BrowserRouter>
      <div className="size-full min-h-screen" style={{ background: 'var(--cream)', fontFamily: "'DM Sans', sans-serif" }}>
        <AppHeader />
        <Routes>
          <Route path="/" element={<RegisterPage />} />
          <Route path="/manager" element={<ManagerLayout />}>
            <Route index element={<Navigate to="/manager/sales" replace />} />
            <Route path="sales" element={<SalesReportPage />} />
            {/* stock + costing routes added in Tasks 5 & 6 */}
          </Route>
        </Routes>
      </div>
    </BrowserRouter>
  );
}
```

- [ ] **Step 6: Verify it runs**

Run: `npm run dev`, open http://localhost:5173.
Expected: header shows Register/Manager toggle; `/` shows "Register coming soon"; clicking Manager goes to `/manager/sales`. Stop the dev server.

- [ ] **Step 7: Verify build**

Run: `npm run build`
Expected: success.

- [ ] **Step 8: Commit**

```bash
git add src/app/App.tsx src/app/components/AppHeader.tsx src/app/routes
git commit -m "feat: add React Router shell with Register/Manager areas"
```

---

### Task 5: Move stock components and build StockPage

**Files:**
- Move: `src/app/components/{InventoryList,AddItemModal,EditItemModal,StockInModal,StatsCard}.tsx` → `src/app/components/stock/`
- Create: `src/app/routes/manager/StockPage.tsx`
- Modify: `src/app/App.tsx` (add the stock route)

- [ ] **Step 1: Move the files and fix their relative imports**

```bash
git mv src/app/components/InventoryList.tsx src/app/components/stock/InventoryList.tsx
git mv src/app/components/AddItemModal.tsx  src/app/components/stock/AddItemModal.tsx
git mv src/app/components/EditItemModal.tsx src/app/components/stock/EditItemModal.tsx
git mv src/app/components/StockInModal.tsx  src/app/components/stock/StockInModal.tsx
git mv src/app/components/StatsCard.tsx     src/app/components/stock/StatsCard.tsx
```

In each moved file, update relative imports that previously went up one level (e.g. `../data/inventory` becomes `../../data/inventory`, `./ui/...` becomes `../ui/...`, `../services/inventoryApi` becomes `../../services/inventoryApi`). Build will tell you which paths are wrong.

- [ ] **Step 2: Create `routes/manager/StockPage.tsx` (extracted from the old InventoryDashboard inventory tab)**

```tsx
import { useState, useEffect } from 'react';
import { Plus, Package, AlertTriangle, DollarSign, Search, Camera, ShieldAlert } from 'lucide-react';
import { InventoryList } from '../../components/stock/InventoryList';
import { AddItemModal } from '../../components/stock/AddItemModal';
import { StockInModal } from '../../components/stock/StockInModal';
import { StatsCard } from '../../components/stock/StatsCard';
import { SectionHeader } from '../../components/common/SectionHeader';
import { Button } from '../../components/common/Button';
import { formatPeso } from '../../components/common/Money';
import { InventoryItem, Category, CATEGORY_LABELS } from '../../data/inventory';
import {
  addIngredient, updateIngredient, deleteIngredient, getStock,
  AddIngredientPayload, UpdateIngredientPayload,
} from '../../services/inventoryApi';

export function StockPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStockIn, setShowStockIn] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const refetch = async () => {
    setIsLoading(true);
    try {
      const res = await getStock();
      setInventory(res.ingredients.map(i => ({
        id: i.id, name: i.name, category: i.category as Category,
        quantity: i.current_stock, unit: i.unit, minStock: i.min_stock_level,
        costPerUnit: i.unit_cost, supplier: i.supplier ?? '', lastUpdated: new Date(),
      })));
    } catch (err) {
      console.error('[StockPage] fetch failed', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { refetch(); }, []);

  const totalItems = inventory.length;
  const criticalItems = inventory.filter(i => i.quantity <= 0).length;
  const lowItems = inventory.filter(i => i.quantity > 0 && i.quantity < i.minStock).length;
  const totalValue = inventory.reduce((s, i) => s + Math.max(i.quantity, 0) * i.costPerUnit, 0);

  const addItem = async (item: Omit<InventoryItem, 'id' | 'lastUpdated'>) => {
    const id = Date.now().toString();
    const payload: AddIngredientPayload = {
      id, name: item.name, category: item.category, unit: item.unit,
      unit_cost: item.costPerUnit, min_stock_level: item.minStock,
      current_stock: item.quantity, supplier: item.supplier || undefined,
    };
    try {
      await addIngredient(payload);
      setInventory(prev => [...prev, { id, ...item, lastUpdated: new Date() }]);
      setShowAddModal(false);
    } catch (err) {
      alert(`Failed to add ingredient: ${(err as Error).message}`);
    }
  };

  const updateItem = async (id: string, updates: Partial<InventoryItem>) => {
    const current = inventory.find(i => i.id === id);
    if (!current) return;
    const payload: UpdateIngredientPayload = {};
    if (updates.name !== undefined && updates.name !== current.name) payload.name = updates.name;
    if (updates.category !== undefined && updates.category !== current.category) payload.category = updates.category;
    if (updates.costPerUnit !== undefined && updates.costPerUnit !== current.costPerUnit) payload.unit_cost = updates.costPerUnit;
    if (updates.minStock !== undefined && updates.minStock !== current.minStock) payload.min_stock_level = updates.minStock;
    if (updates.quantity !== undefined && updates.quantity !== current.quantity) payload.current_stock = updates.quantity;
    if (updates.supplier !== undefined && updates.supplier !== current.supplier) payload.supplier = updates.supplier;
    try {
      if (Object.keys(payload).length > 0) await updateIngredient(id, payload);
      setInventory(prev => prev.map(i => (i.id === id ? { ...i, ...updates, lastUpdated: new Date() } : i)));
    } catch (err) {
      alert(`Failed to update ingredient: ${(err as Error).message}`);
      refetch();
    }
  };

  const deleteItem = async (id: string) => {
    try {
      await deleteIngredient(id);
      setInventory(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      alert(`Failed to delete ingredient: ${(err as Error).message}`);
    }
  };

  const handleStockIn = (updates: Record<string, number>) => {
    setInventory(prev => prev.map(i => {
      const added = updates[i.id];
      if (!added || added <= 0) return i;
      return { ...i, quantity: Math.round((i.quantity + added) * 10_000) / 10_000, lastUpdated: new Date() };
    }));
  };

  const filtered = inventory.filter(i => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = i.name.toLowerCase().includes(q) || (i.supplier ?? '').toLowerCase().includes(q);
    const matchesCat = filterCategory === 'all' || i.category === filterCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <>
      <SectionHeader
        title="Stock"
        subtitle="Ingredient inventory, restock & valuation"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowStockIn(true)}><Camera className="w-4 h-4 inline mr-1" />Stock-In</Button>
            <Button onClick={() => setShowAddModal(true)}><Plus className="w-4 h-4 inline mr-1" />Add Item</Button>
          </div>
        }
      />

      {!isLoading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard icon={<Package className="w-5 h-5" />} label="Total SKUs" value={totalItems} variant="matcha" />
          <StatsCard icon={<AlertTriangle className="w-5 h-5" />} label="Low Stock" value={lowItems} variant="alert" />
          <StatsCard icon={<ShieldAlert className="w-5 h-5" />} label="Critical Stock" value={criticalItems} variant="critical" />
          <StatsCard icon={<DollarSign className="w-5 h-5" />} label="Asset Value" value={formatPeso(totalValue)} variant="cream" />
        </div>
      )}

      {isLoading ? (
        <p className="text-[var(--taupe)]">Loading inventory…</p>
      ) : inventory.length === 0 ? (
        <p className="text-[var(--taupe)]">No ingredients yet. Run <code>npm run seed</code> or add items.</p>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-[var(--cookie-100)] p-4 mb-4 shadow-sm flex flex-col md:flex-row gap-3 md:items-center justify-between">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--sand)]" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search ingredients or suppliers…"
                className="w-full pl-9 pr-4 py-2 border border-[var(--cookie-100)] rounded-xl bg-[var(--cream)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--matcha-600)]/40"
              />
            </div>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="px-4 py-2 border border-[var(--cookie-100)] rounded-xl bg-[var(--cream)] text-sm"
            >
              <option value="all">All Categories</option>
              {(Object.keys(CATEGORY_LABELS) as Category[]).map(c => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>
          <InventoryList items={filtered} onUpdate={updateItem} onDelete={deleteItem} />
        </>
      )}

      {showAddModal && <AddItemModal onAdd={addItem} onClose={() => setShowAddModal(false)} />}
      {showStockIn && <StockInModal inventory={inventory} onStockIn={handleStockIn} onClose={() => setShowStockIn(false)} />}
    </>
  );
}
```

- [ ] **Step 3: Confirm `StatsCard` supports the `variant` values used above**

Open `src/app/components/stock/StatsCard.tsx` and verify it accepts `variant` of `'matcha' | 'alert' | 'critical' | 'cream'`. If a variant is missing, add it following the existing pattern. (This is how the old dashboard used it, so it should already match.)

- [ ] **Step 4: Add the stock route in `App.tsx`**

Add the import and route inside the `/manager` route:

```tsx
import { StockPage } from './routes/manager/StockPage';
// ...
<Route path="stock" element={<StockPage />} />
```

- [ ] **Step 5: Verify**

Run: `npm run build` (expected: success), then `npm run dev` and open `/manager/stock`.
Expected: stock table loads (empty until backend seeded — fine). Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: move stock components and add Manager Stock page"
```

---

### Task 6: Costing page & retire Batch Calculator / Can-I-Bake

**Files:**
- Move: `src/app/components/ProductCosting.tsx` → `src/app/components/costing/ProductCosting.tsx`
- Create: `src/app/routes/manager/CostingPage.tsx`
- Delete: `src/app/components/BatchCalculator.tsx`, `src/app/components/CanIBakePanel.tsx`
- Delete: `src/app/components/InventoryDashboard.tsx`
- Modify: `src/app/App.tsx`

- [ ] **Step 1: Move ProductCosting and fix its imports**

```bash
git mv src/app/components/ProductCosting.tsx src/app/components/costing/ProductCosting.tsx
```

Fix relative imports in the moved file (`../data/...` → `../../data/...`, `./ui/...` → `../ui/...`).

- [ ] **Step 2: Create `routes/manager/CostingPage.tsx`**

```tsx
import { ProductCosting } from '../../components/costing/ProductCosting';
export function CostingPage() {
  return <ProductCosting />;
}
```

- [ ] **Step 3: Delete retired files**

```bash
git rm src/app/components/BatchCalculator.tsx src/app/components/CanIBakePanel.tsx src/app/components/InventoryDashboard.tsx
```

- [ ] **Step 4: Add the costing route in `App.tsx`**

```tsx
import { CostingPage } from './routes/manager/CostingPage';
// ...
<Route path="costing" element={<CostingPage />} />
```

- [ ] **Step 5: Verify no dangling references**

Run: `npm run build`
Expected: success with no "Cannot find module 'InventoryDashboard'/'BatchCalculator'/'CanIBakePanel'". If the build reports a leftover import, remove it.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Costing page; retire Batch Calculator, Can-I-Bake, old dashboard"
```

---

## Phase 2 — Backend sales persistence & API

### Task 7: Sales schema + test-friendly DB path

**Files:**
- Modify: `backend/db/database.js`
- Test: `backend/__tests__/schema.test.js`

- [ ] **Step 1: Make the DB path overridable for tests**

In `backend/db/database.js`, replace the `DB_PATH` line:

```js
const DB_PATH = process.env.POOKIES_DB_PATH || path.join(__dirname, '..', 'pookies_inventory.db');
```

Add a `closeDb` helper near the bottom (before `module.exports`):

```js
function closeDb() {
  if (_db) { _db.close(); _db = null; }
}
```

Add `closeDb` to the `module.exports` object.

- [ ] **Step 2: Add the sales tables to `_initSchema` (inside the existing `db.exec(\`...\`)` template)**

Append these table + index definitions to the SQL string in `_initSchema`:

```sql
    -- Sales (permanent — never purged)
    CREATE TABLE IF NOT EXISTS sales (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_number     TEXT    UNIQUE NOT NULL,
      created_at      TEXT    NOT NULL,
      subtotal        REAL    NOT NULL,
      discount        REAL    NOT NULL DEFAULT 0,
      total           REAL    NOT NULL,
      cost_total      REAL    NOT NULL DEFAULT 0,
      payment_method  TEXT    NOT NULL,
      amount_tendered REAL,
      change_due      REAL,
      cash_amount     REAL    NOT NULL DEFAULT 0,
      ewallet_amount  REAL    NOT NULL DEFAULT 0,
      reference_no    TEXT,
      receipt_image   TEXT
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id             INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      recipe_sku          TEXT    NOT NULL,
      name                TEXT    NOT NULL,
      variant             TEXT,
      unit_price          REAL    NOT NULL,
      quantity            INTEGER NOT NULL,
      line_total          REAL    NOT NULL,
      customization_label TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_sales_created   ON sales (created_at);
    CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items (sale_id);
```

- [ ] **Step 3: Write the schema test**

Create `backend/__tests__/schema.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

const TMP = path.join(os.tmpdir(), `pookies_schema_${Date.now()}.db`);
process.env.POOKIES_DB_PATH = TMP;

const { getDb, closeDb } = require('../db/database');

test.after(() => { closeDb(); try { fs.unlinkSync(TMP); } catch {} });

test('sales and sale_items tables exist', () => {
  const db = getDb();
  const names = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table'"
  ).all().map(r => r.name);
  assert.ok(names.includes('sales'), 'sales table missing');
  assert.ok(names.includes('sale_items'), 'sale_items table missing');
});
```

- [ ] **Step 4: Run the test**

Run: `node --test backend/__tests__/schema.test.js`
Expected: 1 test passing.

- [ ] **Step 5: Commit**

```bash
git add backend/db/database.js backend/__tests__/schema.test.js
git commit -m "feat(backend): add sales/sale_items schema + test DB path override"
```

---

### Task 8: `createSale` controller (record + deduct, atomic & idempotent)

**Files:**
- Create: `backend/controllers/salesController.js`
- Test: `backend/__tests__/sales.create.test.js`

- [ ] **Step 1: Write the failing test**

Create `backend/__tests__/sales.create.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

const TMP = path.join(os.tmpdir(), `pookies_sales_${Date.now()}.db`);
process.env.POOKIES_DB_PATH = TMP;

const { getDb, closeDb, p4 } = require('../db/database');
const sales = require('../controllers/salesController');

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
  };
}

function seedFlour(stock) {
  const db = getDb();
  db.prepare(`INSERT OR REPLACE INTO ingredients
    (id,name,category,current_stock,unit,unit_cost,min_stock_level,supplier)
    VALUES ('flour','Flour','baking',?, 'g', 0.00224, 250, 'Local Market')`).run(stock);
}

const baseBody = () => ({
  saleNumber: 'S-1',
  items: [{ recipeSku: 'c1_box5', name: 'Classic', variant: 'Box of 5', unitPrice: 135, quantity: 1, lineTotal: 135 }],
  subtotal: 135, total: 135, costTotal: 50,
  payment: { method: 'cash', amountTendered: 200, changeDue: 65 },
  deductions: [{ ingredientId: 'flour', totalAmount: 43.4, unit: 'g' }],
});

test.after(() => { closeDb(); try { fs.unlinkSync(TMP); } catch {} });

test('createSale records the sale, items, and deducts stock', () => {
  getDb(); seedFlour(1000);
  const req = { body: baseBody() };
  const res = mockRes();
  sales.createSale(req, res);

  assert.strictEqual(res.body.status, 'ok');
  assert.ok(res.body.sale.id > 0);

  const db = getDb();
  const saved = db.prepare('SELECT * FROM sales WHERE sale_number = ?').get('S-1');
  assert.strictEqual(saved.total, 135);
  const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(saved.id);
  assert.strictEqual(items.length, 1);
  assert.strictEqual(items[0].recipe_sku, 'c1_box5');

  const flour = db.prepare('SELECT current_stock FROM ingredients WHERE id = ?').get('flour');
  assert.strictEqual(p4(flour.current_stock), 956.6);
});

test('createSale is idempotent on repeat saleNumber', () => {
  const req = { body: baseBody() };
  const res = mockRes();
  sales.createSale(req, res); // second call, same S-1
  assert.strictEqual(res.body.status, 'already_applied');

  const db = getDb();
  const flour = db.prepare('SELECT current_stock FROM ingredients WHERE id = ?').get('flour');
  assert.strictEqual(p4(flour.current_stock), 956.6); // unchanged
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node --test backend/__tests__/sales.create.test.js`
Expected: FAIL (`salesController` not found).

- [ ] **Step 3: Implement `backend/controllers/salesController.js`**

```js
'use strict';

const { getDb, p4 } = require('../db/database');

function createSale(req, res) {
  const { saleNumber, items, subtotal, discount = 0, total, costTotal = 0,
          payment = {}, deductions = [] } = req.body || {};

  if (!saleNumber || !Array.isArray(items) || items.length === 0 ||
      typeof total !== 'number' || !payment.method) {
    return res.status(422).json({
      message: 'Invalid payload: saleNumber, items[], total and payment.method are required.',
    });
  }

  const db = getDb();

  // Idempotency — sale already recorded?
  const existing = db.prepare('SELECT * FROM sales WHERE sale_number = ?').get(saleNumber);
  if (existing) {
    return res.json({ status: 'already_applied', sale: rowToSale(db, existing), criticalAlerts: [] });
  }

  const createdAt = new Date().toISOString();
  const criticalAlerts = [];

  const insertSale = db.prepare(`
    INSERT INTO sales
      (sale_number, created_at, subtotal, discount, total, cost_total,
       payment_method, amount_tendered, change_due, cash_amount, ewallet_amount, reference_no, receipt_image)
    VALUES (@sale_number,@created_at,@subtotal,@discount,@total,@cost_total,
            @payment_method,@amount_tendered,@change_due,@cash_amount,@ewallet_amount,@reference_no,NULL)
  `);
  const insertItem = db.prepare(`
    INSERT INTO sale_items
      (sale_id, recipe_sku, name, variant, unit_price, quantity, line_total, customization_label)
    VALUES (?,?,?,?,?,?,?,?)
  `);
  const getIng = db.prepare('SELECT id,name,current_stock,unit FROM ingredients WHERE id = ?');
  const updIng = db.prepare('UPDATE ingredients SET current_stock = ROUND(current_stock - ?, 4) WHERE id = ?');
  const logDed = db.prepare(`INSERT INTO inventory_logs (ingredient_id, change_amount, type, sale_id, log_date)
                             VALUES (?,?, 'SALE', ?, ?)`);

  const tx = db.transaction(() => {
    const info = insertSale.run({
      sale_number: saleNumber,
      created_at: createdAt,
      subtotal: p4(subtotal),
      discount: p4(discount),
      total: p4(total),
      cost_total: p4(costTotal),
      payment_method: payment.method,
      amount_tendered: payment.amountTendered ?? null,
      change_due: payment.changeDue ?? null,
      cash_amount: p4(payment.cashAmount ?? 0),
      ewallet_amount: p4(payment.ewalletAmount ?? 0),
      reference_no: payment.referenceNo ?? null,
    });
    const saleId = info.lastInsertRowid;

    for (const it of items) {
      insertItem.run(saleId, it.recipeSku, it.name, it.variant ?? null,
        p4(it.unitPrice), it.quantity, p4(it.lineTotal), it.customizationLabel ?? null);
    }

    for (const d of deductions) {
      const amount = p4(parseFloat(d.totalAmount));
      const row = getIng.get(d.ingredientId);
      if (!row) continue;
      updIng.run(amount, d.ingredientId);
      logDed.run(d.ingredientId, -amount, saleNumber, createdAt);
      const newStock = p4(row.current_stock - amount);
      if (newStock <= 0) {
        criticalAlerts.push({ ingredientId: d.ingredientId, name: row.name,
          previousStock: p4(row.current_stock), currentStock: newStock, unit: row.unit });
      }
    }
    return saleId;
  });

  try {
    const saleId = tx();
    const saved = db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId);
    return res.status(201).json({
      status: criticalAlerts.length ? 'ok_with_critical_alerts' : 'ok',
      sale: rowToSale(db, saved),
      criticalAlerts,
    });
  } catch (err) {
    console.error('[createSale]', err.message);
    return res.status(500).json({ message: 'Failed to record sale.' });
  }
}

function rowToSale(db, row) {
  const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(row.id).map(i => ({
    recipeSku: i.recipe_sku, name: i.name, variant: i.variant,
    unitPrice: p4(i.unit_price), quantity: i.quantity, lineTotal: p4(i.line_total),
    customizationLabel: i.customization_label,
  }));
  return {
    id: row.id, saleNumber: row.sale_number, createdAt: row.created_at,
    subtotal: p4(row.subtotal), discount: p4(row.discount), total: p4(row.total),
    costTotal: p4(row.cost_total),
    payment: {
      method: row.payment_method, amountTendered: row.amount_tendered, changeDue: row.change_due,
      cashAmount: p4(row.cash_amount), ewalletAmount: p4(row.ewallet_amount), referenceNo: row.reference_no,
    },
    receiptImage: row.receipt_image,
    items,
  };
}

module.exports = { createSale, rowToSale };
```

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `node --test backend/__tests__/sales.create.test.js`
Expected: 2 tests passing; flour ends at 956.6.

- [ ] **Step 5: Commit**

```bash
git add backend/controllers/salesController.js backend/__tests__/sales.create.test.js
git commit -m "feat(backend): createSale records sale + items and deducts atomically"
```

---

### Task 9: List & detail endpoints

**Files:**
- Modify: `backend/controllers/salesController.js`
- Test: `backend/__tests__/sales.list.test.js`

- [ ] **Step 1: Write the failing test**

Create `backend/__tests__/sales.list.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

const TMP = path.join(os.tmpdir(), `pookies_list_${Date.now()}.db`);
process.env.POOKIES_DB_PATH = TMP;

const { getDb, closeDb } = require('../db/database');
const sales = require('../controllers/salesController');

function mockRes() {
  return { statusCode: 200, body: null,
    status(c){this.statusCode=c;return this;}, json(b){this.body=b;return this;} };
}

test.after(() => { closeDb(); try { fs.unlinkSync(TMP); } catch {} });

test('listSales returns recorded sales; getSaleById returns one with items', () => {
  getDb();
  sales.createSale({ body: {
    saleNumber: 'L-1',
    items: [{ recipeSku: 'm1_16oz', name: 'Matcha 16oz', variant: '16oz', unitPrice: 160, quantity: 2, lineTotal: 320 }],
    subtotal: 320, total: 320, costTotal: 120,
    payment: { method: 'gcash', referenceNo: 'GC123' }, deductions: [],
  } }, mockRes());

  const listRes = mockRes();
  sales.listSales({ query: {} }, listRes);
  assert.ok(Array.isArray(listRes.body.sales));
  assert.strictEqual(listRes.body.sales.length, 1);
  const id = listRes.body.sales[0].id;

  const oneRes = mockRes();
  sales.getSaleById({ params: { id: String(id) } }, oneRes);
  assert.strictEqual(oneRes.body.sale.items.length, 1);
  assert.strictEqual(oneRes.body.sale.payment.method, 'gcash');

  const missing = mockRes();
  sales.getSaleById({ params: { id: '99999' } }, missing);
  assert.strictEqual(missing.statusCode, 404);
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node --test backend/__tests__/sales.list.test.js`
Expected: FAIL (`listSales`/`getSaleById` not exported).

- [ ] **Step 3: Add the handlers to `salesController.js` (and export them)**

```js
function listSales(req, res) {
  try {
    const db = getDb();
    const { date, from, to } = req.query || {};
    let where = '';
    const params = [];
    if (date) { where = "WHERE date(created_at) = date(?)"; params.push(date); }
    else if (from && to) { where = "WHERE date(created_at) BETWEEN date(?) AND date(?)"; params.push(from, to); }
    const rows = db.prepare(`
      SELECT s.*, COUNT(si.id) AS item_count
      FROM sales s LEFT JOIN sale_items si ON si.sale_id = s.id
      ${where}
      GROUP BY s.id ORDER BY s.created_at DESC
    `).all(...params);
    res.json({
      sales: rows.map(r => ({
        id: r.id, saleNumber: r.sale_number, createdAt: r.created_at,
        total: p4(r.total), paymentMethod: r.payment_method,
        itemCount: r.item_count, receiptImage: r.receipt_image,
      })),
    });
  } catch (err) {
    console.error('[listSales]', err.message);
    res.status(500).json({ message: 'Failed to list sales.' });
  }
}

function getSaleById(req, res) {
  try {
    const db = getDb();
    const row = db.prepare('SELECT * FROM sales WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ message: 'Sale not found.' });
    res.json({ sale: rowToSale(db, row) });
  } catch (err) {
    console.error('[getSaleById]', err.message);
    res.status(500).json({ message: 'Failed to fetch sale.' });
  }
}
```

Update the exports line:

```js
module.exports = { createSale, listSales, getSaleById, rowToSale };
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `node --test backend/__tests__/sales.list.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/controllers/salesController.js backend/__tests__/sales.list.test.js
git commit -m "feat(backend): list sales and get sale by id"
```

---

### Task 10: Daily report

**Files:**
- Modify: `backend/controllers/salesController.js`
- Test: `backend/__tests__/sales.report.test.js`

- [ ] **Step 1: Write the failing test**

Create `backend/__tests__/sales.report.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

const TMP = path.join(os.tmpdir(), `pookies_report_${Date.now()}.db`);
process.env.POOKIES_DB_PATH = TMP;

const { getDb, closeDb } = require('../db/database');
const sales = require('../controllers/salesController');

function mockRes() {
  return { statusCode: 200, body: null,
    status(c){this.statusCode=c;return this;}, json(b){this.body=b;return this;} };
}

const today = new Date().toISOString().slice(0, 10);

test.after(() => { closeDb(); try { fs.unlinkSync(TMP); } catch {} });

test('daily report aggregates totals, profit, by-payment, by-product', () => {
  getDb();
  sales.createSale({ body: {
    saleNumber: 'R-1',
    items: [{ recipeSku: 'm1_16oz', name: 'Matcha 16oz', variant: '16oz', unitPrice: 160, quantity: 2, lineTotal: 320 }],
    subtotal: 320, total: 320, costTotal: 120, payment: { method: 'cash' }, deductions: [],
  } }, mockRes());
  sales.createSale({ body: {
    saleNumber: 'R-2',
    items: [{ recipeSku: 'c5', name: 'Dubai Cookie', variant: 'piece', unitPrice: 130, quantity: 1, lineTotal: 130 }],
    subtotal: 130, total: 130, costTotal: 61, payment: { method: 'gcash' }, deductions: [],
  } }, mockRes());

  const res = mockRes();
  sales.dailyReport({ query: { date: today } }, res);

  assert.strictEqual(res.body.orderCount, 2);
  assert.strictEqual(res.body.totalSales, 450);
  assert.strictEqual(res.body.estProfit, 450 - 181); // total - cost_total
  const cash = res.body.byPayment.find(p => p.method === 'cash');
  assert.strictEqual(cash.amount, 320);
  const top = res.body.byProduct[0];
  assert.strictEqual(top.name, 'Matcha 16oz'); // highest revenue
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node --test backend/__tests__/sales.report.test.js`
Expected: FAIL (`dailyReport` not exported).

- [ ] **Step 3: Add `dailyReport` to `salesController.js` (and export it)**

```js
function dailyReport(req, res) {
  try {
    const db = getDb();
    const date = (req.query && req.query.date) || new Date().toISOString().slice(0, 10);

    const totals = db.prepare(`
      SELECT COUNT(*) AS order_count,
             COALESCE(SUM(total), 0) AS total_sales,
             COALESCE(SUM(cost_total), 0) AS cost_total
      FROM sales WHERE date(created_at) = date(?)
    `).get(date);

    const byPayment = db.prepare(`
      SELECT payment_method AS method, ROUND(SUM(total), 2) AS amount, COUNT(*) AS count
      FROM sales WHERE date(created_at) = date(?)
      GROUP BY payment_method ORDER BY amount DESC
    `).all(date);

    const byProduct = db.prepare(`
      SELECT si.name AS name, SUM(si.quantity) AS qty, ROUND(SUM(si.line_total), 2) AS revenue
      FROM sale_items si JOIN sales s ON s.id = si.sale_id
      WHERE date(s.created_at) = date(?)
      GROUP BY si.name ORDER BY revenue DESC
    `).all(date);

    res.json({
      date,
      orderCount: totals.order_count,
      totalSales: p4(totals.total_sales),
      estProfit: p4(totals.total_sales - totals.cost_total),
      byPayment: byPayment.map(p => ({ method: p.method, amount: p4(p.amount), count: p.count })),
      byProduct: byProduct.map(p => ({ name: p.name, qty: p.qty, revenue: p4(p.revenue) })),
      topSeller: byProduct[0]?.name ?? null,
    });
  } catch (err) {
    console.error('[dailyReport]', err.message);
    res.status(500).json({ message: 'Failed to build report.' });
  }
}
```

Update exports:

```js
module.exports = { createSale, listSales, getSaleById, dailyReport, rowToSale };
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `node --test backend/__tests__/sales.report.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/controllers/salesController.js backend/__tests__/sales.report.test.js
git commit -m "feat(backend): daily sales report (totals, profit, by payment/product)"
```

---

### Task 11: Receipt image upload + routes + server mount

**Files:**
- Modify: `backend/controllers/salesController.js`
- Create: `backend/routes/sales.js`
- Modify: `backend/server.js`

- [ ] **Step 1: Add the receipt-upload handler to `salesController.js`**

Reuse the same multer receipts directory pattern as `inventoryController.js`. Add at the top of `salesController.js`:

```js
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const RECEIPTS_DIR = path.join(__dirname, '..', 'Receipts');
if (!fs.existsSync(RECEIPTS_DIR)) fs.mkdirSync(RECEIPTS_DIR, { recursive: true });

const receiptUpload = multer({
  storage: multer.diskStorage({
    destination: (_q, _f, cb) => cb(null, RECEIPTS_DIR),
    filename: (req, _f, cb) => cb(null, `sale_${req.params.id}_${Date.now()}.png`),
  }),
  fileFilter: (_q, file, cb) =>
    cb(null, ['image/png', 'image/jpeg', 'image/webp'].includes(file.mimetype)),
  limits: { fileSize: 5 * 1024 * 1024 },
});
```

Add the handler:

```js
function uploadSaleReceipt(req, res) {
  if (!req.file) return res.status(400).json({ message: 'No file. Use field "receipt".' });
  try {
    const db = getDb();
    const sale = db.prepare('SELECT id FROM sales WHERE id = ?').get(req.params.id);
    if (!sale) { fs.unlink(req.file.path, () => {}); return res.status(404).json({ message: 'Sale not found.' }); }
    const publicUrl = `/Receipts/${req.file.filename}`;
    db.prepare('UPDATE sales SET receipt_image = ? WHERE id = ?').run(publicUrl, req.params.id);
    res.status(201).json({ status: 'ok', receiptImage: publicUrl });
  } catch (err) {
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    console.error('[uploadSaleReceipt]', err.message);
    res.status(500).json({ message: 'Receipt save failed.' });
  }
}
```

Update exports to include `receiptUpload` and `uploadSaleReceipt`:

```js
module.exports = { createSale, listSales, getSaleById, dailyReport, receiptUpload, uploadSaleReceipt, rowToSale };
```

- [ ] **Step 2: Create `backend/routes/sales.js`**

```js
'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/salesController');

router.post('/',               ctrl.createSale);
router.get('/',                ctrl.listSales);
router.get('/report/daily',    ctrl.dailyReport);
router.get('/:id',             ctrl.getSaleById);
router.post('/:id/receipt',    ctrl.receiptUpload.single('receipt'), ctrl.uploadSaleReceipt);

module.exports = router;
```

> Note: `/report/daily` is declared **before** `/:id` so "report" is not captured as an id.

- [ ] **Step 3: Mount the router in `backend/server.js`**

After the existing `app.use('/api/inventory', ...)` line, add:

```js
app.use('/api/sales', require('./routes/sales'));
```

- [ ] **Step 4: Manual smoke test against a running server**

Run the backend (`cd backend && npm start`). In another shell:

```bash
curl -s -X POST http://localhost:3001/api/sales -H "Content-Type: application/json" \
  -d '{"saleNumber":"SMOKE-1","items":[{"recipeSku":"c5","name":"Dubai Cookie","variant":"piece","unitPrice":130,"quantity":1,"lineTotal":130}],"subtotal":130,"total":130,"costTotal":61,"payment":{"method":"cash","amountTendered":150,"changeDue":20},"deductions":[]}'
curl -s "http://localhost:3001/api/sales?date=$(date +%F)"
curl -s "http://localhost:3001/api/sales/report/daily?date=$(date +%F)"
```

Expected: first returns `{"status":"ok","sale":{...}}`; list shows the sale; report shows `orderCount: 1`. Stop the backend.

- [ ] **Step 5: Commit**

```bash
git add backend/controllers/salesController.js backend/routes/sales.js backend/server.js
git commit -m "feat(backend): sales routes + receipt image upload, mounted at /api/sales"
```

---

### Task 12: Dev seed script

**Files:**
- Create: `backend/seed.js`
- Modify: `backend/package.json` (add `seed` script)

- [ ] **Step 1: Create `backend/seed.js`**

```js
'use strict';
// Populates realistic starting stock so the POS is usable immediately.
// Safe to re-run: it only UPDATEs current_stock of seeded ingredients.
const { getDb, closeDb } = require('./db/database');

const STARTING_STOCK = {
  flour: 25000, brownSugar: 2000, whiteSugar: 2000, bakingSoda: 500, salt: 1000,
  vanillaExtract: 60, espressoPowder: 60, chocolateBar: 2000, chocoChips: 1000,
  foodColoring: 60, cocoaPowder: 500, grahamCrackers: 420, marshmallow: 2000,
  whiteChoco: 2000, seaSalt: 500, egg: 36, eggYolk: 24, margarine: 600,
  creamCheese: 4000, butter: 400, adoleafMatcha: 270, kataifi: 1000, pistachio: 500,
  oatside: 3000, condensada: 1090, packagingBox: 150, liner: 500,
  cup12oz: 150, cup16oz: 100, straw: 300,
};

const db = getDb();
const upd = db.prepare('UPDATE ingredients SET current_stock = ? WHERE id = ?');
let n = 0;
const tx = db.transaction(() => {
  for (const [id, qty] of Object.entries(STARTING_STOCK)) n += upd.run(qty, id).changes;
});
tx();
console.log(`[seed] starting stock applied to ${n} ingredient(s).`);
closeDb();
```

- [ ] **Step 2: Add the `seed` script to `backend/package.json`**

In `"scripts"`, add:

```json
"seed": "node seed.js"
```

- [ ] **Step 3: Run the seed and verify**

```bash
cd backend && npm run seed
```

Expected: `[seed] starting stock applied to 30 ingredient(s).` (Run the backend then `curl http://localhost:3001/api/inventory/stock` to confirm non-zero stock.)

- [ ] **Step 4: Commit**

```bash
git add backend/seed.js backend/package.json
git commit -m "feat(backend): npm run seed for starting stock"
```

---

## Phase 3 — Catalog, cart, register & checkout

### Task 13: Add `pack6` SKUs to RECIPE_BOOK

**Files:**
- Modify: `src/app/hooks/useInventorySync.tsx`
- Test: `src/app/hooks/recipeBook.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/hooks/recipeBook.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { previewCartDeductions, RECIPE_BOOK } from './useInventorySync';

describe('pack6 SKUs', () => {
  it('exist for all three cookie flavors', () => {
    expect(RECIPE_BOOK.c1_pack6).toBeDefined();
    expect(RECIPE_BOOK.c2_pack6).toBeDefined();
    expect(RECIPE_BOOK.c3_pack6).toBeDefined();
  });

  it('Pack of 6 uses 240g dough worth of flour (250 * 240/720 = 83.3333) + 1 box', () => {
    const ded = previewCartDeductions([{ skuId: 'c1_pack6', quantity: 1 }]);
    const flour = ded.find(d => d.ingredientId === 'flour');
    const box = ded.find(d => d.ingredientId === 'packagingBox');
    expect(flour?.totalAmount).toBeCloseTo(83.3333, 3);
    expect(box?.totalAmount).toBe(1);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/app/hooks/recipeBook.test.ts`
Expected: FAIL (`c1_pack6` undefined).

- [ ] **Step 3: Add the three `pack6` entries to `RECIPE_BOOK`**

In `src/app/hooks/useInventorySync.tsx`, add a dough constant near the other `DOUGH_*` constants:

```ts
const DOUGH_PACK6_G = 240; // 6 cookies × 40g
```

Then add these entries inside the `RECIPE_BOOK` object (after each flavor's existing entries):

```ts
  /** Pack of 6 — 240g dough (6 × 40g), scaled from classic batch */
  c1_pack6: [
    ...scaleBatch(CLASSIC_BATCH, DOUGH_PACK6_G),
    { ingredientId: 'packagingBox', amount: 1, unit: 'pcs' },
  ],
  /** Pack of 6 — red velvet */
  c2_pack6: [
    ...scaleBatch(RED_VELVET_BATCH, DOUGH_PACK6_G),
    { ingredientId: 'packagingBox', amount: 1, unit: 'pcs' },
  ],
  /** Pack of 6 — s'mores */
  c3_pack6: [
    ...scaleBatch(SMORES_BATCH, DOUGH_PACK6_G),
    { ingredientId: 'packagingBox', amount: 1, unit: 'pcs' },
  ],
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx vitest run src/app/hooks/recipeBook.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/hooks/useInventorySync.tsx src/app/hooks/recipeBook.test.ts
git commit -m "feat: add Pack of 6 SKUs to RECIPE_BOOK"
```

---

### Task 14: Product catalog data

**Files:**
- Create: `src/app/data/catalog.ts`
- Test: `src/app/data/catalog.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/data/catalog.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { CATALOG, CatalogProduct } from './catalog';
import { RECIPE_BOOK } from '../hooks/useInventorySync';

describe('catalog', () => {
  it('every non-mixed variant maps to a real RECIPE_BOOK sku', () => {
    for (const product of CATALOG) {
      if (product.isMixedBox) continue;
      for (const v of product.variants) {
        expect(RECIPE_BOOK[v.recipeSku], `${v.id} -> ${v.recipeSku}`).toBeDefined();
      }
    }
  });

  it('has exactly one mixed-box product mapping to c4', () => {
    const mixed = CATALOG.filter((p: CatalogProduct) => p.isMixedBox);
    expect(mixed).toHaveLength(1);
    expect(mixed[0].variants[0].recipeSku).toBe('c4');
  });

  it('covers the three catalog categories', () => {
    const cats = new Set(CATALOG.map(p => p.category));
    expect(cats).toEqual(new Set(['cookies', 'drinks', 'bundles']));
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/app/data/catalog.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/app/data/catalog.ts`**

```ts
export type CatalogCategory = 'cookies' | 'drinks' | 'bundles';

export interface ProductVariant {
  id: string;
  label: string;
  price: number;       // ₱ — provisional, editable here
  recipeSku: string;   // key into RECIPE_BOOK (or 'c4' for the mixed box)
}

export interface CatalogProduct {
  id: string;
  name: string;
  category: CatalogCategory;
  icon: string;        // emoji
  variants: ProductVariant[];
  isMixedBox?: boolean;
}

export const CATEGORY_TABS: { id: CatalogCategory; label: string }[] = [
  { id: 'cookies', label: 'Cookies' },
  { id: 'drinks', label: 'Drinks' },
  { id: 'bundles', label: 'Boxes & Bundles' },
];

export const CATALOG: CatalogProduct[] = [
  {
    id: 'classic', name: 'Classic Choc Chip', category: 'cookies', icon: '🍪',
    variants: [
      { id: 'classic-piece', label: 'Single piece', price: 30,  recipeSku: 'c1_piece' },
      { id: 'classic-mini3', label: 'Mini Box (3)', price: 85,  recipeSku: 'c1_mini3' },
      { id: 'classic-box5',  label: 'Box of 5',     price: 135, recipeSku: 'c1_box5'  },
      { id: 'classic-pack6', label: 'Pack of 6',    price: 150, recipeSku: 'c1_pack6' },
    ],
  },
  {
    id: 'redvelvet', name: 'Red Velvet', category: 'cookies', icon: '❤️',
    variants: [
      { id: 'rv-piece', label: 'Single piece', price: 35,  recipeSku: 'c2_piece' },
      { id: 'rv-mini3', label: 'Mini Box (3)', price: 95,  recipeSku: 'c2_mini3' },
      { id: 'rv-box5',  label: 'Box of 5',     price: 150, recipeSku: 'c2_box5'  },
      { id: 'rv-pack6', label: 'Pack of 6',    price: 170, recipeSku: 'c2_pack6' },
    ],
  },
  {
    id: 'smores', name: "S'mores", category: 'cookies', icon: '🔥',
    variants: [
      { id: 'smores-piece', label: 'Single piece', price: 35,  recipeSku: 'c3_piece' },
      { id: 'smores-mini3', label: 'Mini Box (3)', price: 95,  recipeSku: 'c3_mini3' },
      { id: 'smores-box5',  label: 'Box of 5',     price: 150, recipeSku: 'c3_box5'  },
      { id: 'smores-pack6', label: 'Pack of 6',    price: 170, recipeSku: 'c3_pack6' },
    ],
  },
  {
    id: 'dubai', name: 'Dubai Cookie', category: 'cookies', icon: '🟢',
    variants: [
      { id: 'dubai-piece', label: 'Single piece', price: 130, recipeSku: 'c5' },
    ],
  },
  {
    id: 'matcha', name: 'Matcha Latte', category: 'drinks', icon: '🍵',
    variants: [
      { id: 'matcha-12', label: '12 oz', price: 135, recipeSku: 'm1_12oz' },
      { id: 'matcha-16', label: '16 oz', price: 160, recipeSku: 'm1_16oz' },
    ],
  },
  {
    id: 'mixed-box', name: 'Mixed Box (5)', category: 'bundles', icon: '🎁', isMixedBox: true,
    variants: [
      { id: 'mixed-box-5', label: 'Build your own (5)', price: 150, recipeSku: 'c4' },
    ],
  },
];

/** Flavors selectable inside the Mixed Box builder → base SKU ids understood by resolveMixedBox. */
export const MIXED_BOX_FLAVORS = [
  { baseSku: 'c1', name: 'Classic', icon: '🍪' },
  { baseSku: 'c2', name: 'Red Velvet', icon: '❤️' },
  { baseSku: 'c3', name: "S'mores", icon: '🔥' },
];
export const MIXED_BOX_SLOTS = 5;
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx vitest run src/app/data/catalog.test.ts`
Expected: PASS (all variant SKUs resolve, including the new `*_pack6`).

- [ ] **Step 5: Commit**

```bash
git add src/app/data/catalog.ts src/app/data/catalog.test.ts
git commit -m "feat: add product catalog with variant pricing"
```

---

### Task 15: Sales API service

**Files:**
- Create: `src/app/services/salesApi.ts`

- [ ] **Step 1: Implement `src/app/services/salesApi.ts`**

```ts
const API_BASE: string =
  (import.meta as Record<string, Record<string, string>>).env?.VITE_API_URL ??
  'http://localhost:3001';

export interface SaleItemPayload {
  recipeSku: string;
  name: string;
  variant: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  customizationLabel?: string;
}

export interface PaymentPayload {
  method: 'cash' | 'gcash' | 'card' | 'split';
  amountTendered?: number;
  changeDue?: number;
  cashAmount?: number;
  ewalletAmount?: number;
  referenceNo?: string;
}

export interface CreateSalePayload {
  saleNumber: string;
  items: SaleItemPayload[];
  subtotal: number;
  discount?: number;
  total: number;
  costTotal: number;
  payment: PaymentPayload;
  deductions: { ingredientId: string; totalAmount: number; unit: string }[];
}

export interface Sale {
  id: number;
  saleNumber: string;
  createdAt: string;
  subtotal: number;
  discount: number;
  total: number;
  costTotal: number;
  payment: PaymentPayload;
  receiptImage: string | null;
  items: Omit<SaleItemPayload, 'lineTotal'> & { lineTotal: number }[] extends never ? never : SaleItemPayload[];
}

export interface CreateSaleResponse {
  status: 'ok' | 'ok_with_critical_alerts' | 'already_applied';
  sale: Sale;
  criticalAlerts: { ingredientId: string; name: string; previousStock: number; currentStock: number; unit: string }[];
}

export interface SaleListItem {
  id: number;
  saleNumber: string;
  createdAt: string;
  total: number;
  paymentMethod: string;
  itemCount: number;
  receiptImage: string | null;
}

export interface DailyReport {
  date: string;
  orderCount: number;
  totalSales: number;
  estProfit: number;
  byPayment: { method: string; amount: number; count: number }[];
  byProduct: { name: string; qty: number; revenue: number }[];
  topSeller: string | null;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function createSale(payload: CreateSalePayload): Promise<CreateSaleResponse> {
  return json(await fetch(`${API_BASE}/api/sales`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  }));
}

export async function listSales(date?: string): Promise<{ sales: SaleListItem[] }> {
  const q = date ? `?date=${date}` : '';
  return json(await fetch(`${API_BASE}/api/sales${q}`));
}

export async function getSale(id: number | string): Promise<{ sale: Sale }> {
  return json(await fetch(`${API_BASE}/api/sales/${id}`));
}

export async function getDailyReport(date?: string): Promise<DailyReport> {
  const q = date ? `?date=${date}` : '';
  return json(await fetch(`${API_BASE}/api/sales/report/daily${q}`));
}

export async function uploadSaleReceipt(id: number, blob: Blob): Promise<{ receiptImage: string }> {
  const form = new FormData();
  form.append('receipt', blob, `sale_${id}.png`);
  return json(await fetch(`${API_BASE}/api/sales/${id}/receipt`, { method: 'POST', body: form }));
}
```

> Note: keep the `Sale.items` type simple — if the conditional type above is awkward in your editor, replace the `items` field with `items: SaleItemPayload[];`.

- [ ] **Step 2: Simplify the `Sale.items` type**

Replace the `items` field in the `Sale` interface with the plain form:

```ts
  items: SaleItemPayload[];
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit` (or `npm run build`)
Expected: no type errors from `salesApi.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/app/services/salesApi.ts
git commit -m "feat: add sales API service layer"
```

---

### Task 16: Cart state

**Files:**
- Create: `src/app/state/CartContext.tsx`
- Test: `src/app/state/cart.test.ts`

- [ ] **Step 1: Write the failing test for the reducer**

Create `src/app/state/cart.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { cartReducer, cartTotal, NewLine } from './CartContext';

const classicBox5: NewLine = {
  productId: 'classic', variantId: 'classic-box5', name: 'Classic · Box of 5',
  unitPrice: 135, recipeSku: 'c1_box5',
};
const matcha16: NewLine = {
  productId: 'matcha', variantId: 'matcha-16', name: 'Matcha Latte · 16 oz',
  unitPrice: 160, recipeSku: 'm1_16oz',
};

describe('cartReducer', () => {
  it('adds a line', () => {
    const s = cartReducer([], { type: 'ADD', line: classicBox5 });
    expect(s).toHaveLength(1);
    expect(s[0].quantity).toBe(1);
  });

  it('merges identical variant by incrementing quantity', () => {
    let s = cartReducer([], { type: 'ADD', line: classicBox5 });
    s = cartReducer(s, { type: 'ADD', line: classicBox5 });
    expect(s).toHaveLength(1);
    expect(s[0].quantity).toBe(2);
  });

  it('keeps distinct variants as separate lines and totals correctly', () => {
    let s = cartReducer([], { type: 'ADD', line: classicBox5 });
    s = cartReducer(s, { type: 'ADD', line: matcha16 });
    s = cartReducer(s, { type: 'ADD', line: matcha16 });
    expect(s).toHaveLength(2);
    expect(cartTotal(s)).toBe(135 + 320);
  });

  it('decrements and removes at zero', () => {
    let s = cartReducer([], { type: 'ADD', line: classicBox5 });
    const id = s[0].lineId;
    s = cartReducer(s, { type: 'DEC', lineId: id });
    expect(s).toHaveLength(0);
  });

  it('does not merge mixed boxes with different customization labels', () => {
    const a: NewLine = { ...classicBox5, productId: 'mixed-box', variantId: 'mixed-box-5', recipeSku: 'c4', customizationLabel: 'c1,c1,c1,c1,c1' };
    const b: NewLine = { ...a, customizationLabel: 'c1,c2,c3,c1,c2' };
    let s = cartReducer([], { type: 'ADD', line: a });
    s = cartReducer(s, { type: 'ADD', line: b });
    expect(s).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/app/state/cart.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/app/state/CartContext.tsx`**

```tsx
import { createContext, useContext, useReducer, ReactNode } from 'react';

export interface NewLine {
  productId: string;
  variantId: string;
  name: string;
  unitPrice: number;
  recipeSku: string;
  customizationLabel?: string;
}

export interface CartLine extends NewLine {
  lineId: string;
  quantity: number;
}

export type CartAction =
  | { type: 'ADD'; line: NewLine }
  | { type: 'INC'; lineId: string }
  | { type: 'DEC'; lineId: string }
  | { type: 'REMOVE'; lineId: string }
  | { type: 'CLEAR' };

function sameLine(a: CartLine, b: NewLine): boolean {
  return a.variantId === b.variantId && (a.customizationLabel ?? '') === (b.customizationLabel ?? '');
}

let counter = 0;
const nextId = () => `line_${Date.now()}_${counter++}`;

export function cartReducer(state: CartLine[], action: CartAction): CartLine[] {
  switch (action.type) {
    case 'ADD': {
      const existing = state.find(l => sameLine(l, action.line));
      if (existing) return state.map(l => (l === existing ? { ...l, quantity: l.quantity + 1 } : l));
      return [...state, { ...action.line, lineId: nextId(), quantity: 1 }];
    }
    case 'INC':
      return state.map(l => (l.lineId === action.lineId ? { ...l, quantity: l.quantity + 1 } : l));
    case 'DEC':
      return state
        .map(l => (l.lineId === action.lineId ? { ...l, quantity: l.quantity - 1 } : l))
        .filter(l => l.quantity > 0);
    case 'REMOVE':
      return state.filter(l => l.lineId !== action.lineId);
    case 'CLEAR':
      return [];
    default:
      return state;
  }
}

export function cartTotal(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
}

interface CartCtx {
  lines: CartLine[];
  add: (line: NewLine) => void;
  inc: (lineId: string) => void;
  dec: (lineId: string) => void;
  remove: (lineId: string) => void;
  clear: () => void;
  total: number;
}

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, dispatch] = useReducer(cartReducer, []);
  const value: CartCtx = {
    lines,
    add: line => dispatch({ type: 'ADD', line }),
    inc: lineId => dispatch({ type: 'INC', lineId }),
    dec: lineId => dispatch({ type: 'DEC', lineId }),
    remove: lineId => dispatch({ type: 'REMOVE', lineId }),
    clear: () => dispatch({ type: 'CLEAR' }),
    total: cartTotal(lines),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx vitest run src/app/state/cart.test.ts`
Expected: all cart tests pass.

- [ ] **Step 5: Wrap the Register route in `CartProvider`**

In `src/app/App.tsx`, import `CartProvider` and wrap **only** the register route element:

```tsx
import { CartProvider } from './state/CartContext';
// ...
<Route path="/" element={<CartProvider><RegisterPage /></CartProvider>} />
```

- [ ] **Step 6: Commit**

```bash
git add src/app/state/CartContext.tsx src/app/state/cart.test.ts src/app/App.tsx
git commit -m "feat: add cart state (reducer, totals, provider)"
```

---

### Task 17: Register UI — catalog, variant picker, mixed-box builder, order panel

**Files:**
- Create: `src/app/components/register/CategoryTabs.tsx`
- Create: `src/app/components/register/ProductTile.tsx`
- Create: `src/app/components/register/VariantPicker.tsx`
- Create: `src/app/components/register/MixedBoxBuilder.tsx`
- Create: `src/app/components/register/ProductCatalog.tsx`
- Create: `src/app/components/register/OrderLine.tsx`
- Create: `src/app/components/register/OrderPanel.tsx`
- Modify: `src/app/routes/RegisterPage.tsx`

- [ ] **Step 1: `CategoryTabs.tsx`**

```tsx
import { CATEGORY_TABS, CatalogCategory } from '../../data/catalog';

export function CategoryTabs({ active, onChange }: {
  active: CatalogCategory; onChange: (c: CatalogCategory) => void;
}) {
  return (
    <div className="flex gap-2 mb-4">
      {CATEGORY_TABS.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
            active === t.id
              ? 'bg-[var(--matcha-800)] text-white font-semibold'
              : 'bg-[var(--cookie-100)] text-[var(--taupe)] hover:bg-[var(--cookie-100)]/70'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: `ProductTile.tsx`**

```tsx
import { CatalogProduct } from '../../data/catalog';
import { formatPeso } from '../common/Money';

export function ProductTile({ product, onSelect }: {
  product: CatalogProduct; onSelect: (p: CatalogProduct) => void;
}) {
  const prices = product.variants.map(v => v.price);
  const min = Math.min(...prices);
  const single = product.variants.length === 1;
  return (
    <button
      onClick={() => onSelect(product)}
      className="bg-white border border-[var(--cookie-100)] rounded-2xl p-4 text-center hover:shadow-md hover:border-[var(--matcha-600)]/40 transition-all"
    >
      <div className="text-4xl mb-1">{product.icon}</div>
      <div className="text-sm font-semibold text-[var(--cocoa)]">{product.name}</div>
      <div className="text-xs font-semibold text-[var(--matcha-600)] mt-0.5">
        {single ? formatPeso(min) : `from ${formatPeso(min)}`}
      </div>
    </button>
  );
}
```

- [ ] **Step 3: `VariantPicker.tsx`**

```tsx
import { CatalogProduct, ProductVariant } from '../../data/catalog';
import { formatPeso } from '../common/Money';
import { Button } from '../common/Button';

export function VariantPicker({ product, onPick, onClose }: {
  product: CatalogProduct;
  onPick: (v: ProductVariant) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-4">
          <div className="text-4xl">{product.icon}</div>
          <h3 className="text-lg font-semibold text-[var(--cocoa)]">{product.name}</h3>
        </div>
        <div className="flex flex-col gap-2">
          {product.variants.map(v => (
            <button
              key={v.id}
              onClick={() => onPick(v)}
              className="flex justify-between items-center border border-[var(--cookie-100)] rounded-xl px-4 py-3 hover:border-[var(--matcha-600)] hover:bg-[var(--mint)] transition-colors"
            >
              <span className="text-sm text-[var(--cocoa)]">{v.label}</span>
              <span className="text-sm font-semibold text-[var(--matcha-600)]">{formatPeso(v.price)}</span>
            </button>
          ))}
        </div>
        <Button variant="ghost" className="w-full mt-4" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: `MixedBoxBuilder.tsx`**

```tsx
import { useState } from 'react';
import { CatalogProduct, MIXED_BOX_FLAVORS, MIXED_BOX_SLOTS } from '../../data/catalog';
import { formatPeso } from '../common/Money';
import { Button } from '../common/Button';

export function MixedBoxBuilder({ product, onConfirm, onClose }: {
  product: CatalogProduct;
  onConfirm: (customizationLabel: string, summary: string) => void;
  onClose: () => void;
}) {
  const [slots, setSlots] = useState<string[]>([]); // base SKU ids
  const add = (baseSku: string) => slots.length < MIXED_BOX_SLOTS && setSlots([...slots, baseSku]);
  const undo = () => setSlots(slots.slice(0, -1));
  const full = slots.length === MIXED_BOX_SLOTS;

  const confirm = () => {
    const label = slots.join(',');
    const counts = MIXED_BOX_FLAVORS.map(f => {
      const n = slots.filter(s => s === f.baseSku).length;
      return n ? `${n}× ${f.name}` : null;
    }).filter(Boolean).join(', ');
    onConfirm(label, counts);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-[var(--cocoa)] text-center">{product.icon} Mixed Box — pick 5</h3>
        <p className="text-xs text-[var(--sand)] text-center mb-4">{formatPeso(product.variants[0].price)} · {slots.length}/{MIXED_BOX_SLOTS} chosen</p>

        <div className="flex justify-center gap-2 mb-4">
          {Array.from({ length: MIXED_BOX_SLOTS }).map((_, i) => (
            <div key={i} className="w-9 h-9 rounded-lg border border-[var(--cookie-100)] flex items-center justify-center text-lg bg-[var(--cream)]">
              {slots[i] ? MIXED_BOX_FLAVORS.find(f => f.baseSku === slots[i])?.icon : ''}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {MIXED_BOX_FLAVORS.map(f => (
            <button key={f.baseSku} onClick={() => add(f.baseSku)} disabled={full}
              className="border border-[var(--cookie-100)] rounded-xl py-3 hover:border-[var(--matcha-600)] hover:bg-[var(--mint)] disabled:opacity-40 transition-colors">
              <div className="text-2xl">{f.icon}</div>
              <div className="text-xs text-[var(--cocoa)]">{f.name}</div>
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" onClick={undo} disabled={!slots.length}>Undo</Button>
          <Button className="flex-1" onClick={confirm} disabled={!full}>Add to order</Button>
        </div>
        <Button variant="ghost" className="w-full mt-2" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: `ProductCatalog.tsx` (selection orchestration)**

```tsx
import { useState } from 'react';
import { CATALOG, CatalogCategory, CatalogProduct, ProductVariant } from '../../data/catalog';
import { useCart } from '../../state/CartContext';
import { CategoryTabs } from './CategoryTabs';
import { ProductTile } from './ProductTile';
import { VariantPicker } from './VariantPicker';
import { MixedBoxBuilder } from './MixedBoxBuilder';

export function ProductCatalog() {
  const { add } = useCart();
  const [category, setCategory] = useState<CatalogCategory>('cookies');
  const [picking, setPicking] = useState<CatalogProduct | null>(null);
  const [building, setBuilding] = useState<CatalogProduct | null>(null);

  const products = CATALOG.filter(p => p.category === category);

  const select = (p: CatalogProduct) => {
    if (p.isMixedBox) { setBuilding(p); return; }
    if (p.variants.length === 1) { addVariant(p, p.variants[0]); return; }
    setPicking(p);
  };

  const addVariant = (p: CatalogProduct, v: ProductVariant) => {
    add({ productId: p.id, variantId: v.id, name: `${p.name} · ${v.label}`, unitPrice: v.price, recipeSku: v.recipeSku });
    setPicking(null);
  };

  return (
    <div>
      <CategoryTabs active={category} onChange={setCategory} />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {products.map(p => <ProductTile key={p.id} product={p} onSelect={select} />)}
      </div>

      {picking && <VariantPicker product={picking} onPick={v => addVariant(picking, v)} onClose={() => setPicking(null)} />}
      {building && (
        <MixedBoxBuilder
          product={building}
          onConfirm={(label, summary) => {
            add({ productId: building.id, variantId: building.variants[0].id,
                  name: `Mixed Box · ${summary}`, unitPrice: building.variants[0].price,
                  recipeSku: 'c4', customizationLabel: label });
            setBuilding(null);
          }}
          onClose={() => setBuilding(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 6: `OrderLine.tsx`**

```tsx
import { Minus, Plus, X } from 'lucide-react';
import { CartLine } from '../../state/CartContext';
import { Money } from '../common/Money';

export function OrderLine({ line, onInc, onDec, onRemove }: {
  line: CartLine;
  onInc: () => void; onDec: () => void; onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2 py-2 border-b border-[var(--cream)]">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--cocoa)] truncate">{line.name}</p>
        <Money amount={line.unitPrice * line.quantity} className="text-xs text-[var(--matcha-600)] font-semibold" />
      </div>
      <div className="flex items-center gap-1.5">
        <button onClick={onDec} className="w-6 h-6 rounded-md border border-[var(--cookie-100)] flex items-center justify-center"><Minus className="w-3 h-3" /></button>
        <span className="w-5 text-center text-sm">{line.quantity}</span>
        <button onClick={onInc} className="w-6 h-6 rounded-md border border-[var(--cookie-100)] flex items-center justify-center"><Plus className="w-3 h-3" /></button>
      </div>
      <button onClick={onRemove} className="text-[var(--sand)] hover:text-[var(--critical)]"><X className="w-4 h-4" /></button>
    </div>
  );
}
```

- [ ] **Step 7: `OrderPanel.tsx`**

```tsx
import { ShoppingCart } from 'lucide-react';
import { useCart } from '../../state/CartContext';
import { OrderLine } from './OrderLine';
import { Money } from '../common/Money';
import { Button } from '../common/Button';

export function OrderPanel({ onCharge }: { onCharge: () => void }) {
  const { lines, inc, dec, remove, total } = useCart();
  return (
    <div className="bg-white rounded-2xl border border-[var(--cookie-100)] shadow-sm flex flex-col h-full">
      <div className="px-4 py-3 border-b border-[var(--cream)] font-semibold text-[var(--cocoa)]">Current Order</div>
      <div className="flex-1 overflow-y-auto px-4">
        {lines.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[var(--sand)] py-12">
            <ShoppingCart className="w-8 h-8 mb-2" />
            <p className="text-sm">Tap a product to start an order</p>
          </div>
        ) : (
          lines.map(l => (
            <OrderLine key={l.lineId} line={l} onInc={() => inc(l.lineId)} onDec={() => dec(l.lineId)} onRemove={() => remove(l.lineId)} />
          ))
        )}
      </div>
      <div className="px-4 py-3 border-t border-[var(--cream)]">
        <div className="flex justify-between text-lg font-bold text-[var(--cocoa)] mb-3">
          <span>Total</span><Money amount={total} />
        </div>
        <Button className="w-full text-base py-3" disabled={lines.length === 0} onClick={onCharge}>
          Charge {total > 0 ? `₱${total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : ''}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Assemble `RegisterPage.tsx` (checkout added in Task 19)**

```tsx
import { ProductCatalog } from '../components/register/ProductCatalog';
import { OrderPanel } from '../components/register/OrderPanel';

export function RegisterPage() {
  return (
    <main className="max-w-7xl mx-auto px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 items-start">
        <ProductCatalog />
        <div className="lg:sticky lg:top-6 h-[calc(100vh-7rem)]">
          <OrderPanel onCharge={() => alert('Payment is added in the next step.')} />
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 9: Verify build and manual cart behavior**

Run: `npm run build` (expected: success). Then `npm run dev`, open `/`:
- Tap a cookie → variant picker appears; pick one → it lands in the order with qty 1.
- Tap it again (same variant) → qty becomes 2.
- Tap Mixed Box → builder; pick 5 → adds a "Mixed Box · …" line.
- Tap Matcha (Drinks tab) → picker with 12/16 oz.
- Qty steppers and remove work; total updates. Stop the dev server.

- [ ] **Step 10: Commit**

```bash
git add src/app/components/register src/app/routes/RegisterPage.tsx
git commit -m "feat: register catalog, variant picker, mixed-box builder, order panel"
```

---

### Task 18: Payment math + PaymentModal

**Files:**
- Create: `src/app/components/payment/paymentMath.ts`
- Create: `src/app/components/payment/PaymentModal.tsx`
- Test: `src/app/components/payment/paymentMath.test.ts`

- [ ] **Step 1: Write the failing test for payment math**

Create `src/app/components/payment/paymentMath.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { changeDue, isPaymentValid } from './paymentMath';

describe('changeDue', () => {
  it('is tendered minus total, never negative', () => {
    expect(changeDue(490, 500)).toBe(10);
    expect(changeDue(490, 400)).toBe(0);
  });
});

describe('isPaymentValid', () => {
  it('cash requires tendered >= total', () => {
    expect(isPaymentValid({ method: 'cash', total: 100, tendered: 100 })).toBe(true);
    expect(isPaymentValid({ method: 'cash', total: 100, tendered: 90 })).toBe(false);
  });
  it('gcash/card are valid (reference optional)', () => {
    expect(isPaymentValid({ method: 'gcash', total: 100 })).toBe(true);
    expect(isPaymentValid({ method: 'card', total: 100 })).toBe(true);
  });
  it('split must sum to total', () => {
    expect(isPaymentValid({ method: 'split', total: 100, cash: 60, ewallet: 40 })).toBe(true);
    expect(isPaymentValid({ method: 'split', total: 100, cash: 60, ewallet: 30 })).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/app/components/payment/paymentMath.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `paymentMath.ts`**

```ts
export type PaymentMethod = 'cash' | 'gcash' | 'card' | 'split';

export function changeDue(total: number, tendered: number): number {
  return Math.max(0, Math.round((tendered - total) * 100) / 100);
}

export function isPaymentValid(p: {
  method: PaymentMethod;
  total: number;
  tendered?: number;
  cash?: number;
  ewallet?: number;
}): boolean {
  switch (p.method) {
    case 'cash':  return (p.tendered ?? 0) >= p.total;
    case 'gcash':
    case 'card':  return true;
    case 'split': return Math.abs((p.cash ?? 0) + (p.ewallet ?? 0) - p.total) < 0.005;
    default:      return false;
  }
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx vitest run src/app/components/payment/paymentMath.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement `PaymentModal.tsx`**

```tsx
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
```

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: success.

- [ ] **Step 7: Commit**

```bash
git add src/app/components/payment
git commit -m "feat: payment modal with cash/gcash/card/split + tested math"
```

---

### Task 19: Checkout orchestration — payload builder, receipt, end-to-end

**Files:**
- Create: `src/app/checkout/buildSalePayload.ts`
- Create: `src/app/components/receipt/Receipt.tsx`
- Modify: `src/app/routes/RegisterPage.tsx`
- Test: `src/app/checkout/buildSalePayload.test.ts`

- [ ] **Step 1: Write the failing test for the payload builder**

Create `src/app/checkout/buildSalePayload.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildSalePayload } from './buildSalePayload';
import type { CartLine } from '../state/CartContext';

const lines: CartLine[] = [
  { lineId: 'a', productId: 'matcha', variantId: 'matcha-16', name: 'Matcha Latte · 16 oz', unitPrice: 160, recipeSku: 'm1_16oz', quantity: 2 },
];

describe('buildSalePayload', () => {
  it('builds items, totals, deductions and costTotal', () => {
    const costMap = { adoleafMatcha: 12.644, oatside: 0.13, condensada: 0.18349, seaSalt: 0.4, cup16oz: 5, straw: 0.48 };
    const payload = buildSalePayload({
      saleNumber: 'X-1',
      lines,
      payment: { method: 'cash', amountTendered: 400, changeDue: 80 },
      costMap,
    });
    expect(payload.total).toBe(320);
    expect(payload.items[0].lineTotal).toBe(320);
    expect(payload.deductions.length).toBeGreaterThan(0);
    expect(payload.costTotal).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/app/checkout/buildSalePayload.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `buildSalePayload.ts`**

```ts
import { CartLine, cartTotal } from '../state/CartContext';
import { previewCartDeductions } from '../hooks/useInventorySync';
import { CreateSalePayload, PaymentPayload } from '../services/salesApi';

/** Round to 2 dp (currency). */
function money(n: number): number {
  return Math.round(n * 100) / 100;
}

export function buildSalePayload({ saleNumber, lines, payment, costMap }: {
  saleNumber: string;
  lines: CartLine[];
  payment: PaymentPayload;
  costMap: Record<string, number>; // ingredientId -> unit_cost
}): CreateSalePayload {
  const total = cartTotal(lines);

  const items = lines.map(l => ({
    recipeSku: l.recipeSku,
    name: l.name,
    variant: l.name.split(' · ')[1] ?? '',
    unitPrice: l.unitPrice,
    quantity: l.quantity,
    lineTotal: money(l.unitPrice * l.quantity),
    customizationLabel: l.customizationLabel,
  }));

  const deductions = previewCartDeductions(
    lines.map(l => ({ skuId: l.recipeSku, quantity: l.quantity, customizationLabel: l.customizationLabel })),
  ).map(d => ({ ingredientId: d.ingredientId, totalAmount: d.totalAmount, unit: d.unit }));

  const costTotal = money(
    deductions.reduce((sum, d) => sum + d.totalAmount * (costMap[d.ingredientId] ?? 0), 0),
  );

  return {
    saleNumber,
    items,
    subtotal: total,
    discount: 0,
    total,
    costTotal,
    payment,
    deductions,
  };
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx vitest run src/app/checkout/buildSalePayload.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement `Receipt.tsx`**

```tsx
import { forwardRef } from 'react';
import { Sale } from '../../services/salesApi';
import { formatPeso } from '../common/Money';

export const Receipt = forwardRef<HTMLDivElement, { sale: Sale }>(({ sale }, ref) => {
  const time = new Date(sale.createdAt).toLocaleString('en-PH', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const num = String(sale.id).padStart(6, '0');
  return (
    <div ref={ref} className="bg-white p-5 font-mono text-xs text-[var(--cocoa)]" style={{ width: 280 }}>
      <div className="text-center font-bold">🍪 POOKIES</div>
      <div className="text-center text-[var(--sand)] mb-2">Sale #{num} · {time}</div>
      <div className="border-t border-dashed border-[var(--sand)] my-2" />
      {sale.items.map((it, i) => (
        <div key={i} className="flex justify-between">
          <span className="truncate pr-2">{it.name} ×{it.quantity}</span>
          <span>{it.lineTotal.toFixed(2)}</span>
        </div>
      ))}
      <div className="border-t border-dashed border-[var(--sand)] my-2" />
      <div className="flex justify-between font-bold"><span>TOTAL</span><span>{formatPeso(sale.total)}</span></div>
      <div className="flex justify-between"><span>{sale.payment.method.toUpperCase()}</span>
        <span>{sale.payment.amountTendered != null ? sale.payment.amountTendered.toFixed(2) : sale.total.toFixed(2)}</span></div>
      {sale.payment.changeDue ? (
        <div className="flex justify-between"><span>Change</span><span>{sale.payment.changeDue.toFixed(2)}</span></div>
      ) : null}
      {sale.payment.referenceNo ? (
        <div className="flex justify-between"><span>Ref</span><span>{sale.payment.referenceNo}</span></div>
      ) : null}
      <div className="text-center text-[var(--sand)] mt-2">Salamat! 💚</div>
    </div>
  );
});
Receipt.displayName = 'Receipt';
```

- [ ] **Step 6: Rewrite `RegisterPage.tsx` to orchestrate checkout**

```tsx
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
```

- [ ] **Step 7: End-to-end manual test**

Seed and run both servers (`cd backend && npm run seed && npm start`, then `npm run dev`). On `/`:
1. Build an order, click **Charge**.
2. Pay cash with change → **Complete sale** → receipt appears.
3. Check the backend: `curl "http://localhost:3001/api/sales?date=$(date +%F)"` shows the sale; a `sale_<id>_*.png` exists in `backend/Receipts/` and the sale's `receiptImage` is set (`curl http://localhost:3001/api/sales/<id>`).
4. `curl http://localhost:3001/api/inventory/stock` shows reduced ingredient stock.
Stop the servers.

- [ ] **Step 8: Run the full frontend test suite**

Run: `npm run test`
Expected: all Vitest suites pass.

- [ ] **Step 9: Commit**

```bash
git add src/app/checkout src/app/components/receipt src/app/routes/RegisterPage.tsx
git commit -m "feat: end-to-end checkout (payload, sale, receipt capture)"
```

---

## Phase 4 — Manager sales & reports, receipt page, README

### Task 20: Sales summary cards & daily breakdown

**Files:**
- Create: `src/app/components/sales/SummaryCards.tsx`
- Create: `src/app/components/sales/DailyReport.tsx`

- [ ] **Step 1: `SummaryCards.tsx`**

```tsx
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
```

- [ ] **Step 2: `DailyReport.tsx`**

```tsx
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
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add src/app/components/sales/SummaryCards.tsx src/app/components/sales/DailyReport.tsx
git commit -m "feat: sales summary cards and daily breakdown"
```

---

### Task 21: Sales history list + detail, and the Sales page

**Files:**
- Create: `src/app/components/sales/SaleRow.tsx`
- Create: `src/app/components/sales/SaleDetailModal.tsx`
- Create: `src/app/components/sales/SalesHistory.tsx`
- Modify: `src/app/routes/manager/SalesReportPage.tsx`

- [ ] **Step 1: `SaleRow.tsx`**

```tsx
import { SaleListItem } from '../../services/salesApi';
import { formatPeso } from '../common/Money';

const PAY_ICON: Record<string, string> = { cash: '💵', gcash: '📱', card: '💳', split: '⚡' };

export function SaleRow({ sale, onClick }: { sale: SaleListItem; onClick: () => void }) {
  const time = new Date(sale.createdAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
  return (
    <button onClick={onClick}
      className="w-full grid grid-cols-[1fr_1fr_1fr_auto] gap-2 px-4 py-2.5 text-sm text-left hover:bg-[var(--cream)] border-b border-[var(--cream)]">
      <span className="text-[var(--cocoa)]">#{String(sale.id).padStart(6, '0')}</span>
      <span className="text-[var(--sand)]">{time}</span>
      <span className="capitalize">{PAY_ICON[sale.paymentMethod] ?? ''} {sale.paymentMethod}</span>
      <span className="font-semibold text-[var(--cocoa)]">{formatPeso(sale.total)}</span>
    </button>
  );
}
```

- [ ] **Step 2: `SaleDetailModal.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { getSale, Sale } from '../../services/salesApi';
import { Receipt } from '../receipt/Receipt';
import { Button } from '../common/Button';

export function SaleDetailModal({ id, onClose }: { id: number; onClose: () => void }) {
  const [sale, setSale] = useState<Sale | null>(null);
  useEffect(() => { getSale(id).then(r => setSale(r.sale)).catch(() => setSale(null)); }, [id]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-4 w-full max-w-xs" onClick={e => e.stopPropagation()}>
        {!sale ? <p className="text-[var(--taupe)] p-6 text-center">Loading…</p> : (
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
```

- [ ] **Step 3: `SalesHistory.tsx`**

```tsx
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
```

- [ ] **Step 4: Build the `SalesReportPage.tsx`**

```tsx
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
```

- [ ] **Step 5: Verify**

Run: `npm run build` (expected: success). With both servers running and at least one sale recorded, open `/manager/sales`:
- Summary cards show today's totals; the sale appears in Recent Sales; tapping a row opens its receipt; the breakdown lists by payment and product. Changing the date refetches. Stop the servers.

- [ ] **Step 6: Commit**

```bash
git add src/app/components/sales src/app/routes/manager/SalesReportPage.tsx
git commit -m "feat: manager sales history, detail, and daily report page"
```

---

### Task 22: Reprintable receipt page

**Files:**
- Create: `src/app/routes/ReceiptPage.tsx`
- Modify: `src/app/App.tsx`

- [ ] **Step 1: Create `ReceiptPage.tsx`**

```tsx
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
```

- [ ] **Step 2: Add the route in `App.tsx`**

Add the import and a top-level route (outside `/manager`):

```tsx
import { ReceiptPage } from './routes/ReceiptPage';
// ...
<Route path="/receipt/:id" element={<ReceiptPage />} />
```

- [ ] **Step 3: Verify**

Run: `npm run build` (expected: success). With a known sale id, open `/receipt/<id>` directly — the receipt renders; Print and Save image work. Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/app/routes/ReceiptPage.tsx src/app/App.tsx
git commit -m "feat: reprintable /receipt/:id page"
```

---

### Task 23: README & final verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Write `README.md`**

````markdown
# Pookies POS

A point-of-sale application for the Pookies cookie & matcha café. Cashiers ring up
orders on the **Register**; each sale deducts ingredients from inventory. The
**Manager** area covers stock, sales reports, and product costing.

## Stack
- Frontend: React 18 + TypeScript + Vite + Tailwind v4 + shadcn/ui + React Router 7
- Backend: Express + SQLite (better-sqlite3)
- Tests: Vitest (frontend), node:test (backend)

## Prerequisites
- Node.js >= 18

## Run (two terminals)

```bash
# Terminal 1 — backend API on http://localhost:3001
cd backend
npm install
npm run seed     # one-time: load realistic starting stock
npm start        # or: npm run dev (auto-restart)

# Terminal 2 — frontend on http://localhost:5173
npm install
npm run dev
```

Open http://localhost:5173. The backend must be running first.

## Tests

```bash
npm run test                       # frontend (Vitest)
node --test backend/__tests__      # backend
```

## Features
- **Register** (`/`): product catalog (cookies, drinks, boxes & bundles), variant
  picker, build-your-own Mixed Box, cart, payment (cash/GCash/card/split), on-screen
  receipt saved as an image.
- **Manager** (`/manager`): Sales & daily report, Stock + restock (receipt upload),
  Product Costing.
- Reprint any sale at `/receipt/:id`.

## Notes
- Ingredient deductions are never blocked; stock may go negative and is flagged Critical.
- Sales are stored permanently; ingredient transaction logs are purged after 30 days.
- Provisional product prices live in `src/app/data/catalog.ts`.
````

- [ ] **Step 2: Full verification pass**

Run:
```bash
npm run test
npm run build
node --test backend/__tests__/schema.test.js backend/__tests__/sales.create.test.js backend/__tests__/sales.list.test.js backend/__tests__/sales.report.test.js
```
Expected: all green; build succeeds.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add Pookies POS README"
```

---

## Self-Review (completed during planning)

**Spec coverage:** Every spec section maps to tasks — catalog/pricing (T13–14), checkout
flow (T16–19), payments (T18), receipt save (T11, T19, T22), Manager sales/report (T20–21),
stock (T5), costing (T6), sales tables exempt from purge (T7), `/api/sales` (T8–11),
theming/primitives (T2–3), MUI removal (T1), dev seed (T12), README (T23), tests
throughout. No gaps.

**Placeholder scan:** No TBD/TODO/"handle errors" placeholders — every code step contains
complete code; every command lists expected output.

**Type consistency:** `recipeSku` used consistently across `catalog.ts`, `CartLine`,
`buildSalePayload`, and `SaleItemPayload`. `PaymentPayload` shape matches between
`paymentMath`/`PaymentModal`/`buildSalePayload`/backend `createSale`. `Sale`/`SaleListItem`/
`DailyReport` shapes match backend responses in `salesController`. Backend deduction keys
(`saleNumber` → `inventory_logs.sale_id`) align with the existing unique index.

**Known follow-ups (not blockers):** the existing `PATCH /api/inventory/deduct` endpoint
remains for backward compatibility but is unused by the POS (the atomic `POST /api/sales`
path supersedes it); it can be retired in a later cleanup.

