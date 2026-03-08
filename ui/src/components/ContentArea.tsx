import type { TabId } from './Sidebar';
import ProductsTab from './products/ProductsTab';
import OrdersTab from './orders/OrdersTab';
import InventoryTab from './inventory/InventoryTab';
import CustomersTab from './customers/CustomersTab';
import SystemTab from './system/SystemTab';

interface ContentAreaProps {
  activeTab: TabId;
}

function ContentArea({ activeTab }: ContentAreaProps) {
  if (activeTab === 'products') return <ProductsTab />;
  if (activeTab === 'orders') return <OrdersTab />;
  if (activeTab === 'inventory') return <InventoryTab />;
  if (activeTab === 'customers') return <CustomersTab />;
  if (activeTab === 'system') return <SystemTab />;

  // All tabs are handled above; this satisfies the return type
  return null;
}

export default ContentArea;
