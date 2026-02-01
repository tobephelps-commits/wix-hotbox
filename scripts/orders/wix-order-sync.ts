/**
 * WIX Order Sync
 *
 * Pulls WIX orders via the eCommerce Orders API and syncs them to the
 * local order store. Handles error tolerance so the order dashboard
 * continues working with manual orders even if WIX sync fails.
 *
 * Phase 18: Order Management — Invoice & Label Printing
 */

import { getRecentOrders, mapWixOrderToOrder } from './wix-orders-api.js';
import { loadOrders, saveOrders, upsertWixOrder } from './order-store.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Result of a WIX order sync operation.
 */
export interface SyncResult {
  /** Number of new orders added to the store */
  newOrders: number;
  /** Number of existing orders updated from WIX */
  updatedOrders: number;
  /** Total number of WIX orders fetched */
  totalWixOrders: number;
  /** Error messages (sync continues despite individual errors) */
  errors: string[];
}

// =============================================================================
// Sync Functions
// =============================================================================

/**
 * Fetch recent WIX orders and sync them to the local order store.
 *
 * For each WIX order:
 * 1. Map from WIX ecom format to unified Order
 * 2. Upsert into local store (new or update existing)
 * 3. Log each new/updated order
 *
 * Errors are captured in the result rather than thrown, ensuring the
 * order dashboard continues working even if WIX sync is broken.
 *
 * @param days - Number of days to look back (default 30)
 * @returns Sync result with counts and any errors
 */
export async function syncWixOrders(days?: number): Promise<SyncResult> {
  const lookbackDays = days ?? 30;
  const result: SyncResult = {
    newOrders: 0,
    updatedOrders: 0,
    totalWixOrders: 0,
    errors: [],
  };

  // Fetch WIX orders
  let wixOrders;
  try {
    wixOrders = await getRecentOrders(lookbackDays);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[ORDER SYNC] Failed to fetch WIX orders: ${msg}`);
    result.errors.push(`Failed to fetch WIX orders: ${msg}`);
    return result;
  }

  result.totalWixOrders = wixOrders.length;

  if (wixOrders.length === 0) {
    console.log(`[ORDER SYNC] No WIX orders found in the last ${lookbackDays} days.`);
    return result;
  }

  console.log(`[ORDER SYNC] Processing ${wixOrders.length} WIX orders...`);

  // Process each order
  for (const wixOrder of wixOrders) {
    try {
      const mapped = mapWixOrderToOrder(wixOrder);
      const { order, isNew } = await upsertWixOrder(mapped);

      const customerName = `${order.customer.firstName} ${order.customer.lastName}`.trim() || 'Unknown';

      if (isNew) {
        result.newOrders++;
        console.log(
          `[ORDER SYNC] New order #${order.orderNumber} from WIX — ${customerName}, $${order.total.toFixed(2)}`,
        );
      } else {
        result.updatedOrders++;
        console.log(
          `[ORDER SYNC] Updated order #${order.orderNumber} — status now '${order.status}'`,
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const orderId = wixOrder.id ?? 'unknown';
      console.error(`[ORDER SYNC] Error processing WIX order ${orderId}: ${msg}`);
      result.errors.push(`Error processing order ${orderId}: ${msg}`);
    }
  }

  // Update lastSync timestamp
  try {
    const store = await loadOrders();
    store.lastSync = new Date().toISOString();
    await saveOrders(store);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[ORDER SYNC] Failed to update lastSync: ${msg}`);
    result.errors.push(`Failed to update lastSync: ${msg}`);
  }

  // Log summary
  console.log(
    `[ORDER SYNC] Complete — ${result.newOrders} new, ${result.updatedOrders} updated, ` +
    `${result.totalWixOrders} total WIX orders` +
    (result.errors.length > 0 ? `, ${result.errors.length} errors` : ''),
  );

  return result;
}

/**
 * Convenience: sync last 7 days of WIX orders.
 *
 * @returns Sync result
 */
export async function autoSync(): Promise<SyncResult> {
  console.log('[ORDER SYNC] Running auto-sync (last 7 days)...');
  return syncWixOrders(7);
}
