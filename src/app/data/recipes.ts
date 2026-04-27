// Pookies — Product Costing & Recipe Data (from 2025 PDF)
// Overhead per batch: ₱100.93 (Electricity ₱10.28 + Stickers ₱3.20 + Labor ₱87.45)

export const OVERHEAD_PER_BATCH = 100.93;

export interface RecipeIngredient {
  ingredientId: string; // matches InventoryItem id
  name: string;
  amount: number;
  unit: string;
  unitPrice: number;
  cost: number;
}

export interface Recipe {
  id: string;
  name: string;
  type: 'cookie-batch' | 'cookie-piece' | 'drink';
  yield: string; // e.g. "18 cookies / 3 packs"
  yieldCount: number; // number of sellable units per batch
  ingredients: RecipeIngredient[];
  ingredientSubtotal: number;
  overheadCost: number;
  totalBatchCost: number;
  costPerUnit: number;
  sellingPrice: number;
  profit: number;
}

export const RECIPES: Recipe[] = [
  // ─── 1. Classic Chocolate Chip ──────────────────────────────
  {
    id: 'classic-choc-chip',
    name: 'Classic Chocolate Chip',
    type: 'cookie-batch',
    yield: '18 cookies / 3 packs (6 per pack)',
    yieldCount: 3, // 3 packs
    ingredients: [
      { ingredientId: 'flour',          name: 'Flour',           amount: 250,  unit: 'g',   unitPrice: 0.00224, cost: 0.56  },
      { ingredientId: 'brownSugar',     name: 'Brown Sugar',     amount: 100,  unit: 'g',   unitPrice: 0.098,   cost: 9.80  },
      { ingredientId: 'whiteSugar',     name: 'White Sugar',     amount: 80,   unit: 'g',   unitPrice: 0.100,   cost: 8.00  },
      { ingredientId: 'bakingSoda',     name: 'Baking Soda',     amount: 2,    unit: 'g',   unitPrice: 0.200,   cost: 0.40  },
      { ingredientId: 'salt',           name: 'Salt',            amount: 2,    unit: 'g',   unitPrice: 0.020,   cost: 0.04  },
      { ingredientId: 'egg',            name: 'Egg',             amount: 1,    unit: 'pcs', unitPrice: 10.000,  cost: 10.00 },
      { ingredientId: 'eggYolk',        name: 'Egg Yolk',        amount: 1,    unit: 'pcs', unitPrice: 5.000,   cost: 5.00  },
      { ingredientId: 'margarine',      name: 'Margarine',       amount: 115,  unit: 'g',   unitPrice: 0.235,   cost: 27.03 },
      { ingredientId: 'vanillaExtract', name: 'Vanilla Extract', amount: 5,    unit: 'ml',  unitPrice: 2.5175,  cost: 12.59 },
      { ingredientId: 'espressoPowder', name: 'Espresso Powder', amount: 2,    unit: 'g',   unitPrice: 1.325,   cost: 2.65  },
      { ingredientId: 'chocolateBar',   name: 'Chocolate Bar',   amount: 40,   unit: 'g',   unitPrice: 0.375,   cost: 15.00 },
      { ingredientId: 'chocoChips',     name: 'Choco Chips',     amount: 80,   unit: 'g',   unitPrice: 0.294,   cost: 23.52 },
      { ingredientId: 'packagingBox',   name: 'Packaging',       amount: 3,    unit: 'pcs', unitPrice: 6.260,   cost: 18.78 },
    ],
    ingredientSubtotal: 133.36,
    overheadCost: 100.93,
    totalBatchCost: 234.29,
    costPerUnit: 78.10,
    sellingPrice: 150.00,
    profit: 71.90,
  },

  // ─── 2. Red Velvet ──────────────────────────────────────────
  {
    id: 'red-velvet',
    name: 'Red Velvet',
    type: 'cookie-batch',
    yield: '18 cookies / 3 packs (6 per pack)',
    yieldCount: 3,
    ingredients: [
      { ingredientId: 'flour',          name: 'Flour',             amount: 250,  unit: 'g',   unitPrice: 0.00224, cost: 0.56  },
      { ingredientId: 'brownSugar',     name: 'Brown Sugar',       amount: 110,  unit: 'g',   unitPrice: 0.098,   cost: 10.78 },
      { ingredientId: 'whiteSugar',     name: 'White Sugar',       amount: 80,   unit: 'g',   unitPrice: 0.100,   cost: 8.00  },
      { ingredientId: 'bakingSoda',     name: 'Baking Soda',       amount: 2,    unit: 'g',   unitPrice: 0.200,   cost: 0.40  },
      { ingredientId: 'salt',           name: 'Salt',              amount: 3,    unit: 'g',   unitPrice: 0.020,   cost: 0.06  },
      { ingredientId: 'egg',            name: 'Egg',               amount: 1,    unit: 'pcs', unitPrice: 10.000,  cost: 10.00 },
      { ingredientId: 'eggYolk',        name: 'Egg Yolk',          amount: 1,    unit: 'pcs', unitPrice: 5.000,   cost: 5.00  },
      { ingredientId: 'margarine',      name: 'Margarine',         amount: 115,  unit: 'g',   unitPrice: 0.235,   cost: 27.03 },
      { ingredientId: 'creamCheese',    name: 'Cream Cheese',      amount: 200,  unit: 'g',   unitPrice: 0.445,   cost: 89.00 },
      { ingredientId: 'whiteSugar',     name: 'White Sugar (Filling)', amount: 50, unit: 'g', unitPrice: 0.100,   cost: 5.00  },
      { ingredientId: 'vanillaExtract', name: 'Vanilla Extract',   amount: 10,   unit: 'ml',  unitPrice: 2.5175,  cost: 25.18 },
      { ingredientId: 'whiteChoco',     name: 'White Chocolate',   amount: 80,   unit: 'g',   unitPrice: 0.075,   cost: 6.00  },
      { ingredientId: 'cocoaPowder',    name: 'Cocoa Powder',      amount: 20,   unit: 'g',   unitPrice: 0.706,   cost: 14.12 },
      { ingredientId: 'foodColoring',   name: 'Food Coloring',     amount: 3,    unit: 'ml',  unitPrice: 2.060,   cost: 6.18  },
      { ingredientId: 'packagingBox',   name: 'Packaging',         amount: 3,    unit: 'pcs', unitPrice: 6.260,   cost: 18.78 },
    ],
    ingredientSubtotal: 201.12,
    overheadCost: 100.93,
    totalBatchCost: 302.05,
    costPerUnit: 100.68,
    sellingPrice: 170.00,
    profit: 69.32,
  },

  // ─── 3. S'mores ─────────────────────────────────────────────
  {
    id: 'smores',
    name: "S'mores",
    type: 'cookie-batch',
    yield: '18 cookies / 3 packs (6 per pack)',
    yieldCount: 3,
    ingredients: [
      { ingredientId: 'flour',          name: 'Flour',           amount: 250,  unit: 'g',   unitPrice: 0.00224, cost: 0.56  },
      { ingredientId: 'brownSugar',     name: 'Brown Sugar',     amount: 100,  unit: 'g',   unitPrice: 0.098,   cost: 9.80  },
      { ingredientId: 'whiteSugar',     name: 'White Sugar',     amount: 80,   unit: 'g',   unitPrice: 0.100,   cost: 8.00  },
      { ingredientId: 'bakingSoda',     name: 'Baking Soda',     amount: 2,    unit: 'g',   unitPrice: 0.200,   cost: 0.40  },
      { ingredientId: 'salt',           name: 'Salt',            amount: 2,    unit: 'g',   unitPrice: 0.020,   cost: 0.04  },
      { ingredientId: 'egg',            name: 'Egg',             amount: 1,    unit: 'pcs', unitPrice: 10.000,  cost: 10.00 },
      { ingredientId: 'eggYolk',        name: 'Egg Yolk',        amount: 1,    unit: 'pcs', unitPrice: 5.000,   cost: 5.00  },
      { ingredientId: 'margarine',      name: 'Margarine',       amount: 115,  unit: 'g',   unitPrice: 0.235,   cost: 27.03 },
      { ingredientId: 'vanillaExtract', name: 'Vanilla Extract', amount: 5,    unit: 'ml',  unitPrice: 2.5175,  cost: 12.59 },
      { ingredientId: 'espressoPowder', name: 'Espresso Powder', amount: 2,    unit: 'g',   unitPrice: 1.325,   cost: 2.65  },
      { ingredientId: 'chocolateBar',   name: 'Chocolate Bar',   amount: 40,   unit: 'g',   unitPrice: 0.375,   cost: 15.00 },
      { ingredientId: 'chocoChips',     name: 'Choco Chips',     amount: 80,   unit: 'g',   unitPrice: 0.294,   cost: 23.52 },
      { ingredientId: 'grahamCrackers', name: 'Graham Crackers', amount: 1.16, unit: 'g',   unitPrice: 0.243,   cost: 0.28  },
      { ingredientId: 'marshmallow',    name: 'Marshmallow',     amount: 2,    unit: 'g',   unitPrice: 0.179,   cost: 0.36  },
      { ingredientId: 'packagingBox',   name: 'Packaging',       amount: 3,    unit: 'pcs', unitPrice: 6.260,   cost: 18.78 },
    ],
    ingredientSubtotal: 134.00,
    overheadCost: 100.93,
    totalBatchCost: 234.93,
    costPerUnit: 78.31,
    sellingPrice: 170.00,
    profit: 91.69,
  },

  // ─── 4. Dubai Chewy Chocolate Cookie (per piece) ────────────
  {
    id: 'dubai-cookie',
    name: 'Dubai Chewy Chocolate Cookie',
    type: 'cookie-piece',
    yield: '1 cookie (individual)',
    yieldCount: 1,
    ingredients: [
      { ingredientId: 'kataifi',      name: 'Kataifi',     amount: 15,  unit: 'g',   unitPrice: 1.000,  cost: 15.00 },
      { ingredientId: 'pistachio',    name: 'Pistachio',   amount: 15,  unit: 'g',   unitPrice: 2.250,  cost: 33.75 },
      { ingredientId: 'marshmallow',  name: 'Marshmallow', amount: 40,  unit: 'g',   unitPrice: 0.180,  cost: 7.20  },
      { ingredientId: 'cocoaPowder',  name: 'Cocoa',       amount: 6,   unit: 'g',   unitPrice: 0.706,  cost: 4.24  },
      { ingredientId: 'butter',       name: 'Butter',      amount: 1.5, unit: 'g',   unitPrice: 0.245,  cost: 0.37  },
      { ingredientId: 'liner',        name: 'Liner',       amount: 1,   unit: 'pcs', unitPrice: 0.258,  cost: 0.26  },
    ],
    ingredientSubtotal: 60.81,
    overheadCost: 0,
    totalBatchCost: 60.81,
    costPerUnit: 60.81,
    sellingPrice: 130.00,
    profit: 69.19,
  },

  // ─── 5. Matcha Latte 12oz ────────────────────────────────────
  {
    id: 'matcha-latte-12oz',
    name: 'Matcha Latte (12oz)',
    type: 'drink',
    yield: '1 cup (12oz)',
    yieldCount: 1,
    ingredients: [
      { ingredientId: 'adoleafMatcha', name: 'Adoleaf Matcha', amount: 2.8,  unit: 'g',   unitPrice: 12.644, cost: 35.40 },
      { ingredientId: 'condensada',    name: 'Condensada',     amount: 15,   unit: 'ml',  unitPrice: 0.183,  cost: 2.75  },
      { ingredientId: 'oatside',       name: 'Oatside',        amount: 110,  unit: 'ml',  unitPrice: 0.130,  cost: 14.30 },
      { ingredientId: 'cup12oz',       name: 'Cup (12oz)',      amount: 1,    unit: 'pcs', unitPrice: 4.400,  cost: 4.40  },
      { ingredientId: 'straw',         name: 'Straw',          amount: 1,    unit: 'pcs', unitPrice: 0.480,  cost: 0.48  },
      { ingredientId: 'seaSalt',       name: 'Sea Salt',       amount: 15,   unit: 'g',   unitPrice: 0.400,  cost: 6.00  },
    ],
    ingredientSubtotal: 63.33,
    overheadCost: 0,
    totalBatchCost: 63.33,
    costPerUnit: 63.33,
    sellingPrice: 135.00,
    profit: 71.67,
  },

  // ─── 6. Matcha Latte 16oz ────────────────────────────────────
  {
    id: 'matcha-latte-16oz',
    name: 'Matcha Latte (16oz)',
    type: 'drink',
    yield: '1 cup (16oz)',
    yieldCount: 1,
    ingredients: [
      { ingredientId: 'adoleafMatcha', name: 'Adoleaf Matcha', amount: 4.5,  unit: 'g',   unitPrice: 12.644, cost: 56.90 },
      { ingredientId: 'condensada',    name: 'Condensada',     amount: 22,   unit: 'ml',  unitPrice: 0.183,  cost: 4.04  },
      { ingredientId: 'oatside',       name: 'Oatside',        amount: 160,  unit: 'ml',  unitPrice: 0.130,  cost: 20.80 },
      { ingredientId: 'cup16oz',       name: 'Cup (16oz)',      amount: 1,    unit: 'pcs', unitPrice: 5.000,  cost: 5.00  },
      { ingredientId: 'straw',         name: 'Straw',          amount: 1,    unit: 'pcs', unitPrice: 0.480,  cost: 0.48  },
      { ingredientId: 'seaSalt',       name: 'Sea Salt',       amount: 20,   unit: 'g',   unitPrice: 0.400,  cost: 8.00  },
    ],
    ingredientSubtotal: 95.22,
    overheadCost: 0,
    totalBatchCost: 95.22,
    costPerUnit: 95.22,
    sellingPrice: 160.00,
    profit: 64.78,
  },
];

// Logic Constants
export const COOKIE_LOGIC = {
  individual: { doughPerPiece: 40, unit: 'g', label: 'Individual Cookie' },
  boxOf5: { cookiesPerBox: 5, doughPerCookie: 25, totalDough: 125, unit: 'g', label: 'Box of 5' },
};
