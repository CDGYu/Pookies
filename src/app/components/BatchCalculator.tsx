import { useState, useMemo } from 'react';
import { Calculator, AlertCircle, CheckCircle, Package, ChevronRight } from 'lucide-react';
import { InventoryItem } from '../data/inventory';
import { RECIPES, Recipe } from '../data/recipes';

interface BatchCalculatorProps {
  inventory: InventoryItem[];
}

interface IngredientCheck {
  name: string;
  ingredientId: string;
  required: number;
  available: number;
  unit: string;
  maxBatches: number;
  isSufficient: boolean;
  shortfall: number;
}

function calcBatches(recipe: Recipe, inventory: InventoryItem[]): {
  maxBatches: number;
  limitingFactor: string;
  checks: IngredientCheck[];
} {
  // Consolidate duplicate ingredient IDs (e.g., White Sugar used twice in Red Velvet)
  const consolidated = new Map<string, { name: string; amount: number; unit: string }>();
  for (const ing of recipe.ingredients) {
    if (consolidated.has(ing.ingredientId)) {
      consolidated.get(ing.ingredientId)!.amount += ing.amount;
    } else {
      consolidated.set(ing.ingredientId, { name: ing.name, amount: ing.amount, unit: ing.unit });
    }
  }

  const checks: IngredientCheck[] = [];

  for (const [id, { name, amount, unit }] of consolidated.entries()) {
    const item = inventory.find(i => i.id === id);
    const available = item ? item.quantity : 0;
    const maxBatches = amount > 0 ? Math.floor(available / amount) : Infinity;
    checks.push({
      name,
      ingredientId: id,
      required: amount,
      available,
      unit,
      maxBatches,
      isSufficient: available >= amount,
      shortfall: Math.max(0, amount - available),
    });
  }

  const finiteChecks = checks.filter(c => c.maxBatches !== Infinity);
  const maxBatches = finiteChecks.length > 0 ? Math.min(...finiteChecks.map(c => c.maxBatches)) : 0;
  const limiting = checks.find(c => c.maxBatches === maxBatches);

  return {
    maxBatches,
    limitingFactor: limiting?.name ?? '—',
    checks,
  };
}

export function BatchCalculator({ inventory }: BatchCalculatorProps) {
  const [selectedId, setSelectedId] = useState<string>(RECIPES[0].id);

  const recipe = RECIPES.find(r => r.id === selectedId)!;
  const { maxBatches, limitingFactor, checks } = useMemo(
    () => calcBatches(recipe, inventory),
    [recipe, inventory]
  );

  const projectedRevenue = maxBatches * recipe.sellingPrice;
  const projectedCost = maxBatches * recipe.totalBatchCost;
  const projectedProfit = projectedRevenue - projectedCost;

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.5rem', color: '#2C1810' }}>
          Batch Calculator
        </h2>
        <p className="text-[#9A8F86] text-sm mt-1">
          See how many batches you can produce with your current ingredient stock.
        </p>
      </div>

      {/* Recipe Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {RECIPES.map(r => (
          <button
            key={r.id}
            onClick={() => setSelectedId(r.id)}
            className={`text-left px-4 py-3.5 rounded-2xl border transition-all ${
              selectedId === r.id
                ? 'border-[#4A7C59] bg-[#E8F2EB] shadow-sm'
                : 'border-[#F0DCC0] bg-white hover:border-[#B8D9C2] hover:bg-[#FEFAF5]'
            }`}
          >
            <p
              className={`text-sm ${selectedId === r.id ? 'text-[#2D5A3D]' : 'text-[#3C2A1E]'}`}
              style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: selectedId === r.id ? 600 : 400 }}
            >
              {r.name}
            </p>
            <p className="text-xs text-[#C5B5A8] mt-0.5">{r.yield}</p>
          </button>
        ))}
      </div>

      {/* Result Banner */}
      <div
        className="rounded-2xl p-5 mb-5 flex flex-col sm:flex-row sm:items-center gap-4"
        style={{ background: maxBatches > 0 ? '#4A7C59' : '#C0392B' }}
      >
        <div className="flex-1">
          <p className="text-white/70 text-sm">{recipe.name}</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className="text-white"
              style={{ fontFamily: "'DM Serif Display', serif", fontSize: '2.5rem', lineHeight: 1 }}
            >
              {maxBatches}
            </span>
            <span className="text-white/80 text-sm">
              {maxBatches === 1 ? 'batch' : 'batches'} possible
            </span>
          </div>
          {maxBatches === 0 && (
            <p className="text-white/70 text-xs mt-1">
              Limiting factor: <span className="text-white">{limitingFactor}</span>
            </p>
          )}
          {maxBatches > 0 && (
            <p className="text-white/70 text-xs mt-1">
              Limiting factor: <span className="text-white">{limitingFactor}</span>
            </p>
          )}
        </div>

        {maxBatches > 0 && (
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <div className="text-center bg-white/10 rounded-xl px-3 py-2">
              <p className="text-white/60 text-xs">Revenue</p>
              <p className="text-white text-sm mt-0.5" style={{ fontWeight: 600 }}>₱{projectedRevenue.toFixed(0)}</p>
            </div>
            <div className="text-center bg-white/10 rounded-xl px-3 py-2">
              <p className="text-white/60 text-xs">Cost</p>
              <p className="text-white text-sm mt-0.5" style={{ fontWeight: 600 }}>₱{projectedCost.toFixed(0)}</p>
            </div>
            <div className="text-center bg-white/20 rounded-xl px-3 py-2">
              <p className="text-white/60 text-xs">Profit</p>
              <p className="text-white text-sm mt-0.5" style={{ fontWeight: 600 }}>₱{projectedProfit.toFixed(0)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Ingredient Checks */}
      <div className="bg-white rounded-2xl border border-[#F0DCC0] overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-[#F5EFE6] flex items-center justify-between">
          <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1rem', color: '#2C1810' }}>
            Ingredient Status
          </h3>
          <span className="text-xs text-[#9A8F86]">
            {checks.filter(c => c.isSufficient).length} / {checks.length} sufficient
          </span>
        </div>

        <div className="divide-y divide-[#F5EFE6]">
          {checks.map((check, i) => {
            const pct = Math.min((check.available / Math.max(check.required, 0.001)) * 100, 100);
            return (
              <div key={i} className="px-5 py-3.5 flex items-center gap-3">
                <div className={`shrink-0 ${check.isSufficient ? 'text-[#4A7C59]' : 'text-[#C0392B]'}`}>
                  {check.isSufficient ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <span className="text-sm text-[#2C1810] truncate">{check.name}</span>
                    <div className="shrink-0 flex items-center gap-2 text-xs">
                      <span className="text-[#C5B5A8]">Need: {check.required} {check.unit}</span>
                      <ChevronRight className="w-3 h-3 text-[#E0D0C0]" />
                      <span className={check.isSufficient ? 'text-[#4A7C59]' : 'text-[#C0392B]'} style={{ fontWeight: 500 }}>
                        Have: {check.available % 1 === 0 ? check.available.toLocaleString() : check.available.toFixed(2)} {check.unit}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-[#F5EFE6] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: check.isSufficient ? '#4A7C59' : '#C0392B',
                      }}
                    />
                  </div>
                  {!check.isSufficient && (
                    <p className="text-xs text-[#C0392B] mt-1">
                      Shortfall: {check.shortfall.toFixed(2)} {check.unit}
                    </p>
                  )}
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-xs text-[#C5B5A8]">Max</p>
                  <p className={`text-sm ${check.maxBatches === maxBatches && maxBatches > 0 ? 'text-[#C0392B]' : 'text-[#3C2A1E]'}`} style={{ fontWeight: check.maxBatches === maxBatches ? 600 : 400 }}>
                    {check.maxBatches} batch{check.maxBatches !== 1 ? 'es' : ''}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Restock Suggestions */}
      {checks.some(c => !c.isSufficient) && (
        <div className="mt-4 bg-white rounded-2xl border border-[#F5C6C0] overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-[#F5EFE6]">
            <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1rem', color: '#922B21' }}>
              Restock Required
            </h3>
            <p className="text-xs text-[#C5B5A8] mt-0.5">
              To produce 1 batch of {recipe.name}, restock these items:
            </p>
          </div>
          <div className="divide-y divide-[#F5EFE6]">
            {checks.filter(c => !c.isSufficient).map((check, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#C0392B]" />
                  <span className="text-sm text-[#3C2A1E]">{check.name}</span>
                </div>
                <span className="text-sm text-[#C0392B]" style={{ fontWeight: 600 }}>
                  +{check.shortfall.toFixed(2)} {check.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}