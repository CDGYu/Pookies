/**
 * InventoryList — Stock Monitor Table
 *
 * Three-tier stock status system:
 *   Critical  quantity <= 0              — stock fully depleted (negative allowed after POS deductions)
 *   Low       0 < quantity < minStock    — below single-batch production threshold
 *   OK        quantity >= minStock       — sufficient for at least one full batch
 *
 * Batch thresholds encoded in minStock (sourced from 2025 PDF):
 *   Flour 250g | Margarine 115g | Brown Sugar 110g | White Sugar 130g
 *   Cream Cheese 200g | Cocoa Powder 20g | Oatside 160ml | Adoleaf Matcha 4.5g
 */

import { useState } from 'react';
import {
  Pencil,
  Trash2,
  AlertTriangle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  ShieldAlert,
} from 'lucide-react';
import { InventoryItem, CATEGORY_LABELS, CATEGORY_COLORS } from '../../data/inventory';
import { EditItemModal } from './EditItemModal';

interface InventoryListProps {
  items: InventoryItem[];
  onUpdate: (id: string, updates: Partial<InventoryItem>) => void;
  onDelete: (id: string) => void;
}

function formatCost(cost: number, unit: string) {
  if (cost < 0.001) return `₱${cost.toFixed(5)}/${unit}`;
  if (cost < 0.01)  return `₱${cost.toFixed(5)}/${unit}`;
  if (cost < 1)     return `₱${cost.toFixed(4)}/${unit}`;
  return `₱${cost.toFixed(3)}/${unit}`;
}

function formatQty(qty: number, unit: string) {
  const abs       = Math.abs(qty);
  const formatted = abs % 1 === 0 ? abs.toLocaleString() : abs.toFixed(2);
  return qty < 0 ? `-${formatted} ${unit}` : `${formatted} ${unit}`;
}

// ── Status helpers ────────────────────────────────────────────────────────────

type StockTier = 'critical' | 'low' | 'ok';

function getStockTier(item: InventoryItem): StockTier {
  if (item.quantity <= 0)                             return 'critical';
  if (item.quantity < item.minStock)                  return 'low';
  return 'ok';
}

const TIER_ROW_BG: Record<StockTier, string> = {
  critical: 'bg-red-50/70 hover:bg-red-50',
  low:      'bg-amber-50/40 hover:bg-amber-50/60',
  ok:       'hover:bg-[#FEFAF5]',
};

const TIER_CARD_BORDER: Record<StockTier, string> = {
  critical: 'border-red-300',
  low:      'border-amber-200',
  ok:       'border-[#F0DCC0]',
};

function StatusBadge({ tier }: { tier: StockTier }) {
  if (tier === 'critical') {
    return (
      <span className="inline-flex items-center gap-1 text-[#7F1D1D] bg-red-100 border border-red-300 text-xs px-2 py-0.5 rounded-full">
        <ShieldAlert className="w-3 h-3" />
        Critical
      </span>
    );
  }
  if (tier === 'low') {
    return (
      <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 border border-amber-200 text-xs px-2 py-0.5 rounded-full">
        <AlertCircle className="w-3 h-3" />
        Low Stock
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[#4A7C59] text-xs">
      <CheckCircle className="w-3.5 h-3.5" />
      OK
    </span>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function InventoryList({ items, onUpdate, onDelete }: InventoryListProps) {
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [expandedId, setExpandedId]   = useState<string | null>(null);

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Remove "${name}" from inventory?`)) onDelete(id);
  };

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#F0DCC0] p-12 text-center shadow-sm">
        <p className="text-[#C5B5A8] text-sm">
          No items match your search. Try a different filter.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* ── Desktop Table ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[#F0DCC0] overflow-hidden shadow-sm hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#F5EFE6' }}>
                {[
                  'Ingredient',
                  'Category',
                  'Stock Level',
                  'Min Threshold',
                  'Unit Cost (₱)',
                  'Stock Value',
                  'Supplier',
                  'Status',
                  '',
                ].map(h => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs uppercase tracking-wider text-[#9A8F86] whitespace-nowrap"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5EFE6]">
              {items.map(item => {
                const tier       = getStockTier(item);
                const catCls     = CATEGORY_COLORS[item.category];
                const stockValue = Math.max(item.quantity, 0) * item.costPerUnit;

                return (
                  <tr key={item.id} className={`transition-colors ${TIER_ROW_BG[tier]}`}>
                    {/* Ingredient */}
                    <td className="px-4 py-3.5">
                      <span className="text-[#2C1810]">{item.name}</span>
                      {tier === 'critical' && (
                        <div className="flex items-center gap-1 text-[#C0392B] text-xs mt-0.5">
                          <AlertTriangle className="w-3 h-3" />
                          Critical Stock Alert
                        </div>
                      )}
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border ${catCls.bg} ${catCls.text} ${catCls.border}`}
                      >
                        {CATEGORY_LABELS[item.category]}
                      </span>
                    </td>

                    {/* Stock Level */}
                    <td className="px-4 py-3.5">
                      <span
                        className={
                          tier === 'critical'
                            ? 'text-[#C0392B]'
                            : tier === 'low'
                            ? 'text-amber-700'
                            : 'text-[#2C1810]'
                        }
                        style={{ fontWeight: tier !== 'ok' ? 600 : 400 }}
                      >
                        {formatQty(item.quantity, item.unit)}
                      </span>
                    </td>

                    {/* Min Threshold */}
                    <td className="px-4 py-3.5 text-[#9A8F86] whitespace-nowrap">
                      {formatQty(item.minStock, item.unit)}
                    </td>

                    {/* Unit Cost */}
                    <td className="px-4 py-3.5 text-[#7A6558] whitespace-nowrap">
                      {formatCost(item.costPerUnit, item.unit)}
                    </td>

                    {/* Stock Value (based on non-negative qty) */}
                    <td className="px-4 py-3.5 whitespace-nowrap" style={{ color: '#4A7C59', fontWeight: 500 }}>
                      ₱{stockValue.toLocaleString('en-PH', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>

                    {/* Supplier */}
                    <td className="px-4 py-3.5 text-[#7A6558] text-xs">
                      {item.supplier ?? '—'}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <StatusBadge tier={tier} />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setEditingItem(item)}
                          className="p-1.5 rounded-lg text-[#4A7C59] hover:bg-[#E8F2EB] transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.name)}
                          className="p-1.5 rounded-lg text-[#C0392B] hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        <div className="px-4 py-3 border-t border-[#F5EFE6] bg-[#FEFAF5] flex items-center justify-between">
          <p className="text-xs text-[#C5B5A8]">
            {items.length} ingredient{items.length !== 1 ? 's' : ''}
          </p>
          <p className="text-xs text-[#C5B5A8]">
            Min Threshold = max amount consumed in a single production batch
          </p>
        </div>
      </div>

      {/* ── Mobile Cards ───────────────────────────────────────────────── */}
      <div className="md:hidden space-y-3">
        {items.map(item => {
          const tier       = getStockTier(item);
          const isExpanded = expandedId === item.id;
          const catCls     = CATEGORY_COLORS[item.category];
          const stockValue = Math.max(item.quantity, 0) * item.costPerUnit;

          return (
            <div
              key={item.id}
              className={`rounded-2xl border shadow-sm overflow-hidden bg-white ${TIER_CARD_BORDER[tier]}`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3
                      className="text-[#2C1810] text-sm"
                      style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}
                    >
                      {item.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${catCls.bg} ${catCls.text} ${catCls.border}`}
                      >
                        {CATEGORY_LABELS[item.category]}
                      </span>
                      {item.supplier && (
                        <span className="text-xs text-[#C5B5A8]">{item.supplier}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="p-1 text-[#C5B5A8] hover:text-[#9A8F86] ml-2"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <span className="text-[#C5B5A8]">Stock: </span>
                    <span
                      className={
                        tier === 'critical'
                          ? 'text-[#C0392B]'
                          : tier === 'low'
                          ? 'text-amber-700'
                          : 'text-[#2C1810]'
                      }
                      style={{ fontWeight: tier !== 'ok' ? 600 : 400 }}
                    >
                      {formatQty(item.quantity, item.unit)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#C5B5A8]">Value: </span>
                    <span className="text-[#4A7C59]" style={{ fontWeight: 500 }}>
                      ₱{stockValue.toFixed(2)}
                    </span>
                  </div>
                </div>

                {tier !== 'ok' && (
                  <div className="mt-2">
                    <StatusBadge tier={tier} />
                    {tier === 'critical' && (
                      <p className="text-xs text-[#C0392B] mt-1">
                        Stock depleted — restock required before next production run.
                      </p>
                    )}
                    {tier === 'low' && (
                      <p className="text-xs text-amber-700 mt-1">
                        Below batch minimum of {formatQty(item.minStock, item.unit)}.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {isExpanded && (
                <div className="border-t border-[#F5EFE6] px-4 py-3 space-y-2 bg-[#FEFAF5]">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#C5B5A8]">Batch Min Threshold</span>
                    <span className="text-[#3C2A1E]">{formatQty(item.minStock, item.unit)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#C5B5A8]">Unit Cost</span>
                    <span className="text-[#7A6558]">{formatCost(item.costPerUnit, item.unit)}</span>
                  </div>
                  {item.supplier && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[#C5B5A8]">Supplier</span>
                      <span className="text-[#3C2A1E]">{item.supplier}</span>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setEditingItem(item)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[#4A7C59] bg-[#E8F2EB] hover:bg-[#D0E8D8] transition-colors text-sm"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id, item.name)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[#C0392B] bg-red-50 hover:bg-red-100 transition-colors text-sm"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {editingItem && (
        <EditItemModal
          item={editingItem}
          onUpdate={updates => {
            onUpdate(editingItem.id, updates);
            setEditingItem(null);
          }}
          onClose={() => setEditingItem(null)}
        />
      )}
    </>
  );
}
