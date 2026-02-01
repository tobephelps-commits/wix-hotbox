/**
 * WIX eCommerce Orders V1 API Client
 *
 * Wraps the WIX eCommerce V1 Orders API for fetching and searching orders.
 * Transforms WIX order shapes into the unified Order interface used by
 * the order management system.
 *
 * API Base: https://www.wixapis.com/ecom/v1
 * Required permissions: "Manage Orders" or "Read Orders"
 *
 * Auth pattern: Local helpers duplicated from wix-api.ts (per Phase 15-03 decision).
 *
 * Phase 18: Order Management — Invoice & Label Printing
 */

import 'dotenv/config';
import { fileURLToPath } from 'url';
import path from 'path';
import type { Order, OrderStatus, OrderLineItem, OrderAddress, OrderCustomer } from './types.js';

// =============================================================================
// Constants
// =============================================================================

/** WIX site ID (same as wix-api.ts) */
const WIX_SITE_ID = 'c744cbdb-46f8-4c66-ac76-eb31bd0d52c1';

/** WIX eCommerce V1 API base URL */
const ECOM_API_BASE = 'https://www.wixapis.com/ecom/v1';

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

// =============================================================================
// Auth Helpers (local equivalents — avoids modifying wix-api.ts internals)
// =============================================================================

/**
 * Get the WIX API key from environment.
 * Throws an actionable error if not configured.
 */
function getApiKey(): string {
  const apiKey = process.env.WIX_API_KEY;
  if (!apiKey) {
    throw new Error(
      'WIX_API_KEY environment variable is not set.\n' +
      'To obtain your API key:\n' +
      '  1. Go to WIX Dashboard -> Developer Tools -> API Keys\n' +
      '  2. Generate an API Key with "Manage Orders" or "Read Orders" permission\n' +
      '  3. Add WIX_API_KEY=your_key to your .env file\n' +
      'See .env.example for details.'
    );
  }
  return apiKey;
}

/**
 * Build standard headers for WIX API requests.
 */
function getHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getApiKey()}`,
    'wix-site-id': WIX_SITE_ID,
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
        'Check that WIX_API_KEY in .env is valid and has "Manage Orders" or "Read Orders" permission.\n' +
        'Go to WIX Dashboard -> Developer Tools -> API Keys and verify permissions.'
      );
    case 403:
      throw new Error(
        `WIX Orders API 403 Forbidden at ${endpoint}${contextStr}: ${wixMessage}\n` +
        'The API key may lack the required "Manage Orders" or "Read Orders" permission.\n' +
        'Go to WIX Dashboard -> Developer Tools -> API Keys and verify permissions.'
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
  // Strip country prefix if present (e.g., "US-WA" -> "WA")
  const parts = subdivision.split('-');
  return parts.length > 1 ? parts[parts.length - 1] : subdivision;
}

// =============================================================================
// Public API Functions
// =============================================================================

/**
 * Search orders using the WIX eCommerce V1 search endpoint.
 *
 * POST /ecom/v1/orders/search
 *
 * Handles cursor-based pagination to fetch all matching orders.
 *
 * @param filter - Optional WIX filter object
 * @param limit - Results per page (default 50)
 * @returns Array of raw WIX ecom orders
 */
export async function searchOrders(
  filter?: Record<string, unknown>,
  limit?: number,
): Promise<WixEcomOrder[]> {
  const endpoint = `${ECOM_API_BASE}/orders/search`;
  const pageSize = limit ?? 50;
  const allOrders: WixEcomOrder[] = [];
  let cursor: string | undefined;

  console.log('[WIX Orders] Searching orders...');

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
      headers: getHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      await handleErrorResponse(response, endpoint, 'searchOrders');
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

  console.log(`[WIX Orders] Found ${allOrders.length} orders.`);
  return allOrders;
}

/**
 * Get a single order by ID.
 *
 * GET /ecom/v1/orders/{orderId}
 *
 * @param orderId - The WIX order ID
 * @returns The raw WIX ecom order
 */
export async function getOrder(orderId: string): Promise<WixEcomOrder> {
  const endpoint = `${ECOM_API_BASE}/orders/${orderId}`;

  console.log(`[WIX Orders] Fetching order ${orderId}...`);

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    await handleErrorResponse(response, endpoint, `orderId=${orderId}`);
  }

  const data = await response.json() as { order: WixEcomOrder };
  return data.order;
}

/**
 * Get recent orders from the last N days.
 *
 * Convenience wrapper around searchOrders with a date filter.
 *
 * @param days - Number of days to look back (default 30)
 * @returns Array of raw WIX ecom orders sorted by createdDate DESC
 */
export async function getRecentOrders(days?: number): Promise<WixEcomOrder[]> {
  const lookbackDays = days ?? 30;
  const since = new Date();
  since.setDate(since.getDate() - lookbackDays);

  console.log(`[WIX Orders] Fetching orders from last ${lookbackDays} days...`);

  const filter = {
    createdDate: {
      $gte: since.toISOString(),
    },
  };

  const orders = await searchOrders(filter);

  // Sort by createdDate descending (most recent first)
  orders.sort((a, b) => {
    const dateA = a.createdDate ? new Date(a.createdDate).getTime() : 0;
    const dateB = b.createdDate ? new Date(b.createdDate).getTime() : 0;
    return dateB - dateA;
  });

  return orders;
}

// =============================================================================
// Order Mapping
// =============================================================================

/**
 * Map WIX payment/fulfillment status to our OrderStatus.
 *
 * Status mapping:
 * - PAID + NOT_FULFILLED -> 'new'
 * - PAID + FULFILLED -> 'shipped'
 * - PAID + PARTIALLY_FULFILLED -> 'packed' (approximation)
 * - NOT_PAID -> 'new'
 * - CANCELED -> 'cancelled'
 */
function mapWixStatusToOrderStatus(
  paymentStatus?: string,
  fulfillmentStatus?: string,
  orderStatus?: string,
): OrderStatus {
  // Check for cancellation first
  if (orderStatus === 'CANCELED' || orderStatus === 'CANCELLED') {
    return 'cancelled';
  }

  // Map based on fulfillment status
  if (fulfillmentStatus === 'FULFILLED') {
    return 'shipped';
  }

  if (fulfillmentStatus === 'PARTIALLY_FULFILLED') {
    return 'packed';
  }

  // Default: new order (regardless of payment status)
  return 'new';
}

/**
 * Map a WIX address to our OrderAddress.
 * WIX V1 ecom uses `addressLine` (single field), not `addressLine1`/`addressLine2`.
 * Contact details (name, phone) come from the parent contactDetails object.
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
function extractVariantInfo(descriptionLines?: WixDescriptionLine[]): { color?: string; size?: string } {
  const result: { color?: string; size?: string } = {};
  if (!descriptionLines) return result;

  for (const line of descriptionLines) {
    const name = line.name?.original?.toLowerCase() ?? line.name?.translated?.toLowerCase() ?? '';
    const value = line.plainText?.original ?? line.plainText?.translated ?? '';
    const colorValue = line.colorInfo?.original ?? line.colorInfo?.translated ?? '';

    if (name === 'color' || name === 'colour' || colorValue) {
      result.color = colorValue || value;
    } else if (name === 'size') {
      result.size = value;
    }
  }

  return result;
}

/**
 * Map a WIX ecom line item to our OrderLineItem.
 */
function mapWixLineItem(item: WixLineItem): OrderLineItem {
  const variantInfo = extractVariantInfo(item.descriptionLines);
  const unitPrice = parseAmount(item.price?.amount);
  const quantity = item.quantity ?? 1;

  return {
    productName: item.productName?.original ?? item.productName?.translated ?? 'Unknown Product',
    sku: item.physicalProperties?.sku || undefined,
    quantity,
    unitPrice,
    totalPrice: parseAmount(item.totalPriceAfterTax?.amount) || unitPrice * quantity,
    color: variantInfo.color || undefined,
    size: variantInfo.size || undefined,
    imageUrl: item.image?.url || undefined,
  };
}

/**
 * Transform a WIX ecom order to our unified Order interface.
 *
 * Maps buyer info, addresses, line items, and price summary from WIX
 * eCommerce V1 format to the unified Order type.
 *
 * @param wixOrder - Raw WIX ecom order
 * @returns Unified Order object
 */
export function mapWixOrderToOrder(wixOrder: WixEcomOrder): Order {
  const status = mapWixStatusToOrderStatus(
    wixOrder.paymentStatus,
    wixOrder.fulfillmentStatus,
    wixOrder.status,
  );

  // Customer name comes from billingInfo.contactDetails (primary) or buyerInfo (fallback)
  const billingContact = wixOrder.billingInfo?.contactDetails;
  const customer: OrderCustomer = {
    firstName: billingContact?.firstName ?? wixOrder.buyerInfo?.firstName ?? '',
    lastName: billingContact?.lastName ?? wixOrder.buyerInfo?.lastName ?? '',
    email: wixOrder.buyerInfo?.email || undefined,
    phone: billingContact?.phone ?? wixOrder.buyerInfo?.phone ?? undefined,
  };

  const billingAddress = mapWixAddress(
    wixOrder.billingInfo?.address,
    wixOrder.billingInfo?.contactDetails,
  );
  const shippingAddress = mapWixAddress(
    wixOrder.shippingInfo?.logistics?.deliveryAddress,
  );

  const lineItems = (wixOrder.lineItems ?? []).map(mapWixLineItem);

  const now = new Date().toISOString();

  return {
    id: wixOrder.id ?? '',
    orderNumber: wixOrder.number ?? 0,
    source: 'wix',
    wixOrderId: wixOrder.id,
    status,
    customer,
    billingAddress,
    shippingAddress,
    lineItems,
    subtotal: parseAmount(wixOrder.priceSummary?.subtotal?.amount),
    shippingCost: parseAmount(wixOrder.priceSummary?.shipping?.amount),
    tax: parseAmount(wixOrder.priceSummary?.tax?.amount),
    discount: parseAmount(wixOrder.priceSummary?.discount?.amount),
    total: parseAmount(wixOrder.priceSummary?.total?.amount),
    notes: wixOrder.buyerNote || undefined,
    createdAt: wixOrder.createdDate ?? now,
    updatedAt: wixOrder.updatedDate ?? now,
    statusHistory: [
      {
        status,
        timestamp: wixOrder.createdDate ?? now,
        note: 'Imported from WIX',
      },
    ],
  };
}

// =============================================================================
// CLI Runner
// =============================================================================

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const command = process.argv[2];

  if (command === '--recent') {
    const days = process.argv[3] ? parseInt(process.argv[3], 10) : 30;

    try {
      const wixOrders = await getRecentOrders(days);

      if (wixOrders.length === 0) {
        console.log(`\nNo orders found in the last ${days} days.`);
        process.exit(0);
      }

      const orders = wixOrders.map(mapWixOrderToOrder);

      console.log(`\n${'='.repeat(80)}`);
      console.log(`Recent Orders (last ${days} days): ${orders.length} found`);
      console.log('='.repeat(80));

      // Summary table
      console.log(
        '\n' +
        'Order#'.padEnd(10) +
        'Customer'.padEnd(25) +
        'Status'.padEnd(16) +
        'Items'.padEnd(8) +
        'Total'.padEnd(12) +
        'Date'
      );
      console.log('-'.repeat(80));

      for (const order of orders) {
        const customerName = `${order.customer.firstName} ${order.customer.lastName}`.trim() || 'N/A';
        const date = order.createdAt
          ? new Date(order.createdAt).toLocaleDateString('en-US')
          : 'N/A';

        console.log(
          `#${order.orderNumber}`.padEnd(10) +
          customerName.substring(0, 23).padEnd(25) +
          order.status.padEnd(16) +
          String(order.lineItems.length).padEnd(8) +
          `$${order.total.toFixed(2)}`.padEnd(12) +
          date
        );
      }

      console.log('-'.repeat(80));
      console.log(`Total: ${orders.length} orders`);
    } catch (err) {
      console.error('Error:', err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  } else {
    console.log('Usage:');
    console.log('  npx tsx scripts/orders/wix-orders-api.ts --recent [days]');
    console.log('');
    console.log('Examples:');
    console.log('  npx tsx scripts/orders/wix-orders-api.ts --recent        # Last 30 days');
    console.log('  npx tsx scripts/orders/wix-orders-api.ts --recent 7      # Last 7 days');
  }
}
