/**
 * Monitor API Routes
 *
 * Fastify plugin providing REST endpoints for inventory monitoring:
 * - GET    /api/monitor/config                        -- Current monitor config
 * - GET    /api/monitor/products                      -- List tracked products
 * - POST   /api/monitor/products                      -- Add tracked product
 * - DELETE /api/monitor/products/:style               -- Remove tracked product
 * - PATCH  /api/monitor/products/:style               -- Update tracked product
 * - GET    /api/monitor/products/:style/snapshot      -- Latest snapshot for style
 * - GET    /api/monitor/alerts                        -- List alerts (filtered)
 * - POST   /api/monitor/alerts/:id/acknowledge        -- Acknowledge alert
 * - POST   /api/monitor/poll                          -- On-demand poll cycle
 *
 * Phase 51: Inventory Sync
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import type { VendorId } from '../vendors/types.js';
import type { PollPriority, StockAlert } from '../monitor/types.js';
import {
  DEFAULT_CONFIG,
  listTrackedProducts,
  addTrackedProduct,
  removeTrackedProduct,
  updateTrackedProduct,
  getSnapshot,
  getAlerts,
  acknowledgeAlert,
  pollOnce,
} from '../monitor/index.js';

export default async function monitorRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions,
) {
  // =========================================================================
  // GET /config -- Current monitor configuration
  // =========================================================================

  fastify.get('/config', async () => {
    return { ...DEFAULT_CONFIG };
  });

  // =========================================================================
  // GET /products -- List all tracked products
  // =========================================================================

  fastify.get('/products', async () => {
    const products = listTrackedProducts(fastify.db);
    return { products };
  });

  // =========================================================================
  // POST /products -- Add tracked product
  // =========================================================================

  fastify.post<{
    Body: {
      style: string;
      name: string;
      vendor?: VendorId;
      colors?: string[];
      sizes?: string[];
      priority?: PollPriority;
    };
  }>('/products', async (request, reply) => {
    const { style, name, vendor, colors, sizes, priority } = request.body;

    if (!style || !name) {
      return reply.status(400).send({ error: 'style and name are required' });
    }

    addTrackedProduct(fastify.db, {
      style,
      name,
      vendor: vendor ?? 'sanmar',
      colors,
      sizes,
      priority: priority ?? 'normal',
    });

    return reply.status(201).send({ ok: true, style, vendor: vendor ?? 'sanmar' });
  });

  // =========================================================================
  // DELETE /products/:style -- Remove tracked product
  // =========================================================================

  fastify.delete<{
    Params: { style: string };
    Querystring: { vendor?: string };
  }>('/products/:style', async (request, reply) => {
    const { style } = request.params;
    const vendor = (request.query.vendor as VendorId) ?? 'sanmar';

    const deleted = removeTrackedProduct(fastify.db, style, vendor);
    if (!deleted) {
      return reply.status(404).send({ error: 'Tracked product not found' });
    }

    return { ok: true, style, vendor };
  });

  // =========================================================================
  // PATCH /products/:style -- Update tracked product fields
  // =========================================================================

  fastify.patch<{
    Params: { style: string };
    Querystring: { vendor?: string };
    Body: {
      priority?: PollPriority;
      colors?: string[];
      sizes?: string[];
      lowStockThreshold?: number;
      criticalStockThreshold?: number;
      outOfStockThreshold?: number;
    };
  }>('/products/:style', async (request) => {
    const { style } = request.params;
    const vendor = (request.query.vendor as VendorId) ?? 'sanmar';
    const updates = request.body;

    updateTrackedProduct(fastify.db, style, vendor, updates);

    return { ok: true, style, vendor };
  });

  // =========================================================================
  // GET /products/:style/snapshot -- Latest inventory snapshot
  // =========================================================================

  fastify.get<{
    Params: { style: string };
    Querystring: { vendor?: string };
  }>('/products/:style/snapshot', async (request, reply) => {
    const { style } = request.params;
    const vendor = (request.query.vendor as VendorId) ?? 'sanmar';

    const snapshot = getSnapshot(fastify.db, style, vendor);
    if (!snapshot) {
      return reply.status(404).send({ error: 'No snapshot found for this style' });
    }

    return snapshot;
  });

  // =========================================================================
  // GET /alerts -- List alerts with filtering
  // =========================================================================

  fastify.get<{
    Querystring: {
      type?: string;
      style?: string;
      vendor?: string;
      since?: string;
      limit?: string;
      offset?: string;
    };
  }>('/alerts', async (request) => {
    const { type, style, vendor, since, limit: limitStr, offset: offsetStr } = request.query;
    const limit = limitStr ? parseInt(limitStr, 10) : 50;
    const offset = offsetStr ? parseInt(offsetStr, 10) : 0;

    const alerts = getAlerts(fastify.db, {
      ...(type ? { type: type as StockAlert['type'] } : {}),
      ...(style ? { style } : {}),
      ...(vendor ? { vendor: vendor as VendorId } : {}),
      ...(since ? { since } : {}),
      limit,
      offset,
    });

    return { alerts };
  });

  // =========================================================================
  // POST /alerts/:id/acknowledge -- Acknowledge an alert
  // =========================================================================

  fastify.post<{
    Params: { id: string };
  }>('/alerts/:id/acknowledge', async (request, reply) => {
    const id = parseInt(request.params.id, 10);

    if (isNaN(id)) {
      return reply.status(400).send({ error: 'Invalid alert ID' });
    }

    const acknowledged = acknowledgeAlert(fastify.db, id);
    if (!acknowledged) {
      return reply.status(404).send({ error: 'Alert not found' });
    }

    return { ok: true, id };
  });

  // =========================================================================
  // POST /poll -- Run a single poll cycle on-demand
  // =========================================================================

  fastify.post('/poll', async () => {
    const result = await pollOnce(fastify.db, DEFAULT_CONFIG);

    return {
      productsPolled: result.productsPolled,
      alertsGenerated: result.alerts.length,
      errors: result.errors,
    };
  });
}
