import { ProductCatalog } from '../components/register/ProductCatalog';
import { OrderPanel } from '../components/register/OrderPanel';

export function RegisterPage() {
  return (
    <main className="max-w-7xl mx-auto px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 items-start">
        <ProductCatalog />
        <div className="lg:sticky lg:top-6 h-[calc(100vh-7rem)]">
          <OrderPanel onCharge={() => alert('Payment is added in the next step.')} />
        </div>
      </div>
    </main>
  );
}
