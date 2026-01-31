/**
 * Inventory Monitor Polling Engine
 *
 * Core polling logic that periodically fetches SanMar inventory
 * for all tracked products, saves snapshots, detects stock level
 * transitions, and generates alerts.
 *
 * Usage:
 *   import { pollOnce, startPolling } from './poller.js';
 *   const snapshots = await pollOnce(config);
 *   // or
 *   await startPolling(config); // runs continuously
 *
 * Phase 8: Inventory Monitoring
 */

import 'dotenv/config';

import { getStyleInventory, getTotalQuantity, isWellStocked } from '../sanmar/index.js';
import type { MonitorConfig, InventorySnapshot, SkuSnapshot, StockAlert } from './types.js';
import { loadConfig, loadTrackedProducts, loadLatestSnapshot, saveSnapshot } from './store.js';
import { detectAlerts, formatAlertSummary } from './alerts.js';
import { appendAlerts, ensureAlertLog } from './alert-log.js';

// =============================================================================
// Pre-flight Check
// =============================================================================

/** Module-level flag to run SanMar credential check only once */
let _sanmarCredsChecked = false;

// =============================================================================
// Single Poll Cycle
// =============================================================================

/**
 * Execute a single poll cycle for all tracked products.
 *
 * For each tracked product:
 * 1. Call getStyleInventory(style) from SanMar API
 * 2. Convert SkuInventory[] to InventorySnapshot (sum warehouse qtys)
 * 3. Filter to tracked colors/sizes if specified
 * 4. Load previous snapshot for change detection
 * 5. Detect stock level transitions and generate alerts
 * 6. Save new snapshot (overwriting previous)
 * 7. Append alerts to persistent log
 *
 * @param config - Monitor configuration
 * @param onAlerts - Optional callback invoked when alerts are generated
 * @returns Array of new inventory snapshots (one per tracked product)
 */
export async function pollOnce(
  config: MonitorConfig,
  onAlerts?: (alerts: StockAlert[]) => void,
): Promise<InventorySnapshot[]> {
  // Pre-flight SanMar credential check (runs once per process)
  if (!_sanmarCredsChecked) {
    if (!process.env.SANMAR_CUSTOMER_NUMBER) {
      throw new Error(
        'SanMar credentials not configured. Set SANMAR_CUSTOMER_NUMBER, SANMAR_USERNAME, SANMAR_PASSWORD in .env file.',
      );
    }
    _sanmarCredsChecked = true;
  }

  const products = await loadTrackedProducts(config);

  if (products.length === 0) {
    console.log('[Monitor] No tracked products. Add products with: monitor add <style> <name>');
    return [];
  }

  console.log(`[Monitor] Polling ${products.length} tracked product(s)...`);
  const snapshots: InventorySnapshot[] = [];
  let totalAlerts = 0;

  for (const product of products) {
    try {
      // Fetch all SKU inventory from SanMar
      const skuInventories = await getStyleInventory(product.style);

      // Convert to SkuSnapshot format (summarize warehouse data)
      let skuSnapshots: SkuSnapshot[] = skuInventories.map((sku) => ({
        color: sku.color,
        size: sku.size,
        totalQty: getTotalQuantity(sku),
        wellStocked: isWellStocked(sku),
      }));

      // Filter to tracked colors if specified
      if (product.colors && product.colors.length > 0) {
        const trackedColors = new Set(product.colors);
        skuSnapshots = skuSnapshots.filter((s) => trackedColors.has(s.color));
      }

      // Filter to tracked sizes if specified
      if (product.sizes && product.sizes.length > 0) {
        const trackedSizes = new Set(product.sizes);
        skuSnapshots = skuSnapshots.filter((s) => trackedSizes.has(s.size));
      }

      const snapshot: InventorySnapshot = {
        style: product.style,
        timestamp: new Date().toISOString(),
        skus: skuSnapshots,
      };

      // Load previous snapshot BEFORE saving new one (for change detection)
      const previousSnapshot = await loadLatestSnapshot(product.style, config);

      // Persist new snapshot (overwrites previous)
      await saveSnapshot(snapshot, config);
      snapshots.push(snapshot);

      // Detect stock level transitions
      const alerts = detectAlerts(snapshot, previousSnapshot, config, product.name);

      if (alerts.length > 0) {
        // Log alerts to console
        console.log(formatAlertSummary(alerts));
        // Persist alerts to log file
        await appendAlerts(alerts, config);
        // Invoke callback if provided
        if (onAlerts) {
          onAlerts(alerts);
        }
        totalAlerts += alerts.length;
      }

      console.log(`[Monitor] ${product.style}: ${skuSnapshots.length} SKUs fetched`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[Monitor] ${product.style}: Error - ${message}`);
    }
  }

  // Ensure alerts.json exists (even if empty) after every poll cycle
  await ensureAlertLog(config);

  console.log(`[Monitor] Poll complete. ${products.length} products checked, ${totalAlerts} alerts generated.`);
  return snapshots;
}

// =============================================================================
// Continuous Polling
// =============================================================================

/**
 * Start continuous inventory polling.
 *
 * Runs pollOnce immediately, then sets up an interval to repeat
 * at the configured frequency. Handles SIGINT for graceful shutdown.
 *
 * @param config - Monitor configuration (loaded from file if not provided)
 */
export async function startPolling(config?: MonitorConfig): Promise<void> {
  const cfg = config ?? await loadConfig();
  const products = await loadTrackedProducts(cfg);

  console.log(
    `[Monitor] Started. Polling every ${cfg.pollIntervalMinutes} minutes for ${products.length} product(s).`,
  );

  // Run immediately
  await pollOnce(cfg);

  // Set up interval
  const intervalMs = cfg.pollIntervalMinutes * 60 * 1000;
  const interval = setInterval(async () => {
    try {
      await pollOnce(cfg);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[Monitor] Poll cycle error: ${message}`);
    }
  }, intervalMs);

  // Graceful shutdown on SIGINT
  process.on('SIGINT', () => {
    clearInterval(interval);
    console.log('\n[Monitor] Stopped.');
    process.exit(0);
  });

  // Keep process alive
  console.log(`[Monitor] Next poll in ${cfg.pollIntervalMinutes} minutes. Press Ctrl+C to stop.`);
}
