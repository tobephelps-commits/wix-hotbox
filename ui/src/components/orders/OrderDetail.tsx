/**
 * OrderDetail -- Order detail panel shown when an order is selected.
 *
 * Stub for Task 1; full implementation in Task 2.
 *
 * Phase 50: Order Management Advanced (Plan 02)
 */

interface OrderDetailProps {
  orderId: string | null;
  onOrderUpdated: () => void;
}

function OrderDetail({ orderId }: OrderDetailProps) {
  if (!orderId) {
    return (
      <div className="order-detail__empty">
        Select an order to view details
      </div>
    );
  }

  return (
    <div className="order-detail__empty">
      Loading...
    </div>
  );
}

export default OrderDetail;
