import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { InventoryItem, Category, CATEGORY_LABELS } from '../data/inventory';

interface AddItemModalProps {
  onAdd: (item: Omit<InventoryItem, 'id' | 'lastUpdated'>) => Promise<void>;
  onClose: () => void;
}

const inputClass =
  'w-full px-3 py-2 border border-[#F0DCC0] rounded-xl bg-[#FEF9F2] focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/40 text-sm text-[#3C2A1E] placeholder-[#C5B5A8]';
const labelClass = 'block text-xs uppercase tracking-wider text-[#9A8F86] mb-1';

export function AddItemModal({ onAdd, onClose }: AddItemModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    category: 'baking' as Category,
    quantity: 0,
    unit: 'g',
    minStock: 0,
    costPerUnit: 0,
    supplier: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.unit) return;
    
    setIsLoading(true);
    try {
      await onAdd(formData);
    } finally {
      setIsLoading(false);
    }
  };

  const set = (field: string, value: string | number) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl border border-[#F0DCC0] max-w-md w-full max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#F5EFE6]">
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.25rem', color: '#2C1810' }}>
            Add New Item
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#C5B5A8] hover:text-[#9A8F86] hover:bg-[#F5EFE6] transition-colors" disabled={isLoading}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={labelClass}>Ingredient Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => set('name', e.target.value)}
              className={inputClass}
              placeholder="e.g., Adoleaf Matcha"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className={labelClass}>Category *</label>
            <select
              value={formData.category}
              onChange={e => set('category', e.target.value)}
              className={inputClass}
              disabled={isLoading}
            >
              {(Object.keys(CATEGORY_LABELS) as Category[]).map(cat => (
                <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Quantity *</label>
              <input
                type="number"
                required
                min="0"
                step="0.001"
                value={formData.quantity}
                onChange={e => set('quantity', parseFloat(e.target.value))}
                className={inputClass}
                disabled={isLoading}
              />
            </div>
            <div>
              <label className={labelClass}>Unit *</label>
              <select
                value={formData.unit}
                onChange={e => set('unit', e.target.value)}
                className={inputClass}
                disabled={isLoading}
              >
                <option value="g">g (grams)</option>
                <option value="ml">ml (milliliters)</option>
                <option value="pcs">pcs (pieces)</option>
                <option value="kg">kg</option>
                <option value="L">L (liters)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Min Stock *</label>
              <input
                type="number"
                required
                min="0"
                step="0.001"
                value={formData.minStock}
                onChange={e => set('minStock', parseFloat(e.target.value))}
                className={inputClass}
                disabled={isLoading}
              />
            </div>
            <div>
              <label className={labelClass}>Cost / Unit (₱) *</label>
              <input
                type="number"
                required
                min="0"
                step="0.00001"
                value={formData.costPerUnit}
                onChange={e => set('costPerUnit', parseFloat(e.target.value))}
                className={inputClass}
                placeholder="₱ per g/ml/pc"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Supplier</label>
            <input
              type="text"
              value={formData.supplier}
              onChange={e => set('supplier', e.target.value)}
              className={inputClass}
              placeholder="Optional"
              disabled={isLoading}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-[#F0DCC0] text-[#9A8F86] rounded-xl hover:bg-[#F5EFE6] transition-colors text-sm disabled:opacity-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm transition-colors"
              style={{ background: '#4A7C59' }}
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
