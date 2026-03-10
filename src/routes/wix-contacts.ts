/**
 * WIX Contacts API Routes
 *
 * Fastify plugin providing REST endpoints for WIX contact sync management:
 * - GET    /api/wix-contacts              -- List synced WIX contacts
 * - GET    /api/wix-contacts/stats        -- Contact sync statistics
 * - GET    /api/wix-contacts/:wixContactId -- Get single WIX contact
 * - POST   /api/wix-contacts/sync/once    -- Trigger one-shot sync
 * - POST   /api/wix-contacts/sync/start   -- Start sync daemon
 * - POST   /api/wix-contacts/sync/stop    -- Stop sync daemon
 * - GET    /api/wix-contacts/sync/health  -- Daemon health status
 * - POST   /api/wix-contacts/:wixContactId/link   -- Link contact to customer
 * - DELETE /api/wix-contacts/:wixContactId/link   -- Unlink contact from customer
 *
 * Phase 60: WIX Customer Sync
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import {
  listWixContacts,
  getWixContact,
  getWixContactStats,
  linkToCustomer,
  unlinkFromCustomer,
} from '../wix-contacts/store.js';
import {
  syncOnce,
  startDaemon,
  stopDaemon,
  isDaemonRunning,
  getSyncHealth,
} from '../wix-contacts/daemon.js';
import { getCustomer } from '../customers/store.js';

// =============================================================================
// Route Plugin
// =============================================================================

export default async function wixContactRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions,
) {
  // =========================================================================
  // Contact Queries
  // =========================================================================

  /**
   * GET /api/wix-contacts
   * List synced WIX contacts with optional filtering.
   * Query: ?search=&linked=true|false
   */
  fastify.get<{
    Querystring: { search?: string; linked?: string };
  }>('/', async (request) => {
    const { search, linked } = request.query;

    const contacts = listWixContacts(fastify.db, {
      search: search || undefined,
      linkedOnly: linked === 'true' ? true : undefined,
      unlinkedOnly: linked === 'false' ? true : undefined,
    });

    return { contacts, total: contacts.length };
  });

  /**
   * GET /api/wix-contacts/stats
   * Contact sync statistics.
   */
  fastify.get('/stats', async () => {
    return getWixContactStats(fastify.db);
  });

  /**
   * GET /api/wix-contacts/:wixContactId
   * Get a single WIX contact by ID.
   */
  fastify.get<{
    Params: { wixContactId: string };
  }>('/:wixContactId', async (request, reply) => {
    const contact = getWixContact(fastify.db, request.params.wixContactId);
    if (!contact) {
      return reply.status(404).send({ error: 'WIX contact not found' });
    }
    return contact;
  });

  // =========================================================================
  // Sync Operations
  // =========================================================================

  /**
   * POST /api/wix-contacts/sync/once
   * Trigger a one-shot contact sync.
   */
  fastify.post('/sync/once', async (_request, reply) => {
    if (!fastify.config.wixApiKey || !fastify.config.wixSiteId) {
      return reply.status(400).send({
        error: 'WIX_API_KEY and WIX_SITE_ID must be configured',
      });
    }

    try {
      const result = await syncOnce(fastify.db, fastify.config);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({ error: message });
    }
  });

  /**
   * POST /api/wix-contacts/sync/start
   * Start the customer sync daemon.
   */
  fastify.post('/sync/start', async (_request, reply) => {
    if (!fastify.config.wixApiKey || !fastify.config.wixSiteId) {
      return reply.status(400).send({
        error: 'WIX_API_KEY and WIX_SITE_ID must be configured',
      });
    }

    const started = startDaemon(fastify.db, fastify.config);
    if (!started) {
      return { started: false, reason: 'already running' };
    }
    return { started: true };
  });

  /**
   * POST /api/wix-contacts/sync/stop
   * Stop the customer sync daemon.
   */
  fastify.post('/sync/stop', async () => {
    const stopped = stopDaemon();
    if (!stopped) {
      return { stopped: false, reason: 'not running' };
    }
    return { stopped: true };
  });

  /**
   * GET /api/wix-contacts/sync/health
   * Daemon health status.
   */
  fastify.get('/sync/health', async () => {
    const health = getSyncHealth();
    return {
      running: isDaemonRunning(),
      health,
    };
  });

  // =========================================================================
  // Contact-Customer Linking
  // =========================================================================

  /**
   * POST /api/wix-contacts/:wixContactId/link
   * Link a WIX contact to a B2B customer account.
   * Body: { customerId: string }
   */
  fastify.post<{
    Params: { wixContactId: string };
    Body: { customerId: string };
  }>('/:wixContactId/link', async (request, reply) => {
    const { wixContactId } = request.params;
    const { customerId } = request.body;

    if (!customerId) {
      return reply.status(400).send({ error: 'customerId is required' });
    }

    // Validate contact exists
    const contact = getWixContact(fastify.db, wixContactId);
    if (!contact) {
      return reply.status(404).send({ error: 'WIX contact not found' });
    }

    // Validate customer exists
    const customer = getCustomer(fastify.db, customerId);
    if (!customer) {
      return reply.status(404).send({ error: 'Customer not found' });
    }

    linkToCustomer(fastify.db, wixContactId, customerId);

    // Return updated contact
    return getWixContact(fastify.db, wixContactId);
  });

  /**
   * DELETE /api/wix-contacts/:wixContactId/link
   * Unlink a WIX contact from its customer account.
   */
  fastify.delete<{
    Params: { wixContactId: string };
  }>('/:wixContactId/link', async (request, reply) => {
    const { wixContactId } = request.params;

    const contact = getWixContact(fastify.db, wixContactId);
    if (!contact) {
      return reply.status(404).send({ error: 'WIX contact not found' });
    }

    unlinkFromCustomer(fastify.db, wixContactId);

    // Return updated contact
    return getWixContact(fastify.db, wixContactId);
  });
}
