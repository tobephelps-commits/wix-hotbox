/**
 * WIX Contacts Sync Daemon
 *
 * Polling daemon for WIX contact synchronization. Mirrors the pattern
 * from src/sync/sync-poller.ts with contact-specific metrics.
 *
 * Public API: isDaemonRunning, getSyncHealth, syncOnce, startDaemon, stopDaemon
 *
 * Phase 60: WIX Customer Sync
 */

import type Database from 'better-sqlite3';
import type { Config } from '../config.js';
import type { CustomerSyncHealth, CustomerSyncResult } from './types.js';
import { syncContacts, autoLinkContacts } from './sync-engine.js';

// =============================================================================
// Module-Level State
// =============================================================================

/** Module-level health state -- populated when daemon starts */
let _syncHealth: CustomerSyncHealth | null = null;

/** Running daemon abort controller (null if not running) */
let _abortController: AbortController | null = null;

/** Whether the daemon loop is actively running */
let _running = false;

// =============================================================================
// Constants
// =============================================================================

/** Tick interval in milliseconds (5 minutes — contacts change less frequently than inventory) */
const TICK_INTERVAL_MS = 5 * 60 * 1000;

/** Max consecutive errors before escalating to error-level logging */
const ERROR_ESCALATION_THRESHOLD = 5;

// =============================================================================
// Public API: Status
// =============================================================================

/**
 * Whether the customer sync daemon is currently running.
 */
export function isDaemonRunning(): boolean {
  return _running;
}

/**
 * Get the current customer sync daemon health status.
 * Returns null if no daemon is running.
 */
export function getSyncHealth(): CustomerSyncHealth | null {
  return _syncHealth ? { ..._syncHealth } : null;
}

// =============================================================================
// Single Sync Cycle
// =============================================================================

/**
 * Execute a single sync cycle: sync contacts from WIX, then auto-link.
 *
 * @param db - SQLite database instance
 * @param config - App config with WIX credentials
 * @returns CustomerSyncResult with counts
 */
export async function syncOnce(
  db: Database.Database,
  config: Config,
): Promise<CustomerSyncResult> {
  const result = await syncContacts(db, config);
  autoLinkContacts(db);
  return result;
}

// =============================================================================
// Daemon Lifecycle
// =============================================================================

/**
 * Start the customer sync daemon.
 *
 * Runs a 5-minute tick interval. Each tick calls syncContacts() + autoLinkContacts().
 * Updates CustomerSyncHealth on each tick. Respects AbortSignal for graceful shutdown.
 *
 * @param db - SQLite database instance
 * @param config - App config with WIX credentials
 * @returns true if started, false if already running
 */
export function startDaemon(
  db: Database.Database,
  config: Config,
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
    contactsSynced: 0,
    lastTickDurationMs: 0,
    avgTickDurationMs: 0,
    maxTickDurationMs: 0,
  };

  console.log('[WixContacts] Daemon started. Tick every 5 minutes.');

  // Run first tick immediately
  executeTick(db, config).catch((err) =>
    console.error('[WixContacts] First tick error:', err),
  );

  // Set up tick interval
  const interval = setInterval(async () => {
    if (_abortController?.signal.aborted) {
      clearInterval(interval);
      cleanupOnShutdown();
      return;
    }
    await executeTick(db, config);
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
 * Stop the running customer sync daemon gracefully.
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
  config: Config,
): Promise<void> {
  if (!_syncHealth) return;

  _syncHealth.totalCycles++;
  _syncHealth.lastTickAt = new Date().toISOString();

  const tickStart = Date.now();

  try {
    const result = await syncContacts(db, config);
    autoLinkContacts(db);

    // Update contacts synced count
    _syncHealth.contactsSynced += result.contactsFetched;

    // Success
    _syncHealth.lastSuccessAt = new Date().toISOString();
    _syncHealth.consecutiveErrors = 0;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    _syncHealth.consecutiveErrors++;
    _syncHealth.totalErrors++;

    if (_syncHealth.consecutiveErrors >= ERROR_ESCALATION_THRESHOLD) {
      console.error(
        `[WixContacts] ERROR: ${_syncHealth.consecutiveErrors} consecutive failures. ` +
        `Latest: ${message}. Total errors: ${_syncHealth.totalErrors}. ` +
        `Last success: ${_syncHealth.lastSuccessAt ?? 'never'}`,
      );
    } else {
      console.warn(
        `[WixContacts] Tick failed (${_syncHealth.consecutiveErrors}/${ERROR_ESCALATION_THRESHOLD}): ${message}`,
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
        `[WixContacts] SLOW TICK: ${tickDurationMs}ms (avg: ${Math.round(_syncHealth.avgTickDurationMs)}ms)`,
      );
    }
  }
}

/**
 * Cleanup on shutdown — log session summary and reset state.
 */
function cleanupOnShutdown(): void {
  const health = _syncHealth;
  console.log('[WixContacts] Daemon stopped.');
  if (health) {
    const uptimeMs = Date.now() - new Date(health.startedAt).getTime();
    const uptimeMin = Math.round(uptimeMs / 60000);
    console.log(
      `[WixContacts] Session: ${health.totalCycles} ticks, ${health.contactsSynced} contacts synced, ` +
      `${health.totalErrors} errors, uptime ${uptimeMin}min`,
    );
  }
  _syncHealth = null;
  _abortController = null;
  _running = false;
}
