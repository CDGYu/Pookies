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
