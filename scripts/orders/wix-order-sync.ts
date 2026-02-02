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
import { loadOrders, saveOrders, upsertWixOrder, clearWixOrders } from './order-store.js';
import { listAllProducts, listCollections } from '../pipeline/wix-api.js';

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
  /** Number of retry attempts used (0 if first attempt succeeded) */
  retriesUsed: number;
}

// =============================================================================
// Collection Map Builder
// =============================================================================

/** Names of WIX system collections to skip when resolving a product's brand. */
const SYSTEM_COLLECTIONS = new Set(['all products', 'featured products']);

/** Lookup maps for resolving a product to its WIX collection. */
interface CollectionLookup {
  /** catalogItemId → collection name */
  byId: Map<string, string>;
  /** lowercase product name → collection name (fallback for items without catalogReference) */
  byName: Map<string, string>;
}

/**
 * Build product-to-collection lookups by cross-referencing the WIX
 * Products API (which returns collectionIds on each product) with the
 * Collections API (which provides id → name mapping).
 *
 * Returns two maps: one keyed by product ID (primary) and one keyed by
 * lowercase product name (fallback for custom/manual line items that
 * have no catalogReference).
 *
 * Gracefully returns empty maps if either API call fails so that order
 * sync continues to work — labels will just show "General" instead.
 */
async function buildCollectionMap(): Promise<CollectionLookup> {
  const byId = new Map<string, string>();
  const byName = new Map<string, string>();

  try {
    const [products, collections] = await Promise.all([
      listAllProducts(),
      listCollections(),
    ]);

    // collectionId → name lookup
    const collectionNames = new Map<string, string>();
    for (const col of collections) {
      collectionNames.set(col.id, col.name);
    }

    // productId & productName → first non-system collection name
    for (const product of products) {
      const collectionIds = (product as Record<string, unknown>).collectionIds as
        | string[]
        | undefined;
      if (!collectionIds?.length) continue;

      for (const colId of collectionIds) {
        const name = collectionNames.get(colId);
        if (name && !SYSTEM_COLLECTIONS.has(name.toLowerCase())) {
          byId.set(product.id, name);
          byName.set(product.name.toLowerCase(), name);
          break;
        }
      }
    }

    console.log(`[ORDER SYNC] Built collection map: ${byId.size} products with collections`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(
      `[ORDER SYNC] Could not build collection map (labels will show 'General'): ${msg}`,
    );
  }

  return { byId, byName };
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
export async function syncWixOrders(days?: number, signal?: AbortSignal): Promise<SyncResult> {
  const lookbackDays = days ?? 30;
  const result: SyncResult = {
    newOrders: 0,
    updatedOrders: 0,
    totalWixOrders: 0,
    errors: [],
    retriesUsed: 0,
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
    console.log(`[ORDER SYNC] No WIX orders found (unfulfilled + last ${lookbackDays} days).`);
    return result;
  }

  console.log(`[ORDER SYNC] Processing ${wixOrders.length} WIX orders...`);

  // Build product-to-collection map for pickup label generation
  const collectionMap = await buildCollectionMap();

  // Process each order
  for (const wixOrder of wixOrders) {
    // Check for cancellation via AbortSignal
    if (signal?.aborted) {
      result.errors.push('Sync cancelled by user');
      console.log('[ORDER SYNC] Cancelled by user — stopping order processing.');
      return result;
    }

    try {
      const mapped = mapWixOrderToOrder(wixOrder);

      // Resolve collection from product catalog (for pickup labels).
      // Check ALL line items — the first item with a known collection wins.
      // Falls back to product name matching for custom items without catalogReference.
      if (!mapped.collection && wixOrder.lineItems?.length) {
        for (const li of wixOrder.lineItems) {
          // Primary: look up by catalog product ID
          const catId = li.catalogReference?.catalogItemId;
          if (catId && collectionMap.byId.has(catId)) {
            mapped.collection = collectionMap.byId.get(catId);
            break;
          }
          // Fallback: match product name (for manual/custom line items)
          const prodName = li.productName?.original ?? li.productName?.translated;
          if (prodName && collectionMap.byName.has(prodName.toLowerCase())) {
            mapped.collection = collectionMap.byName.get(prodName.toLowerCase());
            break;
          }
        }
      }
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
 * Sync WIX orders with automatic retry and exponential backoff.
 *
 * Wraps syncWixOrders() and retries on WIX API fetch failures (the
 * getRecentOrders call). Per-order errors are NOT retried — only the
 * initial API fetch.
 *
 * @param maxRetries - Maximum number of retry attempts (default 3)
 * @param baseDelayMs - Base delay in milliseconds for exponential backoff (default 2000)
 * @returns Sync result with retriesUsed count
 */
export async function syncWithRetry(
  maxRetries = 3,
  baseDelayMs = 2000,
): Promise<SyncResult> {
  let lastResult: SyncResult | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await syncWixOrders(60);

    // Check if the WIX API fetch itself failed (indicated by error containing "Failed to fetch WIX orders")
    const apiFetchFailed = result.errors.some((e) => e.startsWith('Failed to fetch WIX orders'));

    if (!apiFetchFailed || attempt === maxRetries) {
      result.retriesUsed = attempt;
      return result;
    }

    // Exponential backoff: baseDelayMs * 2^attempt (2s, 4s, 8s for default)
    const delay = baseDelayMs * Math.pow(2, attempt);
    console.log(`[ORDER SYNC] Retry ${attempt + 1}/${maxRetries} after ${delay}ms...`);
    await new Promise((resolve) => setTimeout(resolve, delay));

    lastResult = result;
  }

  // Should not reach here, but return last result if it does
  return lastResult!;
}

/**
 * Convenience: sync all unfulfilled orders + last 60 days.
 *
 * Uses syncWithRetry for automatic recovery from transient WIX API failures.
 *
 * @returns Sync result
 */
export async function autoSync(): Promise<SyncResult> {
  console.log('[ORDER SYNC] Running auto-sync (unfulfilled + last 60 days)...');
  return syncWithRetry();
}

/**
 * Clear all WIX orders from the local store and re-import fresh.
 *
 * This is a destructive operation — any manual status changes on WIX orders
 * will be lost. Manual orders are preserved.
 *
 * @returns Sync result (all orders will be counted as "new")
 */
export async function resetAndResync(): Promise<SyncResult> {
  const removed = await clearWixOrders();
  console.log(`[ORDER SYNC] Cleared ${removed} WIX orders from local store.`);
  console.log('[ORDER SYNC] Re-importing all WIX orders (unfulfilled + last 60 days)...');
  return syncWixOrders(60);
}
