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
