import './App.css';

function App() {
  return (
    <div className="app-layout">
      <header className="app-header">
        <span className="app-header__title">HotBox</span>
        <span className="app-header__status">System Ready</span>
      </header>

      <aside className="app-sidebar">
        <div className="app-sidebar__label">Navigation</div>
      </aside>

      <main className="app-content">
        <div className="app-content__placeholder">
          Select a tab to get started
        </div>
      </main>
    </div>
  );
}

export default App;
