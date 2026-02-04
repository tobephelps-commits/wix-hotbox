/**
 * Sync Poller
 *
 * Wraps the monitor's pollOnce/pollDue and adds WIX stock sync + email notifications.
 * Provides one-shot, continuous, and priority-aware smart sync modes.
 *
 * Flow per cycle:
 *   1. pollOnce() or pollDue() -- fetch vendor inventory, detect alerts
 *   2. syncAllProducts() -- update WIX variant visibility
 *   3. notifySyncResults() -- email the store owner (if enabled)
 *   4. Log summary to console
 *
 * Usage:
 *   import { syncOnce, startSyncLoop, startSmartSyncLoop, getSyncHealth } from './sync-poller.js';
 *   await syncOnce(monitorConfig, syncConfig);
 *   // or
 *   await startSmartSyncLoop(monitorConfig, syncConfig); // priority-aware tick loop
 *   // or (deprecated)
 *   await startSyncLoop(monitorConfig, syncConfig);
 *
 * Phase 9 + Phase 16: Automated Stock Sync with Priority Tiers
 * Phase 17: Vendor-agnostic polling (credential checks moved to poller.ts)
 */

import type { MonitorConfig, StockAlert } from '../monitor/types.js';
import { pollOnce, pollDue } from '../monitor/poller.js';
import { loadConfig as loadMonitorConfig } from '../monitor/store.js';
import type { SyncConfig, NotificationConfig } from './types.js';
import { getDefaultSyncConfig } from './product-map.js';
import { syncAllProducts, buildSyncSummary } from './stock-sync.js';
import { notifySyncResults } from './notifications.js';

// =============================================================================
// Sync Health Tracking
// =============================================================================

/**
 * Health status of the running sync daemon.
 *
 * Tracks daemon uptime, error rates, and polling statistics.
 * Module-level state (not persisted) -- resets when process restarts.
 */
export interface SyncHealth {
  /** ISO timestamp when daemon started */
  startedAt: string;
  /** ISO timestamp of last tick */
  lastTickAt: string;
  /** ISO timestamp of last successful poll cycle, or null if none yet */
  lastSuccessAt: string | null;
  /** Consecutive errors without a successful tick (resets on success) */
  consecutiveErrors: number;
  /** Total tick count since daemon started */
  totalCycles: number;
  /** Lifetime error count since daemon started */
  totalErrors: number;
  /** Total products polled this session */
  productsPolled: number;
  /** Duration of last tick in milliseconds */
  lastTickDurationMs: number;
  /** Average tick duration in milliseconds (rolling) */
  avgTickDurationMs: number;
  /** Longest tick duration seen in milliseconds */
  maxTickDurationMs: number;
  /** Notification delivery tracking */
  notifications: {
    /** Total emails sent successfully */
    sent: number;
    /** Total email send failures */
    failed: number;
    /** ISO timestamp of last successful email */
    lastSentAt: string | null;
    /** ISO timestamp of last failed email attempt */
    lastFailedAt: string | null;
    /** Last failure message (for dashboard display) */
    lastFailureReason: string | null;
  };
}

/** Module-level health state -- populated when smart sync loop starts */
let _syncHealth: SyncHealth | null = null;

/** Running sync loop abort controller (null if not running) */
let _abortController: AbortController | null = null;

/**
 * Whether daemon is currently running.
 *
 * @returns true if daemon loop is active and not aborted
 */
export function isDaemonRunning(): boolean {
  return _abortController !== null && !_abortController.signal.aborted;
}

// =============================================================================
// Daemon Lifecycle Control
// =============================================================================

/**
 * Build SyncConfig from environment variables.
 *
 * Reads SMTP credentials and notification settings from environment.
 * If SMTP_USER is missing and notifications are requested, notifications
 * are disabled with a warning.
 *
 * Extracted from manage.ts for programmatic daemon control.
 */
function getSyncConfigFromEnv(): SyncConfig {
  const defaults = getDefaultSyncConfig();

  const smtpUser = process.env.SMTP_USER ?? '';
  const smtpPass = process.env.SMTP_PASS ?? '';
  const notifyEnabled = (process.env.NOTIFY_ENABLED ?? 'false').toLowerCase() === 'true';

  // If notifications requested but SMTP user missing, warn and disable
  if (notifyEnabled && !smtpUser) {
    console.warn(
      '[Daemon] Warning: NOTIFY_ENABLED=true but SMTP_USER is not set. Notifications disabled.',
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

/**
 * Start the sync daemon programmatically.
 *
 * Returns immediately after starting the loop (non-blocking).
 * Use getSyncHealth() to monitor status, stopDaemon() to stop.
 *
 * @returns true if started, false if already running
 */
export async function startDaemon(): Promise<boolean> {
  if (isDaemonRunning()) return false;

  _abortController = new AbortController();

  // Load configuration
  const monitorConfig = await loadMonitorConfig();
  const syncConfig = getSyncConfigFromEnv();

  // Start loop in background (don't await)
  startSmartSyncLoop(monitorConfig, syncConfig, _abortController.signal)
    .catch((err) => console.error('[Daemon] Loop error:', err));

  return true;
}

/**
 * Stop the running sync daemon gracefully.
 *
 * Signals the loop to exit after current tick completes.
 *
 * @returns true if stop signal sent, false if not running
 */
export function stopDaemon(): boolean {
  if (!isDaemonRunning()) return false;
  _abortController!.abort();
  return true;
}

/**
 * Get the current sync daemon health status.
 *
 * Returns null if no sync loop is running (syncOnce doesn't populate health).
 * Used by CLI and preview server to query daemon status.
 *
 * @returns Current SyncHealth snapshot, or null if daemon not running
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
  // Pre-flight WIX check -- vendor credential checks are done by poller.ts per product
  if (!process.env.WIX_API_KEY) {
    throw new Error(
      'WIX_API_KEY not set. Add it to .env file. Get your API key from WIX Dashboard > Developer Tools > API Keys.',
    );
  }

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
 * @deprecated Use startSmartSyncLoop() for priority-based polling with health tracking.
 * This function polls all products at a fixed interval regardless of priority.
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
  console.warn(
    '[Sync] DEPRECATION: startSyncLoop() polls all products at a fixed interval. ' +
    'Use startSmartSyncLoop() for priority-based polling with health tracking.',
  );

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

// =============================================================================
// Smart Sync Loop (Priority-Aware)
// =============================================================================

/** Max consecutive errors before escalating to error-level logging */
const ERROR_ESCALATION_THRESHOLD = 5;

/** Tick interval in milliseconds (1 minute) */
const TICK_INTERVAL_MS = 60 * 1000;

/**
 * Start priority-aware sync loop with health tracking and error recovery.
 *
 * Instead of a single setInterval at the pollIntervalMinutes frequency,
 * this uses a fast tick loop (every 1 minute) that checks which products
 * are due for polling based on their priority tier:
 *   - hot: every 15 min (configurable)
 *   - normal: every 60 min (pollIntervalMinutes)
 *   - slow: every 120 min (configurable)
 *
 * Features:
 * - Priority-based polling via pollDue()
 * - Health tracking (uptime, error rates, products polled)
 * - Error recovery: catches failures, increments counters, never crashes
 * - Escalated logging after 5 consecutive errors
 * - Graceful SIGINT shutdown
 * - Optional AbortSignal for programmatic control (Phase 34)
 *
 * @param monitorConfig - Monitor configuration with priority intervals
 * @param syncConfig - Sync configuration (data dir, notifications)
 * @param signal - Optional AbortSignal for programmatic shutdown
 */
export async function startSmartSyncLoop(
  monitorConfig: MonitorConfig,
  syncConfig: SyncConfig,
  signal?: AbortSignal,
): Promise<void> {
  // Pre-flight WIX check -- vendor credential checks are done by poller.ts per product
  if (!process.env.WIX_API_KEY) {
    throw new Error(
      'WIX_API_KEY not set. Add it to .env file. Get your API key from WIX Dashboard > Developer Tools > API Keys.',
    );
  }

  const now = new Date().toISOString();

  // Initialize health tracking
  _syncHealth = {
    startedAt: now,
    lastTickAt: now,
    lastSuccessAt: null,
    consecutiveErrors: 0,
    totalCycles: 0,
    totalErrors: 0,
    productsPolled: 0,
    lastTickDurationMs: 0,
    avgTickDurationMs: 0,
    maxTickDurationMs: 0,
    notifications: { sent: 0, failed: 0, lastSentAt: null, lastFailedAt: null, lastFailureReason: null },
  };

  const hotInterval = monitorConfig.hotIntervalMinutes ?? 15;
  const normalInterval = monitorConfig.pollIntervalMinutes;
  const slowInterval = monitorConfig.slowIntervalMinutes ?? 120;

  console.log(
    `[Sync] Smart sync started. Tick every 1 min. ` +
    `Hot: ${hotInterval}min | Normal: ${normalInterval}min | Slow: ${slowInterval}min`,
  );

  // Run first tick immediately (if not already aborted)
  if (!signal?.aborted) {
    await executeTick(monitorConfig, syncConfig);
  }

  // Set up tick interval (every 1 minute)
  const interval = setInterval(async () => {
    // Check abort signal before each tick
    if (signal?.aborted) {
      clearInterval(interval);
      cleanupOnShutdown();
      return;
    }
    await executeTick(monitorConfig, syncConfig);
  }, TICK_INTERVAL_MS);

  // Handle abort signal from programmatic control
  if (signal) {
    signal.addEventListener('abort', () => {
      clearInterval(interval);
      cleanupOnShutdown();
    }, { once: true });
  }

  // Graceful shutdown on SIGINT (CLI mode)
  process.on('SIGINT', () => {
    clearInterval(interval);
    cleanupOnShutdown();
    process.exit(0);
  });

  console.log('[Sync] Running. Press Ctrl+C to stop.');
}

/**
 * Cleanup and log session summary on shutdown.
 */
function cleanupOnShutdown(): void {
  const health = _syncHealth;
  console.log('\n[Sync] Smart sync stopped.');
  if (health) {
    const uptimeMs = Date.now() - new Date(health.startedAt).getTime();
    const uptimeMin = Math.round(uptimeMs / 60000);
    console.log(
      `[Sync] Session: ${health.totalCycles} ticks, ${health.productsPolled} products polled, ` +
      `${health.totalErrors} errors, uptime ${uptimeMin}min`,
    );
  }
  // Clear state on shutdown
  _syncHealth = null;
  _abortController = null;
}

/**
 * Execute a single tick of the smart sync loop.
 *
 * Calls pollDue() to check which products are due, then syncs any that returned
 * snapshots. Updates health tracking on success or failure. Never throws --
 * all errors are caught and logged to keep the daemon running.
 *
 * @param monitorConfig - Monitor configuration
 * @param syncConfig - Sync configuration
 */
async function executeTick(
  monitorConfig: MonitorConfig,
  syncConfig: SyncConfig,
): Promise<void> {
  if (!_syncHealth) return;

  _syncHealth.totalCycles++;
  _syncHealth.lastTickAt = new Date().toISOString();

  const tickStart = Date.now();

  try {
    // Capture alerts from poll cycle
    let pollAlerts: StockAlert[] = [];
    const snapshots = await pollDue(monitorConfig, (alerts) => {
      pollAlerts = [...pollAlerts, ...alerts];
    });

    if (snapshots.length > 0) {
      // Products were polled -- sync with WIX
      _syncHealth.productsPolled += snapshots.length;

      const results = await syncAllProducts(snapshots, monitorConfig, syncConfig);
      console.log(buildSyncSummary(results));

      // Send email notification (if enabled and there are changes)
      const notifResult = await notifySyncResults(results, pollAlerts, syncConfig);

      // Track notification delivery in health state
      if (notifResult !== null) {
        if (notifResult.success) {
          _syncHealth.notifications.sent++;
          _syncHealth.notifications.lastSentAt = new Date().toISOString();
        } else {
          _syncHealth.notifications.failed++;
          _syncHealth.notifications.lastFailedAt = new Date().toISOString();
          _syncHealth.notifications.lastFailureReason = notifResult.error ?? 'Unknown error';
        }
      }
    }

    // Success -- reset consecutive error counter
    _syncHealth.lastSuccessAt = new Date().toISOString();
    _syncHealth.consecutiveErrors = 0;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    _syncHealth.consecutiveErrors++;
    _syncHealth.totalErrors++;

    if (_syncHealth.consecutiveErrors >= ERROR_ESCALATION_THRESHOLD) {
      // Escalated error logging after threshold
      console.error(
        `[Sync] ERROR: ${_syncHealth.consecutiveErrors} consecutive failures. ` +
        `Latest: ${message}. Total errors: ${_syncHealth.totalErrors}. ` +
        `Last success: ${_syncHealth.lastSuccessAt ?? 'never'}`,
      );
    } else {
      console.warn(`[Sync] Tick failed (${_syncHealth.consecutiveErrors}/${ERROR_ESCALATION_THRESHOLD}): ${message}`);
    }

    // Never crash -- continue to next tick
  } finally {
    // Update tick duration metrics (always, even on failure)
    const tickDurationMs = Date.now() - tickStart;
    _syncHealth.lastTickDurationMs = tickDurationMs;
    _syncHealth.maxTickDurationMs = Math.max(_syncHealth.maxTickDurationMs, tickDurationMs);

    // Cumulative moving average: ((prev * (n-1)) + current) / n
    const n = _syncHealth.totalCycles;
    if (n === 1) {
      _syncHealth.avgTickDurationMs = tickDurationMs;
    } else {
      _syncHealth.avgTickDurationMs =
        ((_syncHealth.avgTickDurationMs * (n - 1)) + tickDurationMs) / n;
    }

    // Slow tick detection: warn if > 3x average and enough data points
    if (n > 5 && tickDurationMs > _syncHealth.avgTickDurationMs * 3) {
      console.warn(
        `[Sync] SLOW TICK: ${tickDurationMs}ms (avg: ${Math.round(_syncHealth.avgTickDurationMs)}ms)`,
      );
    }
  }
}
