'use strict';

const { getDb, p4 } = require('../db/database');

function createSale(req, res) {
  const { saleNumber, items, subtotal, discount = 0, total, costTotal = 0,
          payment = {}, deductions = [] } = req.body || {};

  if (!saleNumber || !Array.isArray(items) || items.length === 0 ||
      typeof total !== 'number' || !payment.method) {
    return res.status(422).json({
      message: 'Invalid payload: saleNumber, items[], total and payment.method are required.',
    });
  }

  const db = getDb();

  // Idempotency — sale already recorded?
  const existing = db.prepare('SELECT * FROM sales WHERE sale_number = ?').get(saleNumber);
  if (existing) {
    return res.json({ status: 'already_applied', sale: rowToSale(db, existing), criticalAlerts: [] });
  }

  const createdAt = new Date().toISOString();
  const criticalAlerts = [];

  const insertSale = db.prepare(`
    INSERT INTO sales
      (sale_number, created_at, subtotal, discount, total, cost_total,
       payment_method, amount_tendered, change_due, cash_amount, ewallet_amount, reference_no, receipt_image)
    VALUES (@sale_number,@created_at,@subtotal,@discount,@total,@cost_total,
            @payment_method,@amount_tendered,@change_due,@cash_amount,@ewallet_amount,@reference_no,NULL)
  `);
  const insertItem = db.prepare(`
    INSERT INTO sale_items
      (sale_id, recipe_sku, name, variant, unit_price, quantity, line_total, customization_label)
    VALUES (?,?,?,?,?,?,?,?)
  `);
  const getIng = db.prepare('SELECT id,name,current_stock,unit FROM ingredients WHERE id = ?');
  const updIng = db.prepare('UPDATE ingredients SET current_stock = ROUND(current_stock - ?, 4) WHERE id = ?');
  const logDed = db.prepare(`INSERT INTO inventory_logs (ingredient_id, change_amount, type, sale_id, log_date)
                             VALUES (?,?, 'SALE', ?, ?)`);

  const tx = db.transaction(() => {
    const info = insertSale.run({
      sale_number: saleNumber,
      created_at: createdAt,
      subtotal: p4(subtotal),
      discount: p4(discount),
      total: p4(total),
      cost_total: p4(costTotal),
      payment_method: payment.method,
      amount_tendered: payment.amountTendered ?? null,
      change_due: payment.changeDue ?? null,
      cash_amount: p4(payment.cashAmount ?? 0),
      ewallet_amount: p4(payment.ewalletAmount ?? 0),
      reference_no: payment.referenceNo ?? null,
    });
    const saleId = info.lastInsertRowid;

    for (const it of items) {
      insertItem.run(saleId, it.recipeSku, it.name, it.variant ?? null,
        p4(it.unitPrice), it.quantity, p4(it.lineTotal), it.customizationLabel ?? null);
    }

    for (const d of deductions) {
      const amount = p4(parseFloat(d.totalAmount));
      const row = getIng.get(d.ingredientId);
      if (!row) continue;
      updIng.run(amount, d.ingredientId);
      logDed.run(d.ingredientId, -amount, saleNumber, createdAt);
      const newStock = p4(row.current_stock - amount);
      if (newStock <= 0) {
        criticalAlerts.push({ ingredientId: d.ingredientId, name: row.name,
          previousStock: p4(row.current_stock), currentStock: newStock, unit: row.unit });
      }
    }
    return saleId;
  });

  try {
    const saleId = tx();
    const saved = db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId);
    return res.status(201).json({
      status: criticalAlerts.length ? 'ok_with_critical_alerts' : 'ok',
      sale: rowToSale(db, saved),
      criticalAlerts,
    });
  } catch (err) {
    console.error('[createSale]', err.message);
    return res.status(500).json({ message: 'Failed to record sale.' });
  }
}

function rowToSale(db, row) {
  const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(row.id).map(i => ({
    recipeSku: i.recipe_sku, name: i.name, variant: i.variant,
    unitPrice: p4(i.unit_price), quantity: i.quantity, lineTotal: p4(i.line_total),
    customizationLabel: i.customization_label,
  }));
  return {
    id: row.id, saleNumber: row.sale_number, createdAt: row.created_at,
    subtotal: p4(row.subtotal), discount: p4(row.discount), total: p4(row.total),
    costTotal: p4(row.cost_total),
    payment: {
      method: row.payment_method, amountTendered: row.amount_tendered, changeDue: row.change_due,
      cashAmount: p4(row.cash_amount), ewalletAmount: p4(row.ewallet_amount), referenceNo: row.reference_no,
    },
    receiptImage: row.receipt_image,
    items,
  };
}

module.exports = { createSale, rowToSale };
