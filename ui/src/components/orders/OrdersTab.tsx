/**
 * OrdersTab -- Main orders tab container managing list/detail state.
 *
 * Master-detail layout: left panel (order list with filters)
 * and right panel (order detail when selected).
 *
 * Phase 50: Order Management Advanced (Plan 02)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import OrderList from './OrderList';
import OrderDetail from './OrderDetail';
import type { OrderStatus } from './types';
import type { OrderListItem, OrderSummary } from './OrderList';
import './OrdersTab.css';

const PAGE_SIZE = 50;

function OrdersTab() {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState<OrderSummary | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [offset, setOffset] = useState(0);

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
    <div className="orders-layout">
      <div className="orders-layout__list-panel">
        {/* Header with sync button */}
        <div className="orders-header">
          <h2 className="orders-header__title">Orders</h2>
          <div className="orders-header__actions">
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
        />
      </div>

      <div className="orders-layout__detail-panel">
        <OrderDetail
          orderId={selectedOrderId}
          onOrderUpdated={handleOrderUpdated}
        />
      </div>
    </div>
  );
}

export default OrdersTab;
