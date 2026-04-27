/**
 * Pookies Inventory Management System
 *
 * POS Integration usage example:
 *
 *   import { InventoryDashboard } from './components/InventoryDashboard';
 *
 *   // In your POS App.tsx, when a sale completes:
 *   const [syncSignal, setSyncSignal] = useState<POSSyncSignal | undefined>();
 *
 *   const handleSaleComplete = (saleId: string, recipe: Recipe) => {
 *     setSyncSignal({
 *       id: saleId,
 *       deductions: buildDeductionMap(recipe), // map ingredientId -> amount consumed
 *     });
 *   };
 *
 *   return <InventoryDashboard posSyncSignal={syncSignal} />;
 */

import { InventoryDashboard } from './components/InventoryDashboard';
import '../styles/fonts.css';

export default function App() {
  return (
    <div
      className="size-full min-h-screen"
      style={{ background: '#FEF9F2', fontFamily: "'DM Sans', sans-serif" }}
    >
      <InventoryDashboard />
    </div>
  );
}
