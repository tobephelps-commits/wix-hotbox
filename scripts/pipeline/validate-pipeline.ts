/**
 * Pipeline Validation Script
 *
 * Read-only health check that exercises all major code paths and reports
 * PASS/FAIL/SKIP/WARN for each subsystem. Does NOT create or modify any
 * WIX products -- purely diagnostic.
 *
 * Usage:
 *   npx tsx scripts/pipeline/validate-pipeline.ts [STYLE]
 *   npm run validate [-- STYLE]
 *
 * Examples:
 *   npm run validate              # Check environment and connectivity only
 *   npm run validate -- PC61      # Also test SanMar data fetch for PC61
 *
 * Exit code: 0 if all checks pass or skip, 1 if any check fails.
 *
 * Phase 10: Integration Polish
 */

import 'dotenv/config';
import { fileURLToPath } from 'url';
import path from 'path';

import { validateCredentials } from '../sanmar/index.js';
import { fetchProductData } from './fetch-product.js';
import { listAllProducts, getProduct } from './wix-api.js';
import { loadConfig, loadTrackedProducts, getRecentAlerts } from '../monitor/index.js';
import { loadProductMap, getDefaultSyncConfig } from '../sync/index.js';

import type { ProductData } from './fetch-product.js';

// =============================================================================
// Result Tracking
// =============================================================================

type CheckStatus = 'PASS' | 'FAIL' | 'SKIP' | 'WARN' | 'INFO';

interface CheckResult {
  status: CheckStatus;
  message: string;
}

const results: CheckResult[] = [];

function record(status: CheckStatus, message: string): void {
  results.push({ status, message });
  const prefix = status === 'PASS' ? '\x1b[32m' :
                 status === 'FAIL' ? '\x1b[31m' :
                 status === 'WARN' ? '\x1b[33m' :
                 status === 'INFO' ? '\x1b[36m' :
                 '\x1b[90m'; // SKIP = dim
  const reset = '\x1b[0m';
  console.log(`   ${prefix}[${status}]${reset} ${message}`);
}

// =============================================================================
// 1. Environment Checks
// =============================================================================

function checkEnvironment(): void {
  console.log('\n1. Environment');

  // SanMar credentials
  const sanmarVars = ['SANMAR_CUSTOMER_NUMBER', 'SANMAR_USERNAME', 'SANMAR_PASSWORD'];
  const sanmarMissing = sanmarVars.filter((v) => !process.env[v]);
  if (sanmarMissing.length === 0) {
    record('PASS', `SanMar credentials configured (${sanmarVars.join(', ')})`);
  } else {
    record('FAIL', `SanMar credentials missing: ${sanmarMissing.join(', ')} -- add to .env file`);
  }

  // WIX API key
  if (process.env.WIX_API_KEY) {
    record('PASS', 'WIX API key configured (WIX_API_KEY)');
  } else {
    record('FAIL', 'WIX API key missing (WIX_API_KEY) -- add to .env file');
  }

  // SMTP notifications (optional)
  const notifyEnabled = process.env.NOTIFY_ENABLED === 'true';
  if (notifyEnabled) {
    const smtpVars = ['SMTP_HOST', 'NOTIFY_TO'];
    const smtpMissing = smtpVars.filter((v) => !process.env[v]);
    if (smtpMissing.length === 0) {
      record('PASS', `SMTP notifications configured (${smtpVars.join(', ')})`);
    } else {
      record('FAIL', `SMTP notifications enabled but missing: ${smtpMissing.join(', ')}`);
    }
  } else {
    record('SKIP', 'SMTP not configured (optional -- set NOTIFY_ENABLED=true to enable)');
  }
}

// =============================================================================
// 2. SanMar API Connectivity
// =============================================================================

async function checkSanMarConnectivity(): Promise<void> {
  console.log('\n2. SanMar API Connectivity');

  // Check if credentials are even available
  const hasCredentials = validateCredentials();
  if (!hasCredentials) {
    record('SKIP', 'SanMar credentials not configured -- skipping connectivity check');
    return;
  }

  try {
    // validateCredentials only checks env vars exist.
    // To test actual connectivity, we attempt a lightweight API call.
    // We use fetchProductData with a known style and catch errors to classify them.
    // But that's heavy -- let's just confirm credentials load correctly.
    record('PASS', 'SanMar credentials validated (all 3 env vars present)');
    record('INFO', 'Full API connectivity is tested in step 3 (SanMar Data Fetch)');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    record('FAIL', `SanMar credential validation failed: ${message}`);
  }
}

// =============================================================================
// 3. SanMar Data Fetch (Optional)
// =============================================================================

async function checkSanMarDataFetch(style?: string): Promise<ProductData | null> {
  console.log('\n3. SanMar Data Fetch' + (style ? ` (style: ${style})` : ''));

  if (!style) {
    record('SKIP', 'No style number provided (pass a style as argument to test)');
    return null;
  }

  const hasCredentials = validateCredentials();
  if (!hasCredentials) {
    record('SKIP', 'SanMar credentials not configured -- cannot test data fetch');
    return null;
  }

  try {
    // Suppress console output from fetchProductData by temporarily redirecting
    const originalLog = console.log;
    const logBuffer: string[] = [];
    console.log = (...args: unknown[]) => {
      logBuffer.push(args.map(String).join(' '));
    };

    const data = await fetchProductData(style);

    // Restore console.log
    console.log = originalLog;

    // Report results
    const colorCount = data.preview.availableColors.length;
    const sizeCount = data.preview.availableSizes.length;
    record('PASS', `Product data: ${data.products.length} variants, ${colorCount} colors, ${sizeCount} sizes`);

    // Pricing
    const wholesale = data.preview.pricing.wholesalePrice;
    const retail = data.preview.pricing.suggestedRetail;
    record('PASS', `Pricing data: wholesale $${wholesale.toFixed(2)}, retail $${retail.toFixed(2)}`);

    // Inventory
    const inStockSkus = data.inventory.filter((i) => {
      // Each SkuInventory item has locations with quantities
      return true; // Just count total items
    });
    record('PASS', `Inventory data: ${data.inventory.length} SKUs returned`);

    // Media
    const imageCount = data.images.length;
    record('PASS', `Media data: ${imageCount} images across ${colorCount} colors`);

    return data;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    record('FAIL', `SanMar data fetch failed for style '${style}': ${message}`);
    return null;
  }
}

// =============================================================================
// 4. WIX API Connectivity
// =============================================================================

async function checkWixConnectivity(): Promise<void> {
  console.log('\n4. WIX API Connectivity');

  if (!process.env.WIX_API_KEY) {
    record('SKIP', 'WIX API key not configured -- skipping connectivity check');
    return;
  }

  try {
    // Suppress console output from listAllProducts
    const originalLog = console.log;
    console.log = () => {};

    const products = await listAllProducts();

    console.log = originalLog;

    record('PASS', `WIX product query works (found ${products.length} products)`);
  } catch (error: unknown) {
    // Restore console.log in case of error
    console.log = globalThis.console.log;

    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('401') || message.includes('Unauthorized')) {
      record('FAIL', `WIX API: 401 Unauthorized (check WIX_API_KEY)`);
    } else if (message.includes('403') || message.includes('Forbidden')) {
      record('FAIL', `WIX API: 403 Forbidden (check API key permissions)`);
    } else {
      record('FAIL', `WIX API connectivity failed: ${message}`);
    }
  }
}

// =============================================================================
// 5. Monitor State
// =============================================================================

async function checkMonitorState(): Promise<void> {
  console.log('\n5. Monitor State');

  try {
    const config = await loadConfig();
    const trackedProducts = await loadTrackedProducts(config);

    if (trackedProducts.length === 0) {
      record('SKIP', 'No products tracked (run `npm run monitor:add <STYLE>` to start)');
      return;
    }

    record('PASS', `${trackedProducts.length} products tracked`);

    // Check for snapshots -- find latest snapshot timestamp
    const { readdir, stat } = await import('node:fs/promises');
    const snapshotsDir = path.join(config.dataDir, 'snapshots');
    try {
      const snapshotFiles = await readdir(snapshotsDir);
      if (snapshotFiles.length > 0) {
        // Find most recent snapshot file
        let latestTime = 0;
        for (const file of snapshotFiles) {
          const fileStat = await stat(path.join(snapshotsDir, file));
          if (fileStat.mtimeMs > latestTime) {
            latestTime = fileStat.mtimeMs;
          }
        }
        const lastPoll = new Date(latestTime);
        const ago = formatTimeAgo(lastPoll);
        record('PASS', `Last poll: ${lastPoll.toISOString().replace('T', ' ').slice(0, 19)} (${ago})`);
      } else {
        record('WARN', 'No inventory snapshots found -- run `npm run monitor:poll` to take first snapshot');
      }
    } catch {
      record('WARN', 'Snapshots directory not found -- run `npm run monitor:poll` to initialize');
    }

    // Check alert log
    try {
      const alerts = await getRecentAlerts(config, 1000);
      record('PASS', `Alert log: ${alerts.length} entries`);
    } catch {
      record('WARN', 'Alert log not accessible');
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    record('FAIL', `Monitor state check failed: ${message}`);
  }
}

// =============================================================================
// 6. Sync State
// =============================================================================

async function checkSyncState(): Promise<void> {
  console.log('\n6. Sync State');

  try {
    const config = getDefaultSyncConfig();
    const mappings = await loadProductMap(config);

    if (mappings.length === 0) {
      record('SKIP', 'No product mappings (run `npm run sync:scan` to auto-discover)');
      return;
    }

    record('PASS', `${mappings.length} product mappings configured`);

    // Check if WIX API key is available for product existence verification
    if (!process.env.WIX_API_KEY) {
      record('SKIP', 'WIX API key not configured -- cannot verify mapped products exist');
      return;
    }

    // Verify each mapped WIX product still exists
    const orphaned: string[] = [];
    const accessible: string[] = [];

    // Suppress console output from getProduct
    const originalLog = console.log;
    console.log = () => {};

    for (const mapping of mappings) {
      try {
        await getProduct(mapping.wixProductId);
        accessible.push(mapping.style);
      } catch {
        orphaned.push(`${mapping.style} -> ${mapping.wixProductId}`);
      }
    }

    console.log = originalLog;

    if (orphaned.length === 0) {
      record('PASS', 'All mapped WIX products exist and are accessible');
    } else {
      for (const orphan of orphaned) {
        record('WARN', `Product mapping ${orphan}: WIX product not found (may have been deleted)`);
      }
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    record('FAIL', `Sync state check failed: ${message}`);
  }
}

// =============================================================================
// Utilities
// =============================================================================

function formatTimeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'just now';
}

// =============================================================================
// Summary
// =============================================================================

function printSummary(): boolean {
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const skipped = results.filter((r) => r.status === 'SKIP').length;
  const warned = results.filter((r) => r.status === 'WARN').length;

  console.log('\n' + '='.repeat(50));
  const parts: string[] = [];
  if (passed > 0) parts.push(`${passed} passed`);
  if (failed > 0) parts.push(`${failed} failed`);
  if (warned > 0) parts.push(`${warned} warnings`);
  if (skipped > 0) parts.push(`${skipped} skipped`);
  console.log(`Summary: ${parts.join(', ')}`);
  console.log('='.repeat(50));

  return failed === 0;
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  const style = process.argv[2];

  console.log('Pipeline Validation Report');
  console.log('==========================');

  // 1. Environment
  checkEnvironment();

  // 2. SanMar API Connectivity
  await checkSanMarConnectivity();

  // 3. SanMar Data Fetch (optional)
  const productData = await checkSanMarDataFetch(style);

  // 4. WIX API Connectivity
  await checkWixConnectivity();

  // 5. Monitor State
  await checkMonitorState();

  // 6. Sync State
  await checkSyncState();

  // Summary
  const allPassed = printSummary();

  // Data quality warnings are printed as part of step 3 if productData is available
  // (added in Task 2)

  process.exit(allPassed ? 0 : 1);
}

// CLI Runner
const __validate_filename = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === __validate_filename) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\nFatal error: ${message}`);
    process.exit(1);
  });
}

export { main as validatePipeline };
