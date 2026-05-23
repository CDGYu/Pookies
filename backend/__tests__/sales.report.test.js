const test = require('node:test');
const assert = require('node:assert');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

const TMP = path.join(os.tmpdir(), `pookies_report_${Date.now()}.db`);
process.env.POOKIES_DB_PATH = TMP;

const { getDb, closeDb } = require('../db/database');
const sales = require('../controllers/salesController');

function mockRes() {
  return { statusCode: 200, body: null,
    status(c){this.statusCode=c;return this;}, json(b){this.body=b;return this;} };
}

const today = new Date().toISOString().slice(0, 10);

test.after(() => { closeDb(); try { fs.unlinkSync(TMP); } catch {} });

test('daily report aggregates totals, profit, by-payment, by-product', () => {
  getDb();
  sales.createSale({ body: {
    saleNumber: 'R-1',
    items: [{ recipeSku: 'm1_16oz', name: 'Matcha 16oz', variant: '16oz', unitPrice: 160, quantity: 2, lineTotal: 320 }],
    subtotal: 320, total: 320, costTotal: 120, payment: { method: 'cash' }, deductions: [],
  } }, mockRes());
  sales.createSale({ body: {
    saleNumber: 'R-2',
    items: [{ recipeSku: 'c5', name: 'Dubai Cookie', variant: 'piece', unitPrice: 130, quantity: 1, lineTotal: 130 }],
    subtotal: 130, total: 130, costTotal: 61, payment: { method: 'gcash' }, deductions: [],
  } }, mockRes());

  const res = mockRes();
  sales.dailyReport({ query: { date: today } }, res);

  assert.strictEqual(res.body.orderCount, 2);
  assert.strictEqual(res.body.totalSales, 450);
  assert.strictEqual(res.body.estProfit, 450 - 181); // total - cost_total
  const cash = res.body.byPayment.find(p => p.method === 'cash');
  assert.strictEqual(cash.amount, 320);
  const top = res.body.byProduct[0];
  assert.strictEqual(top.name, 'Matcha 16oz'); // highest revenue
});
