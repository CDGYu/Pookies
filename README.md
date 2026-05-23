# Pookies POS

A point-of-sale application for the Pookies cookie & matcha café. Cashiers ring up
orders on the **Register**; each sale deducts ingredients from inventory. The
**Manager** area covers stock, sales reports, and product costing.

## Stack
- Frontend: React 18 + TypeScript + Vite + Tailwind v4 + shadcn/ui + React Router 7
- Backend: Express + SQLite (better-sqlite3)
- Tests: Vitest (frontend), node:test (backend)

## Prerequisites
- Node.js >= 18

## Run (two terminals)

Terminal 1 — backend API on http://localhost:3001:

    cd backend
    npm install
    npm run seed     # one-time: load realistic starting stock
    npm start        # or: npm run dev (auto-restart)

Terminal 2 — frontend on http://localhost:5173:

    npm install
    npm run dev

Open http://localhost:5173. The backend must be running first.

## Tests

    npm run test                       # frontend (Vitest)
    node --test backend/__tests__      # backend

## Features
- **Register** (`/`): product catalog (cookies, drinks, boxes & bundles), variant
  picker, build-your-own Mixed Box, cart, payment (cash/GCash/card/split), on-screen
  receipt saved as an image.
- **Manager** (`/manager`): Sales & daily report, Stock + restock (receipt upload),
  Product Costing.
- Reprint any sale at `/receipt/:id`.

## Notes
- Ingredient deductions are never blocked; stock may go negative and is flagged Critical.
- Sales are stored permanently; ingredient transaction logs are purged after 30 days.
- Provisional product prices live in `src/app/data/catalog.ts`.
