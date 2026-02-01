/**
 * Order Management CLI
 *
 * Command-line interface for managing orders, syncing from WIX,
 * and tracking order lifecycle status.
 *
 * Subcommands:
 *   list                          - List all orders in a table
 *   add                           - Create a manual order
 *   status                        - Update an order's lifecycle status
 *   view                          - View full order details
 *   sync                          - Run WIX order sync
 *   help                          - Print usage information
 *
 * Usage:
 *   npx tsx scripts/orders/manage.ts list
 *   npx tsx scripts/orders/manage.ts list --status new
 *   npx tsx scripts/orders/manage.ts list --source manual
 *   npx tsx scripts/orders/manage.ts add --customer "John Doe" --item "Black Tee" --qty 2 --price 25.00
 *   npx tsx scripts/orders/manage.ts status --order 1001 --set ordered --note "PO#12345"
 *   npx tsx scripts/orders/manage.ts view --order 1001
 *   npx tsx scripts/orders/manage.ts sync --days 30
 *
 * Phase 18: Order Management — Invoice & Label Printing
 */

import 'dotenv/config';
import { fileURLToPath } from 'url';
import path from 'path';

import type { Order, OrderStatus, OrderSource, OrderLineItem } from './types.js';
import { ORDER_STATUSES } from './types.js';
import {
  loadOrders,
  listOrders,
  addOrder,
  getOrderByNumber,
  updateOrderStatus,
} from './order-store.js';
import { syncWixOrders, resetAndResync } from './wix-order-sync.js';

// =============================================================================
// ANSI Color Helpers
// =============================================================================

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

/**
 * Color-code an order status for terminal display.
 */
function colorStatus(status: OrderStatus): string {
  switch (status) {
    case 'new':
      return `${COLORS.cyan}${status}${COLORS.reset}`;
    case 'ordered':
      return `${COLORS.blue}${status}${COLORS.reset}`;
    case 'received':
      return `${COLORS.blue}${status}${COLORS.reset}`;
    case 'in-production':
      return `${COLORS.yellow}${status}${COLORS.reset}`;
    case 'packed':
      return `${COLORS.magenta}${status}${COLORS.reset}`;
    case 'shipped':
      return `${COLORS.blue}${status}${COLORS.reset}`;
    case 'delivered':
      return `${COLORS.green}${status}${COLORS.reset}`;
    case 'cancelled':
      return `${COLORS.red}${status}${COLORS.reset}`;
    default:
      return status;
  }
}

// =============================================================================
// CLI Flag Parsing Helpers
// =============================================================================

/**
 * Extract a named flag value from args array.
 * Returns undefined if flag not found.
 */
function getFlag(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx + 1 >= args.length) return undefined;
  return args[idx + 1];
}

/**
 * Extract all values for a repeatable flag from args array.
 * For handling multiple --item, --qty, --price flags.
 */
function getAllFlags(args: string[], flag: string): string[] {
  const values: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === flag && i + 1 < args.length) {
      values.push(args[i + 1]);
    }
  }
  return values;
}

// =============================================================================
// Commands
// =============================================================================

/**
 * List all orders in a table format.
 */
async function cmdList(args: string[]): Promise<void> {
  const statusFilter = getFlag(args, '--status') as OrderStatus | undefined;
  const sourceFilter = getFlag(args, '--source') as OrderSource | undefined;

  // Validate status filter
  if (statusFilter && !ORDER_STATUSES.includes(statusFilter)) {
    console.error(`Invalid status: ${statusFilter}`);
    console.error(`Valid statuses: ${ORDER_STATUSES.join(', ')}`);
    process.exit(1);
  }

  // Validate source filter
  if (sourceFilter && sourceFilter !== 'wix' && sourceFilter !== 'manual') {
    console.error(`Invalid source: ${sourceFilter}. Use 'wix' or 'manual'.`);
    process.exit(1);
  }

  const orders = await listOrders({
    status: statusFilter,
    source: sourceFilter,
  });

  if (orders.length === 0) {
    const filterStr = [
      statusFilter ? `status=${statusFilter}` : '',
      sourceFilter ? `source=${sourceFilter}` : '',
    ]
      .filter(Boolean)
      .join(', ');
    console.log(filterStr ? `No orders found matching: ${filterStr}` : 'No orders found.');
    return;
  }

  // Table header
  console.log('');
  console.log(
    `${COLORS.bold}` +
    '#Number'.padEnd(10) +
    'Source'.padEnd(10) +
    'Status'.padEnd(16) +
    'Customer'.padEnd(25) +
    'Total'.padEnd(12) +
    'Updated' +
    `${COLORS.reset}`,
  );
  console.log('-'.repeat(85));

  // Table rows
  for (const order of orders) {
    const customerName =
      `${order.customer.firstName} ${order.customer.lastName}`.trim() || 'N/A';
    const updated = new Date(order.updatedAt).toLocaleDateString('en-US');

    console.log(
      `#${order.orderNumber}`.padEnd(10) +
      (order.source || 'wix').padEnd(10) +
      colorStatus(order.status).padEnd(16 + 9) + // +9 for ANSI color codes
      customerName.substring(0, 23).padEnd(25) +
      `$${order.total.toFixed(2)}`.padEnd(12) +
      updated,
    );
  }

  console.log('-'.repeat(85));
  console.log(`${orders.length} order${orders.length === 1 ? '' : 's'}`);
}

/**
 * Create a manual order from CLI flags.
 */
async function cmdAdd(args: string[]): Promise<void> {
  // Parse customer
  const customer = getFlag(args, '--customer');
  if (!customer) {
    console.error('Missing required flag: --customer "First Last"');
    console.error('Usage: manage.ts add --customer "John Doe" --item "Product" --qty 1 --price 25.00');
    process.exit(1);
  }

  const email = getFlag(args, '--email');
  const phone = getFlag(args, '--phone');

  // Parse line items (repeatable flags)
  const itemNames = getAllFlags(args, '--item');
  const qtys = getAllFlags(args, '--qty');
  const prices = getAllFlags(args, '--price');

  if (itemNames.length === 0) {
    console.error('Missing required flag: --item "Product Name"');
    console.error('Usage: manage.ts add --customer "John Doe" --item "Product" --qty 1 --price 25.00');
    process.exit(1);
  }

  if (qtys.length !== itemNames.length || prices.length !== itemNames.length) {
    console.error(
      `Mismatched item flags: ${itemNames.length} items, ${qtys.length} qtys, ${prices.length} prices. ` +
      `Each --item must have a matching --qty and --price.`,
    );
    process.exit(1);
  }

  // Build line items
  const lineItems: OrderLineItem[] = itemNames.map((name, i) => {
    const quantity = parseInt(qtys[i], 10);
    const unitPrice = parseFloat(prices[i]);

    if (isNaN(quantity) || quantity < 1) {
      console.error(`Invalid quantity for item "${name}": ${qtys[i]}`);
      process.exit(1);
    }
    if (isNaN(unitPrice) || unitPrice < 0) {
      console.error(`Invalid price for item "${name}": ${prices[i]}`);
      process.exit(1);
    }

    return {
      productName: name,
      quantity,
      unitPrice,
      totalPrice: quantity * unitPrice,
    };
  });

  // Parse totals
  const shippingCost = parseFloat(getFlag(args, '--shipping') ?? '0');
  const tax = parseFloat(getFlag(args, '--tax') ?? '0');
  const notes = getFlag(args, '--notes');

  // Calculate subtotal
  const subtotal = lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const total = subtotal + shippingCost + tax;

  // Parse customer name
  const nameParts = customer.trim().split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  const order = await addOrder({
    source: 'manual',
    status: 'new',
    customer: {
      firstName,
      lastName,
      email: email || undefined,
      phone: phone || undefined,
    },
    lineItems,
    subtotal,
    shippingCost: isNaN(shippingCost) ? 0 : shippingCost,
    tax: isNaN(tax) ? 0 : tax,
    discount: 0,
    total,
    notes: notes || undefined,
  });

  console.log(
    `\n${COLORS.green}Order #${order.orderNumber} created${COLORS.reset} — $${order.total.toFixed(2)}`,
  );
  console.log(`  Customer: ${order.customer.firstName} ${order.customer.lastName}`);
  console.log(`  Items: ${order.lineItems.length}`);
  for (const item of order.lineItems) {
    console.log(`    - ${item.productName} x${item.quantity} @ $${item.unitPrice.toFixed(2)} = $${item.totalPrice.toFixed(2)}`);
  }
  if (order.shippingCost > 0) console.log(`  Shipping: $${order.shippingCost.toFixed(2)}`);
  if (order.tax > 0) console.log(`  Tax: $${order.tax.toFixed(2)}`);
  console.log(`  Total: $${order.total.toFixed(2)}`);
}

/**
 * Update an order's lifecycle status.
 */
async function cmdStatus(args: string[]): Promise<void> {
  const orderNumStr = getFlag(args, '--order');
  const newStatus = getFlag(args, '--set') as OrderStatus | undefined;
  const note = getFlag(args, '--note');

  if (!orderNumStr) {
    console.error('Missing required flag: --order <number>');
    console.error('Usage: manage.ts status --order 1001 --set ordered --note "PO#12345"');
    process.exit(1);
  }

  if (!newStatus) {
    console.error('Missing required flag: --set <status>');
    console.error(`Valid statuses: ${ORDER_STATUSES.join(', ')}`);
    process.exit(1);
  }

  if (!ORDER_STATUSES.includes(newStatus)) {
    console.error(`Invalid status: ${newStatus}`);
    console.error(`Valid statuses: ${ORDER_STATUSES.join(', ')}`);
    process.exit(1);
  }

  const orderNum = parseInt(orderNumStr, 10);
  if (isNaN(orderNum)) {
    console.error(`Invalid order number: ${orderNumStr}`);
    process.exit(1);
  }

  const order = await getOrderByNumber(orderNum);
  if (!order) {
    console.error(`Order #${orderNum} not found.`);
    process.exit(1);
  }

  try {
    const updated = await updateOrderStatus(order.id, newStatus, note);
    console.log(
      `\n${COLORS.green}Order #${updated.orderNumber} status updated${COLORS.reset}: ` +
      `${order.status} -> ${colorStatus(updated.status)}`,
    );
    if (note) console.log(`  Note: ${note}`);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

/**
 * View full order details with status history timeline.
 */
async function cmdView(args: string[]): Promise<void> {
  const orderNumStr = getFlag(args, '--order');

  if (!orderNumStr) {
    console.error('Missing required flag: --order <number>');
    console.error('Usage: manage.ts view --order 1001');
    process.exit(1);
  }

  const orderNum = parseInt(orderNumStr, 10);
  if (isNaN(orderNum)) {
    console.error(`Invalid order number: ${orderNumStr}`);
    process.exit(1);
  }

  const order = await getOrderByNumber(orderNum);
  if (!order) {
    console.error(`Order #${orderNum} not found.`);
    process.exit(1);
  }

  // Print full order details
  console.log('');
  console.log(`${'='.repeat(60)}`);
  console.log(`${COLORS.bold}Order #${order.orderNumber}${COLORS.reset}  [${order.source || 'wix'}]  ${colorStatus(order.status)}`);
  console.log(`${'='.repeat(60)}`);

  // Customer
  console.log(`\n${COLORS.bold}Customer${COLORS.reset}`);
  console.log(`  Name:  ${order.customer.firstName} ${order.customer.lastName}`);
  if (order.customer.email) console.log(`  Email: ${order.customer.email}`);
  if (order.customer.phone) console.log(`  Phone: ${order.customer.phone}`);

  // Addresses
  if (order.shippingAddress) {
    const addr = order.shippingAddress;
    console.log(`\n${COLORS.bold}Shipping Address${COLORS.reset}`);
    console.log(`  ${addr.firstName} ${addr.lastName}`);
    if (addr.company) console.log(`  ${addr.company}`);
    console.log(`  ${addr.addressLine1}`);
    if (addr.addressLine2) console.log(`  ${addr.addressLine2}`);
    console.log(`  ${addr.city}, ${addr.state} ${addr.postalCode}`);
  }

  if (order.billingAddress) {
    const addr = order.billingAddress;
    console.log(`\n${COLORS.bold}Billing Address${COLORS.reset}`);
    console.log(`  ${addr.firstName} ${addr.lastName}`);
    if (addr.company) console.log(`  ${addr.company}`);
    console.log(`  ${addr.addressLine1}`);
    if (addr.addressLine2) console.log(`  ${addr.addressLine2}`);
    console.log(`  ${addr.city}, ${addr.state} ${addr.postalCode}`);
  }

  // Line items
  console.log(`\n${COLORS.bold}Line Items${COLORS.reset}`);
  for (const item of order.lineItems) {
    const details = [item.color, item.size].filter(Boolean).join(' / ');
    console.log(
      `  ${item.productName}` +
      (details ? ` (${details})` : '') +
      ` x${item.quantity} @ $${item.unitPrice.toFixed(2)} = $${item.totalPrice.toFixed(2)}`,
    );
    if (item.sku) console.log(`    SKU: ${item.sku}`);
    if (item.vendorStyle) console.log(`    Vendor Style: ${item.vendorStyle}`);
  }

  // Totals
  console.log(`\n${COLORS.bold}Totals${COLORS.reset}`);
  console.log(`  Subtotal:  $${order.subtotal.toFixed(2)}`);
  if (order.shippingCost > 0) console.log(`  Shipping:  $${order.shippingCost.toFixed(2)}`);
  if (order.tax > 0) console.log(`  Tax:       $${order.tax.toFixed(2)}`);
  if (order.discount > 0) console.log(`  Discount: -$${order.discount.toFixed(2)}`);
  console.log(`  ${COLORS.bold}Total:     $${order.total.toFixed(2)}${COLORS.reset}`);

  // Notes
  if (order.notes) {
    console.log(`\n${COLORS.bold}Notes${COLORS.reset}`);
    console.log(`  ${order.notes}`);
  }

  // Status history timeline
  console.log(`\n${COLORS.bold}Status History${COLORS.reset}`);
  for (let i = 0; i < order.statusHistory.length; i++) {
    const entry = order.statusHistory[i];
    const isLast = i === order.statusHistory.length - 1;
    const prefix = isLast ? '  -> ' : '     ';
    const timestamp = new Date(entry.timestamp).toLocaleString('en-US');

    console.log(
      `${prefix}${colorStatus(entry.status)}  ${COLORS.dim}${timestamp}${COLORS.reset}` +
      (entry.note ? `  ${COLORS.gray}(${entry.note})${COLORS.reset}` : ''),
    );
  }

  // Metadata
  console.log(`\n${COLORS.dim}ID: ${order.id}${COLORS.reset}`);
  if (order.wixOrderId) console.log(`${COLORS.dim}WIX Order ID: ${order.wixOrderId}${COLORS.reset}`);
  console.log(`${COLORS.dim}Created: ${new Date(order.createdAt).toLocaleString('en-US')}${COLORS.reset}`);
  console.log(`${COLORS.dim}Updated: ${new Date(order.updatedAt).toLocaleString('en-US')}${COLORS.reset}`);
  console.log('');
}

/**
 * Run WIX order sync.
 */
async function cmdSync(args: string[]): Promise<void> {
  const isReset = args.includes('--reset');
  const isForce = args.includes('--force');
  const daysStr = getFlag(args, '--days');
  const days = daysStr ? parseInt(daysStr, 10) : isForce ? 60 : 7;

  if (isNaN(days) || days < 1) {
    console.error(`Invalid days value: ${daysStr}`);
    process.exit(1);
  }

  let result;
  if (isReset) {
    console.log('Clearing all WIX orders and re-syncing from scratch...\n');
    result = await resetAndResync();
  } else {
    console.log(`Syncing WIX orders from the last ${days} days...\n`);
    result = await syncWixOrders(days);
  }

  console.log('\n--- Sync Results ---');
  console.log(`  WIX orders found: ${result.totalWixOrders}`);
  console.log(`  New orders:       ${result.newOrders}`);
  console.log(`  Updated orders:   ${result.updatedOrders}`);
  if (result.errors.length > 0) {
    console.log(`  Errors:           ${result.errors.length}`);
    for (const err of result.errors) {
      console.log(`    - ${err}`);
    }
  }
}

/**
 * Print usage information.
 */
function cmdHelp(): void {
  console.log(`
${COLORS.bold}Order Management CLI${COLORS.reset}

${COLORS.bold}Commands:${COLORS.reset}

  ${COLORS.cyan}list${COLORS.reset}                          List all orders
    --status <status>             Filter by status (${ORDER_STATUSES.join(', ')})
    --source <source>             Filter by source (wix, manual)

  ${COLORS.cyan}add${COLORS.reset}                           Create a manual order
    --customer "First Last"       Customer name (required)
    --email "email@example.com"   Customer email (optional)
    --phone "555-1234"            Customer phone (optional)
    --item "Product Name"         Item name (required, repeatable)
    --qty <number>                Quantity per item (required, repeatable)
    --price <number>              Unit price per item (required, repeatable)
    --shipping <number>           Shipping cost (optional, default 0)
    --tax <number>                Tax amount (optional, default 0)
    --notes "Note text"           Order notes (optional)

  ${COLORS.cyan}status${COLORS.reset}                        Update order status
    --order <number>              Order number (required)
    --set <status>                New status (required)
    --note "Note text"            Status change note (optional)

  ${COLORS.cyan}view${COLORS.reset}                          View order details
    --order <number>              Order number (required)

  ${COLORS.cyan}sync${COLORS.reset}                          Sync orders from WIX
    --days <number>               Days to look back (default 7)
    --force                       Force full sync (60 days + collection refresh)
    --reset                       Clear all WIX orders and re-import fresh

  ${COLORS.cyan}help${COLORS.reset}                          Show this help

${COLORS.bold}Examples:${COLORS.reset}

  npm run orders list
  npm run orders list -- --status new
  npm run orders add -- --customer "John Doe" --item "Black Tee" --qty 2 --price 25.00
  npm run orders add -- --customer "Jane" --item "Shirt" --qty 1 --price 20 --item "Hat" --qty 1 --price 15
  npm run orders status -- --order 1001 --set ordered --note "PO#12345"
  npm run orders view -- --order 1001
  npm run orders sync -- --days 30
`);
}

// =============================================================================
// CLI Router
// =============================================================================

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const command = process.argv[2];
  const args = process.argv.slice(3);

  switch (command) {
    case 'list':
      await cmdList(args);
      break;
    case 'add':
      await cmdAdd(args);
      break;
    case 'status':
      await cmdStatus(args);
      break;
    case 'view':
      await cmdView(args);
      break;
    case 'sync':
      await cmdSync(args);
      break;
    case 'help':
    case '--help':
    case '-h':
      cmdHelp();
      break;
    default:
      if (command) {
        console.error(`Unknown command: ${command}`);
      }
      cmdHelp();
      if (command) process.exit(1);
      break;
  }
}
