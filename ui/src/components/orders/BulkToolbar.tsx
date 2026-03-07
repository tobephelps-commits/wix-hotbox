/**
 * BulkToolbar -- Sticky bottom toolbar for bulk order operations.
 *
 * Appears when orders are selected, providing:
 * - Bulk status update (dropdown with status options)
 * - Batch production sheets (PDF/ZIP download)
 * - Deselect all
 *
 * Phase 50: Order Management Advanced (Plan 03)
 */

import { useState, useCallback } from 'react';
import type { OrderStatus } from './types';

// ─── Constants ───────────────────────────────────────────────────────────────

const BULK_STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: 'ordered', label: 'Ordered' },
  { value: 'received', label: 'Received' },
  { value: 'in-production', label: 'In Production' },
  { value: 'packed', label: 'Packed' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'on-hold', label: 'On Hold' },
  { value: 'cancelled', label: 'Cancelled' },
];

// ─── Component ───────────────────────────────────────────────────────────────

interface BulkToolbarProps {
  selectedOrderIds: Set<string>;
  onDeselectAll: () => void;
  onOrdersUpdated: () => void;
}

function BulkToolbar({
  selectedOrderIds,
  onDeselectAll,
  onOrdersUpdated,
}: BulkToolbarProps) {
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const count = selectedOrderIds.size;

  // Show toast briefly
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Bulk status update
  const handleBulkStatus = useCallback(
    async (status: OrderStatus) => {
      setStatusDropdownOpen(false);
      setProcessing(true);
      try {
        const res = await fetch('/api/orders/bulk/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderIds: Array.from(selectedOrderIds),
            status,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const succeeded = data.succeeded ?? count;
          const failed = data.failed?.length ?? 0;
          if (failed > 0) {
            showToast(`${succeeded} updated, ${failed} failed`);
          } else {
            showToast(`${succeeded} order${succeeded !== 1 ? 's' : ''} updated`);
          }
          onDeselectAll();
          onOrdersUpdated();
        } else {
          const data = await res.json().catch(() => ({}));
          showToast(data.error || 'Bulk update failed');
        }
      } catch {
        showToast('Network error');
      } finally {
        setProcessing(false);
      }
    },
    [selectedOrderIds, count, onDeselectAll, onOrdersUpdated, showToast]
  );

  // Batch production sheets
  const handleBatchSheets = useCallback(async () => {
    setProcessing(true);
    try {
      const res = await fetch('/api/orders/bulk/production-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: Array.from(selectedOrderIds) }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || 'Failed to generate production sheets');
        return;
      }

      // Check for partial failures
      const failedCount = res.headers.get('X-Failed-Count');
      if (failedCount && parseInt(failedCount, 10) > 0) {
        showToast(`Generated with ${failedCount} failed`);
      }

      // Download the response as file
      const blob = await res.blob();
      const contentType = res.headers.get('Content-Type') || '';
      const disposition = res.headers.get('Content-Disposition') || '';

      // Extract filename from Content-Disposition
      let filename = 'production-sheets';
      const match = disposition.match(/filename="([^"]+)"/);
      if (match) {
        filename = match[1];
      } else if (contentType.includes('pdf')) {
        filename = 'production-sheet.pdf';
      } else {
        filename = 'production-sheets.zip';
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      showToast('Network error');
    } finally {
      setProcessing(false);
    }
  }, [selectedOrderIds, showToast]);

  return (
    <div className="bulk-toolbar">
      <span className="bulk-toolbar__count">
        {count} order{count !== 1 ? 's' : ''} selected
      </span>

      <div className="bulk-toolbar__actions">
        {/* Bulk Status Update */}
        <div className="bulk-toolbar__dropdown-wrapper">
          <button
            className="bulk-toolbar__btn"
            onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
            disabled={processing}
          >
            Update Status
          </button>
          {statusDropdownOpen && (
            <div className="bulk-toolbar__dropdown">
              {BULK_STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className="bulk-toolbar__dropdown-item"
                  onClick={() => handleBulkStatus(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Batch Production Sheets */}
        <button
          className="bulk-toolbar__btn"
          onClick={handleBatchSheets}
          disabled={processing}
        >
          Production Sheets
        </button>

        {/* Deselect All */}
        <button
          className="bulk-toolbar__btn bulk-toolbar__btn--secondary"
          onClick={onDeselectAll}
          disabled={processing}
        >
          Deselect
        </button>
      </div>

      {/* Toast notification */}
      {toast && <div className="bulk-toolbar__toast">{toast}</div>}
    </div>
  );
}

export default BulkToolbar;
