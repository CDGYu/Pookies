const test = require('node:test');
const assert = require('node:assert');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

const TMP = path.join(os.tmpdir(), `pookies_schema_${Date.now()}.db`);
process.env.POOKIES_DB_PATH = TMP;

const { getDb, closeDb } = require('../db/database');

test.after(() => { closeDb(); try { fs.unlinkSync(TMP); } catch {} });

test('sales and sale_items tables exist', () => {
  const db = getDb();
  const names = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table'"
  ).all().map(r => r.name);
  assert.ok(names.includes('sales'), 'sales table missing');
  assert.ok(names.includes('sale_items'), 'sale_items table missing');
});
