/**
 * inventoryController.js — Pookies Inventory API Controller (SQLite)
 *
 * All endpoints use better-sqlite3 (synchronous). No async/await needed.
 *
 * Routes (registered in routes/inventory.js):
 *   GET  /api/inventory/stock
 *   GET  /api/inventory/valuation
 *   PATCH /api/inventory/deduct
 *   POST  /api/inventory/restock
 *   POST  /api/inventory/receipt      (multipart/form-data)
 *   POST  /api/inventory/add          (create ingredient)
 *   PUT   /api/inventory/update/:id   (update ingredient metadata / stock)
 *   DELETE /api/inventory/delete/:id  (remove ingredient permanently)
 *
 * Negative Stock Policy:
 *   Deductions are NEVER blocked. If a deduction drives stock below zero, the
 *   transaction succeeds and the endpoint returns a `criticalAlerts` array.
 *   The frontend InventoryList renders a red "Critical" badge for qty <= 0.
 *
 * Receipt Naming Convention:
 *   Files are saved to /Receipts/ as:  rec_YYYYMMDD_HHmm.<ext>
 *   Example: rec_20260427_1152.jpg
 *
 * 2025 Master Ingredient Price List (hard-coded for valuation cross-check):
 *   Margarine:      ₱0.235/g   (₱47 per 200g)
 *   White Choco:    ₱0.075/g   (₱150 per 2kg)
 *   Adoleaf Matcha: ₱12.644/g
 *   Oatside:        ₱0.13/ml
 *
 * Dough deduction constants (verified against useInventorySync.tsx RECIPE_BOOK):
 *   Individual cookie     = 40g dough per piece
 *   Box of 5             = 125g total (5 cookies × 25g each)
 *   Dubai Cookie per pc  = 15g Kataifi | 15g Pistachio | 40g Marshmallow | 6g Cocoa | 1.5g Butter | 1 Liner
 *   Matcha Latte 16oz    = 4.5g Matcha | 22ml Condensada | 160ml Oatside | 20g SeaSalt | 1 Cup | 1 Straw
 *   Matcha Latte 12oz    = 2.8g Matcha | 15ml Condensada | 110ml Oatside | 15g SeaSalt | 1 Cup | 1 Straw
 */

'use strict';

const path = require('path');
const fs   = require('fs');
const multer = require('multer');
const { getDb, p4 } = require('../db/database');
const { logActivity } = require('../middleware/logger');

// ── Receipts directory ────────────────────────────────────────────────────────

const RECEIPTS_DIR = path.join(__dirname, '..', 'Receipts');

if (!fs.existsSync(RECEIPTS_DIR)) {
  fs.mkdirSync(RECEIPTS_DIR, { recursive: true });
}

// ── Multer: receipt upload with timestamp filename ────────────────────────────

/**
 * Receipt Image Naming:  rec_YYYYMMDD_HHmm.<ext>
 * Example:               rec_20260427_1152.jpg
 *
 * If a file with the same minute-stamp already exists, a 4-digit millisecond
 * suffix is appended to guarantee uniqueness: rec_20260427_1152_0847.jpg
 */
const receiptStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, RECEIPTS_DIR),

  filename: (_req, file, cb) => {
    const now   = new Date();
    const year  = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day   = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const mins  = String(now.getMinutes()).padStart(2, '0');
    const ms    = String(now.getMilliseconds()).padStart(4, '0');
    const ext   = path.extname(file.originalname).toLowerCase() || '.jpg';

    const base     = `rec_${year}${month}${day}_${hours}${mins}`;
    const basePath = path.join(RECEIPTS_DIR, `${base}${ext}`);
    const filename = fs.existsSync(basePath)
      ? `${base}_${ms}${ext}`
      : `${base}${ext}`;

    cb(null, filename);
  },
});

const receiptFileFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WEBP, and HEIC files are accepted.'));
  }
};

const receiptUpload = multer({
  storage:    receiptStorage,
  fileFilter: receiptFileFilter,
  limits:     { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/inventory/stock
// ─────────────────────────────────────────────────────────────────────────────

/**
 * getStock
 *
 * Returns current stock levels for all 30 ingredients.
 * Used by the frontend CanIBakePanel and POS pre-sale availability check
 * (checkStockAvailability in useInventorySync.tsx).
 */
function getStock(req, res) {
  try {
    const db   = getDb();
    const rows = db.prepare(
      `SELECT id, name, category, current_stock, unit, unit_cost,
              min_stock_level, supplier
       FROM   ingredients
       ORDER  BY category, name`
    ).all();

    res.json({
      ingredients: rows.map(r => ({
        id:              r.id,
        name:            r.name,
        category:        r.category,
        current_stock:   p4(r.current_stock),
        unit:            r.unit,
        unit_cost:       p4(r.unit_cost),
        min_stock_level: p4(r.min_stock_level),
        supplier:        r.supplier ?? null,
      })),
    });
  } catch (err) {
    console.error('[getStock]', err.message);
    res.status(500).json({ message: 'Failed to fetch stock levels.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/inventory/valuation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * getValuation
 *
 * Total Inventory Asset Value calculated in SQLite arithmetic.
 * Formula: value_row = MAX(current_stock, 0) * unit_cost
 * (Negative stock is counted as zero for valuation — stock deficit is not an asset.)
 *
 * This prevents frontend computation lag as the ingredient list grows.
 *
 * Pricing cross-check (2025 Master List):
 *   Margarine:      ₱0.235/g   (₱47 per 200g)
 *   White Choco:    ₱0.075/g   (₱150 per 2kg)
 *   Adoleaf Matcha: ₱12.644/g
 *   Oatside:        ₱0.13/ml
 */
function getValuation(req, res) {
  try {
    const db = getDb();

    const rows = db.prepare(
      `SELECT
         id,
         name,
         MAX(current_stock, 0)                              AS effective_stock,
         unit,
         unit_cost,
         ROUND(MAX(current_stock, 0) * unit_cost, 4)        AS value
       FROM   ingredients
       ORDER  BY value DESC`
    ).all();

    const breakdown = rows.map(r => ({
      ingredientId:  r.id,
      name:          r.name,
      currentStock:  p4(r.effective_stock),
      unit:          r.unit,
      unitCost:      p4(r.unit_cost),
      value:         p4(r.value),
    }));

    const totalValue = p4(breakdown.reduce((sum, b) => sum + b.value, 0));

    res.json({
      totalValue,
      breakdown,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[getValuation]', err.message);
    res.status(500).json({ message: 'Failed to calculate inventory valuation.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/inventory/deduct
// ─────────────────────────────────────────────────────────────────────────────

/**
 * deductStock
 *
 * Applies POS-generated ingredient deductions to the SQLite database.
 *
 * The payload is pre-computed by useInventorySync.tsx → buildDeductions(),
 * which resolves all SKU-to-ingredient mappings including Mixed Box handling.
 *
 * Idempotency: if a saleId is already present in inventory_logs, the request
 * is silently acknowledged (HTTP 200) without re-applying deductions.
 *
 * Negative Stock: deductions are never blocked. Ingredients that cross zero
 * are returned in `criticalAlerts` for the frontend to flag.
 *
 * Expected body (DeductPayload from useInventorySync.tsx):
 * {
 *   saleId:     string,
 *   timestamp:  string (ISO 8601),
 *   deductions: [{ ingredientId, totalAmount, unit }]
 * }
 */
function deductStock(req, res) {
  const { saleId, timestamp, deductions } = req.body;

  if (!saleId || !Array.isArray(deductions) || deductions.length === 0) {
    return res.status(422).json({
      message: 'Invalid payload: saleId and a non-empty deductions array are required.',
    });
  }

  try {
    const db  = getDb();

    // Idempotency check: has this sale already been applied?
    const existingLog = db
      .prepare(`SELECT id FROM inventory_logs WHERE sale_id = ? LIMIT 1`)
      .get(saleId);

    if (existingLog) {
      return res.json({
        status: 'already_applied',
        saleId,
        criticalAlerts: [],
        message: 'Sale already recorded. No changes made.',
      });
    }

    const criticalAlerts = [];
    const logTimestamp   = timestamp ?? new Date().toISOString();

    // Run all deductions inside a single atomic transaction
    const applyDeductions = db.transaction(() => {
      const getIngredient = db.prepare(
        `SELECT id, name, current_stock, unit FROM ingredients WHERE id = ?`
      );
      const updateStock = db.prepare(
        `UPDATE ingredients SET current_stock = ROUND(current_stock - ?, 4) WHERE id = ?`
      );
      const insertLog = db.prepare(
        `INSERT INTO inventory_logs (ingredient_id, change_amount, type, sale_id, log_date)
         VALUES (?, ?, 'SALE', ?, ?)`
      );

      for (const { ingredientId, totalAmount } of deductions) {
        const amount = p4(parseFloat(totalAmount));
        const row    = getIngredient.get(ingredientId);

        if (!row) {
          console.warn(`[deductStock] Unknown ingredient "${ingredientId}" — skipping.`);
          continue;
        }

        updateStock.run(amount, ingredientId);
        insertLog.run(ingredientId, -amount, saleId, logTimestamp);

        const newStock = p4(row.current_stock - amount);
        if (newStock <= 0) {
          criticalAlerts.push({
            ingredientId,
            name:          row.name,
            previousStock: p4(row.current_stock),
            currentStock:  newStock,
            unit:          row.unit,
          });
        }
      }
    });

    applyDeductions();

    // Log to daily activity file
    logActivity({
      type:   'SALE',
      saleId,
      items:  deductions.map(d => ({
        ingredientId: d.ingredientId,
        amount:       p4(parseFloat(d.totalAmount)),
        unit:         d.unit,
      })),
    });

    const status = criticalAlerts.length > 0 ? 'ok_with_critical_alerts' : 'ok';

    res.json({
      status,
      saleId,
      criticalAlerts,
      message:
        criticalAlerts.length > 0
          ? `Deduction applied. ${criticalAlerts.length} ingredient(s) at critical stock level.`
          : 'Deduction applied successfully.',
    });
  } catch (err) {
    console.error('[deductStock]', err.message);
    res.status(500).json({ message: 'Stock deduction failed.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/inventory/restock
// ─────────────────────────────────────────────────────────────────────────────

/**
 * restockIngredient
 *
 * Adds received quantities to current stock and saves a permanent snapshot
 * of confirmed_data to the receipt_uploads row.
 *
 * The confirmed_data JSON column is NOT subject to the 30-day purge —
 * it serves as a permanent audit record beyond log retention.
 *
 * Expected body:
 * {
 *   receiptUploadId?: number,     // FK to receipt_uploads.id (optional)
 *   items: [{ ingredientId, name, amountAdded, unit }]
 * }
 */
function restockIngredient(req, res) {
  const { receiptUploadId, items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(422).json({ message: 'items array is required.' });
  }

  try {
    const db          = getDb();
    const restockedAt = new Date().toISOString();

    const confirmedSnapshot = items.map(item => ({
      ingredientId: item.ingredientId,
      name:         item.name,
      amountAdded:  p4(parseFloat(item.amountAdded)),
      unit:         item.unit,
      restockedAt,
    }));

    const applyRestock = db.transaction(() => {
      const updateStock = db.prepare(
        `UPDATE ingredients SET current_stock = ROUND(current_stock + ?, 4) WHERE id = ?`
      );
      const insertLog = db.prepare(
        `INSERT INTO inventory_logs (ingredient_id, change_amount, type, log_date)
         VALUES (?, ?, 'RESTOCK', ?)`
      );
      const updateReceipt = db.prepare(
        `UPDATE receipt_uploads SET confirmed_data = ? WHERE id = ?`
      );

      for (const { ingredientId, amountAdded } of items) {
        const amount = p4(parseFloat(amountAdded));
        if (amount <= 0) continue;
        updateStock.run(amount, ingredientId);
        insertLog.run(ingredientId, amount, restockedAt);
      }

      // Attach confirmed snapshot to the receipt record (permanent audit trail)
      if (receiptUploadId) {
        updateReceipt.run(JSON.stringify(confirmedSnapshot), receiptUploadId);
      }
    });

    applyRestock();

    // Log to daily activity file
    logActivity({
      type:   'RESTOCK',
      saleId: null,
      items:  confirmedSnapshot.map(s => ({
        ingredientId: s.ingredientId,
        amount:       s.amountAdded,
        unit:         s.unit,
      })),
    });

    res.json({
      status:         'ok',
      restockedAt,
      itemCount:      confirmedSnapshot.length,
      confirmedItems: confirmedSnapshot,
      message:        `Restock confirmed: ${restockedAt} — ${items.length} ingredient(s) updated.`,
    });
  } catch (err) {
    console.error('[restockIngredient]', err.message);
    res.status(500).json({ message: 'Restock failed.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/inventory/receipt   (multipart/form-data, field: "receipt")
// ─────────────────────────────────────────────────────────────────────────────

/**
 * uploadReceipt
 *
 * Saves the uploaded receipt image to /Receipts/ with timestamp naming
 * (rec_YYYYMMDD_HHmm.ext), creates a receipt_uploads record, and returns
 * the record ID for the subsequent restock confirmation call.
 *
 * Workflow:
 *   1. Upload receipt  → POST /api/inventory/receipt  → returns { id, imageName }
 *   2. Confirm restock → POST /api/inventory/restock  → receiptUploadId = id from step 1
 */
function uploadReceipt(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: 'No file received. Use field name "receipt".' });
  }

  try {
    const db        = getDb();
    const imageName = req.file.filename;          // e.g. rec_20260427_1152.jpg
    const filePath  = req.file.path;
    const uploadedAt = new Date().toISOString();

    const result = db
      .prepare(
        `INSERT INTO receipt_uploads (image_name, file_path, upload_date, confirmed_data)
         VALUES (?, ?, ?, '[]')`
      )
      .run(imageName, filePath, uploadedAt);

    const receiptId = result.lastInsertRowid;

    res.status(201).json({
      id:          receiptId,
      imageName,
      filePath,
      uploadedAt,
      publicUrl:   `/Receipts/${imageName}`,
      message:     `Receipt saved: /Receipts/${imageName}`,
    });
  } catch (err) {
    // Clean up the uploaded file if the DB insert failed
    if (req.file?.path) {
      fs.unlink(req.file.path, () => {});
    }
    console.error('[uploadReceipt]', err.message);
    res.status(500).json({ message: 'Receipt upload failed. File removed.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/inventory/add
// ─────────────────────────────────────────────────────────────────────────────

/**
 * addIngredient  (Create)
 *
 * Adds a new ingredient to the master list and logs the initial stock as an
 * ADJUSTMENT event so the record appears in both the SQLite log and the daily
 * activity file.
 *
 * Validation rules (consistent with database.js schema):
 *   id            — required, TEXT, unique (PRIMARY KEY), no spaces
 *   name          — required, TEXT
 *   category      — required: baking | dairy | specialty | drinks | packaging | other
 *   unit          — required: g | ml | pcs
 *   unit_cost     — required, REAL >= 0  (use 2025 Master List rates)
 *   min_stock_level — required, REAL >= 0  (batch-minimum threshold)
 *   current_stock — optional, defaults to 0 if not provided
 *   supplier      — optional, TEXT
 *
 * Batch-minimum reference (2025 Master List):
 *   Flour 250g | Margarine 115g | Oatside 160ml | Adoleaf Matcha 4.5g
 *
 * Cost reference (2025 Master List):
 *   Margarine ₱0.235/g | White Choco ₱0.075/g | Matcha ₱12.644/g | Oatside ₱0.13/ml
 *
 * Expected body:
 * {
 *   id: "newIngredient", name: "...", category: "baking",
 *   unit: "g", unit_cost: 0.235, min_stock_level: 115,
 *   current_stock: 500, supplier: "Magnolia"
 * }
 */
function addIngredient(req, res) {
  const {
    id, name, category, unit,
    unit_cost, min_stock_level,
    current_stock, supplier,
  } = req.body;

  // ── Validation ────────────────────────────────────────────────────────────

  const VALID_CATEGORIES = ['baking', 'dairy', 'specialty', 'drinks', 'packaging', 'other'];
  const VALID_UNITS      = ['g', 'ml', 'pcs'];

  if (!id || typeof id !== 'string' || id.trim() === '' || /\s/.test(id)) {
    return res.status(422).json({
      message: 'id is required and must be a non-empty string with no spaces (e.g. "adoleafMatcha").',
    });
  }
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(422).json({ message: 'name is required.' });
  }
  if (!VALID_CATEGORIES.includes(category)) {
    return res.status(422).json({
      message: `category must be one of: ${VALID_CATEGORIES.join(', ')}.`,
    });
  }
  if (!VALID_UNITS.includes(unit)) {
    return res.status(422).json({
      message: 'unit must be one of: g, ml, pcs.',
    });
  }
  if (unit_cost == null || isNaN(parseFloat(unit_cost)) || parseFloat(unit_cost) < 0) {
    return res.status(422).json({ message: 'unit_cost is required and must be a number >= 0.' });
  }
  if (min_stock_level == null || isNaN(parseFloat(min_stock_level)) || parseFloat(min_stock_level) < 0) {
    return res.status(422).json({ message: 'min_stock_level is required and must be a number >= 0.' });
  }

  const stock    = p4(Math.max(0, parseFloat(current_stock) || 0));
  const cost     = p4(parseFloat(unit_cost));
  const minStock = p4(parseFloat(min_stock_level));
  const cleanId  = id.trim();
  const cleanName = name.trim();

  try {
    const db        = getDb();
    const timestamp = new Date().toISOString();

    // Explicit duplicate check for a clean 409 error message
    const existing = db.prepare('SELECT id FROM ingredients WHERE id = ?').get(cleanId);
    if (existing) {
      return res.status(409).json({
        message: `Ingredient with id "${cleanId}" already exists. Use PUT /update/:id to modify it.`,
      });
    }

    // Atomic insert + log inside a single transaction
    const addAndLog = db.transaction(() => {
      db.prepare(
        `INSERT INTO ingredients
           (id, name, category, current_stock, unit, unit_cost, min_stock_level, supplier)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(cleanId, cleanName, category, stock, unit, cost, minStock, supplier?.trim() ?? null);

      // Log initial stock as ADJUSTMENT (stock > 0 means opening stock was set)
      db.prepare(
        `INSERT INTO inventory_logs
           (ingredient_id, change_amount, type, log_date)
         VALUES (?, ?, 'ADJUSTMENT', ?)`
      ).run(cleanId, stock, timestamp);
    });

    addAndLog();

    // Append to today's daily activity file
    logActivity({
      type:   'ADJUSTMENT',
      saleId: null,
      items:  [{ ingredientId: cleanId, amount: stock, unit }],
    });

    res.status(201).json({
      status: 'ok',
      ingredient: {
        id:              cleanId,
        name:            cleanName,
        category,
        current_stock:   stock,
        unit,
        unit_cost:       cost,
        min_stock_level: minStock,
        supplier:        supplier?.trim() ?? null,
      },
      message: `Ingredient "${cleanName}" added successfully.`,
    });
  } catch (err) {
    // Catch SQLite UNIQUE constraint as a safety net (race condition guard)
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({
        message: `Ingredient with id "${cleanId}" already exists.`,
      });
    }
    console.error('[addIngredient]', err.message);
    res.status(500).json({ message: 'Failed to add ingredient.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/inventory/update/:id
// ─────────────────────────────────────────────────────────────────────────────

/**
 * updateIngredient  (Update)
 *
 * Updates metadata and/or stock for an existing ingredient. Only fields
 * present in the request body are changed — omitted fields are untouched.
 *
 * BLOCKED field: `unit` — changing unit after creation would corrupt all
 * historical log entries. Return a 422 if the caller tries to send it.
 *
 * If `current_stock` is sent, the ADJUSTMENT log records the delta
 * (new_stock - old_stock) so the change is fully auditable.
 * If only metadata fields are sent (name, cost, etc.), change_amount = 0.
 *
 * Updatable fields:
 *   name | category | current_stock | unit_cost | min_stock_level | supplier
 *
 * Expected params:  PUT /api/inventory/update/:id
 * Expected body (any subset of updatable fields):
 * {
 *   name: "...", category: "dairy", current_stock: 600,
 *   unit_cost: 0.235, min_stock_level: 115, supplier: "Magnolia"
 * }
 */
function updateIngredient(req, res) {
  const { id } = req.params;

  if ('unit' in req.body) {
    return res.status(422).json({
      message:
        'unit cannot be changed after creation — doing so would corrupt historical log entries. ' +
        'Delete and re-add the ingredient if a unit change is required.',
    });
  }

  const { name, category, current_stock, unit_cost, min_stock_level, supplier } = req.body;

  const VALID_CATEGORIES = ['baking', 'dairy', 'specialty', 'drinks', 'packaging', 'other'];

  // Validate any supplied category
  if (category !== undefined && !VALID_CATEGORIES.includes(category)) {
    return res.status(422).json({
      message: `category must be one of: ${VALID_CATEGORIES.join(', ')}.`,
    });
  }

  try {
    const db = getDb();

    const existing = db.prepare('SELECT * FROM ingredients WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ message: `Ingredient "${id}" not found.` });
    }

    // Build SET clause dynamically — only include fields the caller provided
    const setCols  = [];
    const setVals  = [];

    if (name !== undefined) {
      const cleanName = String(name).trim();
      if (cleanName === '') {
        return res.status(422).json({ message: 'name cannot be blank.' });
      }
      setCols.push('name = ?');
      setVals.push(cleanName);
    }
    if (category !== undefined) {
      setCols.push('category = ?');
      setVals.push(category);
    }
    if (unit_cost !== undefined) {
      const cost = p4(parseFloat(unit_cost));
      if (isNaN(cost) || cost < 0) {
        return res.status(422).json({ message: 'unit_cost must be a number >= 0.' });
      }
      setCols.push('unit_cost = ?');
      setVals.push(cost);
    }
    if (min_stock_level !== undefined) {
      const minStock = p4(parseFloat(min_stock_level));
      if (isNaN(minStock) || minStock < 0) {
        return res.status(422).json({ message: 'min_stock_level must be a number >= 0.' });
      }
      setCols.push('min_stock_level = ?');
      setVals.push(minStock);
    }
    if (supplier !== undefined) {
      setCols.push('supplier = ?');
      setVals.push(supplier === '' ? null : String(supplier).trim());
    }

    // Stock adjustment — compute delta for the log
    let stockDelta = 0;
    if (current_stock !== undefined) {
      const newStock = p4(parseFloat(current_stock));
      if (isNaN(newStock)) {
        return res.status(422).json({ message: 'current_stock must be a number.' });
      }
      stockDelta = p4(newStock - existing.current_stock);
      setCols.push('current_stock = ROUND(?, 4)');
      setVals.push(newStock);
    }

    if (setCols.length === 0) {
      return res.status(422).json({
        message: 'No updatable fields provided. Send at least one of: name, category, current_stock, unit_cost, min_stock_level, supplier.',
      });
    }

    const timestamp = new Date().toISOString();

    // Atomic update + ADJUSTMENT log
    const updateAndLog = db.transaction(() => {
      db.prepare(
        `UPDATE ingredients SET ${setCols.join(', ')} WHERE id = ?`
      ).run(...setVals, id);

      // Always insert an ADJUSTMENT row so every master-record change is logged
      // change_amount = stock delta (0 for metadata-only changes)
      db.prepare(
        `INSERT INTO inventory_logs
           (ingredient_id, change_amount, type, log_date)
         VALUES (?, ?, 'ADJUSTMENT', ?)`
      ).run(id, stockDelta, timestamp);
    });

    updateAndLog();

    // Append to today's daily activity file
    logActivity({
      type:   'ADJUSTMENT',
      saleId: null,
      items:  [{ ingredientId: id, amount: stockDelta, unit: existing.unit }],
    });

    // Re-fetch the updated row to return the canonical state
    const updated = db.prepare('SELECT * FROM ingredients WHERE id = ?').get(id);

    res.json({
      status: 'ok',
      ingredient: {
        id:              updated.id,
        name:            updated.name,
        category:        updated.category,
        current_stock:   p4(updated.current_stock),
        unit:            updated.unit,
        unit_cost:       p4(updated.unit_cost),
        min_stock_level: p4(updated.min_stock_level),
        supplier:        updated.supplier ?? null,
      },
      stockDelta,
      message: `Ingredient "${updated.name}" updated successfully.`,
    });
  } catch (err) {
    console.error('[updateIngredient]', err.message);
    res.status(500).json({ message: 'Failed to update ingredient.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/inventory/delete/:id
// ─────────────────────────────────────────────────────────────────────────────

/**
 * deleteIngredient  (Delete)
 *
 * Permanently removes an ingredient from the master list.
 *
 * FK constraint handling:
 *   inventory_logs.ingredient_id REFERENCES ingredients(id)
 *   With foreign_keys = ON, SQLite will REJECT a DELETE on ingredients if
 *   any log rows still reference the ingredient.
 *
 *   Resolution: inside a single transaction, delete all associated log rows
 *   FIRST, then delete the ingredient master row. This preserves atomicity
 *   and avoids any FK violation.
 *
 * Audit trail:
 *   logActivity() (file-based, no FK) is called BEFORE the transaction so
 *   the deletion event is always written to today's activity file regardless
 *   of whether the DB transaction succeeds. The file log has no FK constraints
 *   and is the permanent record for the deletion.
 *
 * Expected params: DELETE /api/inventory/delete/:id
 */
function deleteIngredient(req, res) {
  const { id } = req.params;

  try {
    const db = getDb();

    const existing = db.prepare('SELECT * FROM ingredients WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ message: `Ingredient "${id}" not found.` });
    }

    // Step 1: Write file-based audit entry BEFORE the DB transaction
    // (file logger has no FK constraints — safe even if the DB step fails)
    logActivity({
      type:   'ADJUSTMENT',
      saleId: null,
      items:  [{
        ingredientId: id,
        amount:       -p4(existing.current_stock), // negative = removal
        unit:         existing.unit,
      }],
    });

    // Step 2: Atomic — clear FK-referencing log rows, then delete master row
    const deleteAll = db.transaction(() => {
      // Must delete child rows first to satisfy FK constraint
      db.prepare('DELETE FROM inventory_logs WHERE ingredient_id = ?').run(id);
      db.prepare('DELETE FROM ingredients WHERE id = ?').run(id);
    });

    deleteAll();

    res.json({
      status:  'ok',
      deleted: {
        id,
        name:       existing.name,
        finalStock: p4(existing.current_stock),
        unit:       existing.unit,
      },
      message: `Ingredient "${existing.name}" has been permanently removed from the master list.`,
    });
  } catch (err) {
    console.error('[deleteIngredient]', err.message);
    res.status(500).json({ message: 'Failed to delete ingredient.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  getStock,
  getValuation,
  deductStock,
  restockIngredient,
  uploadReceipt,
  receiptUpload,
  addIngredient,
  updateIngredient,
  deleteIngredient,
};