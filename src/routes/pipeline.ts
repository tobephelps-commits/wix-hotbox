/**
 * Pipeline API Routes
 *
 * Fastify plugin providing REST endpoints for the product creation pipeline:
 * - GET  /api/pipeline/preview/:vendorId/:style  -- Style lookup and preview
 * - POST /api/pipeline/create                    -- Create WIX product from curated selections
 * - GET  /api/pipeline/presets                   -- List available pricing presets
 * - GET  /api/pipeline/templates                 -- List saved templates
 * - POST /api/pipeline/templates                 -- Save a template
 * - DELETE /api/pipeline/templates/:name         -- Delete a template
 *
 * Phase 47: Product Pipeline Creation UI
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import type { VendorId, UnifiedProductData } from '../vendors/types.js';
import { isVendorRegistered, listVendors } from '../vendors/registry.js';
import { fetchProductPreview } from '../pipeline/fetch-product.js';
import { createWixProduct } from '../pipeline/create-product.js';
import { PRICING_PRESETS, getPresetConfig } from '../pipeline/pricing-rules.js';
import type { PricingConfig } from '../pipeline/pricing-rules.js';
import type { CuratedProduct, CuratedColor, ProductTemplate } from '../pipeline/types.js';
import type { AngleOverlayConfig } from '../logo/types.js';
import {
  setWixConfig,
  setTemplatesDir,
  listTemplates,
  saveTemplate,
  deleteTemplate,
} from '../pipeline/index.js';

// Importing adapters triggers auto-registration with the vendor registry
import '../vendors/sanmar/adapter.js';
import '../vendors/ss-activewear/adapter.js';

// =============================================================================
// Preview Data Cache
// =============================================================================

interface CachedRawData {
  rawData: UnifiedProductData;
  cachedAt: number;
}

/** Module-level cache for raw vendor data between preview and create steps */
const rawDataCache = new Map<string, CachedRawData>();

/** Cache TTL in milliseconds (10 minutes) */
const CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Get cached raw data for a vendor:style key.
 * Returns null if not found or expired.
 */
function getCachedRawData(key: string): UnifiedProductData | null {
  const entry = rawDataCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    rawDataCache.delete(key);
    return null;
  }
  return entry.rawData;
}

/**
 * Store raw data in the cache.
 */
function setCachedRawData(key: string, rawData: UnifiedProductData): void {
  rawDataCache.set(key, { rawData, cachedAt: Date.now() });
}

// =============================================================================
// Route Plugin
// =============================================================================

export default async function pipelineRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions,
) {
  // Initialize WIX API client and templates system from fastify.config
  const { config } = fastify;

  if (config.wixApiKey && config.wixSiteId) {
    setWixConfig({ apiKey: config.wixApiKey, siteId: config.wixSiteId });
  }

  setTemplatesDir(config.dataDir);

  // =========================================================================
  // GET /preview/:vendorId/:style -- Style lookup and preview
  // =========================================================================

  fastify.get<{ Params: { vendorId: string; style: string } }>(
    '/preview/:vendorId/:style',
    async (request, reply) => {
      const { vendorId, style } = request.params;

      if (!isVendorRegistered(vendorId as VendorId)) {
        return reply.status(400).send({
          error: `Unknown vendor: "${vendorId}". Registered vendors: [${listVendors().join(', ')}]`,
        });
      }

      try {
        const { preview, rawData } = await fetchProductPreview(style, vendorId as VendorId);

        // Cache rawData for the create step
        const cacheKey = `${vendorId}:${style}`;
        setCachedRawData(cacheKey, rawData);

        return preview;
      } catch (err) {
        return reply.status(500).send({
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
  );

  // =========================================================================
  // POST /create -- Create WIX product from curated selections
  // =========================================================================

  fastify.post<{
    Body: {
      vendorId: string;
      style: string;
      selectedColors: CuratedColor[];
      selectedSizes: string[];
      pricingPreset?: string;
      pricingConfig?: PricingConfig;
      collections?: string[];
      decorationCost?: number;
      decorationType?: string;
      logoConfig?: AngleOverlayConfig;
    };
  }>('/create', async (request, reply) => {
    const {
      vendorId,
      style,
      selectedColors,
      selectedSizes,
      pricingPreset,
      pricingConfig: customPricingConfig,
      collections,
      decorationCost,
      decorationType,
      logoConfig,
    } = request.body;

    // Validate vendor
    if (!isVendorRegistered(vendorId as VendorId)) {
      return reply.status(400).send({
        error: `Unknown vendor: "${vendorId}". Registered vendors: [${listVendors().join(', ')}]`,
      });
    }

    // Validate required fields
    if (!selectedColors || selectedColors.length === 0) {
      return reply.status(400).send({ error: 'selectedColors is required and must not be empty' });
    }
    if (!selectedSizes || selectedSizes.length === 0) {
      return reply.status(400).send({ error: 'selectedSizes is required and must not be empty' });
    }

    try {
      // Look up cached rawData from preview step (or re-fetch if expired)
      const cacheKey = `${vendorId}:${style}`;
      let rawData = getCachedRawData(cacheKey);
      if (!rawData) {
        const fetchResult = await fetchProductPreview(style, vendorId as VendorId);
        rawData = fetchResult.rawData;
        setCachedRawData(cacheKey, rawData);
      }

      // Determine pricing config
      const pricingConfig: PricingConfig = customPricingConfig
        ?? getPresetConfig(pricingPreset ?? 'standard-tee');

      // Determine wholesale cost from pricing data
      const firstPricing = rawData.pricing[0];
      const wholesaleCost = firstPricing
        ? (firstPricing.salePrice ?? firstPricing.piecePrice)
        : 0;

      // Build CuratedProduct from request body + rawData
      const firstProduct = rawData.products[0];
      const curated: CuratedProduct = {
        style,
        brandName: firstProduct?.brandName ?? '',
        vendor: vendorId as VendorId,
        productTitle: firstProduct?.productTitle ?? '',
        description: firstProduct?.description ?? '',
        selectedColors,
        selectedSizes,
        pricingConfig,
        wholesaleCost,
        ...(collections && collections.length > 0 ? { collections } : {}),
        ...(decorationCost != null && decorationCost > 0 ? { decorationCost, decorationType } : {}),
      };

      const result = await createWixProduct(curated, rawData, logoConfig ?? undefined);
      return result;
    } catch (err) {
      return reply.status(500).send({
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // =========================================================================
  // GET /presets -- List available pricing presets
  // =========================================================================

  fastify.get('/presets', async () => {
    return PRICING_PRESETS;
  });

  // =========================================================================
  // GET /templates -- List saved templates
  // =========================================================================

  fastify.get('/templates', async () => {
    const templates = await listTemplates();
    return templates;
  });

  // =========================================================================
  // POST /templates -- Save a template
  // =========================================================================

  fastify.post<{
    Body: Omit<ProductTemplate, 'createdAt' | 'updatedAt'>;
  }>('/templates', async (request, reply) => {
    const body = request.body;

    if (!body.name || body.name.trim() === '') {
      return reply.status(400).send({ error: 'Template name is required' });
    }

    const now = new Date().toISOString();
    const template: ProductTemplate = {
      ...body,
      createdAt: now,
      updatedAt: now,
    };

    await saveTemplate(template);
    return template;
  });

  // =========================================================================
  // DELETE /templates/:name -- Delete a template
  // =========================================================================

  fastify.delete<{ Params: { name: string } }>(
    '/templates/:name',
    async (request, reply) => {
      const { name } = request.params;
      const deleted = await deleteTemplate(name);

      if (!deleted) {
        return reply.status(404).send({ error: `Template "${name}" not found` });
      }

      return { deleted: true };
    },
  );
}
