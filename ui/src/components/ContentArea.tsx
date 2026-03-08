import type { TabId } from './Sidebar';
import ProductsTab from './products/ProductsTab';
import OrdersTab from './orders/OrdersTab';
import InventoryTab from './inventory/InventoryTab';

const tabInfo: Record<TabId, { label: string; phase: string }> = {
  products: { label: 'Products', phase: 'Phase 47' },
  orders: { label: 'Orders', phase: 'Phase 49' },
  inventory: { label: 'Inventory', phase: 'Phase 51' },
  customers: { label: 'Customers', phase: 'Phase 53' },
  system: { label: 'System', phase: 'Phase 44' },
};

interface ContentAreaProps {
  activeTab: TabId;
}

function ContentArea({ activeTab }: ContentAreaProps) {
  if (activeTab === 'products') {
    return <ProductsTab />;
  }

  if (activeTab === 'orders') {
    return <OrdersTab />;
  }

  if (activeTab === 'inventory') {
    return <InventoryTab />;
  }

  const info = tabInfo[activeTab];

  return (
    <div className="app-content__placeholder">
      <div>
        <div style={{ fontSize: '1.5rem', marginBottom: '8px', color: 'var(--color-text)' }}>
          {info.label}
        </div>
        <div style={{ color: 'var(--color-text-muted)' }}>
          Coming in {info.phase}
        </div>
      </div>
    </div>
  );
}

export default ContentArea;
