/**
 * Sync Poller / Daemon (v2.0)
 *
 * Wraps the monitor's polling with WIX stock sync and email notifications.
 * Provides one-shot sync, continuous daemon, and health tracking.
 *
 * Ported from scripts/sync/sync-poller.ts for v2.0 Pi Appliance.
 * Key changes:
 * - Database parameter instead of file-based config
 * - wixConfig parameter { apiKey, siteId } from fastify.config
 * - credentials parameter for vendor API auth
 * - SyncHealth imported from types.ts (centralized)
 * - pollOnce/pollDue imported from monitor/poller.ts
 *
 * Phase 51: Inventory Sync
 */

import type Database from 'better-sqlite3';
import type { StockAlert } from '../monitor/types.js';
import type {
  SyncResult,
  SyncHealth,
  NotificationConfig,
} from './types.js';
import { listMappings } from './product-map.js';
import {
  syncProductStock,
  buildSyncSummary,
  type WixConfig,
} from './stock-sync.js';
import { sendSyncNotification } from './notifications.js';
import { pollOnce } from '../monitor/poller.js';
import { getMonitorConfig } from '../monitor/store.js';

// =============================================================================
// Module-Level State
// =============================================================================

/** Module-level health state -- populated when daemon starts */
let _syncHealth: SyncHealth | null = null;

/** Running daemon abort controller (null if not running) */
let _abortController: AbortController | null = null;

/** Whether the daemon loop is actively running */
let _running = false;

// =============================================================================
// Constants
// =============================================================================

/** Max consecutive errors before escalating to error-level logging */
const ERROR_ESCALATION_THRESHOLD = 5;

/** Tick interval in milliseconds (1 minute) */
const TICK_INTERVAL_MS = 60 * 1000;

// =============================================================================
// Public API: Status
// =============================================================================

/**
 * Whether the sync daemon is currently running.
 */
export function isDaemonRunning(): boolean {
  return _running;
}

/**
 * Get the current sync daemon health status.
 *
 * Returns null if no daemon is running.
 */
export function getSyncHealth(): SyncHealth | null {
  return _syncHealth ? { ..._syncHealth } : null;
}

// =============================================================================
// Single Sync Cycle
// =============================================================================

/**
 * Execute a single sync cycle: poll inventory, sync WIX, notify.
 *
 * 1. pollOnce() for inventory snapshots and alerts
 * 2. syncProductStock() for each mapped product with a snapshot
 * 3. sendSyncNotification() if enabled
 * 4. Return results
 *
 * @param db - SQLite database instance
 * @param wixConfig - WIX API credentials { apiKey, siteId }
 * @param notificationConfig - SMTP notification settings
 * @returns Object with poll/sync results
 */
export async function syncOnce(
  db: Database.Database,
  wixConfig: WixConfig,
  notificationConfig: NotificationConfig,
): Promise<{
  productsPolled: number;
  productsSynced: number;
  alerts: StockAlert[];
  errors: string[];
}> {
  console.log('[Sync] Starting sync cycle...');

  // 1. Poll inventory using default monitor config
  const monitorConfig = getMonitorConfig();
  const pollResult = await pollOnce(db, monitorConfig);

  if (pollResult.productsPolled === 0) {
    console.log('[Sync] No products polled.');
    return {
      productsPolled: 0,
      productsSynced: 0,
      alerts: pollResult.alerts,
      errors: pollResult.errors,
    };
  }

  // 2. Sync each mapped product
  const mappings = listMappings(db);
  const syncResults: SyncResult[] = [];
  const errors: string[] = [...pollResult.errors];

  for (const mapping of mappings) {
    try {
      const result = await syncProductStock(db, mapping, wixConfig);
      syncResults.push(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`Sync error for ${mapping.style}: ${message}`);
      console.error(`[Sync] Error syncing ${mapping.style}: ${message}`);
    }
  }

  // Log sync summary
  console.log(buildSyncSummary(syncResults));

  // 3. Send notification
  const alertMessages = pollResult.alerts.map(
    (a) => `${a.type}: ${a.style} ${a.color} ${a.size} (${a.previousQty} -> ${a.currentQty})`,
  );

  await sendSyncNotification(
    notificationConfig,
    syncResults,
    alertMessages.length > 0 ? alertMessages : undefined,
  );

  console.log('[Sync] Sync cycle complete.');

  return {
    productsPolled: pollResult.productsPolled,
    productsSynced: syncResults.length,
    alerts: pollResult.alerts,
    errors,
  };
}

// =============================================================================
// Daemon Lifecycle
// =============================================================================

/**
 * Start the smart sync daemon.
 *
 * Runs a 60-second tick interval. Each tick calls pollOnce() to check
 * which products need polling, then syncs. Updates SyncHealth on each tick.
 * Respects AbortSignal for graceful shutdown.
 *
 * @param db - SQLite database instance
 * @param wixConfig - WIX API credentials
 * @param notificationConfig - SMTP notification settings
 * @returns true if started, false if already running
 */
export function startDaemon(
  db: Database.Database,
  wixConfig: WixConfig,
  notificationConfig: NotificationConfig,
): boolean {
  if (_running) return false;

  _abortController = new AbortController();
  _running = true;

  const now = new Date().toISOString();
  _syncHealth = {
    startedAt: now,
    lastTickAt: null,
    lastSuccessAt: null,
    consecutiveErrors: 0,
    totalCycles: 0,
    totalErrors: 0,
    productsPolled: 0,
    lastTickDurationMs: 0,
    avgTickDurationMs: 0,
    maxTickDurationMs: 0,
    notificationsSent: 0,
    notificationsFailed: 0,
  };

  console.log('[Sync] Daemon started. Tick every 60s.');

  // Run first tick immediately
  executeTick(db, wixConfig, notificationConfig).catch((err) =>
    console.error('[Sync] First tick error:', err),
  );

  // Set up tick interval
  const interval = setInterval(async () => {
    if (_abortController?.signal.aborted) {
      clearInterval(interval);
      cleanupOnShutdown();
      return;
    }
    await executeTick(db, wixConfig, notificationConfig);
  }, TICK_INTERVAL_MS);

  // Handle abort signal
  _abortController.signal.addEventListener(
    'abort',
    () => {
      clearInterval(interval);
      cleanupOnShutdown();
    },
    { once: true },
  );

  return true;
}

/**
 * Stop the running sync daemon gracefully.
 *
 * @returns true if stop signal sent, false if not running
 */
export function stopDaemon(): boolean {
  if (!_running) return false;
  _abortController?.abort();
  return true;
}

// =============================================================================
// Internal: Tick Execution
// =============================================================================

/**
 * Execute a single daemon tick.
 */
async function executeTick(
  db: Database.Database,
  wixConfig: WixConfig,
  notificationConfig: NotificationConfig,
): Promise<void> {
  if (!_syncHealth) return;

  _syncHealth.totalCycles++;
  _syncHealth.lastTickAt = new Date().toISOString();

  const tickStart = Date.now();

  try {
    // Poll inventory using default monitor config
    const monitorConfig = getMonitorConfig();
    const pollResult = await pollOnce(db, monitorConfig);

    if (pollResult.productsPolled > 0) {
      _syncHealth.productsPolled += pollResult.productsPolled;

      // Sync mapped products
      const mappings = listMappings(db);
      const syncResults: SyncResult[] = [];

      for (const mapping of mappings) {
        try {
          const result = await syncProductStock(db, mapping, wixConfig);
          syncResults.push(result);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`[Sync] Tick sync error for ${mapping.style}: ${message}`);
        }
      }

      console.log(buildSyncSummary(syncResults));

      // Send notification
      const alertMessages = pollResult.alerts.map(
        (a) => `${a.type}: ${a.style} ${a.color} ${a.size} (${a.previousQty} -> ${a.currentQty})`,
      );

      const notifResult = await sendSyncNotification(
        notificationConfig,
        syncResults,
        alertMessages.length > 0 ? alertMessages : undefined,
      );

      if (notifResult.success) {
        _syncHealth.notificationsSent++;
      } else if (notifResult.error) {
        _syncHealth.notificationsFailed++;
      }
    }

    // Success
    _syncHealth.lastSuccessAt = new Date().toISOString();
    _syncHealth.consecutiveErrors = 0;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    _syncHealth.consecutiveErrors++;
    _syncHealth.totalErrors++;

    if (_syncHealth.consecutiveErrors >= ERROR_ESCALATION_THRESHOLD) {
      console.error(
        `[Sync] ERROR: ${_syncHealth.consecutiveErrors} consecutive failures. ` +
        `Latest: ${message}. Total errors: ${_syncHealth.totalErrors}. ` +
        `Last success: ${_syncHealth.lastSuccessAt ?? 'never'}`,
      );
    } else {
      console.warn(
        `[Sync] Tick failed (${_syncHealth.consecutiveErrors}/${ERROR_ESCALATION_THRESHOLD}): ${message}`,
      );
    }
  } finally {
    // Update tick duration metrics
    const tickDurationMs = Date.now() - tickStart;
    _syncHealth.lastTickDurationMs = tickDurationMs;
    _syncHealth.maxTickDurationMs = Math.max(
      _syncHealth.maxTickDurationMs,
      tickDurationMs,
    );

    // Cumulative moving average
    const n = _syncHealth.totalCycles;
    if (n === 1) {
      _syncHealth.avgTickDurationMs = tickDurationMs;
    } else {
      _syncHealth.avgTickDurationMs =
        (_syncHealth.avgTickDurationMs * (n - 1) + tickDurationMs) / n;
    }

    // Slow tick detection
    if (n > 5 && tickDurationMs > _syncHealth.avgTickDurationMs * 3) {
      console.warn(
        `[Sync] SLOW TICK: ${tickDurationMs}ms (avg: ${Math.round(_syncHealth.avgTickDurationMs)}ms)`,
      );
    }
  }
}

/**
 * Cleanup on shutdown.
 */
function cleanupOnShutdown(): void {
  const health = _syncHealth;
  console.log('[Sync] Daemon stopped.');
  if (health) {
    const uptimeMs = Date.now() - new Date(health.startedAt).getTime();
    const uptimeMin = Math.round(uptimeMs / 60000);
    console.log(
      `[Sync] Session: ${health.totalCycles} ticks, ${health.productsPolled} products polled, ` +
      `${health.totalErrors} errors, uptime ${uptimeMin}min`,
    );
  }
  _syncHealth = null;
  _abortController = null;
  _running = false;
}
