/**
 * inventoryApi.ts — Pookies Frontend API Service Layer
 *
 * Targets the local Express/SQLite backend at localhost:3001.
 * All calls go through this module — no direct fetch() calls in components.
 *
 * Override the base URL with VITE_API_URL in your .env file:
 *   VITE_API_URL=http://localhost:3001
 *
 * Integration pattern (POS handlePaymentComplete):
 *   import { checkStockBeforeSale, deductStock } from '../services/inventoryApi';
 *
 *   const check = await checkStockBeforeSale(deductions);
 *   if (!check.isAvailable) { showAlert(check.shortfalls); return; }
 *   await deductStock({ saleId, timestamp, deductions });
 *
 * All receipt images are named: rec_YYYYMMDD_HHmm.<ext>  (e.g. rec_20260427_1152.jpg)
 * Stored in: /backend/Receipts/
 *
 * 2025 Master Ingredient Price List (cross-reference):
 *   Margarine:      ₱0.235/g   Egg:       ₱10.00/pc
 *   White Choco:    ₱0.075/g   Egg Yolk:  ₱5.00/pc
 *   Adoleaf Matcha: ₱12.644/g  Oatside:   ₱0.13/ml
 */

// ── Configuration ─────────────────────────────────────────────────────────────

const API_BASE: string =
  (import.meta as Record<string, Record<string, string>>).env?.VITE_API_URL ??
  'http://localhost:3001';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StockIngredient {
  id:              string;
  name:            string;
  category:        string;
  current_stock:   number;
  unit:            string;       // g | ml | pcs
  unit_cost:       number;       // ₱ per unit (2025 Master List)
  min_stock_level: number;       // batch-minimum threshold
  supplier:        string | null;
}

export interface StockResponse {
  ingredients: StockIngredient[];
}

export interface DeductionItem {
  ingredientId: string;
  totalAmount:  number;  // DECIMAL(12,4) — rounded to 4dp
  unit:         string;
}

export interface DeductPayload {
  saleId:     string;
  timestamp:  string;            // ISO 8601
  deductions: DeductionItem[];
}

export interface CriticalAlert {
  ingredientId:  string;
  name:          string;
  previousStock: number;
  currentStock:  number;         // <= 0 when Critical Stock Alert fires
  unit:          string;
}

export interface DeductResponse {
  status:         'ok' | 'ok_with_critical_alerts' | 'already_applied';
  saleId:         string;
  criticalAlerts: CriticalAlert[];
  message:        string;
}

export interface RestockItem {
  ingredientId: string;
  name:         string;
  amountAdded:  number;
  unit:         string;
}

export interface RestockPayload {
  receiptUploadId?: number;    // ID from uploadReceipt response
  items: RestockItem[];
}

export interface RestockResponse {
  status:         string;
  restockedAt:    string;      // ISO 8601
  itemCount:      number;
  confirmedItems: (RestockItem & { restockedAt: string })[];
  message:        string;      // e.g. "Restock confirmed: 2026-04-27T11:52:00Z — 3 ingredient(s) updated."
}

export interface ReceiptUploadResponse {
  id:          number;
  imageName:   string;         // e.g. rec_20260427_1152.jpg
  filePath:    string;
  uploadedAt:  string;
  publicUrl:   string;         // e.g. /Receipts/rec_20260427_1152.jpg
  message:     string;
}

export interface ValuationLine {
  ingredientId: string;
  name:         string;
  currentStock: number;
  unit:         string;
  unitCost:     number;
  value:        number;        // currentStock × unitCost (negative stock = 0)
}

export interface InventoryValuation {
  totalValue:  number;
  breakdown:   ValuationLine[];
  generatedAt: string;
}

export interface StockShortfall {
  ingredientId: string;
  name:         string;
  required:     number;
  available:    number;
  unit:         string;
}

export interface StockAvailabilityResult {
  isAvailable: boolean;
  shortfalls:  StockShortfall[];
}

// ── Precision helper ──────────────────────────────────────────────────────────

/** Round to 4 decimal places — matches SQLite ROUND(x, 4) */
function p4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

async function apiGet<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method:  'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { message?: string }).message ?? `GET ${endpoint} failed: HTTP ${res.status}`
    );
  }
  return res.json() as Promise<T>;
}

async function apiPost<T>(endpoint: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { message?: string }).message ?? `POST ${endpoint} failed: HTTP ${res.status}`
    );
  }
  return res.json() as Promise<T>;
}

async function apiPatch<T>(endpoint: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { message?: string }).message ?? `PATCH ${endpoint} failed: HTTP ${res.status}`
    );
  }
  return res.json() as Promise<T>;
}

async function apiPut<T>(endpoint: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { message?: string }).message ?? `PUT ${endpoint} failed: HTTP ${res.status}`
    );
  }
  return res.json() as Promise<T>;
}

async function apiDelete<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method:  'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { message?: string }).message ?? `DELETE ${endpoint} failed: HTTP ${res.status}`
    );
  }
  return res.json() as Promise<T>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Endpoints
// ─────────────────────────────────────────────────────────────────────────────

/**
 * getStock
 * GET /api/inventory/stock
 *
 * Returns current stock for all 30 ingredients from SQLite.
 * Used by the CanIBakePanel and POS pre-sale guard.
 */
export async function getStock(): Promise<StockResponse> {
  return apiGet<StockResponse>('/api/inventory/stock');
}

/**
 * getInventoryValuation
 * GET /api/inventory/valuation
 *
 * Fetches total asset value calculated by SQLite arithmetic on the backend.
 * Prevents frontend computation lag as the ingredient list grows.
 * Negative stock is counted as zero (stock deficit is not an asset).
 */
export async function getInventoryValuation(): Promise<InventoryValuation> {
  return apiGet<InventoryValuation>('/api/inventory/valuation');
}

/**
 * deductStock
 * PATCH /api/inventory/deduct
 *
 * Applies a completed POS sale's aggregated ingredient deductions.
 * Payload is produced by useInventorySync.tsx → buildDeductions().
 *
 * Transactions are NEVER blocked (negative stock policy).
 * Ingredients that cross zero are returned in `criticalAlerts`.
 */
export async function deductStock(payload: DeductPayload): Promise<DeductResponse> {
  return apiPatch<DeductResponse>('/api/inventory/deduct', payload);
}

/**
 * restockIngredient
 * POST /api/inventory/restock
 *
 * Records a replenishment and saves a permanent confirmed_data snapshot
 * to the receipt_uploads row for audit trail (not subject to 30-day purge).
 *
 * Pass the receiptUploadId from a prior uploadReceipt() call to link them.
 */
export async function restockIngredient(payload: RestockPayload): Promise<RestockResponse> {
  return apiPost<RestockResponse>('/api/inventory/restock', payload);
}

/**
 * uploadReceipt
 * POST /api/inventory/receipt  (multipart/form-data, field: "receipt")
 *
 * Uploads a receipt image to the backend.
 * The server saves it to /Receipts/ renamed as: rec_YYYYMMDD_HHmm.<ext>
 * Example: rec_20260427_1152.jpg
 *
 * Returns the receipt_uploads record ID. Pass it to restockIngredient()
 * as receiptUploadId to link the confirmed snapshot to this receipt.
 */
export async function uploadReceipt(file: File): Promise<ReceiptUploadResponse> {
  const form = new FormData();
  form.append('receipt', file);  // field name must match multer config

  const res = await fetch(`${API_BASE}/api/inventory/receipt`, {
    method: 'POST',
    body:   form,
    // Do NOT set Content-Type — browser sets multipart boundary automatically
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { message?: string }).message ?? `Receipt upload failed: HTTP ${res.status}`
    );
  }
  return res.json() as Promise<ReceiptUploadResponse>;
}

/**
 * checkStockBeforeSale
 *
 * Pre-sale availability guard. Fetches live stock from SQLite, then
 * compares against the pre-computed deduction list from buildDeductions().
 *
 * Call this BEFORE processing payment in handlePaymentComplete.
 * Returns shortfalls so the UI can display exactly which ingredients are insufficient.
 *
 * @param deductions — from useInventorySync.tsx checkStockAvailability()
 */
export async function checkStockBeforeSale(
  deductions: DeductionItem[]
): Promise<StockAvailabilityResult> {
  const { ingredients } = await getStock();

  const stockMap = new Map(
    ingredients.map(i => [i.id, { available: i.current_stock, unit: i.unit, name: i.name }])
  );

  const shortfalls: StockShortfall[] = [];

  for (const { ingredientId, totalAmount, unit } of deductions) {
    const stock     = stockMap.get(ingredientId);
    const available = p4(stock?.available ?? 0);
    if (available < totalAmount) {
      shortfalls.push({
        ingredientId,
        name:      stock?.name ?? ingredientId,
        required:  totalAmount,
        available,
        unit,
      });
    }
  }

  return {
    isAvailable: shortfalls.length === 0,
    shortfalls,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Ingredient CRUD operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * addIngredient
 * POST /api/inventory/add
 *
 * Creates a new ingredient in the master list.
 */
export interface AddIngredientPayload {
  id: string;
  name: string;
  category: string;
  unit: string;
  unit_cost: number;
  min_stock_level: number;
  current_stock?: number;
  supplier?: string;
}

export interface AddIngredientResponse {
  status: string;
  ingredient: StockIngredient;
  message: string;
}

export async function addIngredient(payload: AddIngredientPayload): Promise<AddIngredientResponse> {
  return apiPost<AddIngredientResponse>('/api/inventory/add', payload);
}

/**
 * updateIngredient
 * PUT /api/inventory/update/:id
 *
 * Updates ingredient metadata and/or current stock.
 * Changes are logged as ADJUSTMENT transactions.
 */
export interface UpdateIngredientPayload {
  name?: string;
  category?: string;
  unit_cost?: number;
  min_stock_level?: number;
  current_stock?: number;
  supplier?: string;
}

export interface UpdateIngredientResponse {
  status: string;
  ingredient: StockIngredient;
  stockDelta: number;
  message: string;
}

export async function updateIngredient(
  id: string,
  payload: UpdateIngredientPayload
): Promise<UpdateIngredientResponse> {
  return apiPut<UpdateIngredientResponse>(`/api/inventory/update/${id}`, payload);
}

/**
 * deleteIngredient
 * DELETE /api/inventory/delete/:id
 *
 * Permanently removes an ingredient and its transaction history.
 */
export interface DeleteIngredientResponse {
  status: string;
  deleted: {
    id: string;
    name: string;
    finalStock: number;
    unit: string;
  };
  message: string;
}

export async function deleteIngredient(id: string): Promise<DeleteIngredientResponse> {
  return apiDelete<DeleteIngredientResponse>(`/api/inventory/delete/${id}`);
}
