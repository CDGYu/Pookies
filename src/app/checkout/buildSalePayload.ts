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
