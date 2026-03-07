import { useState, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ContentArea from './components/ContentArea';
import type { TabId } from './components/Sidebar';
import './App.css';

const STORAGE_KEY = 'hotbox-active-tab';

function getInitialTab(): TabId {
  const stored = localStorage.getItem(STORAGE_KEY);
  const valid: TabId[] = ['products', 'orders', 'inventory', 'customers', 'system'];
  if (stored && valid.includes(stored as TabId)) {
    return stored as TabId;
  }
  return 'products';
}

function App() {
  const [activeTab, setActiveTab] = useState<TabId>(getInitialTab);

  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab);
    localStorage.setItem(STORAGE_KEY, tab);
  }, []);

  return (
    <div className="app-layout">
      <header className="app-header">
        <span className="app-header__title">HotBox</span>
        <span className="app-header__status">System Ready</span>
      </header>

      <aside className="app-sidebar">
        <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />
      </aside>

      <main className="app-content">
        <ContentArea activeTab={activeTab} />
      </main>
    </div>
  );
}

export default App;
