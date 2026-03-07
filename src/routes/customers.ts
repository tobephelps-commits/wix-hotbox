/**
 * Customer API Routes
 *
 * Fastify plugin providing REST endpoints for customer management and royalty reporting:
 * - GET    /api/customers              -- List customers (filterable by active)
 * - GET    /api/customers/:id          -- Get single customer
 * - POST   /api/customers              -- Create customer
 * - PATCH  /api/customers/:id          -- Update customer
 * - DELETE /api/customers/:id          -- Delete customer
 * - POST   /api/customers/:id/pricing  -- Calculate customer-specific pricing
 * - GET    /api/customers/:id/royalty/pdf -- Royalty statement PDF
 * - GET    /api/customers/:id/royalty  -- Royalty report JSON
 *
 * Route ordering: /royalty/pdf registered BEFORE /royalty to prevent "pdf"
 * being parsed as a date parameter.
 *
 * Phase 53: Customer & Royalty System
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
} from '../customers/index.js';
import {
  listCustomers,
  getCustomer,
  addCustomer,
  updateCustomer,
  deleteCustomer,
  calculateCustomerPricingSummary,
  generateRoyaltyReport,
  generateRoyaltyStatement,
  setRoyaltyStatementDataDir,
} from '../customers/index.js';
import { getOrder, listOrders } from '../orders/index.js';
import type { OrderWithDetails } from '../orders/index.js';

export default async function customerRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions,
) {
  // Initialize royalty statement PDF with data directory for logo resolution
  setRoyaltyStatementDataDir(fastify.config.dataDir);

  // =========================================================================
  // GET / -- List customers
  // =========================================================================

  fastify.get<{
    Querystring: { active?: string };
  }>('/', async (request) => {
    const { active } = request.query;

    let activeOnly: boolean | undefined;
    if (active === 'true') {
      activeOnly = true;
    } else if (active === 'false') {
      activeOnly = false;
    }

    const customers = listCustomers(fastify.db, activeOnly);
    return { customers };
  });

  // =========================================================================
  // POST / -- Create customer
  // =========================================================================

  fastify.post<{ Body: CreateCustomerInput }>('/', async (request, reply) => {
    const body = request.body;

    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      return reply.status(400).send({ error: 'name is required' });
    }

    if (body.markupPercent == null || typeof body.markupPercent !== 'number' || body.markupPercent < 0) {
      return reply.status(400).send({ error: 'markupPercent must be a non-negative number' });
    }

    if (body.royaltyPercent == null || typeof body.royaltyPercent !== 'number' || body.royaltyPercent < 0) {
      return reply.status(400).send({ error: 'royaltyPercent must be a non-negative number' });
    }

    const customer = addCustomer(fastify.db, body);
    return reply.status(201).send(customer);
  });

  // =========================================================================
  // POST /:id/pricing -- Calculate customer-specific pricing
  // (Registered BEFORE /:id GET to avoid route conflicts)
  // =========================================================================

  fastify.post<{
    Params: { id: string };
    Body: {
      wholesaleCost: number;
      decorationCost?: number;
      rounding?: 'none' | 'nearest-99' | 'nearest-dollar';
      sizeUpcharges?: Record<string, number>;
    };
  }>('/:id/pricing', async (request, reply) => {
    const customer = getCustomer(fastify.db, request.params.id);
    if (!customer) {
      return reply.status(404).send({ error: 'Customer not found' });
    }

    const { wholesaleCost, decorationCost, rounding, sizeUpcharges } = request.body;

    if (wholesaleCost == null || typeof wholesaleCost !== 'number') {
      return reply.status(400).send({ error: 'wholesaleCost is required and must be a number' });
    }

    const summary = calculateCustomerPricingSummary({
      wholesaleCost,
      decorationCost: decorationCost ?? 0,
      customerMarkupPercent: customer.markupPercent,
      royaltyPercent: customer.royaltyPercent,
      rounding,
      sizeUpcharges,
    });

    return summary;
  });

  // =========================================================================
  // GET /:id/royalty/pdf -- Royalty statement PDF
  // (Registered BEFORE /:id/royalty to prevent "pdf" matching as date param)
  // =========================================================================

  fastify.get<{
    Params: { id: string };
    Querystring: { start?: string; end?: string };
  }>('/:id/royalty/pdf', async (request, reply) => {
    const customer = getCustomer(fastify.db, request.params.id);
    if (!customer) {
      return reply.status(404).send({ error: 'Customer not found' });
    }

    const { start, end } = request.query;

    if (!start || !end) {
      return reply.status(400).send({ error: 'start and end query parameters are required (YYYY-MM-DD)' });
    }

    // Validate ISO date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
      return reply.status(400).send({ error: 'start and end must be valid ISO dates (YYYY-MM-DD)' });
    }

    // Load all orders with details for royalty calculation
    const { orders: allOrders } = listOrders(fastify.db);
    const ordersWithDetails: OrderWithDetails[] = [];
    for (const order of allOrders) {
      const detailed = getOrder(fastify.db, order.id);
      if (detailed) {
        ordersWithDetails.push(detailed);
      }
    }

    const report = generateRoyaltyReport({
      customer,
      orders: ordersWithDetails,
      periodStart: start,
      periodEnd: end,
    });

    const buffer = await generateRoyaltyStatement(report, customer);

    const safeName = customer.name.replace(/[^a-zA-Z0-9-_]/g, '-');
    return reply
      .type('application/pdf')
      .header(
        'Content-Disposition',
        `inline; filename="royalty-${safeName}-${start}-${end}.pdf"`,
      )
      .send(buffer);
  });

  // =========================================================================
  // GET /:id/royalty -- Royalty report JSON
  // =========================================================================

  fastify.get<{
    Params: { id: string };
    Querystring: { start?: string; end?: string };
  }>('/:id/royalty', async (request, reply) => {
    const customer = getCustomer(fastify.db, request.params.id);
    if (!customer) {
      return reply.status(404).send({ error: 'Customer not found' });
    }

    const { start, end } = request.query;

    if (!start || !end) {
      return reply.status(400).send({ error: 'start and end query parameters are required (YYYY-MM-DD)' });
    }

    // Validate ISO date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
      return reply.status(400).send({ error: 'start and end must be valid ISO dates (YYYY-MM-DD)' });
    }

    // Load all orders with details for royalty calculation
    const { orders: allOrders } = listOrders(fastify.db);
    const ordersWithDetails: OrderWithDetails[] = [];
    for (const order of allOrders) {
      const detailed = getOrder(fastify.db, order.id);
      if (detailed) {
        ordersWithDetails.push(detailed);
      }
    }

    const report = generateRoyaltyReport({
      customer,
      orders: ordersWithDetails,
      periodStart: start,
      periodEnd: end,
    });

    return report;
  });

  // =========================================================================
  // GET /:id -- Get single customer
  // (Registered AFTER named sub-routes to prevent path collisions)
  // =========================================================================

  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const customer = getCustomer(fastify.db, request.params.id);
    if (!customer) {
      return reply.status(404).send({ error: 'Customer not found' });
    }
    return customer;
  });

  // =========================================================================
  // PATCH /:id -- Update customer
  // =========================================================================

  fastify.patch<{
    Params: { id: string };
    Body: UpdateCustomerInput;
  }>('/:id', async (request, reply) => {
    const customer = getCustomer(fastify.db, request.params.id);
    if (!customer) {
      return reply.status(404).send({ error: 'Customer not found' });
    }

    const body = request.body;

    if (body.markupPercent != null && (typeof body.markupPercent !== 'number' || body.markupPercent < 0)) {
      return reply.status(400).send({ error: 'markupPercent must be a non-negative number' });
    }

    if (body.royaltyPercent != null && (typeof body.royaltyPercent !== 'number' || body.royaltyPercent < 0)) {
      return reply.status(400).send({ error: 'royaltyPercent must be a non-negative number' });
    }

    const updated = updateCustomer(fastify.db, request.params.id, body);
    return updated;
  });

  // =========================================================================
  // DELETE /:id -- Delete customer
  // =========================================================================

  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const deleted = deleteCustomer(fastify.db, request.params.id);
    if (!deleted) {
      return reply.status(404).send({ error: 'Customer not found' });
    }
    return reply.status(204).send();
  });
}
