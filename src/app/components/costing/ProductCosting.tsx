import { useState, ReactNode } from 'react';
import { Cookie, Coffee, ChevronDown, ChevronUp, TrendingUp, Package } from 'lucide-react';
import { RECIPES, OVERHEAD_PER_BATCH, Recipe } from '../../data/recipes';

const TYPE_LABELS: Record<Recipe['type'], { label: string; icon: ReactNode; color: string }> = {
  'cookie-batch': { label: 'Cookie Batch', icon: <Cookie className="w-4 h-4" />, color: 'bg-amber-50 text-amber-700 border-amber-200' },
  'cookie-piece': { label: 'Individual Cookie', icon: <Package className="w-4 h-4" />, color: 'bg-[#E8F2EB] text-[#2D5A3D] border-[#B8D9C2]' },
  'drink':        { label: 'Drink', icon: <Coffee className="w-4 h-4" />, color: 'bg-teal-50 text-teal-700 border-teal-200' },
};

function ProfitBadge({ profit, selling }: { profit: number; selling: number }) {
  const margin = (profit / selling) * 100;
  const isGood = margin >= 40;
  return (
    <div className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs border ${isGood ? 'bg-[#E8F2EB] text-[#2D5A3D] border-[#B8D9C2]' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
      <TrendingUp className="w-3 h-3" />
      {margin.toFixed(0)}% margin
    </div>
  );
}

function RecipeCard({ recipe }: { recipe: Recipe }) {
  const [open, setOpen] = useState(false);
  const typeInfo = TYPE_LABELS[recipe.type];

  return (
    <div className="bg-white rounded-2xl border border-[#F0DCC0] overflow-hidden shadow-sm">
      {/* Card Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left px-5 py-4 flex items-start justify-between gap-3 hover:bg-[#FEFAF5] transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border ${typeInfo.color}`}>
              {typeInfo.icon}
              {typeInfo.label}
            </span>
            <ProfitBadge profit={recipe.profit} selling={recipe.sellingPrice} />
          </div>
          <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.1rem', color: '#2C1810' }}>
            {recipe.name}
          </h3>
          <p className="text-xs text-[#C5B5A8] mt-0.5">{recipe.yield}</p>
        </div>

        {/* Summary numbers */}
        <div className="flex items-center gap-4 shrink-0 text-right">
          <div className="hidden sm:block">
            <p className="text-xs text-[#C5B5A8]">Cost</p>
            <p className="text-sm text-[#7A6558]" style={{ fontWeight: 500 }}>₱{recipe.costPerUnit.toFixed(2)}</p>
          </div>
          <div className="hidden sm:block">
            <p className="text-xs text-[#C5B5A8]">Sell</p>
            <p className="text-sm text-[#4A7C59]" style={{ fontWeight: 600 }}>₱{recipe.sellingPrice.toFixed(2)}</p>
          </div>
          <div className="hidden sm:block">
            <p className="text-xs text-[#C5B5A8]">Profit</p>
            <p className="text-sm text-[#2D5A3D]" style={{ fontWeight: 600 }}>₱{recipe.profit.toFixed(2)}</p>
          </div>
          {open ? <ChevronUp className="w-4 h-4 text-[#C5B5A8]" /> : <ChevronDown className="w-4 h-4 text-[#C5B5A8]" />}
        </div>
      </button>

      {/* Mobile summary */}
      <div className="px-5 pb-3 flex gap-4 text-sm sm:hidden border-t border-[#F5EFE6]">
        <div><span className="text-[#C5B5A8]">Cost </span><span className="text-[#7A6558]" style={{ fontWeight: 500 }}>₱{recipe.costPerUnit.toFixed(2)}</span></div>
        <div><span className="text-[#C5B5A8]">Sell </span><span className="text-[#4A7C59]" style={{ fontWeight: 600 }}>₱{recipe.sellingPrice.toFixed(2)}</span></div>
        <div><span className="text-[#C5B5A8]">Profit </span><span className="text-[#2D5A3D]" style={{ fontWeight: 600 }}>₱{recipe.profit.toFixed(2)}</span></div>
      </div>

      {/* Expanded detail */}
      {open && (
        <div className="border-t border-[#F5EFE6] px-5 py-4 bg-[#FEFAF5]">
          <h4 className="text-xs uppercase tracking-wider text-[#9A8F86] mb-3">Ingredients</h4>
          <table className="w-full text-sm mb-4">
            <thead>
              <tr className="text-left text-xs text-[#C5B5A8]">
                <th className="pb-1.5">Ingredient</th>
                <th className="pb-1.5 text-right">Amount</th>
                <th className="pb-1.5 text-right">Unit Cost</th>
                <th className="pb-1.5 text-right">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5EFE6]">
              {recipe.ingredients.map((ing, i) => (
                <tr key={i}>
                  <td className="py-1.5 text-[#3C2A1E]">{ing.name}</td>
                  <td className="py-1.5 text-right text-[#9A8F86]">{ing.amount} {ing.unit}</td>
                  <td className="py-1.5 text-right text-[#9A8F86]">₱{ing.unitPrice.toFixed(4)}</td>
                  <td className="py-1.5 text-right text-[#3C2A1E]" style={{ fontWeight: 500 }}>₱{ing.cost.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Cost Breakdown */}
          <div className="rounded-xl border border-[#F0DCC0] overflow-hidden">
            <div className="grid grid-cols-2 divide-x divide-[#F0DCC0]">
              <div className="px-4 py-3">
                <p className="text-xs text-[#C5B5A8]">Ingredient Subtotal</p>
                <p className="text-[#3C2A1E] text-sm mt-0.5" style={{ fontWeight: 500 }}>₱{recipe.ingredientSubtotal.toFixed(2)}</p>
              </div>
              <div className="px-4 py-3">
                <p className="text-xs text-[#C5B5A8]">Overhead (per batch)</p>
                <p className="text-[#3C2A1E] text-sm mt-0.5" style={{ fontWeight: 500 }}>₱{recipe.overheadCost.toFixed(2)}</p>
              </div>
            </div>
            <div style={{ background: '#4A7C59' }} className="grid grid-cols-3 divide-x divide-white/20 text-white">
              <div className="px-4 py-3">
                <p className="text-xs text-white/70">Total Cost</p>
                <p className="text-sm mt-0.5" style={{ fontWeight: 600 }}>₱{recipe.totalBatchCost.toFixed(2)}</p>
              </div>
              <div className="px-4 py-3">
                <p className="text-xs text-white/70">Selling Price</p>
                <p className="text-sm mt-0.5" style={{ fontWeight: 600 }}>₱{recipe.sellingPrice.toFixed(2)}</p>
              </div>
              <div className="px-4 py-3">
                <p className="text-xs text-white/70">Profit</p>
                <p className="text-sm mt-0.5" style={{ fontWeight: 600 }}>₱{recipe.profit.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ProductCosting() {
  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.5rem', color: '#2C1810' }}>
          Product Costing
        </h2>
        <p className="text-[#9A8F86] text-sm mt-1">
          2025 recipe cost breakdown — ingredient costs, overhead & profit margins.
        </p>
      </div>

      {/* Overhead Reference Banner */}
      <div className="bg-white rounded-2xl border border-[#F0DCC0] p-4 mb-5 shadow-sm">
        <p className="text-xs uppercase tracking-wider text-[#9A8F86] mb-2">Overhead per Batch</p>
        <div className="flex flex-wrap gap-6 text-sm">
          <div><span className="text-[#C5B5A8]">Electricity: </span><span className="text-[#3C2A1E]" style={{ fontWeight: 500 }}>₱10.28</span></div>
          <div><span className="text-[#C5B5A8]">Stickers: </span><span className="text-[#3C2A1E]" style={{ fontWeight: 500 }}>₱3.20</span></div>
          <div><span className="text-[#C5B5A8]">Labor: </span><span className="text-[#3C2A1E]" style={{ fontWeight: 500 }}>₱87.45</span></div>
          <div className="ml-auto">
            <span className="text-[#C5B5A8]">Total: </span>
            <span style={{ fontFamily: "'DM Serif Display', serif", color: '#2D5A3D', fontSize: '1.1rem' }}>
              ₱{OVERHEAD_PER_BATCH.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Cookie Logic Reference */}
      <div className="bg-white rounded-2xl border border-[#F0DCC0] p-4 mb-5 shadow-sm">
        <p className="text-xs uppercase tracking-wider text-[#9A8F86] mb-2">Cookie Dough Constants</p>
        <div className="flex flex-wrap gap-6 text-sm">
          <div>
            <span className="text-[#C5B5A8]">Individual Cookie: </span>
            <span className="text-[#3C2A1E]" style={{ fontWeight: 500 }}>40g dough per piece</span>
          </div>
          <div>
            <span className="text-[#C5B5A8]">Box of 5: </span>
            <span className="text-[#3C2A1E]" style={{ fontWeight: 500 }}>5 cookies × 25g = 125g dough per box</span>
          </div>
        </div>
      </div>

      {/* Recipe Cards */}
      <div className="space-y-3">
        {RECIPES.map(recipe => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </div>

      {/* Profit Summary */}
      <div className="mt-6 bg-white rounded-2xl border border-[#F0DCC0] overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-[#F5EFE6]">
          <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.1rem', color: '#2C1810' }}>
            Profit Summary
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ background: '#F5EFE6' }}>
              <tr>
                {['Product', 'Type', 'Cost', 'Selling Price', 'Profit', 'Margin'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs uppercase tracking-wider text-[#9A8F86]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5EFE6]">
              {RECIPES.map(r => {
                const margin = (r.profit / r.sellingPrice) * 100;
                return (
                  <tr key={r.id} className="hover:bg-[#FEFAF5] transition-colors">
                    <td className="px-5 py-3 text-[#2C1810]">{r.name}</td>
                    <td className="px-5 py-3 text-[#9A8F86]">{TYPE_LABELS[r.type].label}</td>
                    <td className="px-5 py-3 text-[#7A6558]">₱{r.costPerUnit.toFixed(2)}</td>
                    <td className="px-5 py-3 text-[#4A7C59]" style={{ fontWeight: 500 }}>₱{r.sellingPrice.toFixed(2)}</td>
                    <td className="px-5 py-3 text-[#2D5A3D]" style={{ fontWeight: 600 }}>₱{r.profit.toFixed(2)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-[#F0DCC0] rounded-full overflow-hidden max-w-[80px]">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${Math.min(margin, 100)}%`, background: margin >= 40 ? '#4A7C59' : '#E8B97A' }}
                          />
                        </div>
                        <span className={margin >= 40 ? 'text-[#2D5A3D]' : 'text-[#7A4F1E]'} style={{ fontWeight: 500 }}>
                          {margin.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}