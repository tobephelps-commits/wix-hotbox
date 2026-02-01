/**
 * Stock Sync CLI
 *
 * Command-line interface for managing product mappings, running sync
 * cycles, and configuring email notifications.
 *
 * Subcommands:
 *   link [--vendor ss] <style> <wixProductId> [name]  - Map a vendor style to a WIX product
 *   unlink <style>                                    - Remove a product mapping
 *   list                                              - Show all product mappings
 *   scan                                              - Auto-discover WIX products matching tracked styles
 *   sync                                              - Run one sync cycle (poll + WIX update + notify)
 *   start                                             - Start continuous sync loop
 *   smart-start                                       - Start priority-based sync loop
 *   health                                            - Show sync daemon health status
 *   notify-test                                       - Send a test email to verify SMTP config
 *   config                                            - Show current sync configuration
 *   help                                              - Show usage
 *
 * SMTP credentials are loaded from environment variables:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 *   NOTIFY_TO, NOTIFY_FROM, NOTIFY_ENABLED
 *
 * Usage:
 *   npx tsx scripts/sync/manage.ts link PC61 abc123 "Port & Company Essential Tee"
 *   npx tsx scripts/sync/manage.ts link --vendor ss 2000 def456 "Gildan Ultra Cotton"
 *   npx tsx scripts/sync/manage.ts scan
 *   npx tsx scripts/sync/manage.ts sync
 *   npx tsx scripts/sync/manage.ts start
 *
 * Phase 9: Automated Stock Sync
 * Phase 17: --vendor flag for multi-vendor support
 */

import 'dotenv/config';
import { fileURLToPath } from 'url';
import path from 'path';

import type { VendorId } from '../vendor/types.js';
import { parseVendorFlag } from '../vendor/registry.js';
import type { ProductMapping } from './types.js';
import type { SyncConfig, NotificationConfig } from './types.js';
import {
  loadProductMap,
  addProductMapping,
  removeProductMapping,
  getDefaultSyncConfig,
} from './product-map.js';
import { syncOnce, startSyncLoop, startSmartSyncLoop, getSyncHealth } from './sync-poller.js';
import { sendSyncNotification } from './notifications.js';
import { loadConfig as loadMonitorConfig, loadTrackedProducts } from '../monitor/store.js';
import { listAllProducts } from '../pipeline/wix-api.js';
import type { WixProduct } from '../pipeline/wix-api.js';

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
// Configuration from Environment
// =============================================================================

/**
 * Build SyncConfig from environment variables and defaults.
 *
 * SMTP credentials come from environment to avoid hardcoding secrets.
 * If SMTP_USER is missing and notifications are requested, log a warning
 * and disable notifications.
 */
function buildSyncConfig(): SyncConfig {
  const defaults = getDefaultSyncConfig();

  const smtpUser = process.env.SMTP_USER ?? '';
  const smtpPass = process.env.SMTP_PASS ?? '';
  const notifyEnabled = (process.env.NOTIFY_ENABLED ?? 'false').toLowerCase() === 'true';

  // If notifications requested but SMTP user missing, warn and disable
  if (notifyEnabled && !smtpUser) {
    console.warn(
      '[Sync] Warning: NOTIFY_ENABLED=true but SMTP_USER is not set. Notifications disabled.',
    );
  }

  const enabled = notifyEnabled && !!smtpUser;

  const notification: NotificationConfig = {
    enabled,
    smtp: {
      host: process.env.SMTP_HOST ?? defaults.notification.smtp.host,
      port: parseInt(process.env.SMTP_PORT ?? String(defaults.notification.smtp.port), 10),
      secure: (process.env.SMTP_SECURE ?? 'false').toLowerCase() === 'true',
      user: smtpUser,
      pass: smtpPass,
    },
    to: process.env.NOTIFY_TO ?? smtpUser,
    from: process.env.NOTIFY_FROM ?? smtpUser,
  };

  return {
    ...defaults,
    notification,
  };
}

// =============================================================================
// Usage
// =============================================================================

function printUsage(): void {
  console.log(`
Stock Sync CLI
==============

Usage: npx tsx scripts/sync/manage.ts <command> [args]

Commands:
  link [--vendor ss] <style> <wixProductId> [name]
                                      Map a vendor style to a WIX product ID
                                      --vendor: sanmar (default), ss, ss-activewear, s&s
                                      If name is omitted, style number is used
  unlink <style>                      Remove a product mapping
  list                                Show all product mappings (shows vendor column)
  scan                                Auto-discover WIX products matching tracked styles
  sync                                Run one sync cycle (poll + WIX update + notify)
  start                               Start continuous sync loop (Ctrl+C to stop)
  smart-start                         Start priority-based sync loop (Ctrl+C to stop)
  health                              Show sync daemon health status
  notify-test                         Send a test email to verify SMTP config
  config                              Show current sync and notification config
  help                                Show this help message

Environment Variables (for notifications):
  SMTP_HOST         SMTP server hostname (default: smtp.gmail.com)
  SMTP_PORT         SMTP server port (default: 587)
  SMTP_SECURE       Use TLS (default: false, set to "true" for port 465)
  SMTP_USER         SMTP username / email address
  SMTP_PASS         SMTP password or app password
  NOTIFY_TO         Recipient email (defaults to SMTP_USER)
  NOTIFY_FROM       Sender email (defaults to SMTP_USER)
  NOTIFY_ENABLED    Enable email notifications (default: false)

Examples:
  npx tsx scripts/sync/manage.ts link PC61 abc123 "Port & Company Essential Tee"
  npx tsx scripts/sync/manage.ts link --vendor ss 2000 def456 "Gildan Ultra Cotton"
  npx tsx scripts/sync/manage.ts unlink PC61
  npx tsx scripts/sync/manage.ts list
  npx tsx scripts/sync/manage.ts scan
  npx tsx scripts/sync/manage.ts sync
  npx tsx scripts/sync/manage.ts start
  npx tsx scripts/sync/manage.ts smart-start
  npx tsx scripts/sync/manage.ts health
  npx tsx scripts/sync/manage.ts notify-test
  npx tsx scripts/sync/manage.ts config

npm scripts:
  npm run sync                Show this help
  npm run sync:link           Link a product (pass args after --)
  npm run sync:list           List product mappings
  npm run sync:scan           Auto-discover WIX product mappings
  npm run sync:run            Run single sync cycle
  npm run sync:start          Start continuous sync loop
  npm run sync:smart-start    Start priority-based sync loop
`.trim());
}

// =============================================================================
// Command Handlers
// =============================================================================

async function handleLink(args: string[]): Promise<void> {
  // Extract --vendor before parsing positional args
  const vendor = extractVendorFlag(args);

  const style = args[0];
  const wixProductId = args[1];

  if (!style || !wixProductId) {
    console.error('Error: Style and WIX product ID are required.');
    console.error('Usage: npx tsx scripts/sync/manage.ts link [--vendor ss] <style> <wixProductId> [name]');
    process.exit(1);
  }

  const name = args.slice(2).join(' ') || style.toUpperCase();
  const syncConfig = buildSyncConfig();

  const mapping: ProductMapping = {
    style: style.toUpperCase(),
    wixProductId,
    productName: name,
    linkedAt: new Date().toISOString(),
    vendor,
  };

  await addProductMapping(mapping, syncConfig);
}

async function handleUnlink(args: string[]): Promise<void> {
  const style = args[0];
  if (!style) {
    console.error('Error: Style number is required.');
    console.error('Usage: npx tsx scripts/sync/manage.ts unlink <style>');
    process.exit(1);
  }

  const syncConfig = buildSyncConfig();
  const removed = await removeProductMapping(style.toUpperCase(), syncConfig);
  if (!removed) {
    process.exit(1);
  }
}

async function handleList(): Promise<void> {
  const syncConfig = buildSyncConfig();
  const mappings = await loadProductMap(syncConfig);

  if (mappings.length === 0) {
    console.log('No product mappings. Add one with: npx tsx scripts/sync/manage.ts link <style> <wixProductId> [name]');
    console.log('Or auto-discover with: npx tsx scripts/sync/manage.ts scan');
    return;
  }

  console.log(`\nProduct Mappings (${mappings.length}):`);
  console.log('\u2500'.repeat(90));
  console.log('Style     | Vendor  | WIX Product ID                       | Name');
  console.log('\u2500'.repeat(90));

  for (const m of mappings) {
    const style = m.style.padEnd(9);
    const vendor = vendorLabel(m.vendor).padEnd(7);
    const id = m.wixProductId.padEnd(36);
    const name = m.productName.length > 25 ? m.productName.slice(0, 22) + '...' : m.productName;
    console.log(`${style} | ${vendor} | ${id} | ${name}`);
  }

  console.log('');
}

async function handleScan(): Promise<void> {
  const syncConfig = buildSyncConfig();
  const monitorConfig = await loadMonitorConfig();
  const trackedProducts = await loadTrackedProducts(monitorConfig);

  if (trackedProducts.length === 0) {
    console.log('No tracked products in monitor. Add products with: npx tsx scripts/monitor/manage.ts add <style> [name]');
    return;
  }

  console.log(`[Sync] Scanning WIX store for products matching ${trackedProducts.length} tracked style(s)...`);

  let wixProducts: WixProduct[];
  try {
    wixProducts = await listAllProducts();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Sync] Failed to list WIX products: ${message}`);
    process.exit(1);
  }

  // Build a lookup of tracked styles: key = style, value = { name, vendor }
  const trackedStyles = new Map<string, { name: string; vendor: VendorId }>();
  for (const tp of trackedProducts) {
    trackedStyles.set(tp.style.toUpperCase(), { name: tp.name, vendor: tp.vendor ?? 'sanmar' });
  }

  // Check each WIX product's variant SKUs for matching styles
  let matchCount = 0;
  const existingMappings = await loadProductMap(syncConfig);
  // Use style+vendor as key for dedup (same style may exist on different vendors)
  const existingKeys = new Set(existingMappings.map((m) => `${m.style}:${m.vendor ?? 'sanmar'}`));

  for (const wixProduct of wixProducts) {
    if (!wixProduct.variants || wixProduct.variants.length === 0) continue;

    // Check first variant's SKU for a style match
    for (const [style, info] of trackedStyles) {
      const mapKey = `${style}:${info.vendor}`;

      // Already mapped?
      if (existingKeys.has(mapKey)) continue;

      // Check if any variant SKU starts with this style
      const hasMatch = wixProduct.variants.some(
        (v) => v.variant.sku && v.variant.sku.toUpperCase().startsWith(`${style}-`),
      );

      if (hasMatch) {
        const mapping: ProductMapping = {
          style,
          wixProductId: wixProduct.id,
          productName: wixProduct.name || info.name,
          linkedAt: new Date().toISOString(),
          vendor: info.vendor,
        };

        await addProductMapping(mapping, syncConfig);
        existingKeys.add(mapKey); // Prevent duplicate adds in this run
        matchCount++;
        const vLabel = vendorLabel(info.vendor);
        console.log(`[Sync] Found: ${style} (${vLabel}) -> ${wixProduct.id} (${wixProduct.name})`);
      }
    }
  }

  if (matchCount === 0) {
    console.log('[Sync] No new matches found. Ensure WIX product SKUs follow the format: {style}-{color}-{size}');
  } else {
    console.log(`\n[Sync] Auto-mapped ${matchCount} product(s).`);
  }
}

async function handleSync(): Promise<void> {
  const monitorConfig = await loadMonitorConfig();
  const syncConfig = buildSyncConfig();
  await syncOnce(monitorConfig, syncConfig);
}

async function handleStart(): Promise<void> {
  const monitorConfig = await loadMonitorConfig();
  const syncConfig = buildSyncConfig();
  await startSyncLoop(monitorConfig, syncConfig);
}

async function handleNotifyTest(): Promise<void> {
  const syncConfig = buildSyncConfig();

  if (!syncConfig.notification.smtp.user) {
    console.error('Error: SMTP_USER environment variable is not set.');
    console.error('Set SMTP_USER and SMTP_PASS to test email notifications.');
    process.exit(1);
  }

  console.log('[Sync] Sending test email...');
  console.log(`  SMTP: ${syncConfig.notification.smtp.host}:${syncConfig.notification.smtp.port}`);
  console.log(`  From: ${syncConfig.notification.from}`);
  console.log(`  To:   ${syncConfig.notification.to}`);

  const subject = '[HotBox] Stock Sync Test Email';
  const body = [
    'HotBox Stock Sync - Test Email',
    '==============================',
    '',
    'If you received this email, your SMTP configuration is working correctly.',
    '',
    `Sent at: ${new Date().toISOString()}`,
    '',
    '---',
    'Automated by HotBox Stock Sync',
  ].join('\n');

  await sendSyncNotification(subject, body, syncConfig.notification);
}

async function handleHealth(): Promise<void> {
  const health = getSyncHealth();

  if (!health) {
    console.log('Sync daemon not running. Start with: npm run sync:start');
    console.log('Or use the priority-based loop: npm run sync:smart-start');
    return;
  }

  // Calculate uptime
  const startedMs = new Date(health.startedAt).getTime();
  const uptimeMs = Date.now() - startedMs;
  const uptimeMin = Math.floor(uptimeMs / 60000);
  const uptimeHrs = Math.floor(uptimeMin / 60);
  const uptimeRemMin = uptimeMin % 60;
  const uptimeStr = uptimeHrs > 0 ? `${uptimeHrs}h ${uptimeRemMin}m ago` : `${uptimeMin}m ago`;

  // Calculate last tick age
  const lastTickMs = new Date(health.lastTickAt).getTime();
  const tickAgeMs = Date.now() - lastTickMs;
  const tickAgeMin = Math.floor(tickAgeMs / 60000);
  const tickAgeStr = tickAgeMin > 0 ? `${tickAgeMin}m ago` : 'just now';

  const startedDisplay = health.startedAt.slice(0, 19).replace('T', ' ');
  const lastTickDisplay = health.lastTickAt.slice(0, 19).replace('T', ' ');
  const lastSuccessDisplay = health.lastSuccessAt
    ? health.lastSuccessAt.slice(0, 19).replace('T', ' ')
    : 'never';

  console.log('');
  console.log('Sync Daemon Health');
  console.log('\u2500'.repeat(50));
  console.log(`  Status:           Running`);
  console.log(`  Started:          ${startedDisplay} (${uptimeStr})`);
  console.log(`  Last tick:        ${lastTickDisplay} (${tickAgeStr})`);
  console.log(`  Last success:     ${lastSuccessDisplay}`);
  console.log(`  Consecutive errs: ${health.consecutiveErrors}`);
  console.log(`  Total cycles:     ${health.totalCycles.toLocaleString('en-US')}`);
  console.log(`  Total errors:     ${health.totalErrors}`);
  console.log(`  Products polled:  ${health.productsPolled.toLocaleString('en-US')}`);
  console.log('');
}

async function handleSmartStart(): Promise<void> {
  const monitorConfig = await loadMonitorConfig();
  const syncConfig = buildSyncConfig();

  const hotInterval = monitorConfig.hotIntervalMinutes ?? 15;
  const normalInterval = monitorConfig.pollIntervalMinutes;
  const slowInterval = monitorConfig.slowIntervalMinutes ?? 120;

  console.log('Starting smart sync daemon...');
  console.log(`  Hot products:    every ${hotInterval} minutes`);
  console.log(`  Normal products: every ${normalInterval} minutes`);
  console.log(`  Slow products:   every ${slowInterval} minutes`);
  console.log('');
  console.log('  Tick interval: 1 minute (checks what\'s due)');
  console.log('  Press Ctrl+C to stop.');
  console.log('');

  await startSmartSyncLoop(monitorConfig, syncConfig);
}

async function handleConfig(): Promise<void> {
  const syncConfig = buildSyncConfig();

  console.log('\nSync Configuration:');
  console.log('\u2500'.repeat(50));
  console.log(`  Data directory: ${syncConfig.dataDir}`);
  console.log('');
  console.log('  Notifications:');
  console.log(`    Enabled:   ${syncConfig.notification.enabled}`);
  console.log(`    SMTP host: ${syncConfig.notification.smtp.host}`);
  console.log(`    SMTP port: ${syncConfig.notification.smtp.port}`);
  console.log(`    SMTP user: ${syncConfig.notification.smtp.user || '(not set)'}`);
  console.log(`    SMTP pass: ${syncConfig.notification.smtp.pass ? '****' : '(not set)'}`);
  console.log(`    To:        ${syncConfig.notification.to || '(not set)'}`);
  console.log(`    From:      ${syncConfig.notification.from || '(not set)'}`);
  console.log('');
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
      case 'link':
        await handleLink(args);
        break;
      case 'unlink':
        await handleUnlink(args);
        break;
      case 'list':
        await handleList();
        break;
      case 'scan':
        await handleScan();
        break;
      case 'sync':
        await handleSync();
        break;
      case 'start':
        await handleStart();
        break;
      case 'smart-start':
        await handleSmartStart();
        break;
      case 'health':
        await handleHealth();
        break;
      case 'notify-test':
        await handleNotifyTest();
        break;
      case 'config':
        await handleConfig();
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
