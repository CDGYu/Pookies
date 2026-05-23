/**
 * useInventorySync.tsx — Pookies Inventory Integration Layer
 *
 * Bridges the POS cart with the SQLite/Express inventory backend.
 * Translates SKU IDs into precise per-ingredient deductions using the
 * 2025 Master Ingredient Price List and production batch data.
 *
 * All numeric amounts use DECIMAL(12,4) precision to prevent cumulative
 * stock discrepancies over time.
 *
 * ── Integration pattern in POS App.tsx ──────────────────────────────────────
 *
 *   import { useInventorySync, SyncStatusAlert } from './hooks/useInventorySync';
 *
 *   const { syncSaleToInventory, checkStockAvailability, syncState } = useInventorySync();
 *
 *   const handlePaymentComplete = async (cartItems: CartItem[], saleId: string) => {
 *     const check = await checkStockAvailability(cartItems);
 *     if (!check.isAvailable) {
 *       showStockAlert(check.shortfalls);
 *       return;
 *     }
 *     const ok = await syncSaleToInventory(cartItems, saleId);
 *     if (ok) router.push('/receipt');
 *   };
 *
 *   return (
 *     <>
 *       <SyncStatusAlert state={syncState} />
 *       ...
 *     </>
 *   );
 */

// FIX 1 (CRITICAL): Added `type ReactElement` — required for the AlertConfig type
// annotation below. The file is now `.tsx` to support the JSX in SyncStatusAlert
// and ALERT_CONFIGS (previously `.ts`, which caused a Vite/TypeScript compile error).
import { useState, useCallback, type ReactElement } from 'react';
import { CheckCircle, AlertTriangle, Loader2, Info } from 'lucide-react';

// ─── Configuration ────────────────────────────────────────────────────────────

/**
 * Base URL for the inventory backend API.
 * Override with NEXT_PUBLIC_API_URL (or VITE_API_URL) in your .env file.
 */
const API_BASE_URL =
  (typeof process !== 'undefined' &&
    (process.env.NEXT_PUBLIC_API_URL ?? process.env.VITE_API_URL)) ||
  'http://localhost:3001';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CartItem {
  skuId: string;
  quantity: number;
  /**
   * Required only for Mixed Box (SKU: c4).
   * Comma-separated base SKU IDs for each of the 5 cookie slots.
   * Example: "c1,c2,c1,c3,c2"  →  2 Classic, 1 Red Velvet, 1 S'mores, 1 Red Velvet
   * Alternative: pass as JSON array string '["c1","c2","c1","c3","c2"]'
   */
  customizationLabel?: string;
}

export type IngredientUnit = 'g' | 'ml' | 'pcs';

export interface IngredientRequirement {
  ingredientId: string;
  amount: number;       // DECIMAL(12,4)
  unit: IngredientUnit;
}

interface AggregatedDeduction {
  ingredientId: string;
  totalAmount: number;  // DECIMAL(12,4)
  unit: IngredientUnit;
}

export interface DeductPayload {
  saleId: string;
  timestamp: string;    // ISO 8601
  deductions: AggregatedDeduction[];
}

export interface StockShortfall {
  ingredientId: string;
  name: string;
  required: number;
  available: number;
  unit: string;
}

export interface StockCheckResult {
  isAvailable: boolean;
  shortfalls: StockShortfall[];
}

export interface ValuationLine {
  ingredientId: string;
  name: string;
  currentStock: number;
  unit: string;
  unitCost: number;     // ₱ per g | ml | pc — 2025 Master List
  value: number;        // currentStock × unitCost
}

export interface InventoryValuation {
  totalValue: number;
  breakdown: ValuationLine[];
  generatedAt: string;  // ISO 8601
}

export type SyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface SyncState {
  status: SyncStatus;
  message: string | null;
  lastSyncAt: Date | null;
  saleId: string | null;
}

// ─── Precision Helper ─────────────────────────────────────────────────────────

/**
 * Round to 4 decimal places (DECIMAL 12,4 database column precision).
 * Uses integer arithmetic to avoid floating-point drift.
 */
function p4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}

// ─── Batch Scaling Constants ──────────────────────────────────────────────────

/**
 * All cookie batches (Classic, Red Velvet, S'mores) are portioned at 40g per cookie
 * and yield 18 cookies per batch.
 *
 * Reference batch dough weight = 18 cookies × 40g = 720g
 *
 * Derived scaling factors per product type:
 *   Individual cookie  (40g)  →  40 / 720 = 0.05556
 *   Box of 5          (125g)  → 125 / 720 = 0.17361   (5 cookies × 25g each)
 *   Mini Box of 3      (60g)  →  60 / 720 = 0.08333   (3 cookies × 20g each)
 *   Mixed Box slot     (25g)  →  25 / 720 = 0.03472   (1 cookie slot, box-size portioning)
 */
const BATCH_COOKIE_COUNT   = 18;
const INDIVIDUAL_COOKIE_G  = 40;
const BATCH_DOUGH_WEIGHT_G = BATCH_COOKIE_COUNT * INDIVIDUAL_COOKIE_G; // 720g

const DOUGH_INDIVIDUAL_G   = 40;  // 1 individual piece
const DOUGH_BOX5_G         = 125; // 5 × 25g
const DOUGH_MINI3_G        = 60;  // 3 × 20g
const DOUGH_PACK6_G        = 240; // 6 cookies × 40g
const DOUGH_MIXED_SLOT_G   = 25;  // 1 slot in a Mixed Box of 5

/**
 * Scales one ingredient amount proportionally to a dough portion.
 * Rounds result to 4 decimal places.
 */
function scaleTo(amount: number, portionG: number): number {
  return p4((amount * portionG) / BATCH_DOUGH_WEIGHT_G);
}

/**
 * Returns a new ingredient array scaled to the given dough portion weight.
 */
function scaleBatch(
  batch: IngredientRequirement[],
  portionG: number
): IngredientRequirement[] {
  return batch.map(ing => ({ ...ing, amount: scaleTo(ing.amount, portionG) }));
}

// ─── Base Batch Recipes (2025 Master List, excl. packaging) ──────────────────

/**
 * Classic Chocolate Chip — full batch (18 cookies / 720g dough):
 *   Flour 250g | Brown Sugar 100g | White Sugar 80g | Baking Soda 2g | Salt 2g
 *   Egg 1pc | Egg Yolk 1pc | Margarine 115g  [₱0.235/g = ₱47/200g]
 *   Vanilla Extract 5ml | Espresso Powder 2g
 *   Chocolate Bar 40g | Choco Chips 80g
 *
 * Packaging (3 boxes per batch) is added per-SKU, not in the base batch.
 */
const CLASSIC_BATCH: IngredientRequirement[] = [
  { ingredientId: 'flour',          amount: 250,  unit: 'g'   },
  { ingredientId: 'brownSugar',     amount: 100,  unit: 'g'   },
  { ingredientId: 'whiteSugar',     amount: 80,   unit: 'g'   },
  { ingredientId: 'bakingSoda',     amount: 2,    unit: 'g'   },
  { ingredientId: 'salt',           amount: 2,    unit: 'g'   },
  { ingredientId: 'egg',            amount: 1,    unit: 'pcs' },
  { ingredientId: 'eggYolk',        amount: 1,    unit: 'pcs' },
  { ingredientId: 'margarine',      amount: 115,  unit: 'g'   },
  { ingredientId: 'vanillaExtract', amount: 5,    unit: 'ml'  },
  { ingredientId: 'espressoPowder', amount: 2,    unit: 'g'   },
  { ingredientId: 'chocolateBar',   amount: 40,   unit: 'g'   },
  { ingredientId: 'chocoChips',     amount: 80,   unit: 'g'   },
];

/**
 * Red Velvet — full batch (18 cookies / 720g dough):
 *   Flour 250g | Brown Sugar 110g | White Sugar 130g (80g dough + 50g cream cheese filling)
 *   Baking Soda 2g | Salt 3g | Egg 1pc | Egg Yolk 1pc | Margarine 115g
 *   Cream Cheese 200g | Vanilla Extract 10ml
 *   White Chocolate 80g  [₱0.075/g = ₱150/2kg] | Cocoa Powder 20g | Food Coloring 3ml
 *
 * whiteSugar 130g is the consolidated total: 80g (dough) + 50g (cream cheese filling).
 */
const RED_VELVET_BATCH: IngredientRequirement[] = [
  { ingredientId: 'flour',          amount: 250,  unit: 'g'   },
  { ingredientId: 'brownSugar',     amount: 110,  unit: 'g'   },
  { ingredientId: 'whiteSugar',     amount: 130,  unit: 'g'   }, // 80g dough + 50g filling
  { ingredientId: 'bakingSoda',     amount: 2,    unit: 'g'   },
  { ingredientId: 'salt',           amount: 3,    unit: 'g'   },
  { ingredientId: 'egg',            amount: 1,    unit: 'pcs' },
  { ingredientId: 'eggYolk',        amount: 1,    unit: 'pcs' },
  { ingredientId: 'margarine',      amount: 115,  unit: 'g'   },
  { ingredientId: 'creamCheese',    amount: 200,  unit: 'g'   },
  { ingredientId: 'vanillaExtract', amount: 10,   unit: 'ml'  },
  { ingredientId: 'whiteChoco',     amount: 80,   unit: 'g'   },
  { ingredientId: 'cocoaPowder',    amount: 20,   unit: 'g'   },
  { ingredientId: 'foodColoring',   amount: 3,    unit: 'ml'  },
];

/**
 * S'mores — full batch (18 cookies / 720g dough):
 *   Flour 250g | Brown Sugar 100g | White Sugar 80g | Baking Soda 2g | Salt 2g
 *   Egg 1pc | Egg Yolk 1pc | Margarine 115g | Vanilla Extract 5ml | Espresso Powder 2g
 *   Chocolate Bar 40g | Choco Chips 80g | Graham Crackers 1.16g | Marshmallow 2g
 */
const SMORES_BATCH: IngredientRequirement[] = [
  { ingredientId: 'flour',          amount: 250,  unit: 'g'   },
  { ingredientId: 'brownSugar',     amount: 100,  unit: 'g'   },
  { ingredientId: 'whiteSugar',     amount: 80,   unit: 'g'   },
  { ingredientId: 'bakingSoda',     amount: 2,    unit: 'g'   },
  { ingredientId: 'salt',           amount: 2,    unit: 'g'   },
  { ingredientId: 'egg',            amount: 1,    unit: 'pcs' },
  { ingredientId: 'eggYolk',        amount: 1,    unit: 'pcs' },
  { ingredientId: 'margarine',      amount: 115,  unit: 'g'   },
  { ingredientId: 'vanillaExtract', amount: 5,    unit: 'ml'  },
  { ingredientId: 'espressoPowder', amount: 2,    unit: 'g'   },
  { ingredientId: 'chocolateBar',   amount: 40,   unit: 'g'   },
  { ingredientId: 'chocoChips',     amount: 80,   unit: 'g'   },
  { ingredientId: 'grahamCrackers', amount: 1.16, unit: 'g'   },
  { ingredientId: 'marshmallow',    amount: 2,    unit: 'g'   },
];

/** Lookup map: cookie base SKU → full batch ingredient list */
const BATCH_RECIPE_MAP: Record<string, IngredientRequirement[]> = {
  c1: CLASSIC_BATCH,
  c2: RED_VELVET_BATCH,
  c3: SMORES_BATCH,
};

// ─── RECIPE_BOOK ──────────────────────────────────────────────────────────────

/**
 * RECIPE_BOOK
 *
 * Maps every POS SKU ID to the per-unit ingredient deduction array.
 * Cookie entries are pre-scaled from the batch recipe using the dough-weight
 * ratios defined above. All amounts are rounded to DECIMAL(12,4) at module load time.
 *
 * Cross-reference verification (2025 Master List):
 *   Margarine      ₱0.235/g  (₱47 per 200g)
 *   White Choco    ₱0.075/g  (₱150 per 2kg)
 *   Adoleaf Matcha ₱12.644/g
 *   Oatside        ₱0.13/ml
 *   Egg            ₱10.00/pc
 *   Egg Yolk       ₱5.00/pc
 *
 * Scaling spot-checks — Classic, individual piece (40g portion of 720g batch):
 *   Flour:       250 × 40/720 = 13.8889g
 *   Margarine:   115 × 40/720 =  6.3889g
 *   Choco Chips:  80 × 40/720 =  4.4444g
 *
 * Scaling spot-checks — Classic, Box of 5 (125g portion of 720g batch):
 *   Flour:       250 × 125/720 = 43.4028g
 *   Margarine:   115 × 125/720 = 19.9653g
 *
 * NOTE: Mixed Box (SKU: c4) is resolved dynamically by resolveMixedBox()
 *       because the ingredient list depends on customizationLabel at runtime.
 */
export const RECIPE_BOOK: Record<string, IngredientRequirement[]> = {

  // ── Classic Chocolate Chip ─────────────────────────────────────────────

  /** Individual piece — 40g dough (1/18 of classic batch) */
  c1_piece: scaleBatch(CLASSIC_BATCH, DOUGH_INDIVIDUAL_G),

  /** Box of 5 — 125g total dough (5 cookies × 25g), scaled from classic batch */
  c1_box5: [
    ...scaleBatch(CLASSIC_BATCH, DOUGH_BOX5_G),
    { ingredientId: 'packagingBox', amount: 1, unit: 'pcs' },
  ],

  /** Mini Box of 3 — 60g total dough (3 cookies × 20g), scaled from classic batch */
  c1_mini3: [
    ...scaleBatch(CLASSIC_BATCH, DOUGH_MINI3_G),
    { ingredientId: 'packagingBox', amount: 1, unit: 'pcs' },
  ],

  /** Pack of 6 — 240g dough (6 × 40g), scaled from classic batch */
  c1_pack6: [
    ...scaleBatch(CLASSIC_BATCH, DOUGH_PACK6_G),
    { ingredientId: 'packagingBox', amount: 1, unit: 'pcs' },
  ],

  // ── Red Velvet ────────────────────────────────────────────────────────

  /** Individual piece — 40g dough (1/18 of red velvet batch) */
  c2_piece: scaleBatch(RED_VELVET_BATCH, DOUGH_INDIVIDUAL_G),

  /** Box of 5 — 125g total dough (5 × 25g), scaled from red velvet batch */
  c2_box5: [
    ...scaleBatch(RED_VELVET_BATCH, DOUGH_BOX5_G),
    { ingredientId: 'packagingBox', amount: 1, unit: 'pcs' },
  ],

  /** Mini Box of 3 — 60g total dough (3 × 20g), scaled from red velvet batch */
  c2_mini3: [
    ...scaleBatch(RED_VELVET_BATCH, DOUGH_MINI3_G),
    { ingredientId: 'packagingBox', amount: 1, unit: 'pcs' },
  ],

  /** Pack of 6 — red velvet */
  c2_pack6: [
    ...scaleBatch(RED_VELVET_BATCH, DOUGH_PACK6_G),
    { ingredientId: 'packagingBox', amount: 1, unit: 'pcs' },
  ],

  // ── S'mores ───────────────────────────────────────────────────────────

  /** Individual piece — 40g dough (1/18 of s'mores batch) */
  c3_piece: scaleBatch(SMORES_BATCH, DOUGH_INDIVIDUAL_G),

  /** Box of 5 — 125g total dough (5 × 25g), scaled from s'mores batch */
  c3_box5: [
    ...scaleBatch(SMORES_BATCH, DOUGH_BOX5_G),
    { ingredientId: 'packagingBox', amount: 1, unit: 'pcs' },
  ],

  /** Mini Box of 3 — 60g total dough (3 × 20g), scaled from s'mores batch */
  c3_mini3: [
    ...scaleBatch(SMORES_BATCH, DOUGH_MINI3_G),
    { ingredientId: 'packagingBox', amount: 1, unit: 'pcs' },
  ],

  /** Pack of 6 — s'mores */
  c3_pack6: [
    ...scaleBatch(SMORES_BATCH, DOUGH_PACK6_G),
    { ingredientId: 'packagingBox', amount: 1, unit: 'pcs' },
  ],

  // ── Dubai Chewy Chocolate Cookie ──────────────────────────────────────
  // Per-piece recipe — not batch-scaled. Source: 2025 Master List, per unit.

  c5: [
    { ingredientId: 'kataifi',     amount: 15,  unit: 'g'   },
    { ingredientId: 'pistachio',   amount: 15,  unit: 'g'   },
    { ingredientId: 'marshmallow', amount: 40,  unit: 'g'   },
    { ingredientId: 'cocoaPowder', amount: 6,   unit: 'g'   },
    { ingredientId: 'butter',      amount: 1.5, unit: 'g'   },
    { ingredientId: 'liner',       amount: 1,   unit: 'pcs' },
  ],

  // ── Matcha Latte ──────────────────────────────────────────────────────
  // Per-cup recipe. Source: 2025 Master List.
  //
  // Condensada unit note: the 2025 PDF specifies "15g / 22g" by weight. The
  // inventory and recipe system both track condensada in ml (density ≈ 1.3g/ml).
  // Values below use ml to remain consistent with the database schema.

  /** Matcha Latte 12oz — per cup */
  m1_12oz: [
    { ingredientId: 'adoleafMatcha', amount: 2.8, unit: 'g'   }, // ₱12.644/g
    { ingredientId: 'condensada',    amount: 15,  unit: 'ml'  }, // spec: 15g ≈ 15ml (tracked in ml)
    { ingredientId: 'oatside',       amount: 110, unit: 'ml'  }, // ₱0.13/ml
    { ingredientId: 'seaSalt',       amount: 15,  unit: 'g'   },
    { ingredientId: 'cup12oz',       amount: 1,   unit: 'pcs' },
    { ingredientId: 'straw',         amount: 1,   unit: 'pcs' },
  ],

  /** Matcha Latte 16oz — per cup (also the batch-minimum threshold for Oatside and Matcha) */
  m1_16oz: [
    { ingredientId: 'adoleafMatcha', amount: 4.5, unit: 'g'   }, // batch min: 4.5g
    { ingredientId: 'condensada',    amount: 22,  unit: 'ml'  }, // spec: 22g ≈ 22ml (tracked in ml)
    { ingredientId: 'oatside',       amount: 160, unit: 'ml'  }, // batch min: 160ml
    { ingredientId: 'seaSalt',       amount: 20,  unit: 'g'   },
    { ingredientId: 'cup16oz',       amount: 1,   unit: 'pcs' },
    { ingredientId: 'straw',         amount: 1,   unit: 'pcs' },
  ],

  // NOTE: c4 (Mixed Box) is resolved dynamically — see resolveMixedBox().
};

// ─── Ingredient Display Names ─────────────────────────────────────────────────

const INGREDIENT_DISPLAY_NAMES: Record<string, string> = {
  flour:          'Flour',
  brownSugar:     'Brown Sugar',
  whiteSugar:     'White Sugar',
  bakingSoda:     'Baking Soda',
  salt:           'Salt',
  egg:            'Egg',
  eggYolk:        'Egg Yolk',
  margarine:      'Margarine',
  vanillaExtract: 'Vanilla Extract',
  espressoPowder: 'Espresso Powder',
  chocolateBar:   'Chocolate Bar',
  chocoChips:     'Choco Chips',
  packagingBox:   'Packaging Box',
  creamCheese:    'Cream Cheese',
  foodColoring:   'Food Coloring',
  cocoaPowder:    'Cocoa Powder',
  grahamCrackers: 'Graham Crackers',
  marshmallow:    'Marshmallow',
  kataifi:        'Kataifi',
  pistachio:      'Pistachio',
  whiteChoco:     'White Chocolate',
  liner:          'Liner',
  butter:         'Butter',
  adoleafMatcha:  'Adoleaf Matcha',
  oatside:        'Oatside',
  condensada:     'Condensada',
  cup12oz:        'Cup (12oz)',
  cup16oz:        'Cup (16oz)',
  straw:          'Straw',
  seaSalt:        'Sea Salt',
};

// ─── Mixed Box Resolver ───────────────────────────────────────────────────────

/**
 * resolveMixedBox — Derives ingredient deductions for one Mixed Box of 5 (SKU: c4).
 *
 * Each of the 5 slots holds 25g of the chosen cookie's dough. The function
 * parses the customizationLabel, scales each slot's batch recipe proportionally,
 * then sums across all 5 slots into a single aggregated ingredient list.
 *
 * @param customizationLabel
 *   Comma-separated base SKU IDs, one per cookie slot.
 *   Accepted formats:
 *     "c1,c2,c1,c3,c2"            (plain comma-separated)
 *     '["c1","c2","c1","c3","c2"]' (JSON array string)
 *   Valid base SKUs: c1 (Classic), c2 (Red Velvet), c3 (S'mores)
 *   Defaults to 5× Classic if the label is missing or unparseable.
 */
function resolveMixedBox(customizationLabel: string): IngredientRequirement[] {
  let slots: string[] = [];

  // Attempt JSON array parse, then fall back to comma-split
  try {
    const parsed = JSON.parse(customizationLabel);
    if (Array.isArray(parsed)) {
      slots = parsed.map(String);
    }
  } catch {
    slots = customizationLabel.split(',').map(s => s.trim());
  }

  // Filter to known base SKUs only
  const validSlots = slots.filter(s => s in BATCH_RECIPE_MAP);

  if (validSlots.length === 0) {
    console.warn(
      '[useInventorySync] Mixed Box customizationLabel contained no valid base SKUs. ' +
        'Defaulting to 5x Classic (c1). Received: "' +
        customizationLabel +
        '"'
    );
    validSlots.push(...Array<string>(5).fill('c1'));
  }

  // Accumulate ingredient amounts across all slots (25g each)
  const accumMap = new Map<string, { amount: number; unit: IngredientUnit }>();

  for (const baseId of validSlots) {
    const scaled = scaleBatch(BATCH_RECIPE_MAP[baseId], DOUGH_MIXED_SLOT_G);
    for (const ing of scaled) {
      const existing = accumMap.get(ing.ingredientId);
      if (existing) {
        existing.amount = p4(existing.amount + ing.amount);
      } else {
        accumMap.set(ing.ingredientId, { amount: ing.amount, unit: ing.unit });
      }
    }
  }

  // Include 1 packaging box per mixed box sold
  accumMap.set('packagingBox', { amount: 1, unit: 'pcs' });

  return Array.from(accumMap.entries()).map(([ingredientId, { amount, unit }]) => ({
    ingredientId,
    amount,
    unit,
  }));
}

// ─── Deduction Builder ────────────────────────────────────────────────────────

/**
 * buildDeductions — Aggregates all ingredient requirements for a full POS cart.
 *
 * Handles:
 *   - Quantity multiplication (e.g., 3× Dubai Cookie → 45g Kataifi)
 *   - Mixed Box customization parsing (SKU: c4)
 *   - De-duplication and summation across products sharing an ingredient
 *   - DECIMAL(12,4) rounding at each accumulation step
 *
 * @example
 *   // 3 Dubai Cookies + 2 Matcha Latte 16oz
 *   buildDeductions([
 *     { skuId: 'c5',      quantity: 3 },
 *     { skuId: 'm1_16oz', quantity: 2 },
 *   ]);
 *   // Dubai Cookie deductions (×3):
 *   //   kataifi: 45g  |  pistachio: 45g  |  marshmallow: 120g  |  cocoaPowder: 18g
 *   //   butter: 4.5g  |  liner: 3 pcs
 *   // Matcha Latte 16oz deductions (×2):
 *   //   adoleafMatcha: 9g  |  condensada: 44ml  |  oatside: 320ml
 *   //   seaSalt: 40g  |  cup16oz: 2 pcs  |  straw: 2 pcs
 */
function buildDeductions(cartItems: CartItem[]): AggregatedDeduction[] {
  const accumMap = new Map<string, { totalAmount: number; unit: IngredientUnit }>();

  function accumulate(ingredients: IngredientRequirement[], multiplier: number): void {
    for (const ing of ingredients) {
      const addAmount = p4(ing.amount * multiplier);
      const existing = accumMap.get(ing.ingredientId);
      if (existing) {
        existing.totalAmount = p4(existing.totalAmount + addAmount);
      } else {
        accumMap.set(ing.ingredientId, { totalAmount: addAmount, unit: ing.unit });
      }
    }
  }

  for (const cartItem of cartItems) {
    const { skuId, quantity, customizationLabel } = cartItem;

    if (skuId === 'c4') {
      // Mixed Box: resolve per-box ingredient list, then scale by quantity ordered
      const label = customizationLabel ?? 'c1,c1,c1,c1,c1';
      const mixedIngredients = resolveMixedBox(label);
      accumulate(mixedIngredients, quantity);
      continue;
    }

    const recipe = RECIPE_BOOK[skuId];
    if (!recipe) {
      console.warn(
        '[useInventorySync] Unknown SKU "' +
          skuId +
          '" — skipping deduction. Verify RECIPE_BOOK entries.'
      );
      continue;
    }

    accumulate(recipe, quantity);
  }

  return Array.from(accumMap.entries()).map(([ingredientId, { totalAmount, unit }]) => ({
    ingredientId,
    totalAmount,
    unit,
  }));
}

// ─── API Layer ────────────────────────────────────────────────────────────────

/**
 * Sends a single PATCH /api/inventory/deduct request with the aggregated payload.
 *
 * Backend expectations:
 *   Method:  PATCH
 *   Path:    /api/inventory/deduct
 *   Body:    DeductPayload (JSON)
 *   Returns: 200 OK on success | 409 if stock is insufficient | 422 on validation error
 *
 * Idempotency: the backend should use saleId to prevent duplicate deductions
 * if the same request is retried (e.g., on network timeout).
 */
async function postDeductions(payload: DeductPayload): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/inventory/deduct`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    const message: string =
      (errBody as { message?: string }).message ??
      `Deduction failed with HTTP ${response.status}.`;
    throw new Error(message);
  }
}

/**
 * Fetches current stock levels for all ingredients from the database.
 *
 * Backend expectations:
 *   Method:  GET
 *   Path:    /api/inventory/stock
 *   Returns: { ingredients: [{ id, current_stock, unit }] }
 */
async function fetchCurrentStock(): Promise<
  Map<string, { currentStock: number; unit: string }>
> {
  const response = await fetch(`${API_BASE_URL}/api/inventory/stock`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Stock fetch failed: HTTP ${response.status}`);
  }

  const data = (await response.json()) as {
    ingredients: Array<{ id: string; current_stock: number; unit: string }>;
  };

  return new Map(
    data.ingredients.map(item => [
      item.id,
      { currentStock: item.current_stock, unit: item.unit },
    ])
  );
}

// ─── Exported Standalone Functions ────────────────────────────────────────────

/**
 * checkStockAvailability
 *
 * Pre-sale guard: queries the database and compares current stock against the
 * total ingredient requirements for the cart. Call this BEFORE processing payment.
 *
 * Returns { isAvailable: true } if all ingredients are sufficient, or
 * { isAvailable: false, shortfalls: [...] } listing every deficient ingredient.
 *
 * @example
 *   const check = await checkStockAvailability(cartItems);
 *   if (!check.isAvailable) {
 *     // show check.shortfalls in the UI — each entry has .name, .required, .available
 *   }
 */
export async function checkStockAvailability(
  cartItems: CartItem[]
): Promise<StockCheckResult> {
  const deductions = buildDeductions(cartItems);
  const stockMap = await fetchCurrentStock();
  const shortfalls: StockShortfall[] = [];

  for (const deduction of deductions) {
    const stock = stockMap.get(deduction.ingredientId);
    const available = stock?.currentStock ?? 0;

    if (p4(available) < deduction.totalAmount) {
      shortfalls.push({
        ingredientId: deduction.ingredientId,
        name: INGREDIENT_DISPLAY_NAMES[deduction.ingredientId] ?? deduction.ingredientId,
        required: deduction.totalAmount,
        available: p4(available),
        unit: deduction.unit,
      });
    }
  }

  return {
    isAvailable: shortfalls.length === 0,
    shortfalls,
  };
}

/**
 * syncSaleToInventory
 *
 * Core integration function. Translates the POS cart into ingredient deductions
 * and sends a single PATCH request to the inventory backend.
 *
 * Call this AFTER checkStockAvailability confirms sufficient stock,
 * inside handlePaymentComplete in POS App.tsx.
 *
 * @param cartItems - Full cart array from the POS state.
 * @param saleId    - Unique sale ID from the POS (UUID or sequential). Used for
 *                    backend idempotency and audit trail correlation.
 *
 * @example
 *   await syncSaleToInventory(cartItems, generateSaleId());
 */
export async function syncSaleToInventory(
  cartItems: CartItem[],
  saleId: string
): Promise<void> {
  const deductions = buildDeductions(cartItems);

  const payload: DeductPayload = {
    saleId,
    timestamp: new Date().toISOString(),
    deductions,
  };

  await postDeductions(payload);
}

/**
 * fetchInventoryValuation
 *
 * Retrieves live inventory valuation from the SQLite database.
 * The backend calculates: value = current_stock × unit_cost for each ingredient.
 *
 * Unit cost references (2025 Master List):
 *   Margarine:      ₱0.235/g   (₱47 per 200g)
 *   White Choco:    ₱0.075/g   (₱150 per 2kg)
 *   Adoleaf Matcha: ₱12.644/g
 *   Oatside:        ₱0.13/ml
 *   Egg:            ₱10.00/pc
 *   Egg Yolk:       ₱5.00/pc
 *
 * Backend expectations:
 *   Method:  GET
 *   Path:    /api/inventory/valuation
 *   Returns: InventoryValuation (totalValue + per-ingredient breakdown)
 */
export async function fetchInventoryValuation(): Promise<InventoryValuation> {
  const response = await fetch(`${API_BASE_URL}/api/inventory/valuation`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Valuation fetch failed: HTTP ${response.status}`);
  }

  return (await response.json()) as InventoryValuation;
}

// ─── React Hook ───────────────────────────────────────────────────────────────

/**
 * useInventorySync — React hook providing stateful access to inventory sync operations.
 *
 * Wraps the three standalone functions with loading/error state management
 * suitable for use in the POS UI layer.
 *
 * Returns:
 *   syncState               — current operation status (idle | loading | success | error)
 *   syncSaleToInventory     — stateful wrapper; returns true on success, false on error
 *   checkStockAvailability  — stateful wrapper for the pre-sale stock check
 *   fetchInventoryValuation — stateful wrapper for the live valuation query
 *
 * Usage:
 *   const {
 *     syncState,
 *     syncSaleToInventory,
 *     checkStockAvailability,
 *     fetchInventoryValuation,
 *   } = useInventorySync();
 */
export function useInventorySync() {
  const [syncState, setSyncState] = useState<SyncState>({
    status: 'idle',
    message: null,
    lastSyncAt: null,
    saleId: null,
  });

  const setLoading = (message: string, saleId: string | null = null) => {
    setSyncState({ status: 'loading', message, lastSyncAt: null, saleId });
  };

  const setSuccess = (message: string, saleId: string | null) => {
    setSyncState({ status: 'success', message, lastSyncAt: new Date(), saleId });
  };

  const setError = (message: string) => {
    setSyncState(prev => ({ ...prev, status: 'error', message }));
  };

  /**
   * Stateful syncSaleToInventory.
   * Returns true on success, false on error.
   */
  const sync = useCallback(
    async (cartItems: CartItem[], saleId: string): Promise<boolean> => {
      setLoading('Syncing inventory...', saleId);
      try {
        await syncSaleToInventory(cartItems, saleId);
        setSuccess('Inventory updated successfully.', saleId);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Inventory sync failed.';
        setError(message);
        return false;
      }
    },
    []
  );

  /**
   * Stateful checkStockAvailability.
   * Updates syncState with a summary of any shortfalls found.
   */
  const checkStock = useCallback(
    async (cartItems: CartItem[]): Promise<StockCheckResult> => {
      setLoading('Checking stock availability...');
      try {
        const result = await checkStockAvailability(cartItems);
        if (result.isAvailable) {
          setSyncState(prev => ({ ...prev, status: 'idle', message: null }));
        } else {
          const count = result.shortfalls.length;
          setError(
            `Insufficient stock: ${count} ingredient${count !== 1 ? 's' : ''} below required level.`
          );
        }
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Stock check request failed.';
        setError(message);
        return { isAvailable: false, shortfalls: [] };
      }
    },
    []
  );

  /**
   * Stateful fetchInventoryValuation.
   * Returns the valuation object on success, null on error.
   */
  const fetchValuation = useCallback(async (): Promise<InventoryValuation | null> => {
    setLoading('Calculating inventory value...');
    try {
      const result = await fetchInventoryValuation();
      setSyncState(prev => ({ ...prev, status: 'idle', message: null }));
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Valuation fetch failed.';
      setError(message);
      return null;
    }
  }, []);

  return {
    syncState,
    syncSaleToInventory: sync,
    checkStockAvailability: checkStock,
    fetchInventoryValuation: fetchValuation,
  };
}

// ─── SyncStatusAlert Component ────────────────────────────────────────────────

interface SyncStatusAlertProps {
  state: SyncState;
  className?: string;
}

// FIX 2 (CRITICAL): `React.ReactElement` was used without importing React.
// Changed to `ReactElement` (named import added at top of file).
type AlertConfig = {
  icon: ReactElement;
  containerClass: string;
  textClass: string;
};

const ALERT_CONFIGS: Record<SyncStatus, AlertConfig> = {
  idle: {
    icon: <Info className="w-4 h-4 shrink-0" />,
    containerClass: 'bg-stone-50 border-stone-200',
    textClass: 'text-stone-700',
  },
  loading: {
    icon: <Loader2 className="w-4 h-4 shrink-0 animate-spin" />,
    containerClass: 'bg-blue-50 border-blue-200',
    textClass: 'text-blue-800',
  },
  success: {
    icon: <CheckCircle className="w-4 h-4 shrink-0" />,
    containerClass: 'bg-[#E8F2EB] border-[#B8D9C2]',
    textClass: 'text-[#2D5A3D]',
  },
  error: {
    icon: <AlertTriangle className="w-4 h-4 shrink-0" />,
    containerClass: 'bg-red-50 border-red-200',
    textClass: 'text-red-800',
  },
};

/**
 * SyncStatusAlert
 *
 * Renders a contextual status banner for inventory sync operations.
 * Uses lucide-react icons:
 *   CheckCircle   — success
 *   AlertTriangle — error (stock shortfall or network failure)
 *   Loader2       — loading / in-progress
 *   Info          — idle with a message
 *
 * Themed to the Pookies matcha/cream palette for success states.
 * Returns null when status is idle with no message.
 *
 * @example
 *   const { syncState } = useInventorySync();
 *   return <SyncStatusAlert state={syncState} />;
 */
export function SyncStatusAlert({ state, className = '' }: SyncStatusAlertProps) {
  if (state.status === 'idle' && !state.message) return null;

  const config = ALERT_CONFIGS[state.status];

  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 ${config.containerClass} ${config.textClass} ${className}`}
      style={{ fontFamily: "'DM Sans', sans-serif" }}
      role="status"
      aria-live="polite"
    >
      {config.icon}
      <div className="flex-1 min-w-0">
        <p className="text-sm">{state.message}</p>
        {state.lastSyncAt && state.status === 'success' && (
          <p className="text-xs mt-0.5 opacity-70">
            {'Last synced: ' +
              state.lastSyncAt.toLocaleString('en-PH', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Utility Exports ──────────────────────────────────────────────────────────

/**
 * getSkuDeductions — Returns the pre-computed ingredient deduction array for a
 * single known SKU. Useful for previewing ingredient costs on the POS product
 * detail screen.
 *
 * @param skuId - Any key in RECIPE_BOOK (not 'c4', which requires customization).
 * @returns Array of ingredient requirements, or undefined if SKU is unknown.
 */
export function getSkuDeductions(skuId: string): IngredientRequirement[] | undefined {
  return RECIPE_BOOK[skuId];
}

/**
 * previewCartDeductions — Builds and returns the aggregated deduction list without
 * sending it to the backend. Useful for showing ingredient impact in the cart UI
 * (e.g., a "this will use X of your Y stock" tooltip).
 *
 * @param cartItems - Cart items from the POS state.
 * @returns Flat aggregated array of ingredient deductions.
 */
export function previewCartDeductions(cartItems: CartItem[]): AggregatedDeduction[] {
  return buildDeductions(cartItems);
}