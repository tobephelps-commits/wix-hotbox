/**
 * InventoryTab -- Main inventory monitoring tab with tracked products,
 * snapshot detail, alert management, and poll trigger.
 *
 * Master-detail layout: left panel (tracked products list with search)
 * and right panel (product snapshot + alerts when selected).
 *
 * Phase 57.1: Remaining Tab UIs (Plan 01)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  TrackedProduct,
  InventorySnapshot,
  SkuSnapshot,
  StockAlert,
  PollPriority,
  AlertType,
  VendorId,
} from './types';
import './InventoryTab.css';

// =============================================================================
// Helpers
// =============================================================================

function relativeTime(iso: string | undefined): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function qtyClass(qty: number, wellStocked: boolean): string {
  if (qty === 0) return 'qty--zero';
  if (!wellStocked && qty <= 10) return 'qty--low';
  return 'qty--ok';
}

const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  'out-of-stock': 'Out of Stock',
  'critical': 'Critical',
  'low-stock': 'Low Stock',
  'back-in-stock': 'Back in Stock',
};

const ALL_ALERT_TYPES: AlertType[] = ['out-of-stock', 'critical', 'low-stock', 'back-in-stock'];

// =============================================================================
// Component
// =============================================================================

function InventoryTab() {
  // --- List state ---
  const [products, setProducts] = useState<TrackedProduct[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<VendorId>('sanmar');
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // --- Add form state ---
  const [addStyle, setAddStyle] = useState('');
  const [addName, setAddName] = useState('');
  const [addVendor, setAddVendor] = useState<VendorId>('sanmar');
  const [addPriority, setAddPriority] = useState<PollPriority>('normal');
  const [adding, setAdding] = useState(false);

  // --- Detail state ---
  const [snapshot, setSnapshot] = useState<InventorySnapshot | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotError, setSnapshotError] = useState(false);

  // --- Alert state ---
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [alertTypeFilter, setAlertTypeFilter] = useState<AlertType | null>(null);
  const [globalAlertCount, setGlobalAlertCount] = useState(0);

  // --- Poll state ---
  const [polling, setPolling] = useState(false);

  // --- Sync health ---
  const [syncRunning, setSyncRunning] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // =========================================================================
  // Fetch products
  // =========================================================================

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch('/api/monitor/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products ?? []);
      }
    } catch {
      // Network error -- keep existing data
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  // =========================================================================
  // Fetch global alert count (unacknowledged)
  // =========================================================================

  const fetchGlobalAlertCount = useCallback(async () => {
    try {
      const res = await fetch('/api/monitor/alerts?limit=200');
      if (res.ok) {
        const data = await res.json();
        const unacked = (data.alerts ?? []).filter((a: StockAlert) => !a.acknowledged);
        setGlobalAlertCount(unacked.length);
      }
    } catch {
      // Silently fail
    }
  }, []);

  // =========================================================================
  // Fetch snapshot for selected product
  // =========================================================================

  const fetchSnapshot = useCallback(async (style: string, vendor: VendorId) => {
    setSnapshotLoading(true);
    setSnapshotError(false);
    setSnapshot(null);
    try {
      const res = await fetch(`/api/monitor/products/${encodeURIComponent(style)}/snapshot?vendor=${vendor}`);
      if (res.ok) {
        const data: InventorySnapshot = await res.json();
        setSnapshot(data);
      } else if (res.status === 404) {
        setSnapshot(null);
      } else {
        setSnapshotError(true);
      }
    } catch {
      setSnapshotError(true);
    } finally {
      setSnapshotLoading(false);
    }
  }, []);

  // =========================================================================
  // Fetch alerts for selected product
  // =========================================================================

  const fetchAlerts = useCallback(async (style: string, typeFilter: AlertType | null) => {
    try {
      const params = new URLSearchParams();
      params.set('style', style);
      if (typeFilter) params.set('type', typeFilter);
      params.set('limit', '50');

      const res = await fetch(`/api/monitor/alerts?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts ?? []);
      }
    } catch {
      // Silently fail
    }
  }, []);

  // =========================================================================
  // Fetch sync health
  // =========================================================================

  const fetchSyncHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/sync/health');
      if (res.ok) {
        const data = await res.json();
        setSyncRunning(data.running ?? false);
        setLastSyncTime(data.health?.lastSuccessAt ?? null);
      }
    } catch {
      // Silently fail
    }
  }, []);

  // =========================================================================
  // Initial load
  // =========================================================================

  useEffect(() => {
    fetchProducts();
    fetchGlobalAlertCount();
    fetchSyncHealth();
  }, [fetchProducts, fetchGlobalAlertCount, fetchSyncHealth]);

  // =========================================================================
  // When selected product changes, fetch its snapshot and alerts
  // =========================================================================

  useEffect(() => {
    if (selectedStyle) {
      fetchSnapshot(selectedStyle, selectedVendor);
      fetchAlerts(selectedStyle, alertTypeFilter);
    }
  }, [selectedStyle, selectedVendor, fetchSnapshot, fetchAlerts, alertTypeFilter]);

  // =========================================================================
  // Handlers
  // =========================================================================

  const handleSelectProduct = useCallback((product: TrackedProduct) => {
    setSelectedStyle(product.style);
    setSelectedVendor(product.vendor);
    setAlertTypeFilter(null);
  }, []);

  const handleSearchChange = useCallback((text: string) => {
    setSearch(text);
  }, []);

  const handleAddProduct = useCallback(async () => {
    if (!addStyle.trim() || !addName.trim()) return;
    setAdding(true);
    try {
      const res = await fetch('/api/monitor/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          style: addStyle.trim(),
          name: addName.trim(),
          vendor: addVendor,
          priority: addPriority,
        }),
      });
      if (res.ok) {
        setAddStyle('');
        setAddName('');
        setAddVendor('sanmar');
        setAddPriority('normal');
        setShowAddForm(false);
        await fetchProducts();
      }
    } catch {
      // Network error
    } finally {
      setAdding(false);
    }
  }, [addStyle, addName, addVendor, addPriority, fetchProducts]);

  const handleDeleteProduct = useCallback(async (style: string, vendor: VendorId) => {
    if (!confirm(`Remove "${style}" from tracking?`)) return;
    try {
      const res = await fetch(`/api/monitor/products/${encodeURIComponent(style)}?vendor=${vendor}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        if (selectedStyle === style) {
          setSelectedStyle(null);
          setSnapshot(null);
          setAlerts([]);
        }
        await fetchProducts();
      }
    } catch {
      // Network error
    }
  }, [selectedStyle, fetchProducts]);

  const handlePriorityChange = useCallback(async (style: string, vendor: VendorId, priority: PollPriority) => {
    try {
      await fetch(`/api/monitor/products/${encodeURIComponent(style)}?vendor=${vendor}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority }),
      });
      await fetchProducts();
    } catch {
      // Network error
    }
  }, [fetchProducts]);

  const handleAcknowledgeAlert = useCallback(async (alertId: number) => {
    try {
      const res = await fetch(`/api/monitor/alerts/${alertId}/acknowledge`, { method: 'POST' });
      if (res.ok) {
        setAlerts((prev) => prev.map((a) => a.id === alertId ? { ...a, acknowledged: true } : a));
        fetchGlobalAlertCount();
      }
    } catch {
      // Network error
    }
  }, [fetchGlobalAlertCount]);

  const handlePollNow = useCallback(async () => {
    setPolling(true);
    try {
      await fetch('/api/monitor/poll', { method: 'POST' });
      // Refresh everything
      await Promise.all([
        fetchProducts(),
        fetchGlobalAlertCount(),
        ...(selectedStyle ? [fetchSnapshot(selectedStyle, selectedVendor), fetchAlerts(selectedStyle, alertTypeFilter)] : []),
      ]);
    } catch {
      // Network error
    } finally {
      setPolling(false);
    }
  }, [selectedStyle, selectedVendor, alertTypeFilter, fetchProducts, fetchGlobalAlertCount, fetchSnapshot, fetchAlerts]);

  const handleAlertTypeFilterChange = useCallback((type: AlertType | null) => {
    setAlertTypeFilter(type);
  }, []);

  // =========================================================================
  // Filter products by search
  // =========================================================================

  const filteredProducts = search.trim()
    ? products.filter((p) => {
        const q = search.toLowerCase();
        return p.style.toLowerCase().includes(q) || p.name.toLowerCase().includes(q);
      })
    : products;

  // =========================================================================
  // Group snapshot SKUs by color
  // =========================================================================

  const selectedProduct = products.find(
    (p) => p.style === selectedStyle && p.vendor === selectedVendor,
  );

  const groupedSkus: Record<string, SkuSnapshot[]> = {};
  const sizeColumns: string[] = [];
  if (snapshot?.skus) {
    const sizeSet = new Set<string>();
    for (const sku of snapshot.skus) {
      sizeSet.add(sku.size);
      if (!groupedSkus[sku.color]) groupedSkus[sku.color] = [];
      groupedSkus[sku.color].push(sku);
    }
    // Common size order
    const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL'];
    const sorted = Array.from(sizeSet).sort((a, b) => {
      const ia = sizeOrder.indexOf(a);
      const ib = sizeOrder.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b);
    });
    sizeColumns.push(...sorted);
  }

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className="inventory-layout">
      {/* ================================================================
        * LEFT PANEL -- Tracked products list
        * ================================================================ */}
      <div className="inventory-layout__list-panel">
        {/* Header */}
        <div className="inventory-header">
          <h2 className="inventory-header__title">
            Inventory
            {globalAlertCount > 0 && (
              <span className="inventory-header__alert-badge">{globalAlertCount}</span>
            )}
          </h2>
          <div className="inventory-header__actions">
            <span className="inventory-header__sync-status">
              <span
                className={`inventory-header__sync-dot inventory-header__sync-dot--${syncRunning ? 'running' : 'stopped'}`}
                title={syncRunning ? `Sync running (last: ${relativeTime(lastSyncTime ?? undefined)})` : 'Sync daemon stopped'}
              />
            </span>
            <button
              className="inventory-header__btn inventory-header__btn--secondary"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              {showAddForm ? 'Cancel' : '+ Add'}
            </button>
            <button
              className="inventory-header__btn"
              onClick={handlePollNow}
              disabled={polling}
            >
              {polling && <span className="inventory-header__spinner" />}
              {polling ? 'Polling...' : 'Poll Now'}
            </button>
          </div>
        </div>

        {/* Add product form */}
        {showAddForm && (
          <div className="add-product-form">
            <div className="add-product-form__row">
              <input
                className="add-product-form__input"
                placeholder="Style # (e.g., PC61)"
                value={addStyle}
                onChange={(e) => setAddStyle(e.target.value)}
              />
              <input
                className="add-product-form__input"
                placeholder="Product name"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
              />
            </div>
            <div className="add-product-form__row">
              <select
                className="add-product-form__select"
                value={addVendor}
                onChange={(e) => setAddVendor(e.target.value as VendorId)}
              >
                <option value="sanmar">SanMar</option>
                <option value="ssactivewear">S&S Activewear</option>
              </select>
              <div className="add-product-form__priority-selector">
                {(['hot', 'normal', 'slow'] as PollPriority[]).map((p) => (
                  <button
                    key={p}
                    className={`add-product-form__priority-btn${addPriority === p ? ' add-product-form__priority-btn--active' : ''}`}
                    onClick={() => setAddPriority(p)}
                    type="button"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="add-product-form__actions">
              <button
                className="add-product-form__cancel"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </button>
              <button
                className="add-product-form__submit"
                onClick={handleAddProduct}
                disabled={adding || !addStyle.trim() || !addName.trim()}
              >
                {adding ? 'Adding...' : 'Add Product'}
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="inventory-search">
          <input
            className="inventory-search__input"
            placeholder="Search by style or name..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        {/* Product list */}
        <div className="inventory-list">
          {filteredProducts.length === 0 && !loadingProducts && (
            <div className="inventory-empty">
              <div className="inventory-empty__title">
                {search ? 'No matching products' : 'No tracked products'}
              </div>
              <div className="inventory-empty__text">
                {search ? 'Try a different search term' : 'Add a product to start monitoring inventory'}
              </div>
            </div>
          )}
          {filteredProducts.map((product) => (
            <button
              key={`${product.vendor}-${product.style}`}
              className={`tracked-product-item${selectedStyle === product.style && selectedVendor === product.vendor ? ' tracked-product-item--selected' : ''}`}
              onClick={() => handleSelectProduct(product)}
            >
              <div className="tracked-product-item__main">
                <div className="tracked-product-item__top">
                  <span className="tracked-product-item__style">{product.style}</span>
                  <span className={`vendor-badge vendor-badge--${product.vendor}`}>
                    {product.vendor === 'sanmar' ? 'SanMar' : 'S&S'}
                  </span>
                  <span className={`priority-badge priority-badge--${product.priority}`}>
                    {product.priority}
                  </span>
                </div>
                <div className="tracked-product-item__name">{product.name}</div>
                <div className="tracked-product-item__bottom">
                  <span>Polled {relativeTime(product.lastPolledAt)}</span>
                </div>
              </div>
              <button
                className="tracked-product-item__delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteProduct(product.style, product.vendor);
                }}
                title="Remove from tracking"
              >
                &times;
              </button>
            </button>
          ))}
        </div>
      </div>

      {/* ================================================================
        * RIGHT PANEL -- Product detail
        * ================================================================ */}
      <div className="inventory-layout__detail-panel">
        {!selectedStyle ? (
          <div className="inventory-detail__empty">
            Select a product to view inventory
          </div>
        ) : snapshotLoading ? (
          <div className="inventory-detail__loading">Loading snapshot...</div>
        ) : (
          <div className="inventory-detail">
            {/* Product header */}
            {selectedProduct && (
              <>
                <div className="inventory-detail__header">
                  <span className="inventory-detail__product-name">{selectedProduct.name}</span>
                  <span className="inventory-detail__style">{selectedProduct.style}</span>
                  <span className={`vendor-badge vendor-badge--${selectedProduct.vendor}`}>
                    {selectedProduct.vendor === 'sanmar' ? 'SanMar' : 'S&S'}
                  </span>
                  <div className="inventory-detail__priority-edit">
                    {(['hot', 'normal', 'slow'] as PollPriority[]).map((p) => (
                      <button
                        key={p}
                        className={`inventory-detail__priority-btn${selectedProduct.priority === p ? ' inventory-detail__priority-btn--active' : ''}`}
                        onClick={() => handlePriorityChange(selectedProduct.style, selectedProduct.vendor, p)}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Snapshot section */}
                <div className="inventory-detail__section">
                  <div className="inventory-detail__section-title">Inventory Snapshot</div>
                  <div className="inventory-detail__card">
                    {snapshotError ? (
                      <div className="snapshot-empty">Error loading snapshot</div>
                    ) : !snapshot || !snapshot.skus || snapshot.skus.length === 0 ? (
                      <div className="snapshot-empty">No snapshot available. Run a poll to fetch inventory data.</div>
                    ) : (
                      <>
                        <table className="snapshot-table">
                          <thead>
                            <tr>
                              <th>Color</th>
                              {sizeColumns.map((size) => (
                                <th key={size}>{size}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(groupedSkus).map(([color, skus]) => (
                              <tr key={color}>
                                <td className="snapshot-table__color-label">{color}</td>
                                {sizeColumns.map((size) => {
                                  const sku = skus.find((s) => s.size === size);
                                  if (!sku) {
                                    return <td key={size}>-</td>;
                                  }
                                  return (
                                    <td key={size} className={qtyClass(sku.totalQty, sku.wellStocked)}>
                                      {sku.totalQty}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="snapshot-table__timestamp">
                          Snapshot from {relativeTime(snapshot.timestamp)}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Alerts section */}
                <div className="inventory-detail__section">
                  <div className="inventory-detail__section-title">Alerts</div>
                  <div className="inventory-alerts__filters">
                    <button
                      className={`inventory-alert-pill${alertTypeFilter === null ? ' inventory-alert-pill--active' : ''}`}
                      onClick={() => handleAlertTypeFilterChange(null)}
                    >
                      All
                    </button>
                    {ALL_ALERT_TYPES.map((type) => (
                      <button
                        key={type}
                        className={`inventory-alert-pill${alertTypeFilter === type ? ' inventory-alert-pill--active' : ''}`}
                        onClick={() => handleAlertTypeFilterChange(type)}
                      >
                        {ALERT_TYPE_LABELS[type]}
                      </button>
                    ))}
                  </div>
                  <div className="inventory-detail__card">
                    {alerts.length === 0 ? (
                      <div className="inventory-alerts-empty">No alerts for this product</div>
                    ) : (
                      alerts.map((alert) => (
                        <div
                          key={alert.id}
                          className={`inventory-alert-item${alert.acknowledged ? ' inventory-alert-item--acknowledged' : ''}`}
                        >
                          <span className={`alert-type-badge alert-type-badge--${alert.type}`}>
                            {ALERT_TYPE_LABELS[alert.type]}
                          </span>
                          <div className="inventory-alert-item__content">
                            <div className="inventory-alert-item__top">
                              <span className="inventory-alert-item__detail">
                                {alert.color} / {alert.size}
                              </span>
                              <span className="inventory-alert-item__qty-change">
                                {alert.previousQty} &rarr; {alert.currentQty}
                              </span>
                            </div>
                            <div className="inventory-alert-item__time">
                              {relativeTime(alert.timestamp)}
                            </div>
                          </div>
                          {!alert.acknowledged && (
                            <button
                              className="inventory-alert-item__ack-btn"
                              onClick={() => handleAcknowledgeAlert(alert.id)}
                            >
                              Acknowledge
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default InventoryTab;
