/**
 * Inventory Monitor CLI
 *
 * Command-line interface for managing tracked products, running
 * inventory poll cycles, viewing alerts, and configuring thresholds.
 *
 * Subcommands:
 *   add [--vendor ss] <style> [name] - Add a style to tracking
 *   remove <style>                   - Remove a style from tracking
 *   list                             - List all tracked products
 *   poll                             - Run a single poll cycle
 *   start                            - Start continuous polling
 *   alerts                           - Show recent alerts (last 50)
 *   alerts clear                     - Clear the alert log
 *   warehouse <style>                - Show per-warehouse inventory for a style
 *   priority <style>                 - Show current poll priority
 *   priority <style> <tier>          - Set poll priority (hot|normal|slow)
 *   threshold <style> <key> <value>  - Set per-product threshold override
 *   threshold <style> reset          - Clear per-product threshold overrides
 *   config                           - Print current monitor config
 *   config set <key> <value>         - Update a config value
 *   help                             - Print usage information
 *
 * Usage:
 *   npx tsx scripts/monitor/manage.ts add PC61 "Port & Company Essential Tee"
 *   npx tsx scripts/monitor/manage.ts add --vendor ss 2000 "Gildan Ultra Cotton"
 *   npx tsx scripts/monitor/manage.ts list
 *   npx tsx scripts/monitor/manage.ts poll
 *   npx tsx scripts/monitor/manage.ts alerts
 *   npx tsx scripts/monitor/manage.ts config set lowStockThreshold 20
 *
 * Phase 8: Inventory Monitoring
 * Phase 17: --vendor flag for multi-vendor support
 */

import { fileURLToPath } from 'url';
import path from 'path';

import type { VendorId } from '../vendor/types.js';
import { parseVendorFlag } from '../vendor/registry.js';
import type { MonitorConfig, TrackedProduct, PollPriority } from './types.js';
import {
  loadConfig,
  saveConfig,
  loadTrackedProducts,
  saveTrackedProducts,
  addTrackedProduct,
  removeTrackedProduct,
  loadLatestSnapshot,
} from './store.js';
import { pollOnce, startPolling } from './poller.js';
import { formatAlert } from './alerts.js';
import { getRecentAlerts, clearAlertLog } from './alert-log.js';
import { WAREHOUSES } from '../sanmar/index.js';

// =============================================================================
// CLI Flag Parsing Helpers
// =============================================================================

/**
 * Extract --vendor flag from args array.
 *
 * Removes --vendor and its value from the args array (mutates in place)
 * and returns the parsed VendorId. If --vendor is absent, returns 'sanmar'.
 *
 * Supports: --vendor ss, --vendor sanmar, --vendor ss-activewear, --vendor s&s
 *
 * @param args - Mutable args array (--vendor and value will be removed)
 * @returns Parsed VendorId
 */
function extractVendorFlag(args: string[]): VendorId {
  const vendorIdx = args.indexOf('--vendor');
  if (vendorIdx === -1) {
    return 'sanmar';
  }

  const vendorValue = args[vendorIdx + 1];
  // Remove --vendor and its value from args
  args.splice(vendorIdx, 2);

  return parseVendorFlag(vendorValue);
}

/**
 * Get a human-readable vendor label for display.
 */
function vendorLabel(vendor: VendorId | undefined): string {
  return (vendor ?? 'sanmar') === 'sanmar' ? 'SanMar' : 'S&S';
}

// =============================================================================
// Usage
// =============================================================================

function printUsage(): void {
  console.log(`
Inventory Monitor CLI
=====================

Usage: npx tsx scripts/monitor/manage.ts <command> [args]

Commands:
  add [--vendor ss] <style> [name]  Add a style to inventory tracking
                                    --vendor: sanmar (default), ss, ss-activewear, s&s
                                    If name is omitted, style number is used as name
  remove <style>                    Remove a style from inventory tracking
  list                              List all tracked products (shows vendor column)
  poll                              Run a single inventory poll cycle (with alert detection)
  start                             Start continuous polling (Ctrl+C to stop)
  alerts                            Show recent alerts (last 50)
  alerts clear                      Clear the alert log
  warehouse [--vendor ss] <style>   Show per-warehouse inventory for a tracked style
  priority <style>                  Show current poll priority for a product
  priority <style> <hot|normal|slow>  Set poll priority for a product
  threshold <style> <key> <value>   Set per-product threshold override
                                    Keys: lowStockThreshold, criticalStockThreshold, outOfStockThreshold
  threshold <style> reset           Clear all per-product threshold overrides
  config                            Print current monitor configuration
  config set <key> <value>          Update a config value (numeric fields only)
  help                              Show this help message

Examples:
  npx tsx scripts/monitor/manage.ts add PC61 "Port & Company Essential Tee"
  npx tsx scripts/monitor/manage.ts add --vendor ss 2000 "Gildan Ultra Cotton"
  npx tsx scripts/monitor/manage.ts add K420
  npx tsx scripts/monitor/manage.ts remove PC61
  npx tsx scripts/monitor/manage.ts list
  npx tsx scripts/monitor/manage.ts poll
  npx tsx scripts/monitor/manage.ts warehouse PC61
  npx tsx scripts/monitor/manage.ts warehouse --vendor ss 2000
  npx tsx scripts/monitor/manage.ts priority PC61
  npx tsx scripts/monitor/manage.ts priority PC61 hot
  npx tsx scripts/monitor/manage.ts alerts
  npx tsx scripts/monitor/manage.ts alerts clear
  npx tsx scripts/monitor/manage.ts threshold PC61 lowStockThreshold 20
  npx tsx scripts/monitor/manage.ts threshold PC61 reset
  npx tsx scripts/monitor/manage.ts config
  npx tsx scripts/monitor/manage.ts config set lowStockThreshold 20
  npx tsx scripts/monitor/manage.ts start

npm scripts:
  npm run monitor              Show this help
  npm run monitor:add          Add a product (pass args after --)
  npm run monitor:list         List tracked products
  npm run monitor:poll         Run single poll
  npm run monitor:start        Start continuous polling
`.trim());
}

// =============================================================================
// Command Handlers
// =============================================================================

async function handleAdd(args: string[]): Promise<void> {
  // Extract --vendor before parsing positional args
  const vendor = extractVendorFlag(args);

  const style = args[0];
  if (!style) {
    console.error('Error: Style number is required.');
    console.error('Usage: npx tsx scripts/monitor/manage.ts add [--vendor ss] <style> [name]');
    process.exit(1);
  }

  // Name is everything after the style, or the style itself
  const name = args.slice(1).join(' ') || style;
  const config = await loadConfig();

  const product: TrackedProduct = {
    style: style.toUpperCase(),
    name,
    addedAt: new Date().toISOString(),
    vendor,
  };

  await addTrackedProduct(product, config);
}

async function handleRemove(args: string[]): Promise<void> {
  const style = args[0];
  if (!style) {
    console.error('Error: Style number is required.');
    console.error('Usage: npx tsx scripts/monitor/manage.ts remove <style>');
    process.exit(1);
  }

  const config = await loadConfig();
  const removed = await removeTrackedProduct(style.toUpperCase(), config);

  if (!removed) {
    process.exit(1);
  }
}

async function handleList(): Promise<void> {
  const config = await loadConfig();
  const products = await loadTrackedProducts(config);

  if (products.length === 0) {
    console.log('No tracked products. Add one with: npx tsx scripts/monitor/manage.ts add <style> [name]');
    return;
  }

  console.log(`\nTracked Products (${products.length}):`);
  console.log('\u2500'.repeat(72));
  console.log('Style     | Vendor  | Name                              | Added');
  console.log('\u2500'.repeat(10) + '|' + '\u2500'.repeat(9) + '|' + '\u2500'.repeat(35) + '|' + '\u2500'.repeat(10));

  for (const p of products) {
    const style = p.style.padEnd(9);
    const vendor = vendorLabel(p.vendor).padEnd(7);
    const name = p.name.length > 33 ? p.name.slice(0, 30) + '...' : p.name.padEnd(33);
    const added = p.addedAt.slice(0, 10);
    console.log(`${style} | ${vendor} | ${name} | ${added}`);

    // Show per-product thresholds if they exist
    if (p.thresholds) {
      const parts: string[] = [];
      if (p.thresholds.lowStockThreshold !== undefined) parts.push(`low=${p.thresholds.lowStockThreshold}`);
      if (p.thresholds.criticalStockThreshold !== undefined) parts.push(`critical=${p.thresholds.criticalStockThreshold}`);
      if (p.thresholds.outOfStockThreshold !== undefined) parts.push(`oos=${p.thresholds.outOfStockThreshold}`);
      if (parts.length > 0) {
        console.log(`          |         | \u2514\u2500 Thresholds: ${parts.join(', ')}`);
      }
    }
  }

  console.log('');
}

async function handlePoll(): Promise<void> {
  const config = await loadConfig();
  const snapshots = await pollOnce(config);

  if (snapshots.length > 0) {
    console.log('\nPoll Summary:');
    console.log('\u2500'.repeat(50));
    for (const snap of snapshots) {
      const inStock = snap.skus.filter((s) => s.totalQty > 0).length;
      const outOfStock = snap.skus.length - inStock;
      const vendor = snap.vendor ? vendorLabel(snap.vendor) : 'SanMar';
      console.log(`  ${snap.style} (${vendor}): ${snap.skus.length} SKUs (${inStock} in stock, ${outOfStock} out of stock)`);
    }
  }
}

async function handleStart(): Promise<void> {
  await startPolling();
}

async function handleAlerts(args: string[]): Promise<void> {
  const subcommand = args[0];
  const config = await loadConfig();

  if (subcommand === 'clear') {
    await clearAlertLog(config);
    return;
  }

  const alerts = await getRecentAlerts(config);

  if (alerts.length === 0) {
    console.log('No alerts recorded. Run a poll cycle first: npx tsx scripts/monitor/manage.ts poll');
    return;
  }

  console.log(`\nRecent Alerts (${alerts.length}):`);
  console.log('\u2500'.repeat(80));

  for (const alert of alerts) {
    const time = alert.timestamp.slice(0, 19).replace('T', ' ');
    console.log(`  [${time}] ${formatAlert(alert)}`);
  }

  console.log('');
}

/** Valid numeric config keys that can be updated via CLI */
const NUMERIC_CONFIG_KEYS: (keyof MonitorConfig)[] = [
  'pollIntervalMinutes',
  'lowStockThreshold',
  'criticalStockThreshold',
  'outOfStockThreshold',
  'snapshotMaxAgeMinutes',
];

async function handleConfig(args: string[]): Promise<void> {
  const config = await loadConfig();

  if (args[0] !== 'set') {
    // Print current config
    console.log('\nMonitor Configuration:');
    console.log('\u2500'.repeat(50));
    console.log(JSON.stringify(config, null, 2));
    console.log('');
    return;
  }

  // config set <key> <value>
  const key = args[1];
  const value = args[2];

  if (!key || !value) {
    console.error('Error: Key and value are required.');
    console.error('Usage: npx tsx scripts/monitor/manage.ts config set <key> <value>');
    console.error(`Valid keys: ${NUMERIC_CONFIG_KEYS.join(', ')}`);
    process.exit(1);
  }

  // Validate key
  if (!NUMERIC_CONFIG_KEYS.includes(key as keyof MonitorConfig)) {
    console.error(`Error: Invalid config key "${key}".`);
    console.error(`Valid keys: ${NUMERIC_CONFIG_KEYS.join(', ')}`);
    process.exit(1);
  }

  // Validate value is a number
  const numValue = Number(value);
  if (isNaN(numValue) || numValue < 0) {
    console.error(`Error: Value must be a non-negative number, got "${value}".`);
    process.exit(1);
  }

  // Update config
  (config as unknown as Record<string, unknown>)[key] = numValue;
  await saveConfig(config);
  console.log(`[Monitor] Config updated: ${key} = ${numValue}`);
}

// =============================================================================
// Warehouse Inventory
// =============================================================================

/**
 * Format a number with commas for display (e.g., 12450 -> "12,450").
 */
function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

async function handleWarehouse(args: string[]): Promise<void> {
  // Extract --vendor before parsing positional args
  const vendor = extractVendorFlag(args);

  const style = args[0];
  if (!style) {
    console.error('Error: Style number is required.');
    console.error('Usage: npx tsx scripts/monitor/manage.ts warehouse [--vendor ss] <style>');
    process.exit(1);
  }

  const styleUpper = style.toUpperCase();
  const config = await loadConfig();
  const products = await loadTrackedProducts(config);

  // Find product matching style and vendor (if specified)
  const product = products.find(
    (p) => p.style === styleUpper && (p.vendor ?? 'sanmar') === vendor,
  );

  if (!product) {
    console.error(`Error: Style ${styleUpper} (${vendorLabel(vendor)}) is not tracked. Add it first.`);
    process.exit(1);
  }

  const snapshot = await loadLatestSnapshot(styleUpper, config);

  if (!snapshot) {
    console.log(`No snapshot data for ${styleUpper}. Run 'poll' to refresh.`);
    return;
  }

  // Check if any SKU has warehouse data
  const hasWarehouseData = snapshot.skus.some((s) => s.warehouses && s.warehouses.length > 0);

  if (!hasWarehouseData) {
    console.log(`No warehouse data for ${styleUpper}. Run 'poll' to refresh.`);
    return;
  }

  // Aggregate per-warehouse totals across all SKUs
  const warehouseTotals = new Map<string, { name: string; qty: number }>();

  for (const sku of snapshot.skus) {
    if (!sku.warehouses) continue;
    for (const wh of sku.warehouses) {
      const existing = warehouseTotals.get(wh.warehouseId);
      if (existing) {
        existing.qty += wh.qty;
      } else {
        // Use WAREHOUSES constant for location name if available (SanMar)
        const warehouseInfo = WAREHOUSES.find((w) => String(w.id) === wh.warehouseId);
        const displayName = warehouseInfo ? warehouseInfo.location : wh.warehouseName;
        warehouseTotals.set(wh.warehouseId, { name: displayName, qty: wh.qty });
      }
    }
  }

  // Sort by qty descending
  const sorted = [...warehouseTotals.entries()].sort((a, b) => b[1].qty - a[1].qty);

  // Determine stock status
  function getStatus(qty: number): string {
    if (qty === 0) return 'Out of stock';
    if (qty < config.criticalStockThreshold) return 'Critical';
    if (qty < config.lowStockThreshold) return 'Low stock';
    if (qty >= 1000) return 'Well-stocked';
    return 'Normal';
  }

  // Print table
  const lastPolled = snapshot.timestamp.slice(0, 19).replace('T', ' ');
  const vLabel = vendorLabel(product.vendor);
  console.log(`\nWarehouse Inventory: ${styleUpper} (${product.name}) [${vLabel}]`);
  console.log(`Last polled: ${lastPolled}`);
  console.log('');

  const nameWidth = 20;
  const qtyWidth = 11;
  const statusWidth = 14;
  console.log(`${'Warehouse'.padEnd(nameWidth)} | ${'Total Qty'.padStart(qtyWidth)} | ${'Status'}`);
  console.log(`${'\u2500'.repeat(nameWidth)}\u253c${'\u2500'.repeat(qtyWidth + 2)}\u253c${'\u2500'.repeat(statusWidth)}`);

  let grandTotal = 0;
  for (const [, wh] of sorted) {
    const name = wh.name.length > nameWidth ? wh.name.slice(0, nameWidth - 3) + '...' : wh.name.padEnd(nameWidth);
    const qty = formatNumber(wh.qty).padStart(qtyWidth);
    const status = getStatus(wh.qty);
    console.log(`${name} | ${qty} | ${status}`);
    grandTotal += wh.qty;
  }

  console.log(`${'\u2500'.repeat(nameWidth)}\u253c${'\u2500'.repeat(qtyWidth + 2)}\u253c${'\u2500'.repeat(statusWidth)}`);
  console.log(`${'Total across all'.padEnd(nameWidth)} | ${formatNumber(grandTotal).padStart(qtyWidth)} |`);
  console.log('');
}

// =============================================================================
// Priority Management
// =============================================================================

const VALID_PRIORITIES: PollPriority[] = ['hot', 'normal', 'slow'];

async function handlePriority(args: string[]): Promise<void> {
  const style = args[0];
  if (!style) {
    console.error('Error: Style number is required.');
    console.error('Usage: npx tsx scripts/monitor/manage.ts priority <style> [hot|normal|slow]');
    process.exit(1);
  }

  const styleUpper = style.toUpperCase();
  const config = await loadConfig();
  const products = await loadTrackedProducts(config);
  const product = products.find((p) => p.style === styleUpper);

  if (!product) {
    console.error(`Error: Style ${styleUpper} is not tracked. Add it with: npx tsx scripts/monitor/manage.ts add ${styleUpper}`);
    process.exit(1);
  }

  const newPriority = args[1]?.toLowerCase();

  // If no priority argument, show current priority
  if (!newPriority) {
    const current = product.priority ?? 'normal';
    const interval = getIntervalForDisplay(current, config);
    console.log(`${styleUpper} (${product.name}): priority = ${current} (polls every ${interval} minutes)`);
    return;
  }

  // Validate priority value
  if (!VALID_PRIORITIES.includes(newPriority as PollPriority)) {
    console.error(`Error: Invalid priority "${newPriority}". Must be one of: ${VALID_PRIORITIES.join(', ')}`);
    process.exit(1);
  }

  // Update priority
  product.priority = newPriority as PollPriority;
  await saveTrackedProducts(products, config);

  const interval = getIntervalForDisplay(newPriority as PollPriority, config);
  console.log(`Set ${styleUpper} priority to ${newPriority} (polls every ${interval} minutes)`);
}

/**
 * Get the poll interval in minutes for display based on priority and config.
 */
function getIntervalForDisplay(priority: PollPriority, config: MonitorConfig): number {
  switch (priority) {
    case 'hot':
      return config.hotIntervalMinutes ?? 15;
    case 'slow':
      return config.slowIntervalMinutes ?? 120;
    case 'normal':
    default:
      return config.pollIntervalMinutes;
  }
}

// =============================================================================
// Per-Product Threshold Management
// =============================================================================

/** Valid per-product threshold keys */
const VALID_THRESHOLD_KEYS = ['lowStockThreshold', 'criticalStockThreshold', 'outOfStockThreshold'] as const;
type ThresholdKey = (typeof VALID_THRESHOLD_KEYS)[number];

async function handleThreshold(args: string[]): Promise<void> {
  const style = args[0];
  if (!style) {
    console.error('Error: Style number is required.');
    console.error('Usage: npx tsx scripts/monitor/manage.ts threshold <style> <key> <value>');
    console.error('       npx tsx scripts/monitor/manage.ts threshold <style> reset');
    process.exit(1);
  }

  const styleUpper = style.toUpperCase();
  const config = await loadConfig();
  const products = await loadTrackedProducts(config);
  const product = products.find((p) => p.style === styleUpper);

  if (!product) {
    console.error(`Error: Style ${styleUpper} is not tracked. Add it first.`);
    process.exit(1);
  }

  const keyOrReset = args[1];

  if (!keyOrReset) {
    // Show current thresholds
    if (product.thresholds) {
      console.log(`${styleUpper} (${product.name}) per-product thresholds:`);
      if (product.thresholds.lowStockThreshold !== undefined)
        console.log(`  lowStockThreshold: ${product.thresholds.lowStockThreshold}`);
      if (product.thresholds.criticalStockThreshold !== undefined)
        console.log(`  criticalStockThreshold: ${product.thresholds.criticalStockThreshold}`);
      if (product.thresholds.outOfStockThreshold !== undefined)
        console.log(`  outOfStockThreshold: ${product.thresholds.outOfStockThreshold}`);
    } else {
      console.log(`${styleUpper} (${product.name}): No per-product thresholds (using global config).`);
    }
    return;
  }

  // Reset per-product thresholds
  if (keyOrReset.toLowerCase() === 'reset') {
    delete product.thresholds;
    await saveTrackedProducts(products, config);
    console.log(`[Monitor] Cleared per-product thresholds for ${styleUpper}. Now using global config.`);
    return;
  }

  // Set a specific threshold key
  const key = keyOrReset as ThresholdKey;
  if (!VALID_THRESHOLD_KEYS.includes(key)) {
    console.error(`Error: Invalid threshold key "${keyOrReset}".`);
    console.error(`Valid keys: ${VALID_THRESHOLD_KEYS.join(', ')}`);
    console.error('Or use "reset" to clear all per-product overrides.');
    process.exit(1);
  }

  const value = args[2];
  if (!value) {
    console.error('Error: Threshold value is required.');
    console.error(`Usage: npx tsx scripts/monitor/manage.ts threshold ${style} ${key} <value>`);
    process.exit(1);
  }

  const numValue = Number(value);
  if (isNaN(numValue) || numValue < 0) {
    console.error(`Error: Value must be a non-negative number, got "${value}".`);
    process.exit(1);
  }

  // Initialize thresholds object if absent
  if (!product.thresholds) {
    product.thresholds = {};
  }
  product.thresholds[key] = numValue;

  await saveTrackedProducts(products, config);
  console.log(`[Monitor] Set ${styleUpper} ${key} = ${numValue}`);
}

// =============================================================================
// CLI Entry Point
// =============================================================================

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const command = process.argv[2] ?? 'help';
  const args = process.argv.slice(3);

  try {
    switch (command.toLowerCase()) {
      case 'add':
        await handleAdd(args);
        break;
      case 'remove':
        await handleRemove(args);
        break;
      case 'list':
        await handleList();
        break;
      case 'poll':
        await handlePoll();
        break;
      case 'start':
        await handleStart();
        break;
      case 'alerts':
        await handleAlerts(args);
        break;
      case 'warehouse':
        await handleWarehouse(args);
        break;
      case 'priority':
        await handlePriority(args);
        break;
      case 'threshold':
        await handleThreshold(args);
        break;
      case 'config':
        await handleConfig(args);
        break;
      case 'help':
      case '--help':
      case '-h':
        printUsage();
        break;
      default:
        console.error(`Unknown command: ${command}`);
        printUsage();
        process.exit(1);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\nError: ${message}`);
    process.exit(1);
  }
}
