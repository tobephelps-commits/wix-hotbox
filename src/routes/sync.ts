/**
 * Sync API Routes
 *
 * Fastify plugin providing REST endpoints for stock sync operations:
 * - GET    /api/sync/mappings       -- List all product mappings
 * - POST   /api/sync/mappings       -- Create product mapping
 * - DELETE /api/sync/mappings/:style -- Remove product mapping
 * - POST   /api/sync/run            -- Run single sync cycle on-demand
 * - GET    /api/sync/health         -- Get daemon health status
 * - POST   /api/sync/start          -- Start sync daemon
 * - POST   /api/sync/stop           -- Stop sync daemon
 * - POST   /api/sync/audit          -- Audit product mappings against WIX API
 *
 * Phase 51: Inventory Sync
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import type { VendorId } from '../vendors/types.js';
import type { NotificationConfig, MappingAuditResult } from '../sync/types.js';
import {
  listMappings,
  saveMapping,
  removeMapping,
} from '../sync/product-map.js';
import {
  syncOnce,
  startDaemon,
  stopDaemon,
  isDaemonRunning,
  getSyncHealth,
} from '../sync/sync-poller.js';
import type { WixConfig } from '../sync/stock-sync.js';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Extract WIX config from fastify.config.
 */
function getWixConfig(fastify: FastifyInstance): WixConfig {
  const { wixApiKey, wixSiteId } = fastify.config;
  if (!wixApiKey) {
    throw new Error('WIX_API_KEY is not configured');
  }
  if (!wixSiteId) {
    throw new Error('WIX_SITE_ID is not configured');
  }
  return { apiKey: wixApiKey, siteId: wixSiteId };
}

/**
 * Build notification config from environment variables.
 */
function getNotificationConfig(): NotificationConfig {
  const smtpUser = process.env.SMTP_USER ?? '';
  const smtpPass = process.env.SMTP_PASS ?? '';
  const notifyEnabled =
    (process.env.NOTIFY_ENABLED ?? 'false').toLowerCase() === 'true';
  const enabled = notifyEnabled && !!smtpUser;

  return {
    enabled,
    smtp: {
      host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT ?? '587', 10),
      secure: (process.env.SMTP_SECURE ?? 'false').toLowerCase() === 'true',
      user: smtpUser,
      pass: smtpPass,
    },
    to: process.env.NOTIFY_TO ?? smtpUser,
    from: process.env.NOTIFY_FROM ?? smtpUser,
  };
}

/**
 * Delay helper for rate limiting.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================================
// Route Plugin
// =============================================================================

export default async function syncRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions,
) {
  // =========================================================================
  // Product Mappings
  // =========================================================================

  /**
   * GET /api/sync/mappings
   * List all product mappings.
   */
  fastify.get('/mappings', async () => {
    const mappings = listMappings(fastify.db);
    return { mappings, total: mappings.length };
  });

  /**
   * POST /api/sync/mappings
   * Create a product mapping.
   * Body: { style, wixProductId, productName, vendor? }
   */
  fastify.post<{
    Body: {
      style: string;
      wixProductId: string;
      productName: string;
      vendor?: VendorId;
    };
  }>('/mappings', async (request, reply) => {
    const { style, wixProductId, productName, vendor } = request.body;

    if (!style || !wixProductId || !productName) {
      return reply
        .status(400)
        .send({ error: 'style, wixProductId, and productName are required' });
    }

    saveMapping(fastify.db, {
      style,
      vendor: vendor ?? 'sanmar',
      wixProductId,
      productName,
      linkedAt: new Date().toISOString(),
    });

    return reply.status(201).send({
      message: `Mapping created for ${style}`,
      mapping: { style, vendor: vendor ?? 'sanmar', wixProductId, productName },
    });
  });

  /**
   * DELETE /api/sync/mappings/:style
   * Remove a product mapping.
   * Query: ?vendor= (defaults to 'sanmar')
   */
  fastify.delete<{
    Params: { style: string };
    Querystring: { vendor?: VendorId };
  }>('/mappings/:style', async (request, reply) => {
    const { style } = request.params;
    const vendor = request.query.vendor ?? 'sanmar';

    const removed = removeMapping(fastify.db, style, vendor);
    if (!removed) {
      return reply.status(404).send({ error: `Mapping not found: ${style} (${vendor})` });
    }

    return { message: `Mapping removed for ${style} (${vendor})` };
  });

  // =========================================================================
  // Sync Operations
  // =========================================================================

  /**
   * POST /api/sync/run
   * Run a single sync cycle on-demand.
   */
  fastify.post('/run', async (_request, reply) => {
    try {
      const wixConfig = getWixConfig(fastify);
      const notificationConfig = getNotificationConfig();

      const result = await syncOnce(
        fastify.db,
        wixConfig,
        notificationConfig,
      );

      return {
        productsPolled: result.productsPolled,
        productsSynced: result.productsSynced,
        alerts: result.alerts,
        errors: result.errors,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({ error: message });
    }
  });

  // =========================================================================
  // Daemon Control
  // =========================================================================

  /**
   * GET /api/sync/health
   * Return daemon health and running status.
   */
  fastify.get('/health', async () => {
    const health = getSyncHealth();
    return {
      running: isDaemonRunning(),
      health,
    };
  });

  /**
   * POST /api/sync/start
   * Start the sync daemon.
   */
  fastify.post('/start', async (_request, reply) => {
    try {
      const wixConfig = getWixConfig(fastify);
      const notificationConfig = getNotificationConfig();

      const started = startDaemon(
        fastify.db,
        wixConfig,
        notificationConfig,
      );

      if (!started) {
        return reply.status(409).send({ error: 'Daemon is already running' });
      }

      return { message: 'Sync daemon started' };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({ error: message });
    }
  });

  /**
   * POST /api/sync/stop
   * Stop the sync daemon.
   */
  fastify.post('/stop', async (_request, reply) => {
    const stopped = stopDaemon();

    if (!stopped) {
      return reply.status(404).send({ error: 'Daemon is not running' });
    }

    return { message: 'Sync daemon stopped' };
  });

  // =========================================================================
  // Audit
  // =========================================================================

  /**
   * POST /api/sync/audit
   * Audit all product mappings against the WIX API.
   * Checks if each mapping's wixProductId still exists.
   */
  fastify.post('/audit', async (_request, reply) => {
    try {
      const wixConfig = getWixConfig(fastify);
      const mappings = listMappings(fastify.db);

      const auditResult: MappingAuditResult = {
        total: mappings.length,
        healthy: 0,
        orphaned: [],
        errors: [],
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${wixConfig.apiKey}`,
        'wix-site-id': wixConfig.siteId,
      };

      for (const mapping of mappings) {
        try {
          const endpoint = `https://www.wixapis.com/stores/v1/products/${mapping.wixProductId}`;
          const response = await fetch(endpoint, {
            method: 'GET',
            headers,
          });

          if (response.ok) {
            auditResult.healthy++;
          } else if (response.status === 404) {
            auditResult.orphaned.push(mapping);
          } else {
            const body = await response.text().catch(() => '');
            auditResult.errors.push({
              mapping,
              error: `HTTP ${response.status}: ${body.slice(0, 200)}`,
            });
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          auditResult.errors.push({ mapping, error: message });
        }

        // Rate limit between WIX API calls
        await delay(200);
      }

      return auditResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({ error: message });
    }
  });
}
