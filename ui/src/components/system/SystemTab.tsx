/**
 * SystemTab -- System management dashboard with health cards,
 * sync daemon control, and printer management.
 *
 * Card-based dashboard layout (not master-detail):
 * - Section 1: System Health (CPU, memory, disk, temperature, database, network)
 * - Section 2: Sync Daemon (status, start/stop/run-once, audit)
 * - Section 3: Printer Management (discover, save, test, set default)
 *
 * Phase 57.1: Remaining Tab UIs (Plan 03)
 */

import { useState, useEffect, useCallback } from 'react';
import './SystemTab.css';

// =============================================================================
// Types
// =============================================================================

interface SystemInfo {
  version: string;
  uptime: number;
  nodeVersion: string;
  platform: string;
  arch: string;
  memoryUsage: number;
  database: {
    path: string;
    sizeMB: number;
    migrationsApplied: number;
  };
  cpu: {
    loadAvg: number[];
    cores: number;
  };
  memory: {
    totalMB: number;
    freeMB: number;
    usedPercent: number;
  };
  temperature: number | null;
  disk: {
    totalMB: number;
    usedMB: number;
    availableMB: number;
    usedPercent: number;
  } | null;
  network: {
    addresses: string[];
    port: number;
    baseUrl: string;
  };
}

interface SyncHealth {
  running: boolean;
  health: {
    tickCount: number;
    avgTickMs: number;
    lastTickAt: string | null;
    errors: number;
  } | null;
}

interface DiscoveredPrinter {
  id: string;
  name: string;
  uri: string;
  makeModel: string;
}

interface SavedPrinter {
  id: string;
  name: string;
  uri: string;
  makeModel?: string;
  isDefault?: boolean;
}

interface PrinterStatus {
  state: string;
  stateReasons?: string[];
  markerLevels?: { name: string; level: number }[];
}

// =============================================================================
// Helpers
// =============================================================================

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(' ');
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function loadColor(load: number, cores: number): string {
  const pct = (load / cores) * 100;
  if (pct > 80) return 'health-card__value--red';
  if (pct > 50) return 'health-card__value--yellow';
  return 'health-card__value--green';
}

function memoryColor(pct: number): string {
  if (pct > 85) return 'health-card__bar--red';
  if (pct > 60) return 'health-card__bar--yellow';
  return 'health-card__bar--green';
}

function diskColor(pct: number): string {
  if (pct > 90) return 'health-card__bar--red';
  if (pct > 70) return 'health-card__bar--yellow';
  return 'health-card__bar--green';
}

function tempColor(temp: number): string {
  if (temp > 75) return 'health-card__value--red';
  if (temp > 60) return 'health-card__value--yellow';
  return 'health-card__value--green';
}

function truncatePath(path: string, maxLen = 30): string {
  if (path.length <= maxLen) return path;
  return '...' + path.slice(-(maxLen - 3));
}

// =============================================================================
// Component
// =============================================================================

function SystemTab() {
  // Section 1: System Health
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [systemError, setSystemError] = useState<string | null>(null);

  // Section 2: Sync Daemon
  const [syncHealth, setSyncHealth] = useState<SyncHealth | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [mappingsCount, setMappingsCount] = useState<number | null>(null);
  const [auditResult, setAuditResult] = useState<{ total: number; healthy: number; orphaned: { style: string }[]; errors: { mapping: { style: string }; error: string }[] } | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  // Section 3: Printers
  const [discoveredPrinters, setDiscoveredPrinters] = useState<DiscoveredPrinter[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [savedPrinters, setSavedPrinters] = useState<SavedPrinter[]>([]);
  const [defaultPrinterId, setDefaultPrinterId] = useState<string | undefined>();
  const [printerStatuses, setPrinterStatuses] = useState<Record<string, { loading: boolean; status?: PrinterStatus; error?: string }>>({});
  const [testResults, setTestResults] = useState<Record<string, { loading: boolean; connected?: boolean; error?: string }>>({});
  const [savingPrinter, setSavingPrinter] = useState<Record<string, boolean>>({});

  // ---------------------------------------------------------------------------
  // Section 1: System Health
  // ---------------------------------------------------------------------------

  const fetchSystemInfo = useCallback(async () => {
    try {
      const res = await fetch('/api/system');
      if (res.ok) {
        const data = await res.json();
        setSystemInfo(data);
        setSystemError(null);
      } else {
        setSystemError(`Failed to fetch system info (${res.status})`);
      }
    } catch {
      setSystemError('Unable to reach server');
    }
  }, []);

  // Auto-refresh every 30s
  useEffect(() => {
    fetchSystemInfo();
    const interval = setInterval(fetchSystemInfo, 30000);
    return () => clearInterval(interval);
  }, [fetchSystemInfo]);

  // ---------------------------------------------------------------------------
  // Section 2: Sync Daemon
  // ---------------------------------------------------------------------------

  const fetchSyncHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/sync/health');
      if (res.ok) {
        const data = await res.json();
        setSyncHealth(data);
      }
    } catch {
      // Silently fail
    }
  }, []);

  const fetchMappingsCount = useCallback(async () => {
    try {
      const res = await fetch('/api/sync/mappings');
      if (res.ok) {
        const data = await res.json();
        setMappingsCount(data.total);
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    fetchSyncHealth();
    fetchMappingsCount();
  }, [fetchSyncHealth, fetchMappingsCount]);

  const handleSyncAction = useCallback(async (action: 'start' | 'stop' | 'run') => {
    setSyncLoading(true);
    try {
      await fetch(`/api/sync/${action}`, { method: 'POST' });
      await fetchSyncHealth();
    } catch {
      // Silently fail
    } finally {
      setSyncLoading(false);
    }
  }, [fetchSyncHealth]);

  const handleAudit = useCallback(async () => {
    setAuditLoading(true);
    setAuditResult(null);
    try {
      const res = await fetch('/api/sync/audit', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setAuditResult(data);
      }
    } catch {
      // Silently fail
    } finally {
      setAuditLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Section 3: Printers
  // ---------------------------------------------------------------------------

  const fetchSavedPrinters = useCallback(async () => {
    try {
      const res = await fetch('/api/printing/saved');
      if (res.ok) {
        const data = await res.json();
        setSavedPrinters(data.printers);
        setDefaultPrinterId(data.defaultPrinterId);
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    fetchSavedPrinters();
  }, [fetchSavedPrinters]);

  const handleDiscover = useCallback(async () => {
    setDiscovering(true);
    setDiscoveredPrinters([]);
    try {
      const res = await fetch('/api/printing/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        setDiscoveredPrinters(data.printers);
      }
    } catch {
      // Silently fail
    } finally {
      setDiscovering(false);
    }
  }, []);

  const handleTestPrinter = useCallback(async (uri: string) => {
    setTestResults((prev) => ({ ...prev, [uri]: { loading: true } }));
    try {
      const res = await fetch('/api/printing/printers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uri }),
      });
      if (res.ok) {
        const data = await res.json();
        setTestResults((prev) => ({ ...prev, [uri]: { loading: false, connected: data.connected, error: data.error } }));
      } else {
        setTestResults((prev) => ({ ...prev, [uri]: { loading: false, error: 'Test failed' } }));
      }
    } catch {
      setTestResults((prev) => ({ ...prev, [uri]: { loading: false, error: 'Network error' } }));
    }
  }, []);

  const handleSavePrinter = useCallback(async (printer: DiscoveredPrinter) => {
    setSavingPrinter((prev) => ({ ...prev, [printer.id]: true }));
    try {
      const res = await fetch('/api/printing/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: printer.id,
          name: printer.name,
          uri: printer.uri,
          makeModel: printer.makeModel,
        }),
      });
      if (res.ok) {
        await fetchSavedPrinters();
      }
    } catch {
      // Silently fail
    } finally {
      setSavingPrinter((prev) => ({ ...prev, [printer.id]: false }));
    }
  }, [fetchSavedPrinters]);

  const handleRemovePrinter = useCallback(async (id: string) => {
    try {
      await fetch(`/api/printing/saved/${id}`, { method: 'DELETE' });
      await fetchSavedPrinters();
    } catch {
      // Silently fail
    }
  }, [fetchSavedPrinters]);

  const handleSetDefault = useCallback(async (id: string) => {
    try {
      await fetch(`/api/printing/default/${id}`, { method: 'PUT' });
      await fetchSavedPrinters();
    } catch {
      // Silently fail
    }
  }, [fetchSavedPrinters]);

  const handleCheckStatus = useCallback(async (printer: SavedPrinter) => {
    const encodedUri = btoa(printer.uri);
    setPrinterStatuses((prev) => ({ ...prev, [printer.id]: { loading: true } }));
    try {
      const res = await fetch(`/api/printing/printers/${encodedUri}/status`);
      if (res.ok) {
        const data = await res.json();
        setPrinterStatuses((prev) => ({ ...prev, [printer.id]: { loading: false, status: data } }));
      } else {
        const data = await res.json().catch(() => ({ error: 'Unknown error' }));
        setPrinterStatuses((prev) => ({ ...prev, [printer.id]: { loading: false, error: data.error } }));
      }
    } catch {
      setPrinterStatuses((prev) => ({ ...prev, [printer.id]: { loading: false, error: 'Network error' } }));
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const isRunning = syncHealth?.running ?? false;

  return (
    <div className="system-tab">
      {/* ===================================================================
          Section 1: System Health
          =================================================================== */}
      <section className="system-section">
        <h2 className="system-section__title">System Health</h2>

        {systemError && (
          <div className="system-error">{systemError}</div>
        )}

        {systemInfo && (
          <div className="health-grid">
            {/* Version Card */}
            <div className="health-card">
              <div className="health-card__label">Version</div>
              <div className="health-card__value">{systemInfo.version}</div>
              <div className="health-card__detail">
                Node.js {systemInfo.nodeVersion}
              </div>
              <div className="health-card__detail">
                {systemInfo.platform}/{systemInfo.arch}
              </div>
              <div className="health-card__detail">
                Uptime: {formatUptime(systemInfo.uptime)}
              </div>
            </div>

            {/* CPU Card */}
            <div className="health-card">
              <div className="health-card__label">CPU</div>
              <div className={`health-card__value ${loadColor(systemInfo.cpu.loadAvg[0], systemInfo.cpu.cores)}`}>
                {systemInfo.cpu.loadAvg[0].toFixed(2)}
              </div>
              <div className="health-card__detail">
                Load: {systemInfo.cpu.loadAvg.map((l) => l.toFixed(2)).join(' / ')}
              </div>
              <div className="health-card__detail">
                {systemInfo.cpu.cores} cores
              </div>
            </div>

            {/* Memory Card */}
            <div className="health-card">
              <div className="health-card__label">Memory</div>
              <div className="health-card__value">
                {systemInfo.memory.totalMB - systemInfo.memory.freeMB} / {systemInfo.memory.totalMB} MB
              </div>
              <div className="health-card__bar-container">
                <div
                  className={`health-card__bar ${memoryColor(systemInfo.memory.usedPercent)}`}
                  style={{ width: `${systemInfo.memory.usedPercent}%` }}
                />
              </div>
              <div className="health-card__detail">{systemInfo.memory.usedPercent}% used</div>
            </div>

            {/* Disk Card */}
            {systemInfo.disk && (
              <div className="health-card">
                <div className="health-card__label">Disk</div>
                <div className="health-card__value">
                  {systemInfo.disk.usedMB} / {systemInfo.disk.totalMB} MB
                </div>
                <div className="health-card__bar-container">
                  <div
                    className={`health-card__bar ${diskColor(systemInfo.disk.usedPercent)}`}
                    style={{ width: `${systemInfo.disk.usedPercent}%` }}
                  />
                </div>
                <div className="health-card__detail">
                  {systemInfo.disk.availableMB} MB available ({systemInfo.disk.usedPercent}% used)
                </div>
              </div>
            )}

            {/* Temperature Card (Pi only) */}
            {systemInfo.temperature !== null && (
              <div className="health-card">
                <div className="health-card__label">Temperature</div>
                <div className={`health-card__value ${tempColor(systemInfo.temperature)}`}>
                  {systemInfo.temperature.toFixed(1)}&deg;C
                </div>
              </div>
            )}

            {/* Database Card */}
            <div className="health-card">
              <div className="health-card__label">Database</div>
              <div className="health-card__value">{systemInfo.database.sizeMB} MB</div>
              <div className="health-card__detail" title={systemInfo.database.path}>
                {truncatePath(systemInfo.database.path)}
              </div>
              <div className="health-card__detail">
                {systemInfo.database.migrationsApplied} migrations applied
              </div>
            </div>

            {/* Network Card */}
            <div className="health-card">
              <div className="health-card__label">Network</div>
              <div className="health-card__value">
                <a
                  href={systemInfo.network.baseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="health-card__link"
                >
                  :{systemInfo.network.port}
                </a>
              </div>
              {systemInfo.network.addresses.map((addr) => (
                <div key={addr} className="health-card__detail">{addr}</div>
              ))}
            </div>
          </div>
        )}

        {!systemInfo && !systemError && (
          <div className="system-loading">Loading system info...</div>
        )}
      </section>

      {/* ===================================================================
          Section 2: Sync Daemon
          =================================================================== */}
      <section className="system-section">
        <h2 className="system-section__title">Sync Daemon</h2>

        <div className="sync-panel">
          <div className="sync-status-row">
            <span className={`sync-status ${isRunning ? 'sync-status--running' : 'sync-status--stopped'}`}>
              {isRunning ? 'Running' : 'Stopped'}
            </span>

            {mappingsCount !== null && (
              <span className="sync-mappings-count">{mappingsCount} products mapped</span>
            )}
          </div>

          {isRunning && syncHealth?.health && (
            <div className="sync-details">
              <div className="sync-detail-item">
                <span className="sync-detail-item__label">Ticks</span>
                <span className="sync-detail-item__value">{syncHealth.health.tickCount}</span>
              </div>
              <div className="sync-detail-item">
                <span className="sync-detail-item__label">Avg Tick</span>
                <span className="sync-detail-item__value">{Math.round(syncHealth.health.avgTickMs)}ms</span>
              </div>
              <div className="sync-detail-item">
                <span className="sync-detail-item__label">Last Tick</span>
                <span className="sync-detail-item__value">{relativeTime(syncHealth.health.lastTickAt)}</span>
              </div>
              <div className="sync-detail-item">
                <span className="sync-detail-item__label">Errors</span>
                <span className={`sync-detail-item__value${syncHealth.health.errors > 0 ? ' sync-detail-item__value--error' : ''}`}>
                  {syncHealth.health.errors}
                </span>
              </div>
            </div>
          )}

          <div className="sync-controls">
            <button
              className="sync-controls__btn"
              onClick={() => handleSyncAction('start')}
              disabled={isRunning || syncLoading}
            >
              Start
            </button>
            <button
              className="sync-controls__btn"
              onClick={() => handleSyncAction('stop')}
              disabled={!isRunning || syncLoading}
            >
              Stop
            </button>
            <button
              className="sync-controls__btn sync-controls__btn--accent"
              onClick={() => handleSyncAction('run')}
              disabled={syncLoading}
            >
              {syncLoading ? 'Running...' : 'Run Once'}
            </button>
            <button
              className="sync-controls__btn"
              onClick={handleAudit}
              disabled={auditLoading}
            >
              {auditLoading ? 'Auditing...' : 'Audit Mappings'}
            </button>
          </div>

          {auditResult && (
            <div className="audit-result">
              <div className="audit-result__row">
                <span>Total: {auditResult.total}</span>
                <span className="audit-result__healthy">Healthy: {auditResult.healthy}</span>
                {auditResult.orphaned.length > 0 && (
                  <span className="audit-result__orphaned">Orphaned: {auditResult.orphaned.length}</span>
                )}
                {auditResult.errors.length > 0 && (
                  <span className="audit-result__errors">Errors: {auditResult.errors.length}</span>
                )}
              </div>
              {auditResult.orphaned.length > 0 && (
                <div className="audit-result__list">
                  {auditResult.orphaned.map((o) => (
                    <span key={o.style} className="audit-result__item audit-result__item--orphaned">{o.style}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ===================================================================
          Section 3: Printer Management
          =================================================================== */}
      <section className="system-section">
        <h2 className="system-section__title">Printer Management</h2>

        {/* Discover Printers */}
        <div className="printer-section">
          <div className="printer-section__header">
            <h3 className="printer-section__subtitle">Discover Printers</h3>
            <button
              className="sync-controls__btn sync-controls__btn--accent"
              onClick={handleDiscover}
              disabled={discovering}
            >
              {discovering && <span className="system-spinner" />}
              {discovering ? 'Scanning...' : 'Discover'}
            </button>
          </div>

          {discoveredPrinters.length > 0 ? (
            <div className="discovery-results">
              {discoveredPrinters.map((printer) => {
                const test = testResults[printer.uri];
                const saving = savingPrinter[printer.id];
                const alreadySaved = savedPrinters.some((sp) => sp.id === printer.id);

                return (
                  <div key={printer.id} className="printer-card">
                    <div className="printer-card__info">
                      <div className="printer-card__name">{printer.name}</div>
                      <div className="printer-card__detail">{printer.uri}</div>
                      {printer.makeModel && (
                        <div className="printer-card__detail">{printer.makeModel}</div>
                      )}
                    </div>

                    {test && !test.loading && (
                      <div className={`printer-test-result ${test.connected ? 'printer-test-result--ok' : 'printer-test-result--fail'}`}>
                        {test.connected ? 'Connected' : `Failed: ${test.error || 'Unknown'}`}
                      </div>
                    )}

                    <div className="printer-card__actions">
                      <button
                        className="sync-controls__btn"
                        onClick={() => handleTestPrinter(printer.uri)}
                        disabled={test?.loading}
                      >
                        {test?.loading ? 'Testing...' : 'Test'}
                      </button>
                      <button
                        className="sync-controls__btn"
                        onClick={() => handleSavePrinter(printer)}
                        disabled={saving || alreadySaved}
                      >
                        {alreadySaved ? 'Saved' : saving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="printer-empty">
              {discovering
                ? 'Scanning for printers...'
                : 'Click Discover to scan for printers on your local network.'}
            </div>
          )}
        </div>

        {/* Saved Printers */}
        <div className="printer-section">
          <h3 className="printer-section__subtitle">Saved Printers</h3>

          {savedPrinters.length > 0 ? (
            <div className="discovery-results">
              {savedPrinters.map((printer) => {
                const statusInfo = printerStatuses[printer.id];
                const isDefault = defaultPrinterId === printer.id;

                return (
                  <div key={printer.id} className="printer-card">
                    <div className="printer-card__info">
                      <div className="printer-card__name">
                        {printer.name}
                        {isDefault && <span className="default-badge">Default</span>}
                      </div>
                      <div className="printer-card__detail">{printer.uri}</div>
                      {printer.makeModel && (
                        <div className="printer-card__detail">{printer.makeModel}</div>
                      )}
                    </div>

                    {statusInfo && !statusInfo.loading && (
                      <div className="printer-status-info">
                        {statusInfo.error ? (
                          <span className="printer-status--error">{statusInfo.error}</span>
                        ) : statusInfo.status ? (
                          <>
                            <span className={`printer-status--${statusInfo.status.state === 'idle' ? 'idle' : statusInfo.status.state === 'processing' ? 'idle' : 'error'}`}>
                              {statusInfo.status.state}
                            </span>
                            {statusInfo.status.markerLevels && statusInfo.status.markerLevels.length > 0 && (
                              <div className="printer-markers">
                                {statusInfo.status.markerLevels.map((m) => (
                                  <span key={m.name} className="printer-marker">
                                    {m.name}: {m.level}%
                                  </span>
                                ))}
                              </div>
                            )}
                          </>
                        ) : null}
                      </div>
                    )}

                    <div className="printer-card__actions">
                      <button
                        className="sync-controls__btn"
                        onClick={() => handleCheckStatus(printer)}
                        disabled={statusInfo?.loading}
                      >
                        {statusInfo?.loading ? 'Checking...' : 'Check Status'}
                      </button>
                      {!isDefault && (
                        <button
                          className="sync-controls__btn"
                          onClick={() => handleSetDefault(printer.id)}
                        >
                          Set Default
                        </button>
                      )}
                      <button
                        className="sync-controls__btn sync-controls__btn--danger"
                        onClick={() => handleRemovePrinter(printer.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="printer-empty">
              No printers saved. Use Discover to find printers on your network.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default SystemTab;
