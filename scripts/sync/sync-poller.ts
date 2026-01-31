/**
 * Sync Poller
 *
 * Wraps the monitor's pollOnce and adds WIX stock sync + email notifications.
 * Provides both one-shot and continuous polling modes.
 *
 * Flow per cycle:
 *   1. pollOnce() -- fetch SanMar inventory, detect alerts
 *   2. syncAllProducts() -- update WIX variant visibility
 *   3. notifySyncResults() -- email the store owner (if enabled)
 *   4. Log summary to console
 *
 * Usage:
 *   import { syncOnce, startSyncLoop } from './sync-poller.js';
 *   await syncOnce(monitorConfig, syncConfig);
 *   // or
 *   await startSyncLoop(monitorConfig, syncConfig);
 *
 * Phase 9: Automated Stock Sync
 */

import type { MonitorConfig, StockAlert } from '../monitor/types.js';
import { pollOnce } from '../monitor/poller.js';
import type { SyncConfig } from './types.js';
import { syncAllProducts, buildSyncSummary } from './stock-sync.js';
import { notifySyncResults } from './notifications.js';

// =============================================================================
// Single Sync Cycle
// =============================================================================

/**
 * Execute a single sync cycle: poll inventory, sync WIX, notify.
 *
 * 1. Call pollOnce to fetch inventory and detect alerts
 * 2. Capture alerts via the onAlerts callback
 * 3. Sync all mapped products (update WIX variant visibility)
 * 4. Send email notification if changes detected
 * 5. Log summary to console
 *
 * @param monitorConfig - Monitor configuration (polling, thresholds)
 * @param syncConfig - Sync configuration (data dir, notifications)
 */
export async function syncOnce(
  monitorConfig: MonitorConfig,
  syncConfig: SyncConfig,
): Promise<void> {
  console.log('[Sync] Starting sync cycle...');

  // Capture alerts from poll cycle via callback
  let pollAlerts: StockAlert[] = [];
  const snapshots = await pollOnce(monitorConfig, (alerts) => {
    pollAlerts = alerts;
  });

  if (snapshots.length === 0) {
    console.log('[Sync] No snapshots to sync.');
    return;
  }

  // Sync all mapped products against latest inventory
  const results = await syncAllProducts(snapshots, monitorConfig, syncConfig);

  // Log sync summary
  console.log(buildSyncSummary(results));

  // Send email notification (if enabled and there are changes)
  await notifySyncResults(results, pollAlerts, syncConfig);

  console.log('[Sync] Sync cycle complete.');
}

// =============================================================================
// Continuous Sync Loop
// =============================================================================

/**
 * Start continuous sync polling.
 *
 * Runs syncOnce immediately, then sets up an interval at the configured
 * frequency. Handles SIGINT for graceful shutdown.
 *
 * @param monitorConfig - Monitor configuration
 * @param syncConfig - Sync configuration
 */
export async function startSyncLoop(
  monitorConfig: MonitorConfig,
  syncConfig: SyncConfig,
): Promise<void> {
  console.log(
    `[Sync] Started. Syncing every ${monitorConfig.pollIntervalMinutes} minutes.`,
  );

  // Run immediately
  await syncOnce(monitorConfig, syncConfig);

  // Set up interval
  const intervalMs = monitorConfig.pollIntervalMinutes * 60 * 1000;
  const interval = setInterval(async () => {
    try {
      await syncOnce(monitorConfig, syncConfig);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[Sync] Sync cycle error: ${message}`);
    }
  }, intervalMs);

  // Graceful shutdown on SIGINT
  process.on('SIGINT', () => {
    clearInterval(interval);
    console.log('\n[Sync] Stopped.');
    process.exit(0);
  });

  console.log(
    `[Sync] Next sync in ${monitorConfig.pollIntervalMinutes} minutes. Press Ctrl+C to stop.`,
  );
}
