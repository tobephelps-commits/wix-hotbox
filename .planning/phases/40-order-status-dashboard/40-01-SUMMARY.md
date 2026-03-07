# Plan 40-01 Summary: Extended Order Summary API

**Status:** COMPLETE
**Date:** 2026-02-04

## Objective

Extend order summary API with time-in-stage metrics and actionable attention counts. Backend foundation for enhanced pipeline visibility - the API must provide richer data before the UI can display it.

## Completed Tasks

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Add extended order summary function | 8ba2ff1 | scripts/orders/order-store.ts, scripts/orders/index.ts |
| 2 | Add extended summary API endpoint | d680a7d | scripts/pipeline/preview-server.ts |

## Implementation Details

### Task 1: getOrderSummaryExtended() Function

Created `getOrderSummaryExtended()` in order-store.ts returning:

**OrderSummaryExtended Interface:**
```typescript
interface OrderSummaryExtended {
  statusCounts: Record<OrderStatus, number>;
  errorCount: number;
  errorOrderIds: string[];
  lastSync: string | null;

  agingOrders: {
    status: OrderStatus;
    orderId: string;
    orderNumber: number;
    hoursInStatus: number;
  }[];

  attention: {
    cartFillPending: number;      // new orders not yet ordered
    stuckInProduction: number;    // in-production > 72 hours
    awaitingShipment: number;     // packed > 24 hours
    unresolvedErrors: number;     // same as errorCount
  };

  stageMetrics: Record<string, {
    orderCount: number;
    totalItems: number;
    totalValue: number;
    oldestOrderHours: number | null;
  }>;
}
```

**Aging Thresholds:**
- `new`: 48 hours
- `in-production`: 72 hours
- `packed`: 24 hours

**Active Statuses for Stage Metrics:**
- new, ordered, received, in-production, packed, shipped

**Helper Functions:**
- `hoursSince()`: Calculate hours elapsed from ISO timestamp
- `getStatusEntryTime()`: Find when order entered current status from statusHistory

### Task 2: API Endpoint

Added `GET /api/orders/summary/extended` endpoint:

**Route Registration:**
```typescript
// In parseRoute() - before /api/orders/summary
if (urlPath === '/api/orders/summary/extended') {
  return { route: 'orders-summary-extended' };
}
```

**Handler:**
```typescript
case 'orders-summary-extended': {
  const summary = await getOrderSummaryExtended();
  sendJson(res, 200, summary);
}
```

## Sample Response

```json
{
  "statusCounts": {
    "new": 6,
    "on-hold": 0,
    "ordered": 0,
    "received": 0,
    "in-production": 0,
    "packed": 0,
    "shipped": 0,
    "delivered": 5,
    "cancelled": 0
  },
  "errorCount": 0,
  "errorOrderIds": [],
  "lastSync": "2026-02-04T20:48:07.067Z",
  "agingOrders": [
    {"status": "new", "orderId": "...", "orderNumber": "10227", "hoursInStatus": 1442}
  ],
  "attention": {
    "cartFillPending": 6,
    "stuckInProduction": 0,
    "awaitingShipment": 0,
    "unresolvedErrors": 0
  },
  "stageMetrics": {
    "new": {"orderCount": 6, "totalItems": 13, "totalValue": 312.93, "oldestOrderHours": 1442},
    "ordered": {"orderCount": 0, "totalItems": 0, "totalValue": 0, "oldestOrderHours": null}
  }
}
```

## Files Modified

- `scripts/orders/order-store.ts` - Added getOrderSummaryExtended(), OrderSummaryExtended interface, helper functions
- `scripts/orders/index.ts` - Re-exported getOrderSummaryExtended and OrderSummaryExtended type
- `scripts/pipeline/preview-server.ts` - Added /api/orders/summary/extended route and handler

## Verification Status

- [x] `npx tsc --noEmit` passes (no errors in modified files)
- [x] Preview server starts without errors
- [x] `curl localhost:3457/api/orders/summary/extended` returns valid JSON
- [x] Response includes statusCounts, attention, agingOrders, stageMetrics fields

## API Usage

```bash
# Get extended summary
curl http://localhost:3456/api/orders/summary/extended
```

This endpoint provides the backend data foundation for the enhanced order status dashboard UI in subsequent plans.
