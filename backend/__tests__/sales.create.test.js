const test = require('node:test');
const assert = require('node:assert');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

const TMP = path.join(os.tmpdir(), `pookies_sales_${Date.now()}.db`);
process.env.POOKIES_DB_PATH = TMP;

const { getDb, closeDb, p4 } = require('../db/database');
const sales = require('../controllers/salesController');

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
  };
}

function seedFlour(stock) {
  const db = getDb();
  db.prepare(`INSERT OR REPLACE INTO ingredients
    (id,name,category,current_stock,unit,unit_cost,min_stock_level,supplier)
    VALUES ('flour','Flour','baking',?, 'g', 0.00224, 250, 'Local Market')`).run(stock);
}

const baseBody = () => ({
  saleNumber: 'S-1',
  items: [{ recipeSku: 'c1_box5', name: 'Classic', variant: 'Box of 5', unitPrice: 135, quantity: 1, lineTotal: 135 }],
  subtotal: 135, total: 135, costTotal: 50,
  payment: { method: 'cash', amountTendered: 200, changeDue: 65 },
  deductions: [{ ingredientId: 'flour', totalAmount: 43.4, unit: 'g' }],
});

test.after(() => { closeDb(); try { fs.unlinkSync(TMP); } catch {} });

test('createSale records the sale, items, and deducts stock', () => {
  getDb(); seedFlour(1000);
  const req = { body: baseBody() };
  const res = mockRes();
  sales.createSale(req, res);

  assert.strictEqual(res.body.status, 'ok');
  assert.ok(res.body.sale.id > 0);

  const db = getDb();
  const saved = db.prepare('SELECT * FROM sales WHERE sale_number = ?').get('S-1');
  assert.strictEqual(saved.total, 135);
  const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(saved.id);
  assert.strictEqual(items.length, 1);
  assert.strictEqual(items[0].recipe_sku, 'c1_box5');

  const flour = db.prepare('SELECT current_stock FROM ingredients WHERE id = ?').get('flour');
  assert.strictEqual(p4(flour.current_stock), 956.6);
});

test('createSale is idempotent on repeat saleNumber', () => {
  const req = { body: baseBody() };
  const res = mockRes();
  sales.createSale(req, res); // second call, same S-1
  assert.strictEqual(res.body.status, 'already_applied');

  const db = getDb();
  const flour = db.prepare('SELECT current_stock FROM ingredients WHERE id = ?').get('flour');
  assert.strictEqual(p4(flour.current_stock), 956.6); // unchanged
});
