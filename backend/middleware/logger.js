/**
 * logger.js — Daily Activity Log Writer
 *
 * Writes inventory events to daily JSON files in the /Logs/ directory.
 * Each file represents one calendar day and is named:
 *
 *   YYYY-MM-DD_activity.json  (e.g. 2026-04-27_activity.json)
 *
 * File format:
 * {
 *   "date": "2026-04-27",
 *   "entries": [
 *     {
 *       "timestamp":   "2026-04-27T11:52:00.000Z",
 *       "type":        "SALE" | "RESTOCK" | "ADJUSTMENT",
 *       "saleId":      "abc-123" | null,
 *       "deductions":  [{ "ingredientId": "flour", "amount": 13.8889, "unit": "g" }]
 *     }
 *   ]
 * }
 *
 * Files are append-safe: if the file already exists for today, the new entry
 * is appended to the `entries` array. If not, a new file is created.
 *
 * Files older than 30 days are deleted at server startup by cleanupWorker.js.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { LOGS_DIR } = require('./cleanupWorker');

/**
 * logActivity
 *
 * Appends one activity entry to today's log file.
 *
 * @param {Object} entry
 * @param {'SALE'|'RESTOCK'|'ADJUSTMENT'} entry.type
 * @param {string|null} entry.saleId
 * @param {Array}  entry.items  - array of { ingredientId, amount, unit }
 */
function logActivity(entry) {
  try {
    const now       = new Date();
    const dateKey   = now.toISOString().split('T')[0]; // '2026-04-27'
    const logFile   = path.join(LOGS_DIR, `${dateKey}_activity.json`);

    let logData;

    if (fs.existsSync(logFile)) {
      const raw = fs.readFileSync(logFile, 'utf8');
      logData = JSON.parse(raw);
    } else {
      logData = { date: dateKey, entries: [] };
    }

    logData.entries.push({
      timestamp: now.toISOString(),
      type:      entry.type,
      saleId:    entry.saleId ?? null,
      items:     entry.items ?? [],
    });

    fs.writeFileSync(logFile, JSON.stringify(logData, null, 2), 'utf8');
  } catch (err) {
    // Logging failure must never crash the main request flow
    console.error('[Logger] Failed to write activity log:', err.message);
  }
}

module.exports = { logActivity };
