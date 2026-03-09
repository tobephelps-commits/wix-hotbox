/**
 * CartFillModal -- Modal for vendor cart automation workflow.
 *
 * Three-view state machine:
 * 1. Vendor Selection + Preview: Pick vendor, view consolidated cart items
 * 2. Filling Progress: Trigger cart fill, show results
 * 3. History: View past cart fills
 *
 * Phase 59: v1.x Feature Parity Audit (Plan 03)
 */

import { useState, useCallback, useEffect } from 'react';
import './CartFillModal.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type VendorId = 'sanmar' | 'ss';
type ModalView = 'preview' | 'filling' | 'history';

interface CartItem {
  vendorStyle: string;
  color: string;
  size: string;
  qty: number;
  sourceOrders: number[];
  vendor: string;
}

interface CartPreview {
  items: CartItem[];
  orderCount: number;
  itemCount: number;
}

interface ItemResult {
  success: boolean;
  error?: string;
  item: CartItem;
}

interface FillResult {
  status: 'success' | 'partial' | 'failed';
  itemResults: ItemResult[];
}

interface HistoryEntry {
  status: string;
  vendor: string;
  itemCount: number;
  successCount: number;
  failedCount: number;
  completedAt: string;
}

interface CartFillModalProps {
  onClose: () => void;
  onComplete: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

function CartFillModal({ onClose, onComplete }: CartFillModalProps) {
  const [view, setView] = useState<ModalView>('preview');
  const [vendor, setVendor] = useState<VendorId | null>(null);
  const [preview, setPreview] = useState<CartPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [filling, setFilling] = useState(false);
  const [fillResult, setFillResult] = useState<FillResult | null>(null);
  const [fillError, setFillError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Fetch preview when vendor selected
  const fetchPreview = useCallback(async (v: VendorId) => {
    setLoadingPreview(true);
    setPreviewError(null);
    setPreview(null);
    try {
      const res = await fetch(`/api/orders/cart/preview?vendor=${v}`);
      if (res.ok) {
        const data: CartPreview = await res.json();
        setPreview(data);
      } else {
        const err = await res.json().catch(() => ({}));
        setPreviewError((err as { error?: string }).error || 'Failed to load preview');
      }
    } catch {
      setPreviewError('Network error');
    } finally {
      setLoadingPreview(false);
    }
  }, []);

  // Select vendor
  const handleVendorSelect = useCallback((v: VendorId) => {
    setVendor(v);
    setFillResult(null);
    setFillError(null);
    fetchPreview(v);
  }, [fetchPreview]);

  // Trigger cart fill
  const handleFillCart = useCallback(async () => {
    if (!vendor) return;
    setView('filling');
    setFilling(true);
    setFillResult(null);
    setFillError(null);
    try {
      const res = await fetch('/api/orders/cart/fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor, headless: true }),
      });
      if (res.ok) {
        const data: FillResult = await res.json();
        setFillResult(data);
      } else {
        const err = await res.json().catch(() => ({}));
        setFillError((err as { error?: string; details?: string }).error || 'Cart fill failed');
      }
    } catch {
      setFillError('Network error');
    } finally {
      setFilling(false);
    }
  }, [vendor]);

  // Done handler
  const handleDone = useCallback(() => {
    onComplete();
    onClose();
  }, [onComplete, onClose]);

  // Fetch history
  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/orders/cart/history?limit=10');
      if (res.ok) {
        const data: HistoryEntry[] = await res.json();
        setHistory(data);
      }
    } catch {
      // Silent fail
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  // Show history view
  const handleShowHistory = useCallback(() => {
    setView('history');
    fetchHistory();
  }, [fetchHistory]);

  // Back to preview
  const handleBackToPreview = useCallback(() => {
    setView('preview');
  }, []);

  // Close on overlay click
  const handleOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  // Vendor label helper
  const vendorLabel = (v: string) =>
    v === 'sanmar' ? 'SanMar' : v === 'ss' ? 'S&S Activewear' : v;

  // Format date helper
  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  };

  // Status badge class
  const statusClass = (status: string) => {
    if (status === 'success') return 'cart-fill-modal__status--success';
    if (status === 'partial') return 'cart-fill-modal__status--partial';
    return 'cart-fill-modal__status--failed';
  };

  return (
    <div className="cart-fill-modal__overlay" onClick={handleOverlayClick}>
      <div className="cart-fill-modal">
        {/* Header */}
        <div className="cart-fill-modal__header">
          <h2 className="cart-fill-modal__title">
            {view === 'history' ? 'Cart Fill History' : 'Fill Vendor Cart'}
          </h2>
          <button
            className="cart-fill-modal__close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="cart-fill-modal__body">
          {/* ── Preview View ─────────────────────────────────────── */}
          {view === 'preview' && (
            <>
              {/* Vendor selection */}
              <div className="cart-fill-modal__vendor-select">
                <button
                  className={`cart-fill-modal__vendor-btn${vendor === 'sanmar' ? ' cart-fill-modal__vendor-btn--active' : ''}`}
                  onClick={() => handleVendorSelect('sanmar')}
                >
                  SanMar
                </button>
                <button
                  className={`cart-fill-modal__vendor-btn${vendor === 'ss' ? ' cart-fill-modal__vendor-btn--active' : ''}`}
                  onClick={() => handleVendorSelect('ss')}
                >
                  S&S Activewear
                </button>
              </div>

              {/* Preview content */}
              {loadingPreview && (
                <div className="cart-fill-modal__loading">Loading preview...</div>
              )}

              {previewError && (
                <div className="cart-fill-modal__error">{previewError}</div>
              )}

              {preview && !loadingPreview && (
                <>
                  <div className="cart-fill-modal__summary">
                    <span className="cart-fill-modal__summary-item">
                      <strong>{preview.itemCount}</strong> items
                    </span>
                    <span className="cart-fill-modal__summary-item">
                      <strong>{preview.orderCount}</strong> orders
                    </span>
                  </div>

                  {preview.items.length === 0 ? (
                    <div className="cart-fill-modal__empty">
                      No eligible items for {vendor ? vendorLabel(vendor) : 'this vendor'}
                    </div>
                  ) : (
                    <div className="cart-fill-modal__items-list">
                      {preview.items.map((item, idx) => (
                        <div key={idx} className="cart-fill-modal__item">
                          <div className="cart-fill-modal__item-main">
                            <span className="cart-fill-modal__item-style">{item.vendorStyle}</span>
                            <span className="cart-fill-modal__item-detail">
                              {item.color} / {item.size}
                            </span>
                          </div>
                          <div className="cart-fill-modal__item-right">
                            <span className="cart-fill-modal__item-qty">x{item.qty}</span>
                            <span className="cart-fill-modal__item-orders">
                              Orders: {item.sourceOrders.join(', ')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Footer actions */}
              <div className="cart-fill-modal__footer">
                <button
                  className="cart-fill-modal__history-btn"
                  onClick={handleShowHistory}
                >
                  View History
                </button>
                <button
                  className="cart-fill-modal__fill-btn"
                  onClick={handleFillCart}
                  disabled={!preview || preview.items.length === 0 || filling}
                >
                  Fill Cart
                </button>
              </div>
            </>
          )}

          {/* ── Filling View ─────────────────────────────────────── */}
          {view === 'filling' && (
            <>
              {filling && (
                <div className="cart-fill-modal__progress">
                  <div className="cart-fill-modal__spinner" />
                  <span>Filling {vendor ? vendorLabel(vendor) : ''} cart...</span>
                </div>
              )}

              {fillError && (
                <div className="cart-fill-modal__error">{fillError}</div>
              )}

              {fillResult && (
                <div className="cart-fill-modal__results">
                  <div className={`cart-fill-modal__status ${statusClass(fillResult.status)}`}>
                    {fillResult.status.toUpperCase()}
                  </div>

                  <div className="cart-fill-modal__results-summary">
                    {fillResult.itemResults.filter((r) => r.success).length} / {fillResult.itemResults.length} items succeeded
                  </div>

                  <div className="cart-fill-modal__results-list">
                    {fillResult.itemResults.map((r, idx) => (
                      <div
                        key={idx}
                        className={`cart-fill-modal__result-item${r.success ? ' cart-fill-modal__result-item--success' : ' cart-fill-modal__result-item--failed'}`}
                      >
                        <span className="cart-fill-modal__result-indicator">
                          {r.success ? '\u2713' : '\u2717'}
                        </span>
                        <span className="cart-fill-modal__result-detail">
                          {r.item.vendorStyle} — {r.item.color} / {r.item.size} x{r.item.qty}
                        </span>
                        {r.error && (
                          <span className="cart-fill-modal__result-error">{r.error}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer with Done button */}
              {(fillResult || fillError) && !filling && (
                <div className="cart-fill-modal__footer">
                  <button className="cart-fill-modal__done-btn" onClick={handleDone}>
                    Done
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── History View ─────────────────────────────────────── */}
          {view === 'history' && (
            <>
              {loadingHistory && (
                <div className="cart-fill-modal__loading">Loading history...</div>
              )}

              {!loadingHistory && history.length === 0 && (
                <div className="cart-fill-modal__empty">No cart fill history yet</div>
              )}

              {!loadingHistory && history.length > 0 && (
                <div className="cart-fill-modal__history-list">
                  {history.map((entry, idx) => (
                    <div key={idx} className="cart-fill-modal__history-entry">
                      <div className="cart-fill-modal__history-main">
                        <span className={`cart-fill-modal__status ${statusClass(entry.status)}`}>
                          {entry.status.toUpperCase()}
                        </span>
                        <span className="cart-fill-modal__history-vendor">
                          {vendorLabel(entry.vendor)}
                        </span>
                      </div>
                      <div className="cart-fill-modal__history-detail">
                        <span>{entry.itemCount} items</span>
                        <span className="cart-fill-modal__history-success">
                          {entry.successCount} succeeded
                        </span>
                        {entry.failedCount > 0 && (
                          <span className="cart-fill-modal__history-failed">
                            {entry.failedCount} failed
                          </span>
                        )}
                      </div>
                      <div className="cart-fill-modal__history-date">
                        {formatDate(entry.completedAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="cart-fill-modal__footer">
                <button className="cart-fill-modal__back-btn" onClick={handleBackToPreview}>
                  Back
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default CartFillModal;
