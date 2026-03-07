/**
 * WIX Orders API Client & Sync Orchestration (v2.0)
 *
 * Ported from v1.x scripts/orders/wix-orders-api.ts and wix-order-sync.ts.
 * Fetches orders from WIX eCommerce API, maps them to v2.0 order model,
 * and syncs into the SQLite database via the order service.
 *
 * Auth: Accepts config parameter (WIX_API_KEY, WIX_SITE_ID from fastify.config)
 * rather than reading env directly — matches v2.0 patterns.
 *
 * Uses native fetch (Node 18+). No axios or node-fetch.
 *
 * Phase 49: Order Management Core
 */

import type Database from 'better-sqlite3';
import type { Config } from '../config.js';
import type {
  OrderStatus,
  OrderAddress,
  CreateOrderInput,
  OrderLineItem,
} from './types.js';
import { upsertWixOrder } from './order-service.js';

// =============================================================================
// Constants
// =============================================================================

/** WIX eCommerce V1 API base URL */
const ECOM_API_BASE = 'https://www.wixapis.com/ecom/v1';

/** WIX Stores V1 API base URL (products/collections) */
const STORES_API_BASE = 'https://www.wixapis.com/stores/v1';

/** WIX system collections to skip when resolving product brand */
const SYSTEM_COLLECTIONS = new Set(['all products', 'featured products']);

// =============================================================================
// WIX eCommerce Order Types (local, matching V1 response shape)
// =============================================================================

/** WIX ecom buyer info */
interface WixBuyerInfo {
  contactId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  visitorId?: string;
}

/** WIX ecom contact details (found in billingInfo/shippingInfo) */
interface WixContactDetails {
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
}

/** WIX ecom address */
interface WixAddress {
  firstName?: string;
  lastName?: string;
  company?: string;
  /** WIX V1 uses addressLine (not addressLine1) */
  addressLine?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  subdivision?: string;
  subdivisionFullname?: string;
  country?: string;
  countryFullname?: string;
  postalCode?: string;
  phone?: string;
}

/** WIX ecom address with contact info wrapper */
interface WixAddressWithContact {
  address?: WixAddress;
  contactDetails?: WixContactDetails;
}

/** WIX ecom line item image */
interface WixLineItemImage {
  url?: string;
  width?: number;
  height?: number;
}

/** WIX ecom line item price */
interface WixLineItemPrice {
  amount?: string;
}

/** WIX ecom physical properties */
interface WixPhysicalProperties {
  sku?: string;
  weight?: number;
}

/** WIX ecom item description line (for variant info) */
interface WixDescriptionLine {
  name?: { original?: string; translated?: string };
  plainText?: { original?: string; translated?: string };
  colorInfo?: { original?: string; translated?: string; code?: string };
}

/** WIX ecom line item */
interface WixLineItem {
  id?: string;
  productName?: { original?: string; translated?: string };
  quantity?: number;
  price?: WixLineItemPrice;
  totalPriceAfterTax?: WixLineItemPrice;
  image?: WixLineItemImage;
  physicalProperties?: WixPhysicalProperties;
  descriptionLines?: WixDescriptionLine[];
  catalogReference?: {
    catalogItemId?: string;
    appId?: string;
    options?: Record<string, unknown>;
  };
}

/** WIX ecom price summary */
interface WixPriceSummary {
  subtotal?: { amount?: string };
  shipping?: { amount?: string };
  tax?: { amount?: string };
  discount?: { amount?: string };
  total?: { amount?: string };
}

/** WIX ecom order (V1 response shape) */
interface WixEcomOrder {
  id?: string;
  number?: number;
  status?: string;
  paymentStatus?: string;
  fulfillmentStatus?: string;
  buyerInfo?: WixBuyerInfo;
  billingInfo?: WixAddressWithContact;
  shippingInfo?: {
    carrierId?: string;
    code?: string;
    title?: string;
    logistics?: {
      deliveryAddress?: WixAddress;
      pickupDetails?: {
        address?: WixAddress;
        pickupMethod?: string;
      };
    };
  };
  lineItems?: WixLineItem[];
  priceSummary?: WixPriceSummary;
  createdDate?: string;
  updatedDate?: string;
  buyerNote?: string;
}

/** WIX search orders response */
interface WixSearchOrdersResponse {
  orders?: WixEcomOrder[];
  pagingMetadata?: {
    count?: number;
    cursors?: {
      next?: string;
    };
  };
}

/** WIX product from Stores V1 API */
interface WixStoreProduct {
  id: string;
  name: string;
  collectionIds?: string[];
  [key: string]: unknown;
}

/** WIX collection from Stores V1 API */
interface WixStoreCollection {
  id: string;
  name: string;
  [key: string]: unknown;
}

// =============================================================================
// Exported Types
// =============================================================================

/**
 * Result of a WIX order sync operation.
 */
export interface SyncResult {
  /** Number of new orders added */
  newOrders: number;
  /** Number of existing orders updated from WIX */
  updatedOrders: number;
  /** Number of orders unchanged */
  unchanged: number;
  /** Total number of WIX orders fetched */
  totalWixOrders: number;
  /** Error messages (sync continues despite individual errors) */
  errors: string[];
  /** Timestamp when sync completed */
  syncedAt: string;
  /** Number of retry attempts used (present on syncWithRetry result) */
  retriesUsed?: number;
}

/**
 * Options for sync operations.
 */
export interface SyncOptions {
  /** Number of days to look back for recent orders (default: 60) */
  days?: number;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

/**
 * Options for syncWithRetry.
 */
export interface RetryOptions extends SyncOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay in milliseconds for exponential backoff (default: 2000) */
  baseDelayMs?: number;
}

// =============================================================================
// Auth Helpers
// =============================================================================

/**
 * Build standard headers for WIX API requests.
 * Config must have wixApiKey and wixSiteId set.
 */
function getHeaders(config: Config): Record<string, string> {
  if (!config.wixApiKey) {
    throw new Error(
      'WIX_API_KEY is not configured.\n' +
      'Set WIX_API_KEY in your .env file.\n' +
      'To obtain your API key:\n' +
      '  1. Go to WIX Dashboard -> Developer Tools -> API Keys\n' +
      '  2. Generate an API Key with "Manage Orders" permission\n' +
      '  3. Add WIX_API_KEY=your_key to your .env file'
    );
  }

  if (!config.wixSiteId) {
    throw new Error(
      'WIX_SITE_ID is not configured.\n' +
      'Set WIX_SITE_ID in your .env file or config.'
    );
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.wixApiKey}`,
    'wix-site-id': config.wixSiteId,
  };
}

/**
 * Handle WIX API error responses with descriptive messages.
 */
async function handleErrorResponse(
  response: Response,
  endpoint: string,
  context?: string,
): Promise<never> {
  let errorBody: string;
  try {
    errorBody = await response.text();
  } catch {
    errorBody = '(unable to read response body)';
  }

  let wixMessage = errorBody;
  try {
    const parsed = JSON.parse(errorBody);
    if (parsed.message) {
      wixMessage = parsed.message;
    } else if (parsed.details) {
      wixMessage = JSON.stringify(parsed.details);
    }
  } catch {
    // Use raw text
  }

  const contextStr = context ? ` [${context}]` : '';

  switch (response.status) {
    case 401:
      throw new Error(
        `WIX Orders API 401 Unauthorized at ${endpoint}${contextStr}: ${wixMessage}\n` +
        'Check that WIX_API_KEY is valid and has "Manage Orders" or "Read Orders" permission.'
      );
    case 403:
      throw new Error(
        `WIX Orders API 403 Forbidden at ${endpoint}${contextStr}: ${wixMessage}\n` +
        'The API key may lack the required "Manage Orders" or "Read Orders" permission.'
      );
    case 404:
      throw new Error(
        `WIX Orders API 404 Not Found at ${endpoint}${contextStr}: ${wixMessage}`
      );
    case 400:
      throw new Error(
        `WIX Orders API 400 Bad Request at ${endpoint}${contextStr}: ${wixMessage}`
      );
    default:
      throw new Error(
        `WIX Orders API ${response.status} at ${endpoint}${contextStr}: ${wixMessage}`
      );
  }
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Parse a WIX monetary amount string to a number.
 * WIX returns amounts as strings like "29.99".
 */
function parseAmount(amount?: string): number {
  if (!amount) return 0;
  const parsed = parseFloat(amount);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Extract a subdivision code (state) from WIX subdivision format.
 * WIX returns subdivision as "US-WA" or just "WA".
 */
function parseSubdivision(subdivision?: string): string {
  if (!subdivision) return '';
  const parts = subdivision.split('-');
  return parts.length > 1 ? parts[parts.length - 1] : subdivision;
}

// =============================================================================
// WIX API Functions
// =============================================================================

/**
 * Search orders using the WIX eCommerce V1 search endpoint.
 *
 * POST /ecom/v1/orders/search
 *
 * Handles cursor-based pagination to fetch all matching orders.
 *
 * @param config - Application config with WIX credentials
 * @param filter - Optional WIX filter object
 * @param limit - Results per page (default 50)
 * @returns Array of raw WIX ecom orders
 */
export async function searchWixOrders(
  config: Config,
  filter?: Record<string, unknown>,
  limit?: number,
): Promise<WixEcomOrder[]> {
  const endpoint = `${ECOM_API_BASE}/orders/search`;
  const pageSize = limit ?? 50;
  const allOrders: WixEcomOrder[] = [];
  let cursor: string | undefined;

  console.log('[WIX SYNC] Searching orders...');

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const body: Record<string, unknown> = {
      search: {
        ...(filter ? { filter } : {}),
        cursorPaging: {
          limit: pageSize,
          ...(cursor ? { cursor } : {}),
        },
      },
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: getHeaders(config),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      await handleErrorResponse(response, endpoint, 'searchWixOrders');
    }

    const data = await response.json() as WixSearchOrdersResponse;
    const orders = data.orders ?? [];
    allOrders.push(...orders);

    // Check for next page
    const nextCursor = data.pagingMetadata?.cursors?.next;
    if (!nextCursor || orders.length < pageSize) {
      break;
    }

    cursor = nextCursor;
  }

  console.log(`[WIX SYNC] Found ${allOrders.length} orders.`);
  return allOrders;
}

/**
 * Get a single order by ID.
 *
 * GET /ecom/v1/orders/{orderId}
 *
 * @param config - Application config with WIX credentials
 * @param orderId - The WIX order ID
 * @returns The raw WIX ecom order
 */
export async function getWixOrder(
  config: Config,
  orderId: string,
): Promise<WixEcomOrder> {
  const endpoint = `${ECOM_API_BASE}/orders/${orderId}`;

  console.log(`[WIX SYNC] Fetching order ${orderId}...`);

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: getHeaders(config),
  });

  if (!response.ok) {
    await handleErrorResponse(response, endpoint, `orderId=${orderId}`);
  }

  const data = await response.json() as { order: WixEcomOrder };
  return data.order;
}

/**
 * Get orders that need attention: all unfulfilled orders regardless of age,
 * plus any orders from the last N days (default 60).
 *
 * This ensures no unfulfilled order is missed even if it's older than the
 * lookback window, while also picking up recently fulfilled/cancelled orders
 * for status sync.
 *
 * @param config - Application config with WIX credentials
 * @param days - Max lookback for fulfilled orders (default 60)
 * @returns Array of deduplicated WIX ecom orders sorted by createdDate DESC
 */
export async function getRecentWixOrders(
  config: Config,
  days?: number,
): Promise<WixEcomOrder[]> {
  const lookbackDays = Math.min(days ?? 60, 60);

  // 1. Fetch all unfulfilled orders (no date limit)
  console.log('[WIX SYNC] Fetching all unfulfilled orders...');
  const unfulfilledFilter = {
    fulfillmentStatus: {
      $in: ['NOT_FULFILLED', 'PARTIALLY_FULFILLED'],
    },
  };
  const unfulfilled = await searchWixOrders(config, unfulfilledFilter);
  console.log(`[WIX SYNC] Found ${unfulfilled.length} unfulfilled orders.`);

  // 2. Fetch recent orders (up to lookback window) for status sync
  const since = new Date();
  since.setDate(since.getDate() - lookbackDays);
  console.log(`[WIX SYNC] Fetching orders from last ${lookbackDays} days...`);
  const recentFilter = {
    createdDate: {
      $gte: since.toISOString(),
    },
  };
  const recent = await searchWixOrders(config, recentFilter);

  // 3. Deduplicate by order ID
  const orderMap = new Map<string, WixEcomOrder>();
  for (const order of unfulfilled) {
    if (order.id) orderMap.set(order.id, order);
  }
  for (const order of recent) {
    if (order.id) orderMap.set(order.id, order);
  }

  const orders = Array.from(orderMap.values());
  console.log(`[WIX SYNC] ${orders.length} unique orders after dedup.`);

  // Sort by createdDate descending (most recent first)
  orders.sort((a, b) => {
    const dateA = a.createdDate ? new Date(a.createdDate).getTime() : 0;
    const dateB = b.createdDate ? new Date(b.createdDate).getTime() : 0;
    return dateB - dateA;
  });

  return orders;
}

// =============================================================================
// Mapping Functions
// =============================================================================

/**
 * Map WIX payment/fulfillment status to our OrderStatus.
 *
 * Status mapping:
 * - FULFILLED -> 'shipped'
 * - PARTIALLY_FULFILLED -> 'packed'
 * - NOT_FULFILLED + PAID -> 'new'
 * - CANCELED -> 'cancelled'
 * - Default -> 'new'
 */
export function mapWixStatusToOrderStatus(wixOrder: WixEcomOrder): OrderStatus {
  // Check for cancellation first
  if (wixOrder.status === 'CANCELED' || wixOrder.status === 'CANCELLED') {
    return 'cancelled';
  }

  // Map based on fulfillment status
  if (wixOrder.fulfillmentStatus === 'FULFILLED') {
    return 'shipped';
  }

  if (wixOrder.fulfillmentStatus === 'PARTIALLY_FULFILLED') {
    return 'packed';
  }

  // Default: new order (regardless of payment status)
  return 'new';
}

/**
 * Map a WIX address to our OrderAddress.
 * WIX V1 ecom uses `addressLine` (single field), not `addressLine1`/`addressLine2`.
 */
function mapWixAddress(
  wixAddr?: WixAddress,
  contactDetails?: WixContactDetails,
): OrderAddress | undefined {
  if (!wixAddr) return undefined;

  return {
    firstName: contactDetails?.firstName ?? wixAddr.firstName ?? '',
    lastName: contactDetails?.lastName ?? wixAddr.lastName ?? '',
    company: contactDetails?.company ?? wixAddr.company ?? undefined,
    addressLine1: wixAddr.addressLine ?? wixAddr.addressLine1 ?? '',
    addressLine2: wixAddr.addressLine2 || undefined,
    city: wixAddr.city ?? '',
    state: parseSubdivision(wixAddr.subdivision),
    postalCode: wixAddr.postalCode ?? '',
    country: wixAddr.country ?? 'US',
    phone: contactDetails?.phone ?? wixAddr.phone ?? undefined,
  };
}

/**
 * Extract color and size from WIX line item description lines.
 */
function extractVariantInfo(
  descriptionLines?: WixDescriptionLine[],
): { color?: string; size?: string } {
  const result: { color?: string; size?: string } = {};
  if (!descriptionLines) return result;

  for (const line of descriptionLines) {
    const name =
      line.name?.original?.toLowerCase() ??
      line.name?.translated?.toLowerCase() ??
      '';
    const value = line.plainText?.original ?? line.plainText?.translated ?? '';
    const colorValue =
      line.colorInfo?.original ?? line.colorInfo?.translated ?? '';

    if (name === 'color' || name === 'colour' || colorValue) {
      result.color = colorValue || value;
    } else if (name === 'size') {
      result.size = value;
    }
  }

  return result;
}

/**
 * Map a WIX ecom line item to our OrderLineItem shape (for CreateOrderInput).
 */
function mapWixLineItem(
  item: WixLineItem,
): Omit<OrderLineItem, 'id' | 'orderId' | 'createdAt'> {
  const variantInfo = extractVariantInfo(item.descriptionLines);
  const unitPrice = parseAmount(item.price?.amount);
  const quantity = item.quantity ?? 1;

  return {
    productName:
      item.productName?.original ??
      item.productName?.translated ??
      'Unknown Product',
    sku: item.physicalProperties?.sku || undefined,
    quantity,
    unitPrice,
    totalPrice:
      parseAmount(item.totalPriceAfterTax?.amount) || unitPrice * quantity,
    color: variantInfo.color || undefined,
    size: variantInfo.size || undefined,
    imageUrl: item.image?.url || undefined,
  };
}

/**
 * Map a WIX ecom order to a CreateOrderInput shape with wixOrderId.
 *
 * Maps buyer info, addresses, line items, and price summary from WIX
 * eCommerce V1 format to the v2.0 CreateOrderInput type.
 *
 * @param wixOrder - Raw WIX ecom order
 * @param collectionMap - Optional product-to-collection lookup
 * @returns CreateOrderInput with wixOrderId attached
 */
export function mapWixOrderToCreateInput(
  wixOrder: WixEcomOrder,
  collectionMap?: Map<string, string>,
): CreateOrderInput & { wixOrderId: string } {
  // Customer info from billingInfo.contactDetails (primary) or buyerInfo (fallback)
  const billingContact = wixOrder.billingInfo?.contactDetails;

  const customerFirstName =
    billingContact?.firstName ?? wixOrder.buyerInfo?.firstName ?? undefined;
  const customerLastName =
    billingContact?.lastName ?? wixOrder.buyerInfo?.lastName ?? undefined;
  const customerEmail = wixOrder.buyerInfo?.email || undefined;
  const customerPhone =
    billingContact?.phone ?? wixOrder.buyerInfo?.phone ?? undefined;

  const billingAddress = mapWixAddress(
    wixOrder.billingInfo?.address,
    wixOrder.billingInfo?.contactDetails,
  );
  const shippingAddress = mapWixAddress(
    wixOrder.shippingInfo?.logistics?.deliveryAddress,
  );

  const items = (wixOrder.lineItems ?? []).map(mapWixLineItem);

  // Resolve collection from product catalog if map is provided
  let collection: string | undefined;
  if (collectionMap && wixOrder.lineItems?.length) {
    for (const li of wixOrder.lineItems) {
      // Primary: look up by catalog product ID
      const catId = li.catalogReference?.catalogItemId;
      if (catId && collectionMap.has(catId)) {
        collection = collectionMap.get(catId);
        break;
      }
      // Fallback: match product name (for manual/custom line items)
      const prodName =
        li.productName?.original ?? li.productName?.translated;
      if (prodName && collectionMap.has(prodName.toLowerCase())) {
        collection = collectionMap.get(prodName.toLowerCase());
        break;
      }
    }
  }

  return {
    source: 'wix',
    customerFirstName,
    customerLastName,
    customerEmail,
    customerPhone,
    billingAddress,
    shippingAddress,
    collection,
    notes: wixOrder.buyerNote || undefined,
    subtotal: parseAmount(wixOrder.priceSummary?.subtotal?.amount),
    shippingCost: parseAmount(wixOrder.priceSummary?.shipping?.amount),
    tax: parseAmount(wixOrder.priceSummary?.tax?.amount),
    discount: parseAmount(wixOrder.priceSummary?.discount?.amount),
    total: parseAmount(wixOrder.priceSummary?.total?.amount),
    items,
    wixOrderId: wixOrder.id ?? '',
  };
}

// =============================================================================
// Collection Resolution
// =============================================================================

/**
 * Build a product-to-collection lookup map by cross-referencing the WIX
 * Products API (which returns collectionIds on each product) with the
 * Collections API (which provides id -> name mapping).
 *
 * Returns a combined map keyed by both product ID and lowercase product name.
 * Product ID is the primary lookup; product name is a fallback for custom items.
 *
 * Gracefully returns empty map if either API call fails so that order
 * sync continues to work -- labels will just show no collection.
 *
 * @param config - Application config with WIX credentials
 * @returns Map of productId/productName -> collectionName
 */
export async function buildCollectionMap(
  config: Config,
): Promise<Map<string, string>> {
  const result = new Map<string, string>();

  try {
    const headers = getHeaders(config);

    // Fetch all products (paginated)
    const allProducts: WixStoreProduct[] = [];
    let offset = 0;
    const pageSize = 100;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const response = await fetch(`${STORES_API_BASE}/products/query`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: { paging: { limit: pageSize, offset } },
          includeVariants: false,
        }),
      });

      if (!response.ok) {
        await handleErrorResponse(
          response,
          `${STORES_API_BASE}/products/query`,
          'buildCollectionMap',
        );
      }

      const data = await response.json() as {
        products: WixStoreProduct[];
        totalResults: number;
      };
      allProducts.push(...data.products);

      if (
        allProducts.length >= data.totalResults ||
        data.products.length < pageSize
      ) {
        break;
      }
      offset += pageSize;
    }

    // Fetch all collections (paginated)
    const allCollections: WixStoreCollection[] = [];
    offset = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const response = await fetch(`${STORES_API_BASE}/collections/query`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: { paging: { limit: pageSize, offset } },
        }),
      });

      if (!response.ok) {
        await handleErrorResponse(
          response,
          `${STORES_API_BASE}/collections/query`,
          'buildCollectionMap',
        );
      }

      const data = await response.json() as {
        collections: WixStoreCollection[];
        totalResults: number;
      };
      allCollections.push(...data.collections);

      if (
        allCollections.length >= data.totalResults ||
        data.collections.length < pageSize
      ) {
        break;
      }
      offset += pageSize;
    }

    // Build collectionId -> name lookup
    const collectionNames = new Map<string, string>();
    for (const col of allCollections) {
      collectionNames.set(col.id, col.name);
    }

    // Map productId & productName -> first non-system collection name
    for (const product of allProducts) {
      const collectionIds = product.collectionIds;
      if (!collectionIds?.length) continue;

      for (const colId of collectionIds) {
        const name = collectionNames.get(colId);
        if (name && !SYSTEM_COLLECTIONS.has(name.toLowerCase())) {
          result.set(product.id, name);
          result.set(product.name.toLowerCase(), name);
          break;
        }
      }
    }

    console.log(
      `[WIX SYNC] Built collection map: ${result.size} entries from ${allProducts.length} products`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(
      `[WIX SYNC] Could not build collection map (orders will sync without collection tags): ${msg}`,
    );
  }

  return result;
}

// =============================================================================
// Sync Orchestration
// =============================================================================

/**
 * Fetch recent WIX orders and sync them into the SQLite database.
 *
 * For each WIX order:
 * 1. Map from WIX ecom format to CreateOrderInput
 * 2. Upsert into database (new or update existing)
 * 3. Track results
 *
 * Errors on individual orders are captured in the result rather than thrown,
 * ensuring the sync process continues even if some orders fail.
 *
 * @param config - Application config with WIX credentials
 * @param db - SQLite database instance
 * @param options - Optional sync configuration (days, abort signal)
 * @returns Sync result with counts and any errors
 */
export async function syncWixOrders(
  config: Config,
  db: Database.Database,
  options?: SyncOptions,
): Promise<SyncResult> {
  const result: SyncResult = {
    newOrders: 0,
    updatedOrders: 0,
    unchanged: 0,
    totalWixOrders: 0,
    errors: [],
    syncedAt: new Date().toISOString(),
  };

  // Fetch WIX orders
  let wixOrders: WixEcomOrder[];
  try {
    wixOrders = await getRecentWixOrders(config, options?.days);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[WIX SYNC] Failed to fetch WIX orders: ${msg}`);
    result.errors.push(`Failed to fetch WIX orders: ${msg}`);
    return result;
  }

  result.totalWixOrders = wixOrders.length;

  if (wixOrders.length === 0) {
    console.log('[WIX SYNC] No WIX orders found.');
    return result;
  }

  console.log(`[WIX SYNC] Processing ${wixOrders.length} WIX orders...`);

  // Build product-to-collection map
  const collectionMap = await buildCollectionMap(config);

  // Process each order
  for (const wixOrder of wixOrders) {
    // Check for cancellation via AbortSignal
    if (options?.signal?.aborted) {
      result.errors.push('Sync cancelled');
      console.log('[WIX SYNC] Cancelled -- stopping order processing.');
      break;
    }

    try {
      const mapped = mapWixOrderToCreateInput(wixOrder, collectionMap);
      const { order, action } = upsertWixOrder(db, mapped);

      const customerName =
        `${order.customerFirstName ?? ''} ${order.customerLastName ?? ''}`.trim() ||
        'Unknown';

      if (action === 'created') {
        result.newOrders++;
        console.log(
          `[WIX SYNC] New order #${order.orderNumber} -- ${customerName}, $${order.total.toFixed(2)}`,
        );
      } else if (action === 'updated') {
        result.updatedOrders++;
        console.log(
          `[WIX SYNC] Updated order #${order.orderNumber} -- status '${order.status}'`,
        );
      } else {
        result.unchanged++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const orderId = wixOrder.id ?? 'unknown';
      console.error(
        `[WIX SYNC] Error processing WIX order ${orderId}: ${msg}`,
      );
      result.errors.push(`Error processing order ${orderId}: ${msg}`);
    }
  }

  // Log summary
  console.log(
    `[WIX SYNC] Complete -- ${result.newOrders} new, ${result.updatedOrders} updated, ` +
    `${result.unchanged} unchanged, ${result.totalWixOrders} total WIX orders` +
    (result.errors.length > 0 ? `, ${result.errors.length} errors` : ''),
  );

  return result;
}

/**
 * Sync WIX orders with automatic retry and exponential backoff.
 *
 * Wraps syncWixOrders() and retries on WIX API fetch failures.
 * Per-order errors are NOT retried -- only the initial API fetch.
 *
 * @param config - Application config with WIX credentials
 * @param db - SQLite database instance
 * @param options - Optional retry and sync configuration
 * @returns Sync result with retriesUsed count
 */
export async function syncWithRetry(
  config: Config,
  db: Database.Database,
  options?: RetryOptions,
): Promise<SyncResult> {
  const maxRetries = options?.maxRetries ?? 3;
  const baseDelayMs = options?.baseDelayMs ?? 2000;
  let lastResult: SyncResult | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const syncResult = await syncWixOrders(config, db, {
      days: options?.days,
      signal: options?.signal,
    });

    // Check if the WIX API fetch itself failed
    const apiFetchFailed = syncResult.errors.some((e) =>
      e.startsWith('Failed to fetch WIX orders'),
    );

    if (!apiFetchFailed || attempt === maxRetries) {
      syncResult.retriesUsed = attempt;
      return syncResult;
    }

    // Exponential backoff: baseDelayMs * 2^attempt (2s, 4s, 8s for default)
    const delay = baseDelayMs * Math.pow(2, attempt);
    console.log(
      `[WIX SYNC] Retry ${attempt + 1}/${maxRetries} after ${delay}ms...`,
    );
    await new Promise((resolve) => setTimeout(resolve, delay));

    lastResult = syncResult;
  }

  // Should not reach here, but return last result if it does
  return lastResult!;
}
