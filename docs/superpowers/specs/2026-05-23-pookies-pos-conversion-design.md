# Pookies — Inventory System → POS Application (Design Spec)

- **Date:** 2026-05-23
- **Status:** Approved design — ready for implementation planning
- **Author:** Brainstormed with Claude (visual companion session)

## 1. Goal

Convert the existing **Pookies Inventory Management System** into a **Point-of-Sale (POS)
application** for a cookie & matcha café, and refresh the look. The app becomes
**POS-first**: the cashier/register screen is the default experience, and inventory is
trimmed to a back-office "Manager" area that supports selling. Each sale automatically
deducts ingredients from the inventory that is already wired for it.

## 2. Current state (what we're building on)

- **Frontend:** React 18 + TypeScript + Vite + Tailwind v4 + shadcn/ui, `lucide-react`
  icons, `recharts`, `motion`. Single-screen `InventoryDashboard` with three tabs
  (Stock Monitor, Product Costing, Batch Calculator).
- **Backend:** Express + SQLite (`better-sqlite3`). Tables: `ingredients`,
  `inventory_logs` (purged after 30 days), `receipt_uploads`. Endpoints for stock,
  valuation, deduct, restock, receipt upload, ingredient CRUD, transactions, low-stock.
- **Already built for POS (reused, not rebuilt):** `useInventorySync.tsx` contains a full
  `RECIPE_BOOK` mapping product SKUs → exact ingredient deductions, a `buildDeductions`
  aggregator, Mixed-Box resolver, `checkStockAvailability`, and `syncSaleToInventory`.
  The backend `PATCH /api/inventory/deduct` is atomic and idempotent (unique index on
  `sale_id, ingredient_id`).
- **Gap:** there is **no selling UI** — no catalog to sell from, cart, checkout, payment,
  or sales receipt, and **no persistent sales records** (sales currently only exist as
  `inventory_logs` rows that get purged at 30 days).

## 3. Scope

### In scope
- Register (cashier) screen: product catalog, variant selection, Mixed-Box builder, cart.
- Checkout: payment (cash + change, GCash/e-wallet, card, split), on-screen receipt,
  receipt saved as an image.
- Manager area: Sales history & end-of-day report (new), Stock + restock (kept), Product
  Costing (kept).
- Persistent sales records (new `sales` / `sale_items` tables, exempt from purge).
- Visual refresh: palette tokens, shared UI primitives, consistent touch-friendly styling.
- Remove unused MUI dependency stack.
- Dev seed script for starting stock; real README.
- Vitest tests for cart/deduction/sales math.

### Out of scope (confirmed)
- Discounts / promos / vouchers
- Customer accounts / loyalty
- Multiple cashiers / login & PIN
- Order parking (hold & resume)
- Batch Calculator and the standalone "Can I Bake?" panel are **retired**.

## 4. Decisions (from brainstorming)

| Decision | Choice |
|---|---|
| App direction | Convert fully to POS; inventory becomes back-office "Manager" |
| Architecture | Two-area shell via **React Router 7** (already a dependency) |
| Register layout | Catalog left, order panel right; category tabs on top |
| Product model | Full range: piece, Mini Box (3), Box of 5, Pack of 6, Mixed Box (5), Dubai piece, Matcha 12/16oz |
| Payments | Cash (+change), GCash/e-wallet, Card, Split |
| Receipt | On-screen + saved as image to `/Receipts` |
| Back office kept | Stock + restock, Sales history & daily report (new), Product Costing |
| MUI cleanup | Remove (verified unused) |
| Dev seed | On-demand `npm run seed` |

## 5. Architecture — router shell

```
/                    RegisterPage      (default — cashier)
/manager             ManagerLayout     (redirects to /manager/sales)
/manager/sales       SalesReportPage   (history + end-of-day report)
/manager/stock       StockPage         (inventory table, add/edit, restock)
/manager/costing     CostingPage       (existing product costing)
/receipt/:id         ReceiptPage       (reprintable / re-savable receipt)
```

A persistent header hosts the **Register ↔ Manager** toggle. `App.tsx` becomes a
`<BrowserRouter>` with a `<CartProvider>` wrapping the register routes.

## 6. Product catalog & pricing

New `src/app/data/catalog.ts`. Each variant points to a `recipeSku` key in `RECIPE_BOOK`,
so selling reuses the existing, tested deduction logic.

| Product | Category | Variants (`recipeSku`) | Provisional price (₱) |
|---|---|---|---|
| Classic Choc Chip | cookies | piece `c1_piece`, Mini Box 3 `c1_mini3`, Box of 5 `c1_box5`, Pack of 6 `c1_pack6` | 30 / 85 / 135 / 150 |
| Red Velvet | cookies | `c2_piece`, `c2_mini3`, `c2_box5`, `c2_pack6` | 35 / 95 / 150 / 170 |
| S'mores | cookies | `c3_piece`, `c3_mini3`, `c3_box5`, `c3_pack6` | 35 / 95 / 150 / 170 |
| Mixed Box (5) | bundles | builder → `c4` + `customizationLabel` | 150 |
| Dubai Cookie | cookies | piece `c5` | 130 |
| Matcha Latte | drinks | 12oz `m1_12oz`, 16oz `m1_16oz` | 135 / 160 |

**Prices are provisional and editable** (defined in one place in `catalog.ts`).

**New `RECIPE_BOOK` entries** (`c1_pack6`, `c2_pack6`, `c3_pack6`): a Pack of 6 = 6 × 40g
dough (240g, scaled from the batch recipe) + 1 packaging box. Added alongside the existing
piece/mini3/box5 entries in `useInventorySync.tsx`.

Catalog types:

```ts
type CatalogCategory = 'cookies' | 'drinks' | 'bundles';

interface ProductVariant {
  id: string;          // 'classic-box5'
  label: string;       // 'Box of 5'
  price: number;       // ₱
  recipeSku: string;   // key into RECIPE_BOOK
}

interface CatalogProduct {
  id: string;
  name: string;
  category: CatalogCategory;
  icon: string;            // emoji or lucide name
  variants: ProductVariant[];
  isMixedBox?: boolean;    // opens the 5-slot builder instead of a variant list
}
```

## 7. Cart & checkout flow

1. Tap a product → if it has one variant, add directly; if multiple, open **VariantPicker**.
   Mixed Box opens **MixedBoxBuilder** (choose 5 cookies from Classic/Red Velvet/S'mores).
2. **OrderPanel** (right) lists lines with qty steppers and a running total; a primary
   **Charge ₱X** button.
3. **PaymentModal** — choose method, enter amount(s); cash shows change due.
4. On confirm: **pre-sale stock check** (`checkStockAvailability`). Shortfalls are shown.
   Per existing policy, deductions are **never blocked** — the cashier may proceed; any
   ingredient crossing zero is flagged Critical.
5. `POST /api/sales` records the sale and deducts atomically.
6. **Receipt** renders on screen (New sale / Print), is captured to PNG, and uploaded to
   `/Receipts`, linked to the sale.

Cart state (`CartContext`):

```ts
interface CartLine {
  lineId: string;            // local uuid
  productId: string;
  variantId: string;
  name: string;              // 'Classic · Box of 5'
  unitPrice: number;
  quantity: number;
  recipeSku: string;         // for deduction
  customizationLabel?: string; // Mixed Box only
}
```

Cart → deductions: map each line to the `CartItem` shape `buildDeductions` already accepts
(`{ skuId: recipeSku, quantity, customizationLabel }`).

## 8. Payments

- **Cash:** amount tendered → `change_due = tendered − total`.
- **GCash / e-wallet:** optional `reference_no`.
- **Card:** optional `reference_no`.
- **Split:** `cash_amount` + `ewallet_amount` must sum to `total`; e-wallet portion may
  carry a `reference_no`. Change applies only to any cash overpayment.

Validation lives in the PaymentModal; the backend stores the chosen breakdown.

## 9. Receipt

- `Receipt` component renders sale number, timestamp, line items, totals, payment, change.
- Captured to PNG on the client (`html-to-image`) and POSTed to `POST /api/sales/:id/receipt`,
  which saves to `/Receipts` (reusing the multer pipeline) and stores the filename on the
  sale row.
- Re-openable at `/receipt/:id` for reprint / re-save.
- Image capture failure is **non-blocking**: the sale is already recorded; the UI surfaces
  a soft warning and offers retry.

## 10. Manager area

- **Sales & Reports** (`/manager/sales`): summary cards (today's sales, order count,
  estimated profit, top seller), recent-sales list (tap → `SaleDetailModal` / receipt),
  and an **End-of-Day Breakdown** by payment method and by product. Date selector.
- **Stock** (`/manager/stock`): existing `InventoryList`, `AddItemModal`, `EditItemModal`,
  `StockInModal`, `StatsCard` (asset value, low/critical counts), restock + receipt upload —
  moved under `components/stock/`, restyled.
- **Costing** (`/manager/costing`): existing `ProductCosting`, restyled.

## 11. Data model

### Frontend
`catalog.ts` (above), `CartContext`, `salesApi.ts` types mirroring the backend responses.

### Backend — new tables (NOT purged)

```sql
CREATE TABLE IF NOT EXISTS sales (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_number     TEXT    UNIQUE NOT NULL,   -- idempotency key from client
  created_at      TEXT    NOT NULL,
  subtotal        REAL    NOT NULL,
  discount        REAL    NOT NULL DEFAULT 0,
  total           REAL    NOT NULL,
  cost_total      REAL    NOT NULL DEFAULT 0, -- COGS snapshot for profit reporting
  payment_method  TEXT    NOT NULL,           -- 'cash'|'gcash'|'card'|'split'
  amount_tendered REAL,
  change_due      REAL,
  cash_amount     REAL    NOT NULL DEFAULT 0,
  ewallet_amount  REAL    NOT NULL DEFAULT 0,
  reference_no    TEXT,
  receipt_image   TEXT                        -- '/Receipts/...' filename, nullable
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

`cost_total` is computed at checkout (Σ deduction × ingredient `unit_cost`) so profit
reporting is correct even after `inventory_logs` are purged.

## 12. Backend API (`/api/sales`)

- **`POST /api/sales`** — body: `{ saleNumber, items[], payment{}, deductions[], costTotal }`.
  One transaction: insert `sales` + `sale_items`, then apply deductions (reusing the
  existing deduct routine, keyed on `saleNumber` for idempotency). Returns the saved sale
  and `criticalAlerts`. If `saleNumber` already exists → `already_applied`, no double count.
- **`GET /api/sales?date=YYYY-MM-DD`** (or `from`/`to`) — list with item counts/totals.
- **`GET /api/sales/:id`** — full sale + items (receipt reprint).
- **`GET /api/sales/report/daily?date=YYYY-MM-DD`** — `{ totalSales, orderCount,
  estProfit, byPayment[], byProduct[], topSeller }`.
- **`POST /api/sales/:id/receipt`** — multipart image upload → save to `/Receipts`, set
  `sales.receipt_image`.

Routes in new `backend/routes/sales.js`; handlers in `backend/controllers/salesController.js`;
table creation added to `backend/db/database.js` `_initSchema`.

## 13. Stock & deduction policy (unchanged)

- Deductions never blocked; negative stock allowed and surfaced as **Critical**.
- Idempotent per sale.
- 4-decimal precision (`p4`) preserved end-to-end.
- `cleanupWorker` continues to purge only `inventory_logs` + `/Logs`. **`sales` and
  `sale_items` are never purged.**

## 14. Theming & visual refresh

- Lift the palette into CSS variables (`theme.css`) + Tailwind tokens:
  `matcha-600 #4A7C59`, `matcha-800 #2D5A3D`, `cream #FEF9F2`, `cookie-100 #F0DCC0`,
  `cocoa #2C1810`, `taupe #7A6558`, `sand #9A8F86`, `mint #E8F2EB`, plus alert/critical.
- Shared primitives in `components/common/`: `Button`, `Card`, `Badge`, `Money`
  (₱ formatting), `SectionHeader`. New screens use them; moved screens are restyled to them.
- Replace ad-hoc inline hex in new and touched components with tokens/primitives.
- Touch-friendly sizing for register controls.

## 15. File structure (target)

```
src/app/
  App.tsx                       BrowserRouter + CartProvider
  routes/
    RegisterPage.tsx
    ManagerLayout.tsx
    manager/{SalesReportPage,StockPage,CostingPage}.tsx
    ReceiptPage.tsx
  state/CartContext.tsx
  components/
    register/{ProductCatalog,CategoryTabs,ProductTile,VariantPicker,MixedBoxBuilder,OrderPanel,OrderLine}.tsx
    payment/{PaymentModal,CashPanel,EwalletPanel,SplitPanel}.tsx
    receipt/{Receipt,ReceiptActions}.tsx
    sales/{SalesHistory,SaleRow,DailyReport,SummaryCards,SaleDetailModal}.tsx
    stock/   (InventoryList, AddItemModal, EditItemModal, StockInModal, StatsCard — moved, restyled)
    costing/ ProductCosting (moved, restyled)
    common/  {Button,Card,Badge,Money,SectionHeader}.tsx
    ui/      (shadcn primitives — kept)
  data/      catalog.ts (new), recipes.ts, inventory.ts
  services/  inventoryApi.ts, salesApi.ts (new)
  hooks/     useInventorySync.tsx (extended: pack6)
backend/
  routes/sales.js                (new)
  controllers/salesController.js  (new)
  db/database.js                  (+sales/sale_items schema)
  seed.js                         (new — npm run seed)
```

**Removed:** `BatchCalculator.tsx`, `CanIBakePanel.tsx`; `InventoryDashboard.tsx`
decomposed into the pages above.

## 16. Dependencies

- **Add:** `react-router` is present; `html-to-image` (receipt PNG capture); `vitest` +
  `@testing-library/react` (dev).
- **Remove (verified unused in `src`):** `@mui/material`, `@mui/icons-material`,
  `@emotion/react`, `@emotion/styled`, `@popperjs/core`, `react-popper`, `react-slick`.
- **Keep:** `embla-carousel-react`, `vaul` (used by shadcn ui), `recharts`, `motion`,
  `lucide-react`, `sonner`, etc.

## 17. Dev seed

`backend/seed.js` (run via `npm run seed`) sets realistic starting stock (from the current
`inventory.ts` quantities, e.g. flour 25000g, margarine 600g, …) by updating
`current_stock` for seeded ingredients. Safe to re-run (idempotent UPDATE). Documented in
the README.

## 18. Testing (Vitest)

- **Cart math:** line totals, order total, quantity changes, remove line.
- **Deductions:** `buildDeductions` for piece/mini3/box5/**pack6**/Mixed Box; aggregation
  across shared ingredients; 4-dp precision.
- **Backend sales:** `POST /api/sales` records sale + items + applies deductions
  atomically; idempotent on repeat `saleNumber`; `daily report` aggregates totals / profit
  / by-payment / by-product correctly; sales rows persist after a simulated cleanup run.

## 19. Documentation

Replace the empty `README.md` with: project overview, prerequisites, install, run
(backend then frontend), `npm run seed`, ports, and a short feature tour (Register,
Manager, receipts).

## 20. Risks & notes

- **Receipt capture** depends on a client-side DOM→PNG step; kept non-blocking so a capture
  failure never loses a sale.
- **Cookie size inconsistency** is inherited from existing data (pieces 40g, box cookies
  20–25g). Pack of 6 is defined at 6 × 40g; all amounts live in one place and are editable.
- **Provisional prices** must be confirmed before go-live (single source: `catalog.ts`).
- Existing committed `pookies_inventory.db` is not overwritten by seeding; `npm run seed`
  only updates stock levels of seeded ingredients.
```
