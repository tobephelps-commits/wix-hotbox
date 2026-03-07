/**
 * OrderList -- Scrollable order list with status filter tabs and search.
 *
 * Shows status filter pills with count badges from summary,
 * a search input, and order rows with key details.
 *
 * Phase 50: Order Management Advanced (Plan 02)
 */

import type { OrderStatus } from './types';

/** Order summary shape returned by GET /api/orders/summary */
export interface OrderSummary {
  statusCounts: Record<string, number>;
  errorCount: number;
  totalOrders: number;
  lastSync?: string;
}

/** Order shape from GET /api/orders (list-level, no items/history) */
export interface OrderListItem {
  id: string;
  orderNumber: number;
  source: string;
  status: OrderStatus;
  customerFirstName?: string;
  customerLastName?: string;
  customerEmail?: string;
  subtotal: number;
  shippingCost: number;
  tax: number;
  discount: number;
  total: number;
  createdAt: string;
  updatedAt: string;
  /** Item count returned by list endpoint */
  itemCount?: number;
}

/** Status display config */
const STATUS_LABELS: Record<OrderStatus, string> = {
  'new': 'New',
  'on-hold': 'On Hold',
  'ordered': 'Ordered',
  'received': 'Received',
  'in-production': 'In Production',
  'packed': 'Packed',
  'shipped': 'Shipped',
  'delivered': 'Delivered',
  'cancelled': 'Cancelled',
};

const ALL_STATUSES: OrderStatus[] = [
  'new', 'on-hold', 'ordered', 'received',
  'in-production', 'packed', 'shipped',
  'delivered', 'cancelled',
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatCurrency(cents: number): string {
  return '$' + cents.toFixed(2);
}

function customerName(order: OrderListItem): string {
  const parts = [order.customerFirstName, order.customerLastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : order.customerEmail || 'Unknown';
}

interface OrderListProps {
  orders: OrderListItem[];
  selectedOrderId: string | null;
  summary: OrderSummary | null;
  statusFilter: OrderStatus | null;
  search: string;
  totalCount: number;
  onSelectOrder: (id: string) => void;
  onStatusFilterChange: (status: OrderStatus | null) => void;
  onSearchChange: (search: string) => void;
  onLoadMore: () => void;
  hasMore: boolean;
}

function OrderList({
  orders,
  selectedOrderId,
  summary,
  statusFilter,
  search,
  totalCount,
  onSelectOrder,
  onStatusFilterChange,
  onSearchChange,
  onLoadMore,
  hasMore,
}: OrderListProps) {
  return (
    <>
      {/* Search */}
      <div className="orders-search">
        <input
          type="text"
          className="orders-search__input"
          placeholder="Search by name, email, or order #"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* Status filter pills */}
      <div className="orders-filters">
        <button
          className={`orders-filter-pill${statusFilter === null ? ' orders-filter-pill--active' : ''}`}
          onClick={() => onStatusFilterChange(null)}
        >
          All
          {summary && (
            <span className="orders-filter-pill__count">{summary.totalOrders}</span>
          )}
        </button>
        {ALL_STATUSES.map((status) => {
          const count = summary?.statusCounts[status] ?? 0;
          if (count === 0 && statusFilter !== status) return null;
          return (
            <button
              key={status}
              className={`orders-filter-pill${statusFilter === status ? ' orders-filter-pill--active' : ''}`}
              onClick={() => onStatusFilterChange(status)}
            >
              {STATUS_LABELS[status]}
              <span className="orders-filter-pill__count">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Order list */}
      <div className="orders-list">
        {orders.length === 0 ? (
          <div className="orders-empty">
            <div className="orders-empty__title">No orders found</div>
            <div className="orders-empty__text">
              {search
                ? 'Try a different search term'
                : 'Sync orders from WIX to get started'}
            </div>
          </div>
        ) : (
          orders.map((order) => (
            <button
              key={order.id}
              className={`order-row${selectedOrderId === order.id ? ' order-row--selected' : ''}`}
              onClick={() => onSelectOrder(order.id)}
            >
              <div className="order-row__main">
                <div className="order-row__top">
                  <span className="order-row__number">#{order.orderNumber}</span>
                  <span className={`status-badge status-badge--${order.status}`}>
                    {STATUS_LABELS[order.status]}
                  </span>
                </div>
                <div className="order-row__bottom">
                  <span className="order-row__customer">{customerName(order)}</span>
                  {order.itemCount !== undefined && (
                    <span className="order-row__items">
                      {order.itemCount} item{order.itemCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
              <div className="order-row__right">
                <span className="order-row__total">{formatCurrency(order.total)}</span>
                <span className="order-row__date">{formatDate(order.createdAt)}</span>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Load more */}
      {hasMore && orders.length > 0 && orders.length < totalCount && (
        <div className="orders-load-more">
          <button
            className="orders-load-more__btn"
            onClick={onLoadMore}
          >
            Load More ({orders.length} of {totalCount})
          </button>
        </div>
      )}
    </>
  );
}

export default OrderList;
