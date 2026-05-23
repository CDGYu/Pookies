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
  items: SaleItemPayload[];
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
