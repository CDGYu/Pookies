'use strict';
// Populates realistic starting stock so the POS is usable immediately.
// Safe to re-run: it only UPDATEs current_stock of seeded ingredients.
const { getDb, closeDb } = require('./db/database');

const STARTING_STOCK = {
  flour: 25000, brownSugar: 2000, whiteSugar: 2000, bakingSoda: 500, salt: 1000,
  vanillaExtract: 60, espressoPowder: 60, chocolateBar: 2000, chocoChips: 1000,
  foodColoring: 60, cocoaPowder: 500, grahamCrackers: 420, marshmallow: 2000,
  whiteChoco: 2000, seaSalt: 500, egg: 36, eggYolk: 24, margarine: 600,
  creamCheese: 4000, butter: 400, adoleafMatcha: 270, kataifi: 1000, pistachio: 500,
  oatside: 3000, condensada: 1090, packagingBox: 150, liner: 500,
  cup12oz: 150, cup16oz: 100, straw: 300,
};

const db = getDb();
const upd = db.prepare('UPDATE ingredients SET current_stock = ? WHERE id = ?');
let n = 0;
const tx = db.transaction(() => {
  for (const [id, qty] of Object.entries(STARTING_STOCK)) n += upd.run(qty, id).changes;
});
tx();
console.log(`[seed] starting stock applied to ${n} ingredient(s).`);
closeDb();
