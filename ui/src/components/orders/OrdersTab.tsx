/**
 * OrdersTab -- Main orders tab container managing list/detail state.
 *
 * Master-detail layout: left panel (order list with filters)
 * and right panel (order detail when selected).
 * Supports list and pipeline (kanban) view modes.
 *
 * Phase 50: Order Management Advanced (Plan 02, Plan 03)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import OrderList from './OrderList';
import OrderDetail from './OrderDetail';
import OrderCreateForm from './OrderCreateForm';
import PipelineView from './PipelineView';
import BulkToolbar from './BulkToolbar';
import type { OrderStatus } from './types';
import type { OrderListItem, OrderSummary } from './OrderList';
import './OrdersTab.css';

type ViewMode = 'list' | 'pipeline';

const PAGE_SIZE = 50;

function OrdersTab() {
  // View mode persisted in localStorage
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      const saved = localStorage.getItem('orders-view-mode');
      return saved === 'pipeline' ? 'pipeline' : 'list';
    } catch {
      return 'list';
    }
  });

  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState<OrderSummary | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [offset, setOffset] = useState(0);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Multi-select handlers
  const handleToggleSelect = useCallback((id: string) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedOrderIds(new Set(orders.map((o) => o.id)));
  }, [orders]);

  const handleDeselectAll = useCallback(() => {
    setSelectedOrderIds(new Set());
  }, []);

  // Persist view mode
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('orders-view-mode', mode);
    } catch {
      // localStorage unavailable
    }
  }, []);

  // Debounce timer ref for search
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch summary for status count badges
  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/orders/summary');
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch {
      // Silently fail; summary is supplementary
    }
  }, []);

  // Fetch orders list
  const fetchOrders = useCallback(async (
    filterStatus: OrderStatus | null,
    searchText: string,
    pageOffset: number,
    append: boolean,
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (searchText) params.set('search', searchText);
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(pageOffset));

      const res = await fetch(`/api/orders?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (append) {
          setOrders((prev) => [...prev, ...data.orders]);
        } else {
          setOrders(data.orders);
        }
        setTotalCount(data.totalCount);
      }
    } catch {
      // Network error — keep existing data
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchSummary();
    fetchOrders(null, '', 0, false);
  }, [fetchSummary, fetchOrders]);

  // Status filter change
  const handleStatusFilterChange = useCallback((status: OrderStatus | null) => {
    setStatusFilter(status);
    setOffset(0);
    fetchOrders(status, search, 0, false);
  }, [search, fetchOrders]);

  // Search change with debounce
  const handleSearchChange = useCallback((text: string) => {
    setSearch(text);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setOffset(0);
      fetchOrders(statusFilter, text, 0, false);
    }, 300);
  }, [statusFilter, fetchOrders]);

  // Load more (pagination)
  const handleLoadMore = useCallback(() => {
    const nextOffset = offset + PAGE_SIZE;
    setOffset(nextOffset);
    fetchOrders(statusFilter, search, nextOffset, true);
  }, [offset, statusFilter, search, fetchOrders]);

  // Select order
  const handleSelectOrder = useCallback((id: string) => {
    setSelectedOrderId(id);
  }, []);

  // Sync orders from WIX
  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      await fetch('/api/orders/sync', { method: 'POST' });
      // Refresh list and summary after sync
      await Promise.all([
        fetchOrders(statusFilter, search, 0, false),
        fetchSummary(),
      ]);
      setOffset(0);
    } catch {
      // Sync error — could show toast, but keeping simple for now
    } finally {
      setSyncing(false);
    }
  }, [statusFilter, search, fetchOrders, fetchSummary]);

  // Callback when order detail updates status — refresh list + summary
  const handleOrderUpdated = useCallback(() => {
    fetchOrders(statusFilter, search, 0, false);
    fetchSummary();
    setOffset(0);
  }, [statusFilter, search, fetchOrders, fetchSummary]);

  const hasMore = orders.length < totalCount;

  return (
    <div className={`orders-layout${viewMode === 'pipeline' ? ' orders-layout--pipeline' : ''}`}>
      <div className="orders-layout__list-panel">
        {/* Header with view toggle and sync button */}
        <div className="orders-header">
          <h2 className="orders-header__title">Orders</h2>
          <div className="orders-header__actions">
            {/* View mode toggle */}
            <div className="orders-header__view-toggle">
              <button
                className={`orders-header__view-btn${viewMode === 'list' ? ' orders-header__view-btn--active' : ''}`}
                onClick={() => handleViewModeChange('list')}
                title="List view"
                aria-label="List view"
              >
                {/* List icon (3 horizontal lines) */}
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="3" y1="4" x2="15" y2="4" />
                  <line x1="3" y1="9" x2="15" y2="9" />
                  <line x1="3" y1="14" x2="15" y2="14" />
                </svg>
              </button>
              <button
                className={`orders-header__view-btn${viewMode === 'pipeline' ? ' orders-header__view-btn--active' : ''}`}
                onClick={() => handleViewModeChange('pipeline')}
                title="Pipeline view"
                aria-label="Pipeline view"
              >
                {/* Kanban icon (3 vertical columns) */}
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="2" y="3" width="3.5" height="12" rx="1" />
                  <rect x="7.25" y="3" width="3.5" height="8" rx="1" />
                  <rect x="12.5" y="3" width="3.5" height="10" rx="1" />
                </svg>
              </button>
            </div>

            <button
              className="orders-header__new-btn"
              onClick={() => setShowCreateForm(true)}
            >
              + New Order
            </button>

            <button
              className="orders-header__sync-btn"
              onClick={handleSync}
              disabled={syncing}
            >
              {syncing && <span className="orders-header__spinner" />}
              {syncing ? 'Syncing...' : 'Sync Orders'}
            </button>
          </div>
        </div>

        {viewMode === 'list' ? (
          <OrderList
            orders={orders}
            selectedOrderId={selectedOrderId}
            summary={summary}
            statusFilter={statusFilter}
            search={search}
            totalCount={totalCount}
            onSelectOrder={handleSelectOrder}
            onStatusFilterChange={handleStatusFilterChange}
            onSearchChange={handleSearchChange}
            onLoadMore={handleLoadMore}
            hasMore={hasMore}
            selectedOrderIds={selectedOrderIds}
            onToggleSelect={handleToggleSelect}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
          />
        ) : (
          <PipelineView
            onOrderSelect={handleSelectOrder}
          />
        )}

        {/* Bulk operations toolbar (visible when orders selected in list mode) */}
        {viewMode === 'list' && selectedOrderIds.size > 0 && (
          <BulkToolbar
            selectedOrderIds={selectedOrderIds}
            onDeselectAll={handleDeselectAll}
            onOrdersUpdated={handleOrderUpdated}
          />
        )}
      </div>

      <div className="orders-layout__detail-panel">
        <OrderDetail
          orderId={selectedOrderId}
          onOrderUpdated={handleOrderUpdated}
        />
      </div>

      {showCreateForm && (
        <OrderCreateForm
          onCreated={() => {
            setShowCreateForm(false);
            fetchOrders(statusFilter, search, 0, false);
            fetchSummary();
            setOffset(0);
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}
    </div>
  );
}

export default OrdersTab;
