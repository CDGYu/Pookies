/**
 * CanIBakePanel — Production Readiness Dashboard
 *
 * Checks current inventory against every recipe's full-batch requirements
 * and displays a per-product "Can Produce" / "Cannot Produce" status.
 *
 * Batch constants (hard-coded from 2025 Master List):
 *   Standard Cookie     = 40g dough per piece
 *   Box of 5            = 125g total dough (5 cookies x 25g each)
 *   Matcha Latte 12oz   = 110ml Oatside,  2.8g Adoleaf Matcha
 *   Matcha Latte 16oz   = 160ml Oatside,  4.5g Adoleaf Matcha
 *   Critical thresholds = Flour < 250g | Margarine < 115g | Oatside < 160ml
 *
 * Costing cross-check (2025 Master List — display only):
 *   Margarine:      ₱0.235/g  (₱47 per 200g)
 *   White Choco:    ₱0.075/g  (₱150 per 2kg)
 *   Adoleaf Matcha: ₱12.644/g
 *   Oatside:        ₱0.13/ml
 */

import { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  AlertTriangle,
} from 'lucide-react';
import { InventoryItem } from '../data/inventory';
import { RECIPES, Recipe } from '../data/recipes';

interface CanIBakePanelProps {
  inventory: InventoryItem[];
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface BlockingIngredient {
  name: string;
  have: number;
  need: number;
  unit: string;
  shortfall: number;
}

interface ProductReadiness {
  recipeId: string;
  name: string;
  type: Recipe['type'];
  yieldLabel: string;
  canProduce: boolean;
  blockingIngredients: BlockingIngredient[];
}

// ── Batch readiness checker ───────────────────────────────────────────────────

/**
 * Checks whether the current inventory can fulfill at least one full unit
 * of the given recipe.
 *
 * Handles duplicate ingredientId entries (e.g., Red Velvet uses whiteSugar
 * in both the dough and cream cheese filling — amounts are consolidated before
 * comparison).
 *
 * Packaging ingredients (packagingBox, liner) are excluded from production
 * readiness checks — supply chain management only, not a production blocker.
 */
function checkReadiness(recipe: Recipe, inventory: InventoryItem[]): ProductReadiness {
  const PACKAGING_IDS = new Set(['packagingBox', 'liner', 'cup12oz', 'cup16oz', 'straw']);

  // Consolidate amounts for the same ingredient
  const needed = new Map<string, { amount: number; unit: string; name: string }>();
  for (const ing of recipe.ingredients) {
    if (PACKAGING_IDS.has(ing.ingredientId)) continue;
    const existing = needed.get(ing.ingredientId);
    if (existing) {
      existing.amount += ing.amount;
    } else {
      needed.set(ing.ingredientId, {
        amount: ing.amount,
        unit:   ing.unit,
        name:   ing.name,
      });
    }
  }

  const blocking: BlockingIngredient[] = [];

  for (const [id, { amount, unit, name }] of needed) {
    const item = inventory.find(i => i.id === id);
    const have = item?.quantity ?? 0;
    if (have < amount) {
      blocking.push({
        name,
        have:      Math.max(have, 0), // display 0 not negative for UI clarity
        need:      amount,
        unit,
        shortfall: Math.round((amount - have) * 10_000) / 10_000,
      });
    }
  }

  return {
    recipeId:            recipe.id,
    name:                recipe.name,
    type:                recipe.type,
    yieldLabel:          recipe.yield,
    canProduce:          blocking.length === 0,
    blockingIngredients: blocking,
  };
}

// ── Type label helper ─────────────────────────────────────────────────────────

const TYPE_LABEL: Record<Recipe['type'], string> = {
  'cookie-batch': 'Cookie Batch',
  'cookie-piece': 'Individual',
  'drink':        'Drink',
};

// ── Component ─────────────────────────────────────────────────────────────────

export function CanIBakePanel({ inventory }: CanIBakePanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [openRecipeId, setOpenRecipeId] = useState<string | null>(null);

  const readiness: ProductReadiness[] = RECIPES.map(r => checkReadiness(r, inventory));
  const readyCount    = readiness.filter(r => r.canProduce).length;
  const totalCount    = readiness.length;
  const allReady      = readyCount === totalCount;
  const noneReady     = readyCount === 0;

  // Determine overall status color
  const headerBg    = allReady  ? '#4A7C59' : noneReady ? '#922B21' : '#7A4F1E';
  const headerLight = allReady  ? '#E8F2EB' : noneReady ? '#FEE2E0' : '#FEF3C7';
  const headerText  = allReady  ? '#2D5A3D' : noneReady ? '#7F1D1D' : '#78350F';

  const toggleRecipe = (id: string) =>
    setOpenRecipeId(prev => (prev === id ? null : id));

  return (
    <div
      className="rounded-2xl border overflow-hidden shadow-sm mb-4"
      style={{ borderColor: '#F0DCC0', background: '#FFFFFF' }}
    >
      {/* ── Header ── */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:bg-[#FEFAF5]"
      >
        <div className="flex items-center gap-3">
          <div
            className="rounded-xl p-2 shrink-0"
            style={{ background: headerBg }}
          >
            <FlaskConical className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: '1.05rem',
                color: '#2C1810',
              }}
            >
              Production Readiness
            </h3>
            <p className="text-xs text-[#9A8F86] mt-0.5">
              Can I Bake? — stock vs. full-batch requirements
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Summary badge */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border"
            style={{ background: headerLight, color: headerText, borderColor: headerText + '40' }}
          >
            {allReady ? (
              <CheckCircle className="w-3.5 h-3.5" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5" />
            )}
            <span style={{ fontWeight: 600 }}>
              {readyCount} / {totalCount} ready
            </span>
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-[#C5B5A8]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#C5B5A8]" />
          )}
        </div>
      </button>

      {/* ── Expanded content ── */}
      {expanded && (
        <div className="border-t border-[#F5EFE6]">
          {/* Critical ingredient warning banner */}
          {!allReady && (
            <div className="mx-4 mt-4 flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
              <div>
                <p
                  className="text-xs text-amber-800"
                  style={{ fontWeight: 600 }}
                >
                  Full Production Batch Not Currently Possible
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  At least one product is blocked. Check ingredient levels —
                  Flour must be &ge; 250g, Margarine &ge; 115g, and Oatside &ge; 160ml
                  for a complete production run.
                </p>
              </div>
            </div>
          )}

          {/* Product grid */}
          <div className="p-4 space-y-2">
            {readiness.map(item => (
              <div
                key={item.recipeId}
                className={`rounded-xl border overflow-hidden transition-colors ${
                  item.canProduce
                    ? 'border-[#B8D9C2] bg-[#F5FAF6]'
                    : 'border-red-200 bg-red-50/60'
                }`}
              >
                {/* Product row */}
                <button
                  onClick={() =>
                    !item.canProduce && item.blockingIngredients.length > 0
                      ? toggleRecipe(item.recipeId)
                      : undefined
                  }
                  className={`w-full flex items-center justify-between px-4 py-3 text-left ${
                    !item.canProduce ? 'cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {item.canProduce ? (
                      <CheckCircle className="w-4 h-4 text-[#4A7C59] shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-[#C0392B] shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p
                        className={`text-sm truncate ${
                          item.canProduce ? 'text-[#2C1810]' : 'text-[#7F1D1D]'
                        }`}
                        style={{ fontWeight: 500 }}
                      >
                        {item.name}
                      </p>
                      <p className="text-xs text-[#C5B5A8] mt-0.5 truncate">
                        {TYPE_LABEL[item.type]} — {item.yieldLabel}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full border ${
                        item.canProduce
                          ? 'bg-[#E8F2EB] text-[#2D5A3D] border-[#B8D9C2]'
                          : 'bg-red-100 text-[#C0392B] border-red-200'
                      }`}
                      style={{ fontWeight: 600 }}
                    >
                      {item.canProduce
                        ? 'Ready'
                        : `${item.blockingIngredients.length} missing`}
                    </span>
                    {!item.canProduce && item.blockingIngredients.length > 0 && (
                      openRecipeId === item.recipeId ? (
                        <ChevronUp className="w-3.5 h-3.5 text-[#C5B5A8]" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-[#C5B5A8]" />
                      )
                    )}
                  </div>
                </button>

                {/* Blocking ingredients — shown when row is expanded */}
                {!item.canProduce &&
                  openRecipeId === item.recipeId &&
                  item.blockingIngredients.length > 0 && (
                    <div className="border-t border-red-200 bg-white divide-y divide-[#F5EFE6]">
                      {item.blockingIngredients.map((bi, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between px-5 py-2.5"
                        >
                          <div>
                            <span className="text-xs text-[#3C2A1E]" style={{ fontWeight: 500 }}>
                              {bi.name}
                            </span>
                            <span className="text-xs text-[#C5B5A8] ml-2">
                              Need {bi.need} {bi.unit}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-[#C0392B]" style={{ fontWeight: 600 }}>
                              Have {bi.have} {bi.unit}
                            </span>
                            <span className="text-xs text-[#9A8F86] block">
                              Short {bi.shortfall.toFixed(2)} {bi.unit}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            ))}
          </div>

          {/* Footer note */}
          <div className="px-5 pb-4">
            <p className="text-xs text-[#C5B5A8]">
              Batch sizes: Cookie batch = 18 pieces / 720g dough. Box of 5 = 125g dough.
              Packaging stock is excluded from production readiness checks.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
