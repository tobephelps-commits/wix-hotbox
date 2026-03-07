/**
 * Order API Routes
 *
 * Fastify plugin providing REST endpoints for order management:
 * - GET    /api/orders              -- List orders (filterable, paginated)
 * - GET    /api/orders/summary      -- Order summary (status counts)
 * - GET    /api/orders/summary/extended -- Extended summary with metrics
 * - GET    /api/orders/errors       -- Orders with unresolved errors
 * - POST   /api/orders/bulk/status  -- Bulk status update
 * - POST   /api/orders/bulk/production-sheets -- Bulk production sheet ZIP
 * - GET    /api/orders/cart/preview  -- Preview consolidated cart items
 * - POST   /api/orders/cart/fill     -- Trigger browser cart automation
 * - GET    /api/orders/cart/history  -- Cart fill history
 * - POST   /api/orders/sync         -- Trigger WIX order sync
 * - POST   /api/orders/sync/reset   -- Reset and resync all WIX orders
 * - GET    /api/orders/:id          -- Get order details
 * - GET    /api/orders/:id/production-sheet -- Production sheet PDF
 * - GET    /api/orders/:id/invoice  -- Invoice PDF
 * - POST   /api/orders              -- Create manual order
 * - PATCH  /api/orders/:id/status   -- Update order status
 * - DELETE /api/orders/:id          -- Delete order
 *
 * Route ordering: Bulk/cart/named endpoints registered BEFORE parameterized /:id
 * routes to prevent path collisions (Phase 41 lesson).
 *
 * Phase 49: Order Management Core
 * Phase 50: PDF generation endpoints
 * Phase 52: Cart automation endpoints
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import type {
  OrderStatus,
  OrderSource,
  OrderFilter,
  CreateOrderInput,
} from '../orders/index.js';
import type { VendorId } from '../vendors/types.js';
import {
  listOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  updateOrderStatusBulk,
  deleteOrder,
  clearWixOrders,
  getOrdersWithErrors,
  getOrderSummary,
  getOrderSummaryExtended,
  syncWithRetry,
  generateProductionSheet,
  generateInvoice,
  setPdfDataDir,
  buildCartFillRequest,
  fillSanMarCart,
  fillSSCart,
  markOrdersAsOrdered,
  markSSOrdersAsOrdered,
  addOrderError,
} from '../orders/index.js';
import archiver from 'archiver';
import { mkdirSync, writeFileSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

export default async function orderRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions,
) {
  // Initialize PDF template with data directory for logo resolution
  setPdfDataDir(fastify.config.dataDir);

  // =========================================================================
  // GET / -- List orders (filterable, paginated)
  // =========================================================================

  fastify.get<{
    Querystring: {
      status?: string;
      source?: string;
      search?: string;
      limit?: string;
      offset?: string;
    };
  }>('/', async (request) => {
    const { status, source, search, limit: limitStr, offset: offsetStr } = request.query;
    const limit = limitStr ? parseInt(limitStr, 10) : 50;
    const offset = offsetStr ? parseInt(offsetStr, 10) : 0;

    const filter: OrderFilter = {
      ...(status ? { status: status as OrderStatus } : {}),
      ...(source ? { source: source as OrderSource } : {}),
      ...(search ? { search } : {}),
      limit,
      offset,
    };

    const result = listOrders(fastify.db, filter);
    return { orders: result.orders, totalCount: result.totalCount, limit, offset };
  });

  // =========================================================================
  // GET /summary -- Order summary (status counts)
  // =========================================================================

  fastify.get('/summary', async () => {
    return getOrderSummary(fastify.db);
  });

  // =========================================================================
  // GET /summary/extended -- Extended summary with metrics
  // =========================================================================

  fastify.get('/summary/extended', async () => {
    return getOrderSummaryExtended(fastify.db);
  });

  // =========================================================================
  // GET /errors -- Orders with unresolved errors
  // =========================================================================

  fastify.get('/errors', async () => {
    const orders = getOrdersWithErrors(fastify.db);
    return { orders };
  });

  // =========================================================================
  // POST /bulk/status -- Bulk status update
  // (Registered BEFORE /:id to prevent "bulk" matching as an id parameter)
  // =========================================================================

  fastify.post<{
    Body: { orderIds: string[]; status: OrderStatus; note?: string };
  }>('/bulk/status', async (request, reply) => {
    const { orderIds, status, note } = request.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return reply.status(400).send({ error: 'orderIds must be a non-empty array' });
    }

    if (!status) {
      return reply.status(400).send({ error: 'status is required' });
    }

    const result = updateOrderStatusBulk(fastify.db, orderIds, status, note);
    return result;
  });

  // =========================================================================
  // POST /bulk/production-sheets -- Generate production sheets for multiple orders
  // Returns single PDF for one order, ZIP archive for multiple orders.
  // (Registered alongside /bulk/status, BEFORE /:id routes)
  // =========================================================================

  fastify.post<{
    Body: { orderIds: string[] };
  }>('/bulk/production-sheets', async (request, reply) => {
    const { orderIds } = request.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return reply.status(400).send({ error: 'orderIds must be a non-empty array' });
    }

    // Fetch all orders and generate PDFs
    const results: { orderNumber: number; buffer: Buffer }[] = [];
    const failed: { orderId: string; reason: string }[] = [];

    for (const id of orderIds) {
      try {
        const order = getOrder(fastify.db, id);
        if (!order) {
          failed.push({ orderId: id, reason: 'Order not found' });
          continue;
        }
        const buffer = await generateProductionSheet(order);
        results.push({ orderNumber: order.orderNumber, buffer });
      } catch (err) {
        failed.push({
          orderId: id,
          reason: err instanceof Error ? err.message : String(err),
        });
      }
    }

    if (results.length === 0) {
      return reply.status(404).send({
        error: 'No production sheets generated',
        failed,
      });
    }

    // Set failed count header for client awareness of partial failures
    if (failed.length > 0) {
      reply.header('X-Failed-Count', String(failed.length));
    }

    // Single order: return PDF directly
    if (results.length === 1) {
      const { orderNumber, buffer } = results[0];
      return reply
        .type('application/pdf')
        .header(
          'Content-Disposition',
          `attachment; filename="PS-${orderNumber}.pdf"`,
        )
        .send(buffer);
    }

    // Multiple orders: create ZIP archive
    return new Promise<void>((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 5 } });

      reply
        .type('application/zip')
        .header(
          'Content-Disposition',
          'attachment; filename="production-sheets.zip"',
        );

      const chunks: Buffer[] = [];
      archive.on('data', (chunk: Buffer) => chunks.push(chunk));
      archive.on('end', () => {
        reply.send(Buffer.concat(chunks));
        resolve();
      });
      archive.on('error', (err) => {
        reject(err);
      });

      for (const { orderNumber, buffer } of results) {
        archive.append(buffer, { name: `PS-${orderNumber}.pdf` });
      }

      archive.finalize();
    });
  });

  // =========================================================================
  // GET /cart/preview -- Preview consolidated cart items for a vendor
  // (Registered BEFORE /:id to prevent "cart" matching as an id parameter)
  // =========================================================================

  fastify.get<{
    Querystring: { vendor?: string };
  }>('/cart/preview', async (request, reply) => {
    const vendor = request.query.vendor as VendorId | undefined;

    if (vendor && vendor !== 'sanmar' && vendor !== 'ss') {
      return reply.status(400).send({ error: 'vendor must be "sanmar" or "ss"' });
    }

    const cartRequest = buildCartFillRequest(fastify.db, vendor);
    return {
      items: cartRequest.items,
      orderCount: cartRequest.orderNumbers.length,
      itemCount: cartRequest.items.length,
    };
  });

  // =========================================================================
  // POST /cart/fill -- Trigger browser cart automation for a vendor
  // =========================================================================

  fastify.post<{
    Body: { vendor: 'sanmar' | 'ss'; headless?: boolean };
  }>('/cart/fill', async (request, reply) => {
    const { vendor, headless } = request.body;

    if (!vendor || (vendor !== 'sanmar' && vendor !== 'ss')) {
      return reply.status(400).send({ error: 'vendor must be "sanmar" or "ss"' });
    }

    // Build cart fill request from eligible orders
    const cartRequest = buildCartFillRequest(fastify.db, vendor);
    if (cartRequest.items.length === 0) {
      return reply.status(400).send({ error: 'No eligible orders for cart fill' });
    }

    // Extract web credentials from config
    const credentials =
      vendor === 'sanmar'
        ? { username: fastify.config.sanmarWebUsername, password: fastify.config.sanmarWebPassword }
        : { username: fastify.config.ssWebUsername, password: fastify.config.ssWebPassword };

    if (!credentials.username || !credentials.password) {
      return reply.status(400).send({ error: `Web credentials not configured for ${vendor}` });
    }

    const options = { headless: headless ?? true };

    try {
      // Execute cart fill
      const result =
        vendor === 'sanmar'
          ? await fillSanMarCart(fastify.db, cartRequest, credentials, options)
          : await fillSSCart(fastify.db, cartRequest, credentials, options);

      // Transition successful orders to "ordered" status
      if (result.status === 'success' || result.status === 'partial') {
        if (vendor === 'sanmar') {
          await markOrdersAsOrdered(fastify.db, result);
        } else {
          await markSSOrdersAsOrdered(fastify.db, result);
        }
      }

      // Log errors to order_errors table for any failed items
      for (const itemResult of result.itemResults) {
        if (!itemResult.success && itemResult.error) {
          // Find order IDs for the source orders of this failed item
          for (const orderNumber of itemResult.item.sourceOrders) {
            const row = fastify.db
              .prepare('SELECT id FROM orders WHERE order_number = ?')
              .get(orderNumber) as { id: string } | undefined;
            if (row) {
              addOrderError(fastify.db, row.id, {
                operation: 'cart-fill',
                message: `Failed to add ${itemResult.item.vendorStyle} ${itemResult.item.color} ${itemResult.item.size}: ${itemResult.error}`,
              });
            }
          }
        }
      }

      // Persist result for audit trail
      const fillsDir = path.resolve(fastify.config.dataDir, 'cart-fills');
      mkdirSync(fillsDir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      writeFileSync(
        path.join(fillsDir, `${timestamp}-${vendor}.json`),
        JSON.stringify(result, null, 2),
      );

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      // Detect login failures
      if (message.toLowerCase().includes('login')) {
        return reply.status(401).send({ error: 'Vendor login failed', details: message });
      }

      // Playwright launch or other failures
      return reply.status(500).send({ error: 'Cart fill failed', details: message });
    }
  });

  // =========================================================================
  // GET /cart/history -- Cart fill history
  // =========================================================================

  fastify.get<{
    Querystring: { vendor?: string; limit?: string };
  }>('/cart/history', async (request, reply) => {
    const vendor = request.query.vendor as VendorId | undefined;
    const limit = request.query.limit ? parseInt(request.query.limit, 10) : 10;

    if (vendor && vendor !== 'sanmar' && vendor !== 'ss') {
      return reply.status(400).send({ error: 'vendor must be "sanmar" or "ss"' });
    }

    const fillsDir = path.resolve(fastify.config.dataDir, 'cart-fills');

    let files: string[];
    try {
      files = readdirSync(fillsDir).filter((f) => f.endsWith('.json'));
    } catch {
      // Directory doesn't exist yet -- no history
      return [];
    }

    // Filter by vendor if specified
    if (vendor) {
      files = files.filter((f) => f.endsWith(`-${vendor}.json`));
    }

    // Sort descending by filename (timestamp-based)
    files.sort((a, b) => b.localeCompare(a));

    // Limit results
    files = files.slice(0, limit);

    // Read and summarize each result
    const summaries = files.map((file) => {
      const raw = readFileSync(path.join(fillsDir, file), 'utf-8');
      const result = JSON.parse(raw) as {
        status: string;
        request: { items: unknown[]; orderNumbers: number[] };
        itemResults: { success: boolean }[];
        completedAt: string;
      };

      const itemCount = result.itemResults.length;
      const successCount = result.itemResults.filter((r) => r.success).length;
      const failedCount = itemCount - successCount;

      // Extract vendor from filename (last segment before .json)
      const fileVendor = file.replace('.json', '').split('-').pop() || '';

      return {
        status: result.status,
        vendor: fileVendor,
        itemCount,
        successCount,
        failedCount,
        completedAt: result.completedAt,
      };
    });

    return summaries;
  });

  // =========================================================================
  // POST /sync -- Trigger WIX order sync
  // =========================================================================

  fastify.post<{
    Body: { days?: number };
  }>('/sync', async (request) => {
    const { days } = request.body ?? {};
    const result = await syncWithRetry(fastify.config, fastify.db, { days });
    return result;
  });

  // =========================================================================
  // POST /sync/reset -- Reset and resync all WIX orders
  // =========================================================================

  fastify.post<{
    Body: { days?: number };
  }>('/sync/reset', async (request) => {
    const { days } = request.body ?? {};
    const clearedCount = clearWixOrders(fastify.db);
    const result = await syncWithRetry(fastify.config, fastify.db, { days });
    return { ...result, clearedCount };
  });

  // =========================================================================
  // GET /:id -- Get order details
  // (Registered AFTER named routes to prevent path collisions)
  // =========================================================================

  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const order = getOrder(fastify.db, request.params.id);
    if (!order) {
      return reply.status(404).send({ error: 'Order not found' });
    }
    return order;
  });

  // =========================================================================
  // GET /:id/production-sheet -- Generate production sheet PDF for single order
  // =========================================================================

  fastify.get<{ Params: { id: string } }>('/:id/production-sheet', async (request, reply) => {
    const order = getOrder(fastify.db, request.params.id);
    if (!order) {
      return reply.status(404).send({ error: 'Order not found' });
    }

    const buffer = await generateProductionSheet(order);
    return reply
      .type('application/pdf')
      .header(
        'Content-Disposition',
        `attachment; filename="PS-${order.orderNumber}.pdf"`,
      )
      .send(buffer);
  });

  // =========================================================================
  // GET /:id/invoice -- Generate invoice PDF for single order
  // =========================================================================

  fastify.get<{ Params: { id: string } }>('/:id/invoice', async (request, reply) => {
    const order = getOrder(fastify.db, request.params.id);
    if (!order) {
      return reply.status(404).send({ error: 'Order not found' });
    }

    const buffer = await generateInvoice(order);
    return reply
      .type('application/pdf')
      .header(
        'Content-Disposition',
        `attachment; filename="INV-${order.orderNumber}.pdf"`,
      )
      .send(buffer);
  });

  // =========================================================================
  // POST / -- Create manual order
  // =========================================================================

  fastify.post<{ Body: CreateOrderInput }>('/', async (request, reply) => {
    const body = request.body;

    if (!body.source) {
      return reply.status(400).send({ error: 'source is required' });
    }

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return reply.status(400).send({ error: 'items must be a non-empty array' });
    }

    const order = createOrder(fastify.db, body);
    return reply.status(201).send(order);
  });

  // =========================================================================
  // PATCH /:id/status -- Update order status
  // =========================================================================

  fastify.patch<{
    Params: { id: string };
    Body: { status: OrderStatus; note?: string };
  }>('/:id/status', async (request, reply) => {
    const { id } = request.params;
    const { status, note } = request.body;

    if (!status) {
      return reply.status(400).send({ error: 'status is required' });
    }

    try {
      const order = updateOrderStatus(fastify.db, id, status, note);
      return order;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('not found')) {
        return reply.status(404).send({ error: 'Order not found' });
      }
      return reply.status(400).send({ error: message });
    }
  });

  // =========================================================================
  // DELETE /:id -- Delete order
  // =========================================================================

  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const deleted = deleteOrder(fastify.db, request.params.id);
    if (!deleted) {
      return reply.status(404).send({ error: 'Order not found' });
    }
    return reply.status(204).send();
  });
}
