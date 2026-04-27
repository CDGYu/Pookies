/**
 * server.js — Pookies Inventory Management System — Express Entry Point
 *
 * ERN Stack (Express, React, Node.js) + SQLite (better-sqlite3)
 * Local, offline, no external database server required.
 *
 * Start: node server.js   or   npm start
 * Port:  3001 (configured via PORT env variable)
 *
 * Startup sequence:
 *   1. Connect to / initialise pookies_inventory.db (auto-creates on first run)
 *   2. Run 30-day retention cleanup (inventory_logs + /Logs/ files)
 *   3. Start Express server on PORT
 *
 * Install dependencies before first run:
 *   npm install express better-sqlite3 multer cors dotenv
 *
 * Directory structure created automatically:
 *   /backend/Receipts/         — uploaded receipt images
 *   /backend/Logs/             — daily activity JSON files
 *   /backend/pookies_inventory.db — SQLite database
 */

'use strict';

require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const { getDb }           = require('./db/database');
const { runStartupCleanup } = require('./middleware/cleanupWorker');

const app  = express();
const PORT = process.env.PORT ?? 3001;

// ── Middleware ─────────────────────────────────────────────────────────────────

app.use(cors({
  // Allow the Vite dev server (default port 5173) and any production origin
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve receipt images statically so the frontend can display them
app.use(
  '/Receipts',
  express.static(path.join(__dirname, 'Receipts'))
);

// ── Request logger (development only) ─────────────────────────────────────────

if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ── Routes ─────────────────────────────────────────────────────────────────────

app.use('/api/inventory', require('./routes/inventory'));

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status:  'ok',
    service: 'Pookies Inventory Management System',
    db:      'SQLite (pookies_inventory.db)',
    time:    new Date().toISOString(),
  });
});

// 404 catch-all
app.use((_req, res) => {
  res.status(404).json({ message: 'Endpoint not found.' });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('[Server Error]', err.message);
  res.status(err.status ?? 500).json({
    message: err.message ?? 'Internal server error.',
  });
});

// ── Startup ────────────────────────────────────────────────────────────────────

function start() {
  // Step 1: Initialise SQLite database (creates file + schema + seeds on first run)
  try {
    getDb();
    console.log('[Server] SQLite database ready.');
  } catch (err) {
    console.error('[Server] FATAL — database initialisation failed:', err.message);
    process.exit(1);
  }

  // Step 2: Run 30-day data retention cleanup (synchronous, runs once at startup)
  try {
    runStartupCleanup();
  } catch (err) {
    // Non-fatal — log and continue
    console.error('[Server] Cleanup worker error:', err.message);
  }

  // Step 3: Start Express
  app.listen(PORT, () => {
    console.log(`[Server] Pookies Inventory API running on http://localhost:${PORT}`);
    console.log(`[Server] Health check: http://localhost:${PORT}/health`);
  });
}

start();

module.exports = app; // exported for testing
