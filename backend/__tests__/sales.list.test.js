const test = require('node:test');
const assert = require('node:assert');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

const TMP = path.join(os.tmpdir(), `pookies_list_${Date.now()}.db`);
process.env.POOKIES_DB_PATH = TMP;

const { getDb, closeDb } = require('../db/database');
const sales = require('../controllers/salesController');

function mockRes() {
  return { statusCode: 200, body: null,
    status(c){this.statusCode=c;return this;}, json(b){this.body=b;return this;} };
}

test.after(() => { closeDb(); try { fs.unlinkSync(TMP); } catch {} });

test('listSales returns recorded sales; getSaleById returns one with items', () => {
  getDb();
  sales.createSale({ body: {
    saleNumber: 'L-1',
    items: [{ recipeSku: 'm1_16oz', name: 'Matcha 16oz', variant: '16oz', unitPrice: 160, quantity: 2, lineTotal: 320 }],
    subtotal: 320, total: 320, costTotal: 120,
    payment: { method: 'gcash', referenceNo: 'GC123' }, deductions: [],
  } }, mockRes());

  const listRes = mockRes();
  sales.listSales({ query: {} }, listRes);
  assert.ok(Array.isArray(listRes.body.sales));
  assert.strictEqual(listRes.body.sales.length, 1);
  const id = listRes.body.sales[0].id;

  const oneRes = mockRes();
  sales.getSaleById({ params: { id: String(id) } }, oneRes);
  assert.strictEqual(oneRes.body.sale.items.length, 1);
  assert.strictEqual(oneRes.body.sale.payment.method, 'gcash');

  const missing = mockRes();
  sales.getSaleById({ params: { id: '99999' } }, missing);
  assert.strictEqual(missing.statusCode, 404);
});
