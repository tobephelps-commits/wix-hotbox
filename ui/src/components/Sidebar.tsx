import './Sidebar.css';

export type TabId = 'products' | 'orders' | 'inventory' | 'customers' | 'system';

interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

const mainTabs: Tab[] = [
  { id: 'products', label: 'Products', icon: '\u{1F4E6}' },   // 📦
  { id: 'orders', label: 'Orders', icon: '\u{1F4CB}' },       // 📋
  { id: 'inventory', label: 'Inventory', icon: '\u{1F3ED}' },  // 🏭
  { id: 'customers', label: 'Customers', icon: '\u{1F465}' },  // 👥
];

const systemTab: Tab = { id: 'system', label: 'System', icon: '\u2699\uFE0F' }; // ⚙️

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const renderTab = (tab: Tab) => (
    <button
      key={tab.id}
      type="button"
      className={`sidebar-tab${activeTab === tab.id ? ' sidebar-tab--active' : ''}`}
      onClick={() => onTabChange(tab.id)}
      aria-current={activeTab === tab.id ? 'page' : undefined}
    >
      <span className="sidebar-tab__icon">{tab.icon}</span>
      <span className="sidebar-tab__label">{tab.label}</span>
    </button>
  );

  return (
    <nav className="sidebar" aria-label="Main navigation">
      <div className="sidebar__main">
        {mainTabs.map(renderTab)}
      </div>
      <div className="sidebar__bottom">
        <div className="sidebar__separator" />
        {renderTab(systemTab)}
      </div>
    </nav>
  );
}

export default Sidebar;
