/**
 * Inventory Monitor CLI
 *
 * Command-line interface for managing tracked products, running
 * inventory poll cycles, viewing alerts, and configuring thresholds.
 *
 * Subcommands:
 *   add <style> [name]          - Add a style to tracking
 *   remove <style>              - Remove a style from tracking
 *   list                        - List all tracked products
 *   poll                        - Run a single poll cycle
 *   start                       - Start continuous polling
 *   alerts                      - Show recent alerts (last 50)
 *   alerts clear                - Clear the alert log
 *   config                      - Print current monitor config
 *   config set <key> <value>    - Update a config value
 *   help                        - Print usage information
 *
 * Usage:
 *   npx tsx scripts/monitor/manage.ts add PC61 "Port & Company Essential Tee"
 *   npx tsx scripts/monitor/manage.ts list
 *   npx tsx scripts/monitor/manage.ts poll
 *   npx tsx scripts/monitor/manage.ts alerts
 *   npx tsx scripts/monitor/manage.ts config set lowStockThreshold 20
 *
 * Phase 8: Inventory Monitoring
 */

import { fileURLToPath } from 'url';
import path from 'path';

import type { MonitorConfig, TrackedProduct } from './types.js';
import {
  loadConfig,
  saveConfig,
  loadTrackedProducts,
  addTrackedProduct,
  removeTrackedProduct,
} from './store.js';
import { pollOnce, startPolling } from './poller.js';
import { formatAlert } from './alerts.js';
import { getRecentAlerts, clearAlertLog } from './alert-log.js';

// =============================================================================
// Usage
// =============================================================================

function printUsage(): void {
  console.log(`
Inventory Monitor CLI
=====================

Usage: npx tsx scripts/monitor/manage.ts <command> [args]

Commands:
  add <style> [name]          Add a SanMar style to inventory tracking
                              If name is omitted, style number is used as name
  remove <style>              Remove a style from inventory tracking
  list                        List all tracked products
  poll                        Run a single inventory poll cycle (with alert detection)
  start                       Start continuous polling (Ctrl+C to stop)
  alerts                      Show recent alerts (last 50)
  alerts clear                Clear the alert log
  config                      Print current monitor configuration
  config set <key> <value>    Update a config value (numeric fields only)
  help                        Show this help message

Examples:
  npx tsx scripts/monitor/manage.ts add PC61 "Port & Company Essential Tee"
  npx tsx scripts/monitor/manage.ts add K420
  npx tsx scripts/monitor/manage.ts remove PC61
  npx tsx scripts/monitor/manage.ts list
  npx tsx scripts/monitor/manage.ts poll
  npx tsx scripts/monitor/manage.ts alerts
  npx tsx scripts/monitor/manage.ts alerts clear
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
  const style = args[0];
  if (!style) {
    console.error('Error: Style number is required.');
    console.error('Usage: npx tsx scripts/monitor/manage.ts add <style> [name]');
    process.exit(1);
  }

  // Name is everything after the style, or the style itself
  const name = args.slice(1).join(' ') || style;
  const config = await loadConfig();

  const product: TrackedProduct = {
    style: style.toUpperCase(),
    name,
    addedAt: new Date().toISOString(),
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
  console.log('\u2500'.repeat(60));
  console.log('Style     | Name                              | Added');
  console.log('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500|\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500|\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500');

  for (const p of products) {
    const style = p.style.padEnd(9);
    const name = p.name.length > 33 ? p.name.slice(0, 30) + '...' : p.name.padEnd(33);
    const added = p.addedAt.slice(0, 10);
    console.log(`${style} | ${name} | ${added}`);
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
      console.log(`  ${snap.style}: ${snap.skus.length} SKUs (${inStock} in stock, ${outOfStock} out of stock)`);
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
