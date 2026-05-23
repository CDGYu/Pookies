import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AppHeader } from './components/AppHeader';
import { RegisterPage } from './routes/RegisterPage';
import { ManagerLayout } from './routes/ManagerLayout';
import { SalesReportPage } from './routes/manager/SalesReportPage';
import { StockPage } from './routes/manager/StockPage';
import { CostingPage } from './routes/manager/CostingPage';
import { CartProvider } from './state/CartContext';
import { ReceiptPage } from './routes/ReceiptPage';
import '../styles/fonts.css';

export default function App() {
  return (
    <BrowserRouter>
      <div className="size-full min-h-screen" style={{ background: 'var(--cream)', fontFamily: "'DM Sans', sans-serif" }}>
        <AppHeader />
        <Routes>
          <Route path="/" element={<CartProvider><RegisterPage /></CartProvider>} />
          <Route path="/receipt/:id" element={<ReceiptPage />} />
          <Route path="/manager" element={<ManagerLayout />}>
            <Route index element={<Navigate to="/manager/sales" replace />} />
            <Route path="sales" element={<SalesReportPage />} />
            <Route path="stock" element={<StockPage />} />
            <Route path="costing" element={<CostingPage />} />
          </Route>
        </Routes>
      </div>
    </BrowserRouter>
  );
}
