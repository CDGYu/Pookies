/**
 * database.js — SQLite Database Bootstrap
 *
 * Creates and initialises pookies_inventory.db on first run.
 * Uses better-sqlite3 (synchronous) for simplicity and reliability.
 *
 * Install: npm install better-sqlite3
 *
 * Tables:
 *   ingredients     — master stock table (30 rows, pre-seeded)
 *   inventory_logs  — transaction history (30-day retention)
 *   receipt_uploads — receipt records with confirmed_data JSONB audit trail
 *
 * Source of truth for costs (2025 Master Ingredient Price List):
 *   Margarine:      ₱0.235/g   (₱47 per 200g)
 *   White Choco:    ₱0.075/g   (₱150 per 2kg)
 *   Adoleaf Matcha: ₱12.644/g
 *   Oatside:        ₱0.13/ml
 *   Egg:            ₱10.00/pc
 *   Egg Yolk:       ₱5.00/pc
 *
 * Batch-minimum thresholds (single production run, highest per ingredient):
 *   Flour 250g | Margarine 115g | Brown Sugar 110g | White Sugar 130g
 *   Cream Cheese 200g | Cocoa Powder 20g | Oatside 160ml | Adoleaf Matcha 4.5g
 */

'use strict';

const path     = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'pookies_inventory.db');

let _db = null;

/**
 * getDb — Returns the singleton database connection.
 * Initialises schema and seeds ingredients on first call.
 */
function getDb() {
  if (_db) return _db;

  _db = new Database(DB_PATH);

  // Performance pragmas
  _db.pragma('journal_mode = WAL');  // Write-Ahead Logging for concurrent reads
  _db.pragma('foreign_keys = ON');
  _db.pragma('synchronous = NORMAL'); // Safe + fast for local use

  _initSchema(_db);
  _seedIngredients(_db);

  console.log(`[Database] Connected to ${DB_PATH}`);
  return _db;
}

// ── Schema ────────────────────────────────────────────────────────────────────

function _initSchema(db) {
  db.exec(`
    -- Master stock table
    CREATE TABLE IF NOT EXISTS ingredients (
      id              TEXT    PRIMARY KEY,   -- matches frontend InventoryItem.id
      name            TEXT    NOT NULL,
      category        TEXT    NOT NULL,      -- baking | dairy | specialty | drinks | packaging | other
      current_stock   REAL    NOT NULL DEFAULT 0,
      unit            TEXT    NOT NULL,      -- g | ml | pcs
      unit_cost       REAL    NOT NULL,      -- ₱ per unit (2025 Master List)
      min_stock_level REAL    NOT NULL,      -- batch-minimum threshold
      supplier        TEXT
    );

    -- Transaction log (purged after 30 days by cleanupWorker)
    CREATE TABLE IF NOT EXISTS inventory_logs (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      ingredient_id   TEXT    NOT NULL REFERENCES ingredients(id),
      change_amount   REAL    NOT NULL,      -- positive = restock, negative = deduction
      type            TEXT    NOT NULL,      -- SALE | RESTOCK | ADJUSTMENT
      sale_id         TEXT,                  -- POS sale reference (idempotency)
      log_date        TEXT    NOT NULL       -- ISO 8601 datetime string
    );

    CREATE INDEX IF NOT EXISTS idx_logs_date
      ON inventory_logs (log_date);

    CREATE INDEX IF NOT EXISTS idx_logs_sale_id
      ON inventory_logs (sale_id) WHERE sale_id IS NOT NULL;

    -- Receipt uploads with permanent audit snapshot
    CREATE TABLE IF NOT EXISTS receipt_uploads (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      image_name      TEXT    NOT NULL,      -- e.g. rec_20260427_1152.jpg
      file_path       TEXT    NOT NULL,      -- absolute path on server
      upload_date     TEXT    NOT NULL,      -- ISO 8601
      confirmed_data  TEXT    NOT NULL DEFAULT '[]'  -- JSON array of confirmed restock items
    );
  `);
}

// ── Seed Data ─────────────────────────────────────────────────────────────────
// Uses INSERT OR IGNORE — safe to call on every startup; no duplicate rows.
//
// current_stock is initialised to 0 for every ingredient.
// Production stock is added exclusively through verified receipt uploads
// (POST /api/inventory/receipt + POST /api/inventory/restock).
//
// unit_cost values are the 2025 Master Ingredient Price List (source of truth):
//   Margarine:      0.2350   (₱0.235/g  = ₱47 per 200g)
//   White Choco:    0.0750   (₱0.075/g  = ₱150 per 2kg)
//   Adoleaf Matcha: 12.6444  (₱12.644/g)
//   Oatside:        0.1300   (₱0.13/ml)
//   Egg:            10.0000  (₱10.00/pc)
//   Egg Yolk:       5.0000   (₱5.00/pc)
//
// min_stock_level reflects the highest amount consumed in a single production run:
//   Flour 250g | Brown Sugar 110g | White Sugar 130g | Margarine 115g
//   Cream Cheese 200g | Cocoa Powder 20g | Oatside 160ml | Adoleaf Matcha 4.5g

function _seedIngredients(db) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO ingredients
      (id, name, category, current_stock, unit, unit_cost, min_stock_level, supplier)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const seed = db.transaction(() => {
    // ── BAKING ──────────────────────────────────────────────────────────────
    //                           id               name               category   stock  unit   unit_cost  min_stock  supplier
    insert.run('flour',          'Flour',           'baking',          0, 'g',   0.00224,    250,   'Local Market');
    insert.run('brownSugar',     'Brown Sugar',     'baking',          0, 'g',   0.098,      110,   'Local Market');
    insert.run('whiteSugar',     'White Sugar',     'baking',          0, 'g',   0.100,      130,   'Local Market');
    insert.run('bakingSoda',     'Baking Soda',     'baking',          0, 'g',   0.200,      2,     'Local Market');
    insert.run('salt',           'Salt',            'baking',          0, 'g',   0.020,      3,     'Local Market');
    insert.run('vanillaExtract', 'Vanilla Extract', 'baking',          0, 'ml',  2.5175,     10,    'Flavors PH');
    insert.run('espressoPowder', 'Espresso Powder', 'baking',          0, 'g',   1.325,      2,     'Coffee Depot');
    insert.run('chocolateBar',   'Chocolate Bar',   'baking',          0, 'g',   0.375,      40,    'Dutche');
    insert.run('chocoChips',     'Choco Chips',     'baking',          0, 'g',   0.294,      80,    'Dutche');
    insert.run('foodColoring',   'Food Coloring',   'baking',          0, 'ml',  2.060,      3,     'Baking Supply');
    insert.run('cocoaPowder',    'Cocoa Powder',    'baking',          0, 'g',   0.706,      20,    'Dutche');
    insert.run('grahamCrackers', 'Graham Crackers', 'baking',          0, 'g',   0.24286,    2,     'Local Market');
    insert.run('marshmallow',    'Marshmallow',     'baking',          0, 'g',   0.179,      40,    'Local Market');
    insert.run('whiteChoco',     'White Chocolate', 'baking',          0, 'g',   0.075,      80,    'Dutche');      // 0.075/g = 150/2kg
    insert.run('seaSalt',        'Sea Salt',        'baking',          0, 'g',   0.400,      20,    'Local Market');

    // ── DAIRY & EGGS ────────────────────────────────────────────────────────
    insert.run('egg',            'Egg',             'dairy',           0, 'pcs', 10.000,     1,     'Local Farm');  // 10.00/pc
    insert.run('eggYolk',        'Egg Yolk',        'dairy',           0, 'pcs', 5.000,      1,     'Local Farm');  // 5.00/pc
    insert.run('margarine',      'Margarine',       'dairy',           0, 'g',   0.235,      115,   'Magnolia');    // 0.235/g = 47/200g
    insert.run('creamCheese',    'Cream Cheese',    'dairy',           0, 'g',   0.445,      200,   'Magnolia');
    insert.run('butter',         'Butter',          'dairy',           0, 'g',   0.245,      2,     'Magnolia');

    // ── SPECIALTY ───────────────────────────────────────────────────────────
    insert.run('adoleafMatcha',  'Adoleaf Matcha',  'specialty',       0, 'g',   12.64444,   4.5,   'Adoleaf');    // 12.644/g
    insert.run('kataifi',        'Kataifi',         'specialty',       0, 'g',   1.000,      15,    'Import Supplier');
    insert.run('pistachio',      'Pistachio',       'specialty',       0, 'g',   2.250,      15,    'Import Supplier');

    // ── DRINKS ──────────────────────────────────────────────────────────────
    insert.run('oatside',        'Oatside',         'drinks',          0, 'ml',  0.130,      160,   'Oatside PH'); // 0.13/ml
    insert.run('condensada',     'Condensada',      'drinks',          0, 'ml',  0.18349,    22,    'Local Market');

    // ── PACKAGING ───────────────────────────────────────────────────────────
    insert.run('packagingBox',   'Packaging Box',   'packaging',       0, 'pcs', 6.260,      3,     'Packaging Plus');
    insert.run('liner',          'Liner',           'packaging',       0, 'pcs', 0.258,      1,     'Packaging Plus');
    insert.run('cup12oz',        'Cup (12oz)',       'packaging',       0, 'pcs', 4.400,      1,     'Packaging Plus');
    insert.run('cup16oz',        'Cup (16oz)',       'packaging',       0, 'pcs', 5.000,      1,     'Packaging Plus');
    insert.run('straw',          'Straw',           'packaging',       0, 'pcs', 0.480,      1,     'Packaging Plus');
  });

  seed();
}

// ── Precision helper ──────────────────────────────────────────────────────────

/** Round to 4 decimal places — matches DECIMAL(12,4) PostgreSQL migration compatibility. */
function p4(n) {
  return Math.round(n * 10_000) / 10_000;
}

module.exports = { getDb, p4 };