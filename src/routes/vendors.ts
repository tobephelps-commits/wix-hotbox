/**
 * Vendor API Routes
 *
 * Fastify plugin providing REST endpoints for vendor operations:
 * - GET /api/vendors — List registered vendors
 * - GET /api/vendors/:vendorId/credentials — Check if vendor credentials are configured
 * - GET /api/vendors/:vendorId/styles/:style — Fetch unified product data for a style
 *
 * Importing the adapter modules triggers auto-registration with the vendor registry.
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import type { VendorId } from '../vendors/types.js';

// Importing adapters triggers auto-registration with the vendor registry
import '../vendors/sanmar/adapter.js';
import '../vendors/ss-activewear/adapter.js';

import { listVendors, getVendor, isVendorRegistered } from '../vendors/registry.js';

export default async function vendorRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions,
) {
  /**
   * GET /api/vendors
   * List all registered vendors with their IDs and display names.
   */
  fastify.get('/', async () => {
    const vendorIds = listVendors();
    const vendors = vendorIds.map((id) => {
      const adapter = getVendor(id);
      return { id: adapter.vendorId, name: adapter.vendorName };
    });
    return { vendors };
  });

  /**
   * GET /api/vendors/:vendorId/credentials
   * Check if a vendor's API credentials are configured and valid.
   */
  fastify.get<{ Params: { vendorId: string } }>(
    '/:vendorId/credentials',
    async (request, reply) => {
      const { vendorId } = request.params;

      if (!isVendorRegistered(vendorId as VendorId)) {
        return reply.status(400).send({
          error: `Unknown vendor: "${vendorId}". Registered vendors: [${listVendors().join(', ')}]`,
        });
      }

      const adapter = getVendor(vendorId as VendorId);
      const configured = await adapter.validateCredentials();

      return { vendor: vendorId, configured };
    },
  );

  /**
   * GET /api/vendors/:vendorId/styles/:style
   * Fetch all unified product data (products, pricing, inventory, media) for a style.
   */
  fastify.get<{ Params: { vendorId: string; style: string } }>(
    '/:vendorId/styles/:style',
    async (request, reply) => {
      const { vendorId, style } = request.params;

      if (!isVendorRegistered(vendorId as VendorId)) {
        return reply.status(400).send({
          error: `Unknown vendor: "${vendorId}". Registered vendors: [${listVendors().join(', ')}]`,
        });
      }

      try {
        const adapter = getVendor(vendorId as VendorId);
        const data = await adapter.fetchAllProductData(style);
        return data;
      } catch (err) {
        return reply.status(500).send({
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
  );
}
