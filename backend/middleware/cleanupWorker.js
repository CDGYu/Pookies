/**
 * cleanupWorker.js — Pookies 30-Day Data Retention Engine
 *
 * Enforces a strict 30-day rolling retention policy.
 * RUNS ONCE AT APP STARTUP — not a cron job. This keeps the local SQLite
 * database lightweight and prevents the /Logs/ directory from growing unbounded.
 *
 * Called from server.js immediately after the DB connection is established:
 *
 *   const { runStartupCleanup } = require('./middleware/cleanupWorker');
 *   runStartupCleanup();
 *
 * What it does:
 *   1. Deletes rows from inventory_logs where log_date < (TODAY - 30 DAYS)
 *   2. Scans /Logs/ and permanently deletes any .json activity files whose
 *      date prefix (YYYY-MM-DD) is older than the 30-day cutoff
 *
 * The confirmed_data column in receipt_uploads is NOT purged — it holds
 * permanent audit snapshots of every confirmed restock, retained indefinitely.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { getDb } = require('../db/database');

const RETENTION_DAYS = 30;
const LOGS_DIR = path.join(__dirname, '..', 'Logs');

// ── Ensure /Logs/ directory exists ────────────────────────────────────────────

if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * runStartupCleanup
 *
 * Executes both cleanup phases synchronously. Called once during server boot.
 * Logs results to the console; errors are caught and logged without crashing.
 */
function runStartupCleanup() {
  console.log('[CleanupWorker] Running 30-day retention cleanup...');

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const cutoffIso  = cutoff.toISOString();           // e.g. '2026-03-28T00:00:00.000Z'
  const cutoffDate = cutoff.toISOString().split('T')[0]; // e.g. '2026-03-28'

  let dbDeleted   = 0;
  let fileDeleted = 0;

  // ── Phase 1: SQLite inventory_logs cleanup ───────────────────────────────

  try {
    const db = getDb();

    const result = db
      .prepare(`DELETE FROM inventory_logs WHERE log_date < ?`)
      .run(cutoffIso);

    dbDeleted = result.changes;

    if (dbDeleted > 0) {
      console.log(`[CleanupWorker] Deleted ${dbDeleted} expired log record(s) from SQLite.`);
    } else {
      console.log('[CleanupWorker] SQLite: no expired records found.');
    }
  } catch (err) {
    console.error('[CleanupWorker] SQLite cleanup error:', err.message);
  }

  // ── Phase 2: Physical /Logs/ file cleanup ─────────────────────────────────

  try {
    const files = fs.readdirSync(LOGS_DIR);

    for (const filename of files) {
      // Activity log files are named: YYYY-MM-DD_activity.json
      // Extract the date prefix and compare against the cutoff.
      const match = filename.match(/^(\d{4}-\d{2}-\d{2})_activity\.json$/);
      if (!match) continue;

      const fileDate = match[1]; // e.g. '2026-03-15'

      if (fileDate < cutoffDate) {
        // String comparison works correctly for ISO date format
        const filePath = path.join(LOGS_DIR, filename);
        fs.unlinkSync(filePath);
        fileDeleted++;
        console.log(`[CleanupWorker] Deleted expired log file: ${filename}`);
      }
    }

    if (fileDeleted === 0) {
      console.log('[CleanupWorker] /Logs/: no expired files found.');
    }
  } catch (err) {
    console.error('[CleanupWorker] /Logs/ cleanup error:', err.message);
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  const cutoffReadable = cutoff.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  console.log(
    `[CleanupWorker] Done. Cutoff: ${cutoffReadable} ` +
    `(${RETENTION_DAYS}-day window). ` +
    `DB rows deleted: ${dbDeleted}. Log files deleted: ${fileDeleted}.`
  );
}

module.exports = { runStartupCleanup, RETENTION_DAYS, LOGS_DIR };
