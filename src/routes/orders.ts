/**
 * Order API Routes
 *
 * Fastify plugin providing REST endpoints for order management:
 * - GET    /api/orders              -- List orders (filterable, paginated)
 * - GET    /api/orders/summary      -- Order summary (status counts)
 * - GET    /api/orders/summary/extended -- Extended summary with metrics
 * - GET    /api/orders/errors       -- Orders with unresolved errors
 * - POST   /api/orders/bulk/status  -- Bulk status update
 * - POST   /api/orders/sync         -- Trigger WIX order sync
 * - POST   /api/orders/sync/reset   -- Reset and resync all WIX orders
 * - GET    /api/orders/:id          -- Get order details
 * - POST   /api/orders              -- Create manual order
 * - PATCH  /api/orders/:id/status   -- Update order status
 * - DELETE /api/orders/:id          -- Delete order
 *
 * Route ordering: Bulk/named endpoints registered BEFORE parameterized /:id
 * routes to prevent path collisions (Phase 41 lesson).
 *
 * Phase 49: Order Management Core
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import type {
  OrderStatus,
  OrderSource,
  OrderFilter,
  CreateOrderInput,
} from '../orders/index.js';
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
} from '../orders/index.js';

export default async function orderRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions,
) {
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
