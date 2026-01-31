/**
 * Inventory Monitor CLI
 *
 * Command-line interface for managing tracked products and
 * running inventory poll cycles.
 *
 * Subcommands:
 *   add <style> [name]  - Add a style to tracking
 *   remove <style>      - Remove a style from tracking
 *   list                - List all tracked products
 *   poll                - Run a single poll cycle
 *   start               - Start continuous polling
 *   help                - Print usage information
 *
 * Usage:
 *   npx tsx scripts/monitor/manage.ts add PC61 "Port & Company Essential Tee"
 *   npx tsx scripts/monitor/manage.ts list
 *   npx tsx scripts/monitor/manage.ts poll
 *   npx tsx scripts/monitor/manage.ts start
 *
 * Phase 8: Inventory Monitoring
 */

import { fileURLToPath } from 'url';
import path from 'path';

import type { TrackedProduct } from './types.js';
import {
  loadConfig,
  loadTrackedProducts,
  addTrackedProduct,
  removeTrackedProduct,
} from './store.js';
import { pollOnce, startPolling } from './poller.js';

// =============================================================================
// Usage
// =============================================================================

function printUsage(): void {
  console.log(`
Inventory Monitor CLI
=====================

Usage: npx tsx scripts/monitor/manage.ts <command> [args]

Commands:
  add <style> [name]   Add a SanMar style to inventory tracking
                       If name is omitted, style number is used as name
  remove <style>       Remove a style from inventory tracking
  list                 List all tracked products
  poll                 Run a single inventory poll cycle
  start                Start continuous polling (Ctrl+C to stop)
  help                 Show this help message

Examples:
  npx tsx scripts/monitor/manage.ts add PC61 "Port & Company Essential Tee"
  npx tsx scripts/monitor/manage.ts add K420
  npx tsx scripts/monitor/manage.ts remove PC61
  npx tsx scripts/monitor/manage.ts list
  npx tsx scripts/monitor/manage.ts poll
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
  console.log('─'.repeat(60));
  console.log('Style     | Name                              | Added');
  console.log('──────────|───────────────────────────────────|──────────');

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
    console.log('─'.repeat(50));
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
