/**
 * OrderDetail -- Order detail panel shown when an order is selected.
 *
 * Fetches full order from GET /api/orders/:id (includes items, statusHistory, errors).
 * Shows order info, line items, financials, status timeline, error banners,
 * status transition controls, and PDF download buttons.
 *
 * Phase 50: Order Management Advanced (Plan 02)
 */

import { useState, useEffect, useCallback } from 'react';
import type { OrderWithDetails, OrderStatus } from './types';
import { ORDER_STATUS_TRANSITIONS } from './types';
import OrderCreateForm from './OrderCreateForm';

/** Status display labels */
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

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatCurrency(amount: number): string {
  return '$' + amount.toFixed(2);
}

interface OrderDetailProps {
  orderId: string | null;
  onOrderUpdated: () => void;
}

function OrderDetail({ orderId, onOrderUpdated }: OrderDetailProps) {
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [editing, setEditing] = useState(false);

  const fetchOrder = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${id}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      } else {
        setOrder(null);
      }
    } catch {
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (orderId) {
      fetchOrder(orderId);
    } else {
      setOrder(null);
    }
  }, [orderId, fetchOrder]);

  const handleStatusChange = useCallback(async (newStatus: OrderStatus) => {
    if (!order) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          note: 'Status updated via dashboard',
        }),
      });
      if (res.ok) {
        // Refresh order detail
        await fetchOrder(order.id);
        onOrderUpdated();
      }
    } catch {
      // Could show error toast
    } finally {
      setUpdatingStatus(false);
    }
  }, [order, fetchOrder, onOrderUpdated]);

  const handleDownloadPdf = useCallback(async (type: 'production-sheet' | 'invoice' | 'label') => {
    if (!order) return;
    try {
      const res = await fetch(`/api/orders/${order.id}/${type}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const prefixMap: Record<string, string> = {
          'production-sheet': 'PS',
          'invoice': 'INV',
          'label': 'LABEL',
        };
        a.download = `${prefixMap[type] ?? type}-${order.orderNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch {
      // Could show error toast
    }
  }, [order]);

  // Empty state
  if (!orderId) {
    return (
      <div className="order-detail__empty">
        Select an order to view details
      </div>
    );
  }

  // Loading state
  if (loading && !order) {
    return (
      <div className="order-detail__loading">
        Loading order...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="order-detail__empty">
        Order not found
      </div>
    );
  }

  // Get valid next statuses
  const validTransitions = ORDER_STATUS_TRANSITIONS[order.status] || [];
  const unresolvedErrors = order.errors.filter((e) => !e.resolved);

  // Group items by vendorStyle for visual grouping
  const sortedItems = [...order.items].sort((a, b) => {
    const styleA = a.vendorStyle || '';
    const styleB = b.vendorStyle || '';
    if (styleA !== styleB) return styleA.localeCompare(styleB);
    const colorA = a.color || '';
    const colorB = b.color || '';
    if (colorA !== colorB) return colorA.localeCompare(colorB);
    return (a.size || '').localeCompare(b.size || '');
  });

  return (
    <div className="order-detail">
      {/* Header */}
      <div className="order-detail__header">
        <span className="order-detail__order-number">
          Order #{order.orderNumber}
        </span>
        <span className={`status-badge status-badge--${order.status}`}>
          {STATUS_LABELS[order.status]}
        </span>
        <span className="order-detail__source-badge">
          {order.source}
        </span>
        <span className="order-detail__date">
          {formatDate(order.createdAt)}
        </span>
        <button
          className="order-detail__edit-btn"
          onClick={() => setEditing(true)}
        >
          Edit
        </button>
      </div>

      {/* Error banner */}
      {unresolvedErrors.length > 0 && (
        <div className="order-detail__errors">
          <div className="order-detail__errors-title">
            Unresolved Errors ({unresolvedErrors.length})
          </div>
          {unresolvedErrors.map((err) => (
            <div key={err.id} className="order-detail__error-item">
              <span className="order-detail__error-operation">{err.operation}:</span>{' '}
              {err.message}
            </div>
          ))}
        </div>
      )}

      {/* Status transition controls */}
      {validTransitions.length > 0 && (
        <div className="order-detail__section">
          <div className="order-detail__section-title">Update Status</div>
          <div className="order-detail__status-actions">
            {validTransitions.map((status) => (
              <button
                key={status}
                className={`order-detail__status-btn${status === 'cancelled' ? ' order-detail__status-btn--cancel' : ''}`}
                onClick={() => handleStatusChange(status)}
                disabled={updatingStatus}
              >
                {STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PDF download buttons */}
      <div className="order-detail__section">
        <div className="order-detail__section-title">Documents</div>
        <div className="order-detail__pdf-actions">
          <button
            className="order-detail__pdf-btn"
            onClick={() => handleDownloadPdf('production-sheet')}
          >
            Production Sheet
          </button>
          <button
            className="order-detail__pdf-btn"
            onClick={() => handleDownloadPdf('invoice')}
          >
            Invoice
          </button>
          <button
            className="order-detail__pdf-btn"
            onClick={() => handleDownloadPdf('label')}
            disabled={!order.shippingAddress}
            title={!order.shippingAddress ? 'No shipping address' : undefined}
          >
            Label
          </button>
        </div>
      </div>

      {/* Customer info */}
      {(order.customerFirstName || order.customerLastName || order.customerEmail) && (
        <div className="order-detail__section">
          <div className="order-detail__section-title">Customer</div>
          <div className="order-detail__card">
            <div className="order-detail__customer-name">
              {[order.customerFirstName, order.customerLastName].filter(Boolean).join(' ')}
            </div>
            {(order.customerEmail || order.customerPhone) && (
              <div className="order-detail__customer-contact">
                {order.customerEmail && <div>{order.customerEmail}</div>}
                {order.customerPhone && <div>{order.customerPhone}</div>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Addresses */}
      {(order.shippingAddress || order.billingAddress) && (
        <div className="order-detail__section">
          <div className="order-detail__section-title">Addresses</div>
          <div className="order-detail__addresses">
            {order.shippingAddress && (
              <div className="order-detail__card">
                <div className="order-detail__address-label">Shipping</div>
                {order.shippingAddress.company && (
                  <div className="order-detail__address-line">{order.shippingAddress.company}</div>
                )}
                <div className="order-detail__address-line">
                  {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                </div>
                <div className="order-detail__address-line">{order.shippingAddress.addressLine1}</div>
                {order.shippingAddress.addressLine2 && (
                  <div className="order-detail__address-line">{order.shippingAddress.addressLine2}</div>
                )}
                <div className="order-detail__address-line">
                  {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                </div>
                <div className="order-detail__address-line">{order.shippingAddress.country}</div>
              </div>
            )}
            {order.billingAddress && (
              <div className="order-detail__card">
                <div className="order-detail__address-label">Billing</div>
                {order.billingAddress.company && (
                  <div className="order-detail__address-line">{order.billingAddress.company}</div>
                )}
                <div className="order-detail__address-line">
                  {order.billingAddress.firstName} {order.billingAddress.lastName}
                </div>
                <div className="order-detail__address-line">{order.billingAddress.addressLine1}</div>
                {order.billingAddress.addressLine2 && (
                  <div className="order-detail__address-line">{order.billingAddress.addressLine2}</div>
                )}
                <div className="order-detail__address-line">
                  {order.billingAddress.city}, {order.billingAddress.state} {order.billingAddress.postalCode}
                </div>
                <div className="order-detail__address-line">{order.billingAddress.country}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Line items */}
      {sortedItems.length > 0 && (
        <div className="order-detail__section">
          <div className="order-detail__section-title">
            Line Items ({sortedItems.length})
          </div>
          <div className="order-detail__card" style={{ padding: 0, overflow: 'auto' }}>
            <table className="order-detail__items-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt=""
                            className="order-detail__item-thumb"
                          />
                        )}
                        <div>
                          <div className="order-detail__item-name">{item.productName}</div>
                          <div className="order-detail__item-variant">
                            {[
                              item.vendorStyle,
                              item.color,
                              item.size,
                            ].filter(Boolean).join(' / ')}
                          </div>
                          {item.notes && (
                            <div style={{ fontSize: '0.85em', color: '#666', fontStyle: 'italic', marginTop: 2 }}>
                              {item.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>{item.quantity}</td>
                    <td>{formatCurrency(item.unitPrice)}</td>
                    <td>{formatCurrency(item.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Financials */}
      <div className="order-detail__section">
        <div className="order-detail__section-title">Financials</div>
        <div className="order-detail__financials">
          <div className="order-detail__financial-row">
            <span>Subtotal</span>
            <span>{formatCurrency(order.subtotal)}</span>
          </div>
          {order.shippingCost > 0 && (
            <div className="order-detail__financial-row">
              <span>Shipping</span>
              <span>{formatCurrency(order.shippingCost)}</span>
            </div>
          )}
          {order.tax > 0 && (
            <div className="order-detail__financial-row">
              <span>Tax</span>
              <span>{formatCurrency(order.tax)}</span>
            </div>
          )}
          {order.discount > 0 && (
            <div className="order-detail__financial-row">
              <span>Discount</span>
              <span>-{formatCurrency(order.discount)}</span>
            </div>
          )}
          <div className="order-detail__financial-row order-detail__financial-row--total">
            <span>Total</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
        </div>
      </div>

      {/* Status History Timeline */}
      {order.statusHistory.length > 0 && (
        <div className="order-detail__section">
          <div className="order-detail__section-title">Status History</div>
          <div className="order-detail__card">
            <div className="order-detail__timeline">
              {/* Most recent at top */}
              {[...order.statusHistory].reverse().map((entry) => (
                <div key={entry.id} className="order-detail__timeline-entry">
                  <div className={`order-detail__timeline-dot order-detail__timeline-dot--${entry.status}`} />
                  <div className="order-detail__timeline-line" />
                  <div className="order-detail__timeline-content">
                    <div className="order-detail__timeline-status">
                      {STATUS_LABELS[entry.status]}
                    </div>
                    {entry.note && (
                      <div className="order-detail__timeline-note">{entry.note}</div>
                    )}
                    <div className="order-detail__timeline-date">
                      {formatDateTime(entry.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      {order.notes && (
        <div className="order-detail__section">
          <div className="order-detail__section-title">Notes</div>
          <div className="order-detail__card">
            <div className="order-detail__notes">{order.notes}</div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <OrderCreateForm
          editOrder={order}
          onCreated={() => {
            setEditing(false);
            fetchOrder(order.id);
            onOrderUpdated();
          }}
          onCancel={() => setEditing(false)}
        />
      )}
    </div>
  );
}

export default OrderDetail;
