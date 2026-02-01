/**
 * SanMar Cart Fill CLI
 *
 * Command-line interface for previewing and executing SanMar.com cart
 * automation. Shows consolidated cart items from pending orders and
 * optionally launches browser automation to fill the SanMar cart.
 *
 * Commands:
 *   preview (default)     — Show what would be added to cart
 *   --fill                — Execute cart fill automation
 *   --status <statuses>   — Filter orders by status (comma-separated, default: new)
 *   --no-headless         — Run browser in visible mode from the start
 *   help                  — Print usage information
 *
 * Usage:
 *   npx tsx scripts/orders/cart-cli.ts
 *   npx tsx scripts/orders/cart-cli.ts preview
 *   npx tsx scripts/orders/cart-cli.ts --fill
 *   npx tsx scripts/orders/cart-cli.ts --fill --no-headless
 *   npx tsx scripts/orders/cart-cli.ts --status new,ordered
 *   npx tsx scripts/orders/cart-cli.ts help
 *
 * Phase 19: Order Management — SanMar Cart Automation (Plan 03)
 */

import 'dotenv/config';
import { fileURLToPath } from 'url';
import path from 'path';

import type { OrderStatus } from './types.js';
import type { CartItem, CartFillResult } from './cart-types.js';
import { getOrdersForCartFill, consolidateOrders } from './cart-consolidator.js';
import { fillCartForPendingOrders } from './sanmar-cart-filler.js';

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

// =============================================================================
// CLI Flag Parsing
// =============================================================================

/**
 * Check if a boolean flag is present in args.
 */
function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

/**
 * Get a named flag value from args.
 */
function getFlag(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx + 1 >= args.length) return undefined;
  return args[idx + 1];
}

/**
 * Parse --status flag into an array of OrderStatus values.
 * Accepts comma-separated values: --status new,ordered
 */
function parseStatuses(args: string[]): OrderStatus[] {
  const raw = getFlag(args, '--status');
  if (!raw) return ['new'];
  return raw.split(',').map((s) => s.trim()) as OrderStatus[];
}

// =============================================================================
// Commands
// =============================================================================

/**
 * Preview consolidated cart without executing.
 * Shows eligible orders, consolidated items, and skipped items.
 */
async function cmdPreview(args: string[]): Promise<void> {
  const statuses = parseStatuses(args);

  console.log(`\n${COLORS.bold}SanMar Cart Preview${COLORS.reset}`);
  console.log('='.repeat(50));
  console.log(`${COLORS.dim}Filtering orders by status: ${statuses.join(', ')}${COLORS.reset}\n`);

  // Load eligible orders
  const orders = await getOrdersForCartFill({ statuses });

  if (orders.length === 0) {
    console.log(`${COLORS.yellow}No orders found with status: ${statuses.join(', ')}${COLORS.reset}`);
    console.log('Nothing to add to cart.\n');
    return;
  }

  // Count total line items across all orders
  const totalLineItems = orders.reduce((sum, o) => sum + o.lineItems.length, 0);
  const orderNumbers = orders.map((o) => `#${o.orderNumber}`).join(', ');

  console.log(`${COLORS.cyan}Orders:${COLORS.reset} ${orderNumbers} (${orders.length} orders, ${totalLineItems} line items)`);
  console.log('');

  // Consolidate
  const request = consolidateOrders(orders);

  if (request.items.length === 0) {
    console.log(`${COLORS.yellow}No SanMar items found after consolidation.${COLORS.reset}`);
    console.log('All items may be from other vendors or missing vendor style numbers.\n');
    return;
  }

  // Count skipped items
  const sanmarLineItems = orders.reduce((sum, o) => {
    return sum + o.lineItems.filter((li) => {
      const isSanMar = li.vendor !== 'ss';
      const hasStyle = !!li.vendorStyle;
      const hasColorSize = !!li.color && !!li.size;
      return isSanMar && hasStyle && hasColorSize;
    }).length;
  }, 0);
  const skippedCount = totalLineItems - sanmarLineItems;

  // Display consolidated cart
  console.log(`${COLORS.bold}Consolidated Cart (${request.items.length} unique items):${COLORS.reset}`);
  console.log('');

  // Table header
  console.log(
    `  ${COLORS.bold}` +
    'Style'.padEnd(10) +
    'Color'.padEnd(16) +
    'Size'.padEnd(8) +
    'Qty'.padEnd(8) +
    'Source Orders' +
    `${COLORS.reset}`,
  );
  console.log(`  ${'-'.repeat(60)}`);

  // Table rows
  for (const item of request.items) {
    const sourceOrders = item.sourceOrders.map((n) => `#${n}`).join(', ');
    console.log(
      '  ' +
      item.vendorStyle.padEnd(10) +
      item.color.substring(0, 14).padEnd(16) +
      item.size.padEnd(8) +
      `x${item.quantity}`.padEnd(8) +
      `${COLORS.dim}from ${sourceOrders}${COLORS.reset}`,
    );
  }

  console.log('');

  if (skippedCount > 0) {
    console.log(`${COLORS.yellow}Skipped: ${skippedCount} items (no vendor style, missing color/size, or non-SanMar vendor)${COLORS.reset}`);
    console.log('');
  }

  console.log(`${COLORS.dim}Run with --fill to execute cart automation${COLORS.reset}`);
  console.log('');
}

/**
 * Execute cart fill automation.
 * Calls fillCartForPendingOrders and displays results.
 */
async function cmdFill(args: string[]): Promise<void> {
  const statuses = parseStatuses(args);
  const headless = !hasFlag(args, '--no-headless');

  console.log(`\n${COLORS.bold}SanMar Cart Fill${COLORS.reset}`);
  console.log('='.repeat(50));
  console.log(`${COLORS.dim}Status filter: ${statuses.join(', ')}${COLORS.reset}`);
  console.log(`${COLORS.dim}Browser mode: ${headless ? 'headless (until checkout)' : 'visible'}${COLORS.reset}`);
  console.log('');

  console.log('Starting cart fill automation...\n');

  const result = await fillCartForPendingOrders({
    statuses,
    headless,
  });

  if (!result) {
    console.log(`${COLORS.yellow}No orders to process. Cart fill not executed.${COLORS.reset}\n`);
    return;
  }

  // Display results
  displayFillResult(result);
}

/**
 * Display cart fill result summary.
 */
function displayFillResult(result: CartFillResult): void {
  console.log('');
  console.log(`${COLORS.bold}Cart Fill Results${COLORS.reset}`);
  console.log('='.repeat(50));

  // Overall status
  const statusColor =
    result.status === 'success' ? COLORS.green :
    result.status === 'partial' ? COLORS.yellow :
    COLORS.red;
  console.log(`${COLORS.bold}Status:${COLORS.reset} ${statusColor}${result.status.toUpperCase()}${COLORS.reset}`);
  console.log('');

  // Per-item results
  const successCount = result.itemResults.filter((r) => r.success).length;
  const failedCount = result.itemResults.filter((r) => !r.success).length;

  console.log(`${COLORS.green}Succeeded:${COLORS.reset} ${successCount} items`);
  if (failedCount > 0) {
    console.log(`${COLORS.red}Failed:${COLORS.reset}    ${failedCount} items`);
  }
  console.log('');

  // Detail per item
  for (const ir of result.itemResults) {
    const icon = ir.success ? `${COLORS.green}+${COLORS.reset}` : `${COLORS.red}x${COLORS.reset}`;
    const label = `${ir.item.vendorStyle} / ${ir.item.color} / ${ir.item.size} x${ir.item.quantity}`;
    if (ir.success) {
      console.log(`  ${icon} ${label}`);
    } else {
      console.log(`  ${icon} ${label}  ${COLORS.red}— ${ir.error}${COLORS.reset}`);
    }
  }

  console.log('');

  // Orders affected
  const orderNumbers = result.request.orderNumbers.map((n) => `#${n}`).join(', ');
  if (result.status !== 'failed') {
    console.log(`${COLORS.cyan}Orders marked as 'ordered':${COLORS.reset} ${orderNumbers}`);
  } else {
    console.log(`${COLORS.yellow}Orders NOT updated (cart fill failed):${COLORS.reset} ${orderNumbers}`);
  }

  if (result.checkoutUrl) {
    console.log('');
    console.log(`${COLORS.bold}Checkout:${COLORS.reset} Browser opened at ${result.checkoutUrl}`);
    console.log(`${COLORS.dim}Complete checkout manually in the opened browser window.${COLORS.reset}`);
  }

  console.log('');
}

/**
 * Print usage information.
 */
function cmdHelp(): void {
  console.log(`
${COLORS.bold}SanMar Cart Fill CLI${COLORS.reset}

${COLORS.bold}Commands:${COLORS.reset}

  ${COLORS.cyan}preview${COLORS.reset} (default)             Preview consolidated cart without executing
  ${COLORS.cyan}--fill${COLORS.reset}                        Execute SanMar cart fill automation
  ${COLORS.cyan}help${COLORS.reset}                          Show this help

${COLORS.bold}Options:${COLORS.reset}

  --status <statuses>             Filter orders by status (default: new)
                                  Comma-separated: --status new,ordered
  --no-headless                   Run browser in visible mode from the start

${COLORS.bold}Examples:${COLORS.reset}

  npm run cart                    Preview what would be added to cart
  npm run cart:preview            Same as above
  npm run cart:fill               Execute cart fill automation
  npm run cart:fill -- --no-headless     Run with visible browser
  npm run cart -- --status new,ordered   Preview with multiple statuses
`);
}

// =============================================================================
// CLI Router
// =============================================================================

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const args = process.argv.slice(2);
  const command = args[0];

  // Route based on command or flags
  if (command === 'help' || command === '--help' || command === '-h') {
    cmdHelp();
  } else if (hasFlag(args, '--fill')) {
    await cmdFill(args);
  } else {
    // Default: preview (command can be 'preview' or absent)
    await cmdPreview(args);
  }
}
