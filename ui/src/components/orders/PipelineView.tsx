/**
 * PipelineView -- Kanban-style pipeline visualization for orders.
 *
 * Shows orders grouped by status in horizontal scrollable stage columns
 * with aging indicators, attention badges, and compact order cards.
 *
 * Phase 50: Order Management Advanced (Plan 03)
 */

import { useState, useEffect, useCallback } from 'react';
import type { OrderStatus } from './types';
import type { OrderListItem, OrderSummary } from './OrderList';
import './PipelineView.css';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Extended summary from GET /api/orders/summary/extended */
interface ExtendedSummary extends OrderSummary {
  agingOrders: {
    status: OrderStatus;
    orderId: string;
    orderNumber: number;
    hoursInStatus: number;
  }[];
  attention: {
    cartFillPending: number;
    stuckInProduction: number;
    awaitingShipment: number;
    unresolvedErrors: number;
  };
  stageMetrics: Record<
    string,
    {
      count: number;
      totalItems: number;
      totalValue: number;
      oldestOrderHours: number | null;
    }
  >;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Pipeline stages (active statuses only, excludes terminal) */
const PIPELINE_STAGES: OrderStatus[] = [
  'new',
  'ordered',
  'received',
  'in-production',
  'packed',
  'shipped',
];

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

/** Aging thresholds in hours — matches server AGING_THRESHOLDS */
const AGING_THRESHOLDS: Partial<Record<OrderStatus, number>> = {
  'new': 48,
  'in-production': 72,
  'packed': 24,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return '$' + amount.toFixed(2);
}

function customerName(order: OrderListItem): string {
  const parts = [order.customerFirstName, order.customerLastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : order.customerEmail || 'Unknown';
}

function hoursAgo(isoDate: string): number {
  const ms = Date.now() - new Date(isoDate).getTime();
  return Math.round(ms / (1000 * 60 * 60));
}

function formatHours(h: number): string {
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  const rem = h % 24;
  return rem > 0 ? `${days}d ${rem}h` : `${days}d`;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface PipelineViewProps {
  onOrderSelect: (id: string) => void;
}

function PipelineView({ onOrderSelect }: PipelineViewProps) {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [extSummary, setExtSummary] = useState<ExtendedSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [attentionFilter, setAttentionFilter] = useState<string | null>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersRes, summaryRes] = await Promise.all([
        fetch('/api/orders?limit=200'),
        fetch('/api/orders/summary/extended'),
      ]);

      if (ordersRes.ok) {
        const data = await ordersRes.json();
        // Filter to active statuses only
        const active = (data.orders as OrderListItem[]).filter(
          (o) => !['delivered', 'cancelled'].includes(o.status)
        );
        setOrders(active);
      }

      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setExtSummary(data);
      }
    } catch {
      // Network error — keep existing data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Group orders by status
  const ordersByStatus: Record<string, OrderListItem[]> = {};
  for (const stage of PIPELINE_STAGES) {
    ordersByStatus[stage] = [];
  }
  for (const order of orders) {
    if (ordersByStatus[order.status]) {
      ordersByStatus[order.status].push(order);
    }
  }

  // Build aging lookup from extended summary
  const agingMap = new Map<string, number>();
  if (extSummary) {
    for (const a of extSummary.agingOrders) {
      agingMap.set(a.orderId, a.hoursInStatus);
    }
  }

  // Attention filter logic
  const filteredOrders = attentionFilter ? filterByAttention(orders, attentionFilter) : null;

  // If filtering by attention, override the stage grouping
  const displayByStatus: Record<string, OrderListItem[]> = {};
  if (filteredOrders) {
    for (const stage of PIPELINE_STAGES) {
      displayByStatus[stage] = filteredOrders.filter((o) => o.status === stage);
    }
  } else {
    for (const stage of PIPELINE_STAGES) {
      displayByStatus[stage] = ordersByStatus[stage];
    }
  }

  if (loading && orders.length === 0) {
    return <div className="pipeline-loading">Loading pipeline...</div>;
  }

  return (
    <div className="pipeline-wrapper">
      {/* Attention badges */}
      {extSummary && (
        <div className="pipeline-attention">
          <AttentionBadge
            label="Cart Fill Pending"
            count={extSummary.attention.cartFillPending}
            color="blue"
            active={attentionFilter === 'cart-fill'}
            onClick={() =>
              setAttentionFilter(attentionFilter === 'cart-fill' ? null : 'cart-fill')
            }
          />
          <AttentionBadge
            label="Stuck in Production"
            count={extSummary.attention.stuckInProduction}
            color="orange"
            active={attentionFilter === 'stuck-production'}
            onClick={() =>
              setAttentionFilter(
                attentionFilter === 'stuck-production' ? null : 'stuck-production'
              )
            }
          />
          <AttentionBadge
            label="Awaiting Shipment"
            count={extSummary.attention.awaitingShipment}
            color="yellow"
            active={attentionFilter === 'awaiting-shipment'}
            onClick={() =>
              setAttentionFilter(
                attentionFilter === 'awaiting-shipment' ? null : 'awaiting-shipment'
              )
            }
          />
          <AttentionBadge
            label="Errors"
            count={extSummary.attention.unresolvedErrors}
            color="red"
            active={attentionFilter === 'errors'}
            onClick={() =>
              setAttentionFilter(attentionFilter === 'errors' ? null : 'errors')
            }
          />
        </div>
      )}

      {/* Kanban columns */}
      <div className="pipeline-container">
        {PIPELINE_STAGES.map((stage) => {
          const stageOrders = displayByStatus[stage];
          const metrics = extSummary?.stageMetrics[stage];

          return (
            <div key={stage} className="pipeline-stage">
              <div className="pipeline-stage__header">
                <span className={`pipeline-stage__dot pipeline-stage__dot--${stage}`} />
                <span className="pipeline-stage__name">{STATUS_LABELS[stage]}</span>
                <span className="pipeline-stage__count">{stageOrders.length}</span>
                {metrics && metrics.totalValue > 0 && (
                  <span className="pipeline-stage__value">
                    {formatCurrency(metrics.totalValue)}
                  </span>
                )}
              </div>
              <div className="pipeline-stage__cards">
                {stageOrders.length === 0 ? (
                  <div className="pipeline-stage__empty">No orders</div>
                ) : (
                  stageOrders.map((order) => {
                    const hrs = hoursAgo(order.updatedAt);
                    const threshold = AGING_THRESHOLDS[order.status];
                    const agingHrs = agingMap.get(order.id);
                    let agingLevel: 'none' | 'warning' | 'danger' = 'none';
                    if (threshold) {
                      if (hrs >= threshold) {
                        agingLevel = 'danger';
                      } else if (hrs >= threshold * 0.75) {
                        agingLevel = 'warning';
                      }
                    }

                    return (
                      <button
                        key={order.id}
                        className={`pipeline-card pipeline-card--${order.status}`}
                        onClick={() => onOrderSelect(order.id)}
                      >
                        <div className="pipeline-card__top">
                          <span className="pipeline-card__number">
                            #{order.orderNumber}
                          </span>
                          {agingLevel !== 'none' && (
                            <span
                              className={`pipeline-aging pipeline-aging--${agingLevel}`}
                            >
                              {formatHours(agingHrs ?? hrs)}
                            </span>
                          )}
                        </div>
                        <div className="pipeline-card__customer">
                          {customerName(order)}
                        </div>
                        <div className="pipeline-card__bottom">
                          {order.itemCount !== undefined && (
                            <span className="pipeline-card__items">
                              {order.itemCount} item{order.itemCount !== 1 ? 's' : ''}
                            </span>
                          )}
                          <span className="pipeline-card__total">
                            {formatCurrency(order.total)}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Attention Badge Sub-component ───────────────────────────────────────────

function AttentionBadge({
  label,
  count,
  color,
  active,
  onClick,
}: {
  label: string;
  count: number;
  color: 'blue' | 'orange' | 'yellow' | 'red';
  active: boolean;
  onClick: () => void;
}) {
  if (count === 0) return null;
  return (
    <button
      className={`pipeline-attention__badge pipeline-attention__badge--${color}${active ? ' pipeline-attention__badge--active' : ''}`}
      onClick={onClick}
    >
      <span className="pipeline-attention__badge-count">{count}</span>
      <span className="pipeline-attention__badge-label">{label}</span>
    </button>
  );
}

// ─── Filter helpers ──────────────────────────────────────────────────────────

function filterByAttention(
  orders: OrderListItem[],
  filter: string
): OrderListItem[] {
  switch (filter) {
    case 'cart-fill':
      return orders.filter((o) => o.status === 'new');
    case 'stuck-production': {
      const threshold = 72;
      return orders.filter(
        (o) =>
          o.status === 'in-production' &&
          hoursAgo(o.updatedAt) > threshold
      );
    }
    case 'awaiting-shipment': {
      const threshold = 24;
      return orders.filter(
        (o) =>
          o.status === 'packed' && hoursAgo(o.updatedAt) > threshold
      );
    }
    case 'errors':
      // Cannot filter by error from list data alone — show all orders
      // The attention count comes from the summary API
      return orders;
    default:
      return orders;
  }
}

export default PipelineView;
