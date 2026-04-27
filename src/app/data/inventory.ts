export type Category = 'baking' | 'dairy' | 'specialty' | 'drinks' | 'packaging' | 'other';

export interface InventoryItem {
  id: string;
  name: string;
  category: Category;
  quantity: number;
  unit: string;
  // Batch-minimum threshold: the maximum amount this ingredient requires in any single production batch.
  // Alert fires when quantity < minStock (strict less-than).
  minStock: number;
  costPerUnit: number; // ₱ per g / ml / pc  — sourced from 2025 Master Ingredient Price List
  supplier?: string;
  lastUpdated: Date;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  baking:    'Baking',
  dairy:     'Dairy & Eggs',
  specialty: 'Specialty',
  drinks:    'Drinks',
  packaging: 'Packaging',
  other:     'Other',
};

export const CATEGORY_COLORS: Record<Category, { bg: string; text: string; border: string }> = {
  baking:    { bg: 'bg-amber-50',   text: 'text-amber-800',  border: 'border-amber-200' },
  dairy:     { bg: 'bg-blue-50',    text: 'text-blue-800',   border: 'border-blue-200' },
  specialty: { bg: 'bg-[#E8F2EB]',  text: 'text-[#2D5A3D]', border: 'border-[#B8D9C2]' },
  drinks:    { bg: 'bg-teal-50',    text: 'text-teal-800',   border: 'border-teal-200' },
  packaging: { bg: 'bg-stone-100',  text: 'text-stone-700',  border: 'border-stone-300' },
  other:     { bg: 'bg-slate-100',  text: 'text-slate-700',  border: 'border-slate-300' },
};

// ── 2025 Master Ingredient Price List (₱ per g | ml | pc) ───────────────────
export const UNIT_COSTS: Record<string, number> = {
  flour:          0.00224,  // ₱0.00224/g
  brownSugar:     0.09800,
  whiteSugar:     0.10000,
  bakingSoda:     0.20000,
  salt:           0.02000,
  egg:           10.00000,  // ₱10.00/pc
  eggYolk:        5.00000,  // ₱5.00/pc
  margarine:      0.23500,  // ₱0.235/g  (₱47 per 200g)
  vanillaExtract: 2.51750,
  espressoPowder: 1.32500,
  chocolateBar:   0.37500,
  chocoChips:     0.29400,
  packagingBox:   6.26000,
  creamCheese:    0.44500,
  foodColoring:   2.06000,
  cocoaPowder:    0.70600,
  grahamCrackers: 0.24286,
  marshmallow:    0.17900,
  kataifi:        1.00000,
  pistachio:      2.25000,
  whiteChoco:     0.07500,  // ₱0.075/g  (₱150 per 2kg)
  liner:          0.25800,
  butter:         0.24500,
  adoleafMatcha: 12.64444,  // ₱12.644/g
  oatside:        0.13000,  // ₱0.13/ml
  condensada:     0.18349,
  cup12oz:        4.40000,
  cup16oz:        5.00000,
  straw:          0.48000,
  seaSalt:        0.40000,
};

// ── Batch-Minimum Thresholds (single production run) ────────────────────────
// minStock = maximum amount consumed by any single recipe batch.
// Source: 2025 PDF batch reference + recipe data.
//   Flour 250g | Brown Sugar 110g | White Sugar 130g (80g dough + 50g filling)
//   Margarine 115g | Cream Cheese 200g | Cocoa Powder 20g
//   Oatside 160ml | Adoleaf Matcha 4.5g
export const initialInventory: InventoryItem[] = [
  // ── BAKING ──────────────────────────────────────────────────────────────
  {
    id: 'flour',
    name: 'Flour',
    category: 'baking',
    quantity: 25000,
    unit: 'g',
    minStock: 250,       // single batch uses 250g
    costPerUnit: UNIT_COSTS.flour,
    supplier: 'Local Market',
    lastUpdated: new Date(),
  },
  {
    id: 'brownSugar',
    name: 'Brown Sugar',
    category: 'baking',
    quantity: 2000,
    unit: 'g',
    minStock: 110,       // Red Velvet batch: 110g (highest across all recipes)
    costPerUnit: UNIT_COSTS.brownSugar,
    supplier: 'Local Market',
    lastUpdated: new Date(),
  },
  {
    id: 'whiteSugar',
    name: 'White Sugar',
    category: 'baking',
    quantity: 2000,
    unit: 'g',
    minStock: 130,       // Red Velvet: 80g dough + 50g cream cheese filling = 130g
    costPerUnit: UNIT_COSTS.whiteSugar,
    supplier: 'Local Market',
    lastUpdated: new Date(),
  },
  {
    id: 'bakingSoda',
    name: 'Baking Soda',
    category: 'baking',
    quantity: 500,
    unit: 'g',
    minStock: 2,         // 2g per batch (max across cookie recipes)
    costPerUnit: UNIT_COSTS.bakingSoda,
    supplier: 'Local Market',
    lastUpdated: new Date(),
  },
  {
    id: 'salt',
    name: 'Salt',
    category: 'baking',
    quantity: 1000,
    unit: 'g',
    minStock: 3,         // 3g per batch (Red Velvet max)
    costPerUnit: UNIT_COSTS.salt,
    supplier: 'Local Market',
    lastUpdated: new Date(),
  },
  {
    id: 'vanillaExtract',
    name: 'Vanilla Extract',
    category: 'baking',
    quantity: 60,
    unit: 'ml',
    minStock: 10,        // 10ml per batch (Red Velvet max)
    costPerUnit: UNIT_COSTS.vanillaExtract,
    supplier: 'Flavors PH',
    lastUpdated: new Date(),
  },
  {
    id: 'espressoPowder',
    name: 'Espresso Powder',
    category: 'baking',
    quantity: 60,
    unit: 'g',
    minStock: 2,         // 2g per batch
    costPerUnit: UNIT_COSTS.espressoPowder,
    supplier: 'Coffee Depot',
    lastUpdated: new Date(),
  },
  {
    id: 'chocolateBar',
    name: 'Chocolate Bar',
    category: 'baking',
    quantity: 2000,
    unit: 'g',
    minStock: 40,        // 40g per batch
    costPerUnit: UNIT_COSTS.chocolateBar,
    supplier: 'Dutche',
    lastUpdated: new Date(),
  },
  {
    id: 'chocoChips',
    name: 'Choco Chips',
    category: 'baking',
    quantity: 1000,
    unit: 'g',
    minStock: 80,        // 80g per batch
    costPerUnit: UNIT_COSTS.chocoChips,
    supplier: 'Dutche',
    lastUpdated: new Date(),
  },
  {
    id: 'foodColoring',
    name: 'Food Coloring',
    category: 'baking',
    quantity: 60,
    unit: 'ml',
    minStock: 3,         // 3ml per batch (Red Velvet)
    costPerUnit: UNIT_COSTS.foodColoring,
    supplier: 'Baking Supply',
    lastUpdated: new Date(),
  },
  {
    id: 'cocoaPowder',
    name: 'Cocoa Powder',
    category: 'baking',
    quantity: 500,
    unit: 'g',
    minStock: 20,        // batch threshold: Red Velvet uses 20g (highest)
    costPerUnit: UNIT_COSTS.cocoaPowder,
    supplier: 'Dutche',
    lastUpdated: new Date(),
  },
  {
    id: 'grahamCrackers',
    name: 'Graham Crackers',
    category: 'baking',
    quantity: 420,
    unit: 'g',
    minStock: 2,         // S'mores batch uses 1.16g; threshold rounded to 2g
    costPerUnit: UNIT_COSTS.grahamCrackers,
    supplier: 'Local Market',
    lastUpdated: new Date(),
  },
  {
    id: 'marshmallow',
    name: 'Marshmallow',
    category: 'baking',
    quantity: 2000,
    unit: 'g',
    minStock: 40,        // Dubai Cookie uses 40g per piece (highest)
    costPerUnit: UNIT_COSTS.marshmallow,
    supplier: 'Local Market',
    lastUpdated: new Date(),
  },
  {
    id: 'whiteChoco',
    name: 'White Chocolate',
    category: 'baking',
    quantity: 2000,
    unit: 'g',
    minStock: 80,        // Red Velvet uses 80g per batch  [₱0.075/g = ₱150/2kg]
    costPerUnit: UNIT_COSTS.whiteChoco,
    supplier: 'Dutche',
    lastUpdated: new Date(),
  },
  {
    id: 'seaSalt',
    name: 'Sea Salt',
    category: 'baking',
    quantity: 500,
    unit: 'g',
    minStock: 20,        // 16oz Matcha Latte uses 20g (highest)
    costPerUnit: UNIT_COSTS.seaSalt,
    supplier: 'Local Market',
    lastUpdated: new Date(),
  },

  // ── DAIRY & EGGS ────────────────────────────────────────────────────────
  {
    id: 'egg',
    name: 'Egg',
    category: 'dairy',
    quantity: 36,
    unit: 'pcs',
    minStock: 1,         // 1 pc per cookie batch
    costPerUnit: UNIT_COSTS.egg,
    supplier: 'Local Farm',
    lastUpdated: new Date(),
  },
  {
    id: 'eggYolk',
    name: 'Egg Yolk',
    category: 'dairy',
    quantity: 24,
    unit: 'pcs',
    minStock: 1,         // 1 pc per cookie batch
    costPerUnit: UNIT_COSTS.eggYolk,
    supplier: 'Local Farm',
    lastUpdated: new Date(),
  },
  {
    id: 'margarine',
    name: 'Margarine',
    category: 'dairy',
    quantity: 600,
    unit: 'g',
    minStock: 115,       // batch threshold: 115g per cookie batch  [₱0.235/g = ₱47/200g]
    costPerUnit: UNIT_COSTS.margarine,
    supplier: 'Magnolia',
    lastUpdated: new Date(),
  },
  {
    id: 'creamCheese',
    name: 'Cream Cheese',
    category: 'dairy',
    quantity: 4000,
    unit: 'g',
    minStock: 200,       // batch threshold: Red Velvet filling uses 200g
    costPerUnit: UNIT_COSTS.creamCheese,
    supplier: 'Magnolia',
    lastUpdated: new Date(),
  },
  {
    id: 'butter',
    name: 'Butter',
    category: 'dairy',
    quantity: 400,
    unit: 'g',
    minStock: 2,         // Dubai Cookie uses 1.5g; threshold rounded to 2g
    costPerUnit: UNIT_COSTS.butter,
    supplier: 'Magnolia',
    lastUpdated: new Date(),
  },

  // ── SPECIALTY ───────────────────────────────────────────────────────────
  {
    id: 'adoleafMatcha',
    name: 'Adoleaf Matcha',
    category: 'specialty',
    quantity: 270,
    unit: 'g',
    minStock: 4.5,       // batch threshold: 16oz Matcha Latte uses 4.5g
    costPerUnit: UNIT_COSTS.adoleafMatcha,
    supplier: 'Adoleaf',
    lastUpdated: new Date(),
  },
  {
    id: 'kataifi',
    name: 'Kataifi',
    category: 'specialty',
    quantity: 1000,
    unit: 'g',
    minStock: 15,        // Dubai Cookie uses 15g per piece
    costPerUnit: UNIT_COSTS.kataifi,
    supplier: 'Import Supplier',
    lastUpdated: new Date(),
  },
  {
    id: 'pistachio',
    name: 'Pistachio',
    category: 'specialty',
    quantity: 500,
    unit: 'g',
    minStock: 15,        // Dubai Cookie uses 15g per piece
    costPerUnit: UNIT_COSTS.pistachio,
    supplier: 'Import Supplier',
    lastUpdated: new Date(),
  },

  // ── DRINKS ──────────────────────────────────────────────────────────────
  {
    id: 'oatside',
    name: 'Oatside',
    category: 'drinks',
    quantity: 3000,
    unit: 'ml',
    minStock: 160,       // batch threshold: 16oz Matcha Latte uses 160ml
    costPerUnit: UNIT_COSTS.oatside,
    supplier: 'Oatside PH',
    lastUpdated: new Date(),
  },
  {
    id: 'condensada',
    name: 'Condensada',
    category: 'drinks',
    quantity: 1090,
    unit: 'ml',
    minStock: 22,        // 16oz Matcha Latte uses 22ml (highest)
    costPerUnit: UNIT_COSTS.condensada,
    supplier: 'Local Market',
    lastUpdated: new Date(),
  },

  // ── PACKAGING ───────────────────────────────────────────────────────────
  {
    id: 'packagingBox',
    name: 'Packaging Box',
    category: 'packaging',
    quantity: 150,
    unit: 'pcs',
    minStock: 3,         // 3 boxes per cookie batch (one batch = 3 packs of 6)
    costPerUnit: UNIT_COSTS.packagingBox,
    supplier: 'Packaging Plus',
    lastUpdated: new Date(),
  },
  {
    id: 'liner',
    name: 'Liner',
    category: 'packaging',
    quantity: 500,
    unit: 'pcs',
    minStock: 1,         // 1 liner per Dubai Cookie piece
    costPerUnit: UNIT_COSTS.liner,
    supplier: 'Packaging Plus',
    lastUpdated: new Date(),
  },
  {
    id: 'cup12oz',
    name: 'Cup (12oz)',
    category: 'packaging',
    quantity: 150,
    unit: 'pcs',
    minStock: 1,         // 1 per Matcha Latte 12oz
    costPerUnit: UNIT_COSTS.cup12oz,
    supplier: 'Packaging Plus',
    lastUpdated: new Date(),
  },
  {
    id: 'cup16oz',
    name: 'Cup (16oz)',
    category: 'packaging',
    quantity: 100,
    unit: 'pcs',
    minStock: 1,         // 1 per Matcha Latte 16oz
    costPerUnit: UNIT_COSTS.cup16oz,
    supplier: 'Packaging Plus',
    lastUpdated: new Date(),
  },
  {
    id: 'straw',
    name: 'Straw',
    category: 'packaging',
    quantity: 300,
    unit: 'pcs',
    minStock: 1,         // 1 per drink sold
    costPerUnit: UNIT_COSTS.straw,
    supplier: 'Packaging Plus',
    lastUpdated: new Date(),
  },
];
