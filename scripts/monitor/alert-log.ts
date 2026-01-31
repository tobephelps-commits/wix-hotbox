/**
 * Persistent Alert Log
 *
 * Stores stock alerts as a JSON file for historical review.
 * Alerts are appended after each poll cycle and capped at 1000
 * entries to prevent unbounded growth.
 *
 * File: {dataDir}/alerts.json
 *
 * Phase 8: Inventory Monitoring
 */

import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import type { MonitorConfig, StockAlert } from './types.js';

/** Maximum number of alerts to keep in the log */
const MAX_ALERT_LOG_SIZE = 1000;

/** Default number of recent alerts to return */
const DEFAULT_RECENT_COUNT = 50;

// =============================================================================
// Alert Log Path
// =============================================================================

/**
 * Get the file path for the alert log.
 */
function getAlertLogPath(config: MonitorConfig): string {
  return path.join(config.dataDir, 'alerts.json');
}

// =============================================================================
// Load / Save
// =============================================================================

/**
 * Load alert log from JSON file.
 *
 * @param config - Monitor configuration (provides dataDir)
 * @returns Array of all stored alerts, or empty array if file doesn't exist
 */
export async function loadAlertLog(config: MonitorConfig): Promise<StockAlert[]> {
  const filePath = getAlertLogPath(config);

  try {
    const raw = await readFile(filePath, 'utf-8');
    return JSON.parse(raw) as StockAlert[];
  } catch {
    // File doesn't exist or is invalid -- return empty log
    return [];
  }
}

/**
 * Append new alerts to the persistent alert log.
 *
 * Loads existing log, appends new alerts, and saves. If the combined
 * log exceeds MAX_ALERT_LOG_SIZE (1000), trims oldest entries to stay
 * within the limit.
 *
 * @param alerts - New alerts to append
 * @param config - Monitor configuration (provides dataDir)
 */
export async function appendAlerts(
  alerts: StockAlert[],
  config: MonitorConfig,
): Promise<void> {
  if (alerts.length === 0) return;

  const existing = await loadAlertLog(config);
  let combined = [...existing, ...alerts];

  // Cap at MAX_ALERT_LOG_SIZE, keep most recent
  if (combined.length > MAX_ALERT_LOG_SIZE) {
    combined = combined.slice(combined.length - MAX_ALERT_LOG_SIZE);
  }

  await mkdir(config.dataDir, { recursive: true });
  const filePath = getAlertLogPath(config);
  await writeFile(filePath, JSON.stringify(combined, null, 2), 'utf-8');
}

/**
 * Get the most recent alerts from the log.
 *
 * @param config - Monitor configuration (provides dataDir)
 * @param count - Number of recent alerts to return (default: 50)
 * @returns Array of the most recent alerts, newest last
 */
export async function getRecentAlerts(
  config: MonitorConfig,
  count: number = DEFAULT_RECENT_COUNT,
): Promise<StockAlert[]> {
  const all = await loadAlertLog(config);
  if (all.length <= count) return all;
  return all.slice(all.length - count);
}

/**
 * Ensure the alert log file exists (creates empty array if missing).
 *
 * Called after each poll cycle to satisfy the invariant that
 * alerts.json always exists after polling completes.
 *
 * @param config - Monitor configuration (provides dataDir)
 */
export async function ensureAlertLog(config: MonitorConfig): Promise<void> {
  const filePath = getAlertLogPath(config);
  try {
    await readFile(filePath, 'utf-8');
  } catch {
    // File doesn't exist -- create empty log
    await mkdir(config.dataDir, { recursive: true });
    await writeFile(filePath, JSON.stringify([], null, 2), 'utf-8');
  }
}

/**
 * Clear the entire alert log by deleting alerts.json.
 *
 * @param config - Monitor configuration (provides dataDir)
 */
export async function clearAlertLog(config: MonitorConfig): Promise<void> {
  const filePath = getAlertLogPath(config);
  try {
    await unlink(filePath);
    console.log('[Monitor] Alert log cleared.');
  } catch {
    // File didn't exist -- nothing to clear
    console.log('[Monitor] Alert log already empty.');
  }
}
