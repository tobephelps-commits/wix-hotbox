/**
 * Local Preview Server
 *
 * Serves a self-contained HTML page for visual product curation.
 * The owner enters a SanMar style number, sees color cards with swatches
 * and images, picks which colors/sizes to offer, sets a price, and
 * creates a WIX draft product -- all from a local web browser.
 *
 * Endpoints:
 *   GET  /                    -> Serve preview.html
 *   GET  /api/product/:style  -> Fetch vendor data, return ProductPreview JSON (?vendor=ss|sanmar)
 *   POST /api/create          -> Accept CuratedProduct, create WIX draft
 *
 * Usage:
 *   npx tsx scripts/pipeline/preview-server.ts [STYLE]
 *   npm run preview [-- STYLE]
 *
 * No external dependencies -- uses Node.js built-in http, fs, path, url.
 *
 * Phase 6: Product Creation Pipeline
 * Phase 17: Vendor-agnostic support (vendor parameter on endpoints)
 */

import 'dotenv/config';
import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';
import { fetchProductData } from './fetch-product.js';
import type { ProductData } from './fetch-product.js';
import { createWixProduct } from './create-product.js';
import type { CuratedProduct } from './types.js';
import type { VendorId } from '../vendor/types.js';
import { listTemplates, getTemplate, saveTemplate, deleteTemplate } from './templates.js';
import { PRICING_PRESETS } from './pricing-rules.js';
import {
  compositeLogoOnImage,
  loadLogoRegistry,
  getLogoEntry,
  getPositionPreset,
  listLogos,
} from './overlay.js';
import {
  getAllProductCosts,
  getProductCost,
  getCostHistory,
} from './cost-tracker.js';
import {
  listSales,
  createSale,
  applySale,
  revertSale,
  cancelSale,
  checkAndProcessSales,
} from './sale-pricing.js';
import type { SaleConfig } from './types.js';
import {
  loadConfig,
  loadTrackedProducts,
  getRecentAlerts,
} from '../monitor/index.js';
import { loadLatestSnapshot } from '../monitor/store.js';
import { getSyncHealth } from '../sync/sync-poller.js';

// Order Management (Phase 18)
import {
  listOrders,
  getOrder as getOrderById,
  getOrderByNumber,
  addOrder,
  updateOrderStatus,
  syncWixOrders,
  generateInvoice,
  generateShippingLabel,
  printInvoice,
  printShippingLabel,
  listPrinters,
} from '../orders/index.js';
import type { OrderStatus, OrderSource, OrderCustomer, OrderLineItem, OrderAddress } from '../orders/index.js';

// SanMar Cart Automation (Phase 19)
import {
  getOrdersForCartFill,
  consolidateOrders,
  fillCartForPendingOrders,
  saveCartFillResult,
} from '../orders/index.js';
import type { CartFillResult } from '../orders/index.js';

// Register both vendor adapters to ensure they're available at runtime
import '../sanmar/adapter.js';
import '../ss-activewear/adapter.js';

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_PORT = 3456;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================================================================
// Vendor Helpers
// =============================================================================

/**
 * Parse vendor query parameter from a request URL.
 * Accepts: 'sanmar', 'ss'. Defaults to 'sanmar' if missing or invalid.
 */
function parseVendorParam(reqUrl: string): VendorId {
  try {
    const urlObj = new URL(reqUrl, 'http://localhost');
    const v = urlObj.searchParams.get('vendor');
    if (v === 'ss') return 'ss';
    return 'sanmar';
  } catch {
    return 'sanmar';
  }
}

/**
 * Human-readable vendor name for display.
 */
function vendorDisplayName(vendor: VendorId): string {
  if (vendor === 'ss') return 'S&S Activewear';
  return 'SanMar';
}

// =============================================================================
// In-Memory Cache
// =============================================================================

/**
 * Simple in-memory cache for fetched product data.
 * Keyed by "STYLE:vendor" composite key. Reused between GET /api/product
 * and POST /api/create so we don't refetch the same style.
 * Cleared when a new style is fetched.
 */
const productCache = new Map<string, ProductData>();

/** Build cache key from style + vendor */
function cacheKey(style: string, vendor: VendorId): string {
  return `${style.toUpperCase()}:${vendor}`;
}

// =============================================================================
// Request Helpers
// =============================================================================

/**
 * Read the full request body as a string.
 */
function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

/**
 * Send a JSON response with CORS headers.
 */
function sendJson(
  res: http.ServerResponse,
  statusCode: number,
  data: unknown,
): void {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(body);
}

/**
 * Send an HTML file response.
 */
function sendHtml(res: http.ServerResponse, filePath: string): void {
  try {
    const html = fs.readFileSync(filePath, 'utf-8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
}

/**
 * Send a binary buffer response with CORS headers.
 */
function sendBuffer(
  res: http.ServerResponse,
  statusCode: number,
  contentType: string,
  buffer: Buffer,
  extraHeaders?: Record<string, string>,
): void {
  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'Content-Length': buffer.length,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    ...(extraHeaders ?? {}),
  });
  res.end(buffer);
}

// =============================================================================
// Route Handlers
// =============================================================================

/**
 * GET /api/product/:style?vendor=ss|sanmar
 *
 * Fetch vendor data for a style and return the ProductPreview JSON.
 * Caches the full ProductData for reuse in POST /api/create.
 */
async function handleGetProduct(
  res: http.ServerResponse,
  style: string,
  vendor: VendorId,
): Promise<void> {
  try {
    console.log(`[Preview] Fetching product data for style: ${style} (vendor: ${vendor})`);

    const data = await fetchProductData(style, vendor);

    // Cache for later use by POST /api/create
    productCache.clear();
    productCache.set(cacheKey(style, vendor), data);

    sendJson(res, 200, { ok: true, data: data.preview });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Preview] Error fetching ${style}: ${message}`);
    sendJson(res, 200, { ok: false, error: message });
  }
}

/**
 * POST /api/create
 *
 * Accept a CuratedProduct JSON body and create a WIX draft product.
 * Uses cached ProductData from the most recent GET /api/product call.
 */
async function handleCreateProduct(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<void> {
  try {
    const body = await readBody(req);
    const curated: CuratedProduct = JSON.parse(body);

    // Validate required fields
    if (
      !curated.style ||
      !curated.selectedColors?.length ||
      !curated.selectedSizes?.length ||
      !curated.pricingConfig
    ) {
      sendJson(res, 200, {
        ok: false,
        error:
          'Missing required fields: style, selectedColors, selectedSizes, pricingConfig',
      });
      return;
    }

    // Validate pricingConfig
    if (
      typeof curated.pricingConfig.markupPercent !== 'number' ||
      curated.pricingConfig.markupPercent < 0
    ) {
      sendJson(res, 200, {
        ok: false,
        error:
          'Invalid pricingConfig: markupPercent must be a non-negative number',
      });
      return;
    }

    // Get cached product data (or re-fetch)
    const curatedVendor: VendorId = curated.vendor ?? 'sanmar';
    let productData = productCache.get(cacheKey(curated.style, curatedVendor));
    if (!productData) {
      console.log(`[Preview] Cache miss for ${curated.style} (${curatedVendor}), re-fetching...`);
      productData = await fetchProductData(curated.style, curatedVendor);
      productCache.set(cacheKey(curated.style, curatedVendor), productData);
    }

    console.log(
      `[Preview] Creating WIX draft for ${curated.style} (${curated.pricingConfig.markupPercent}% markup, ${curated.pricingConfig.rounding} rounding)...`,
    );
    const result = await createWixProduct(curated, productData);

    sendJson(res, 200, { ok: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Preview] Error creating product: ${message}`);
    sendJson(res, 200, { ok: false, error: message });
  }
}

// =============================================================================
// Server
// =============================================================================

/**
 * Parse the URL path to extract route and parameters.
 */
function parseRoute(urlPath: string): { route: string; param?: string } {
  // Match /api/product/:style
  const productMatch = urlPath.match(/^\/api\/product\/([A-Za-z0-9._-]+)\/?$/);
  if (productMatch) {
    return { route: 'get-product', param: productMatch[1] };
  }

  // Match /api/create
  if (urlPath === '/api/create') {
    return { route: 'create-product' };
  }

  // Match /api/templates/:name (must come before /api/templates)
  const templateNameMatch = urlPath.match(/^\/api\/templates\/(.+)\/?$/);
  if (templateNameMatch) {
    return { route: 'template-by-name', param: decodeURIComponent(templateNameMatch[1]) };
  }

  // Match /api/templates
  if (urlPath === '/api/templates') {
    return { route: 'templates' };
  }

  // Match /api/presets
  if (urlPath === '/api/presets') {
    return { route: 'presets' };
  }

  // Match /api/logos
  if (urlPath === '/api/logos') {
    return { route: 'logos' };
  }

  // Match /api/overlay
  if (urlPath === '/api/overlay') {
    return { route: 'overlay' };
  }

  // Match /api/overlays/:filename
  const overlayFileMatch = urlPath.match(/^\/api\/overlays\/([A-Za-z0-9._-]+)\/?$/);
  if (overlayFileMatch) {
    return { route: 'overlay-file', param: overlayFileMatch[1] };
  }

  // Match /api/margins/:style (must come before /api/margins)
  const marginStyleMatch = urlPath.match(/^\/api\/margins\/([A-Za-z0-9._-]+)\/?$/);
  if (marginStyleMatch) {
    return { route: 'margin-by-style', param: marginStyleMatch[1] };
  }

  // Match /api/margins
  if (urlPath === '/api/margins') {
    return { route: 'margins' };
  }

  // Match /api/sales/:id/apply
  const saleApplyMatch = urlPath.match(/^\/api\/sales\/([A-Za-z0-9._-]+)\/apply\/?$/);
  if (saleApplyMatch) {
    return { route: 'sale-apply', param: saleApplyMatch[1] };
  }

  // Match /api/sales/:id/revert
  const saleRevertMatch = urlPath.match(/^\/api\/sales\/([A-Za-z0-9._-]+)\/revert\/?$/);
  if (saleRevertMatch) {
    return { route: 'sale-revert', param: saleRevertMatch[1] };
  }

  // Match /api/sales/:id/cancel
  const saleCancelMatch = urlPath.match(/^\/api\/sales\/([A-Za-z0-9._-]+)\/cancel\/?$/);
  if (saleCancelMatch) {
    return { route: 'sale-cancel', param: saleCancelMatch[1] };
  }

  // Match /api/sales/check
  if (urlPath === '/api/sales/check') {
    return { route: 'sales-check' };
  }

  // Match /api/sales
  if (urlPath === '/api/sales') {
    return { route: 'sales' };
  }

  // Match /api/inventory/product/:style (must come before /api/inventory/products)
  const inventoryProductMatch = urlPath.match(/^\/api\/inventory\/product\/([A-Za-z0-9._-]+)\/?$/);
  if (inventoryProductMatch) {
    return { route: 'inventory-product', param: inventoryProductMatch[1] };
  }

  // Match /api/inventory/products
  if (urlPath === '/api/inventory/products') {
    return { route: 'inventory-products' };
  }

  // Match /api/inventory/alerts
  if (urlPath === '/api/inventory/alerts') {
    return { route: 'inventory-alerts' };
  }

  // Match /api/inventory/health
  if (urlPath === '/api/inventory/health') {
    return { route: 'inventory-health' };
  }

  // Match /api/inventory/config
  if (urlPath === '/api/inventory/config') {
    return { route: 'inventory-config' };
  }

  // SanMar Cart Automation API (Phase 19)

  // Match /api/cart/preview
  if (urlPath === '/api/cart/preview') {
    return { route: 'cart-preview' };
  }

  // Match /api/cart/fill
  if (urlPath === '/api/cart/fill') {
    return { route: 'cart-fill' };
  }

  // Match /api/cart/history
  if (urlPath === '/api/cart/history') {
    return { route: 'cart-history' };
  }

  // Order Management API (Phase 18)

  // Match /api/orders/:id/invoice
  const orderInvoiceMatch = urlPath.match(/^\/api\/orders\/([A-Za-z0-9._-]+)\/invoice\/?$/);
  if (orderInvoiceMatch) {
    return { route: 'order-invoice', param: orderInvoiceMatch[1] };
  }

  // Match /api/orders/:id/label
  const orderLabelMatch = urlPath.match(/^\/api\/orders\/([A-Za-z0-9._-]+)\/label\/?$/);
  if (orderLabelMatch) {
    return { route: 'order-label', param: orderLabelMatch[1] };
  }

  // Match /api/orders/:id/print-invoice
  const orderPrintInvoiceMatch = urlPath.match(/^\/api\/orders\/([A-Za-z0-9._-]+)\/print-invoice\/?$/);
  if (orderPrintInvoiceMatch) {
    return { route: 'order-print-invoice', param: orderPrintInvoiceMatch[1] };
  }

  // Match /api/orders/:id/print-label
  const orderPrintLabelMatch = urlPath.match(/^\/api\/orders\/([A-Za-z0-9._-]+)\/print-label\/?$/);
  if (orderPrintLabelMatch) {
    return { route: 'order-print-label', param: orderPrintLabelMatch[1] };
  }

  // Match /api/orders/:id/status
  const orderStatusMatch = urlPath.match(/^\/api\/orders\/([A-Za-z0-9._-]+)\/status\/?$/);
  if (orderStatusMatch) {
    return { route: 'order-status', param: orderStatusMatch[1] };
  }

  // Match /api/orders/sync (must come before /api/orders/:id)
  if (urlPath === '/api/orders/sync') {
    return { route: 'orders-sync' };
  }

  // Match /api/orders/:id (must come after sub-routes)
  const orderByIdMatch = urlPath.match(/^\/api\/orders\/([A-Za-z0-9._-]+)\/?$/);
  if (orderByIdMatch) {
    return { route: 'order-by-id', param: orderByIdMatch[1] };
  }

  // Match /api/orders
  if (urlPath === '/api/orders') {
    return { route: 'orders' };
  }

  // Match /api/printers
  if (urlPath === '/api/printers') {
    return { route: 'printers' };
  }

  // Match / (root)
  if (urlPath === '/' || urlPath === '/index.html') {
    return { route: 'serve-html' };
  }

  return { route: 'not-found' };
}

/**
 * Create and start the HTTP server.
 */
function startServer(port: number, initialStyle?: string): void {
  const server = http.createServer(
    async (req: http.IncomingMessage, res: http.ServerResponse) => {
      const method = req.method ?? 'GET';
      const urlPath = (req.url ?? '/').split('?')[0];

      // Handle CORS preflight
      if (method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        });
        res.end();
        return;
      }

      const { route, param } = parseRoute(urlPath);

      try {
        switch (route) {
          case 'serve-html': {
            const htmlPath = path.join(__dirname, 'preview.html');
            sendHtml(res, htmlPath);
            break;
          }

          case 'get-product': {
            if (method !== 'GET') {
              sendJson(res, 405, { ok: false, error: 'Method not allowed' });
              break;
            }
            const productVendor = parseVendorParam(req.url ?? '/');
            await handleGetProduct(res, param!, productVendor);
            break;
          }

          case 'create-product': {
            if (method !== 'POST') {
              sendJson(res, 405, { ok: false, error: 'Method not allowed' });
              break;
            }
            await handleCreateProduct(req, res);
            break;
          }

          case 'templates': {
            if (method === 'GET') {
              // GET /api/templates - List all templates
              try {
                const templates = await listTemplates();
                sendJson(res, 200, { templates });
              } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                console.error(`[Preview] Error listing templates: ${message}`);
                sendJson(res, 500, { error: 'Internal server error' });
              }
            } else if (method === 'POST') {
              // POST /api/templates - Save a new template
              try {
                const body = await readBody(req);
                const template = JSON.parse(body);
                if (!template.name || typeof template.name !== 'string' || template.name.trim() === '') {
                  sendJson(res, 400, { error: 'Template name is required and must be non-empty' });
                  break;
                }
                await saveTemplate(template);
                const saved = await getTemplate(template.name);
                sendJson(res, 201, saved);
              } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                console.error(`[Preview] Error saving template: ${message}`);
                sendJson(res, 500, { error: 'Internal server error' });
              }
            } else {
              sendJson(res, 405, { error: 'Method not allowed' });
            }
            break;
          }

          case 'template-by-name': {
            if (method === 'GET') {
              // GET /api/templates/:name - Get a single template
              try {
                const template = await getTemplate(param!);
                if (template) {
                  sendJson(res, 200, template);
                } else {
                  sendJson(res, 404, { error: 'Template not found' });
                }
              } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                console.error(`[Preview] Error getting template: ${message}`);
                sendJson(res, 500, { error: 'Internal server error' });
              }
            } else if (method === 'DELETE') {
              // DELETE /api/templates/:name - Delete a template
              try {
                const deleted = await deleteTemplate(param!);
                if (deleted) {
                  sendJson(res, 200, { deleted: true });
                } else {
                  sendJson(res, 404, { error: 'Template not found' });
                }
              } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                console.error(`[Preview] Error deleting template: ${message}`);
                sendJson(res, 500, { error: 'Internal server error' });
              }
            } else {
              sendJson(res, 405, { error: 'Method not allowed' });
            }
            break;
          }

          case 'presets': {
            if (method !== 'GET') {
              sendJson(res, 405, { error: 'Method not allowed' });
              break;
            }
            // GET /api/presets - List available pricing presets
            sendJson(res, 200, { presets: PRICING_PRESETS });
            break;
          }

          case 'logos': {
            if (method !== 'GET') {
              sendJson(res, 405, { error: 'Method not allowed' });
              break;
            }
            // GET /api/logos - List available logos and position presets
            try {
              const registry = loadLogoRegistry();
              sendJson(res, 200, {
                logos: registry.logos,
                positionPresets: registry.positionPresets,
              });
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              console.error(`[Preview] Error loading logo registry: ${message}`);
              sendJson(res, 500, { error: 'Internal server error' });
            }
            break;
          }

          case 'overlay': {
            if (method !== 'POST') {
              sendJson(res, 405, { error: 'Method not allowed' });
              break;
            }
            // POST /api/overlay - Generate a composited overlay image
            try {
              const body = await readBody(req);
              const payload = JSON.parse(body);

              // Validate required fields
              if (!payload.imageUrl || !payload.logoName || !payload.position) {
                sendJson(res, 400, {
                  error: 'Missing required fields: imageUrl, logoName, position',
                });
                break;
              }

              // Verify logo exists
              try {
                getLogoEntry(payload.logoName);
              } catch {
                sendJson(res, 404, { error: `Logo "${payload.logoName}" not found` });
                break;
              }

              // Resolve position (preset name or "x,y" format)
              const position = getPositionPreset(payload.position);

              const overlayConfig = {
                logoName: payload.logoName as string,
                position,
                scale: payload.scale as number | undefined,
                opacity: payload.opacity as number | undefined,
              };

              console.log(
                `[Preview] Generating overlay: logo="${payload.logoName}" position="${payload.position}" scale=${overlayConfig.scale ?? 'default'}`,
              );

              const buffer = await compositeLogoOnImage(
                payload.imageUrl as string,
                overlayConfig,
              );

              sendBuffer(res, 200, 'image/jpeg', buffer);
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              console.error(`[Preview] Error generating overlay: ${message}`);
              sendJson(res, 500, { error: 'Overlay generation failed: ' + message });
            }
            break;
          }

          case 'overlay-file': {
            if (method !== 'GET') {
              sendJson(res, 405, { error: 'Method not allowed' });
              break;
            }
            // GET /api/overlays/:filename - Serve a saved overlay image
            try {
              const overlayDir = path.resolve('media/overlays');
              const filePath = path.join(overlayDir, param!);

              // Security: ensure the resolved path is within the overlays directory
              const resolvedPath = path.resolve(filePath);
              if (!resolvedPath.startsWith(overlayDir)) {
                sendJson(res, 400, { error: 'Invalid filename' });
                break;
              }

              if (!fs.existsSync(resolvedPath)) {
                sendJson(res, 404, { error: 'Overlay file not found' });
                break;
              }

              const fileBuffer = fs.readFileSync(resolvedPath);
              sendBuffer(res, 200, 'image/jpeg', fileBuffer);
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              console.error(`[Preview] Error serving overlay file: ${message}`);
              sendJson(res, 500, { error: 'Internal server error' });
            }
            break;
          }

          // Cost/Margin API (Phase 15)

          case 'margins': {
            if (method !== 'GET') {
              sendJson(res, 405, { error: 'Method not allowed' });
              break;
            }
            try {
              const costs = await getAllProductCosts();
              sendJson(res, 200, { margins: costs });
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              console.error(`[Preview] Error loading margins: ${message}`);
              sendJson(res, 500, { error: 'Internal server error' });
            }
            break;
          }

          case 'margin-by-style': {
            if (method !== 'GET') {
              sendJson(res, 405, { error: 'Method not allowed' });
              break;
            }
            try {
              const current = await getProductCost(param!);
              if (!current) {
                sendJson(res, 404, { error: `Style "${param}" not found in cost history` });
                break;
              }
              const history = await getCostHistory(param!);
              sendJson(res, 200, { current, history });
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              console.error(`[Preview] Error loading margin for ${param}: ${message}`);
              sendJson(res, 500, { error: 'Internal server error' });
            }
            break;
          }

          // Sale Pricing API (Phase 15)

          case 'sales': {
            if (method === 'GET') {
              try {
                const urlObj = new URL(req.url ?? '/', `http://localhost`);
                const statusFilter = urlObj.searchParams.get('status') as 'active' | 'scheduled' | 'ended' | 'cancelled' | null;
                const sales = await listSales(statusFilter ?? undefined);
                sendJson(res, 200, { sales });
              } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                console.error(`[Preview] Error listing sales: ${message}`);
                sendJson(res, 500, { error: 'Internal server error' });
              }
            } else if (method === 'POST') {
              try {
                const body = await readBody(req);
                const payload = JSON.parse(body);

                // Validate required fields
                if (!payload.name || !payload.discountType || payload.discountValue === undefined ||
                    !payload.startDate || !payload.endDate) {
                  sendJson(res, 400, {
                    error: 'Missing required fields: name, discountType, discountValue, startDate, endDate',
                  });
                  break;
                }

                // Validate discount type
                if (!['percent', 'fixed', 'override'].includes(payload.discountType)) {
                  sendJson(res, 400, { error: 'Invalid discountType. Must be: percent, fixed, or override' });
                  break;
                }

                const sale = await createSale({
                  name: payload.name,
                  discountType: payload.discountType as SaleConfig['discountType'],
                  discountValue: payload.discountValue,
                  productStyles: payload.productStyles || [],
                  startDate: payload.startDate,
                  endDate: payload.endDate,
                });

                // If start date is now/past and sale is active, apply it
                if (sale.status === 'active') {
                  try {
                    await applySale(sale.id);
                  } catch (applyErr) {
                    console.warn(`[Preview] Sale created but apply failed: ${applyErr instanceof Error ? applyErr.message : String(applyErr)}`);
                  }
                }

                sendJson(res, 201, { sale });
              } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                console.error(`[Preview] Error creating sale: ${message}`);
                sendJson(res, 400, { error: message });
              }
            } else {
              sendJson(res, 405, { error: 'Method not allowed' });
            }
            break;
          }

          case 'sale-apply': {
            if (method !== 'POST') {
              sendJson(res, 405, { error: 'Method not allowed' });
              break;
            }
            try {
              await applySale(param!);
              sendJson(res, 200, { ok: true, message: `Sale "${param}" applied` });
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              console.error(`[Preview] Error applying sale ${param}: ${message}`);
              sendJson(res, 400, { error: message });
            }
            break;
          }

          case 'sale-revert': {
            if (method !== 'POST') {
              sendJson(res, 405, { error: 'Method not allowed' });
              break;
            }
            try {
              await revertSale(param!);
              sendJson(res, 200, { ok: true, message: `Sale "${param}" reverted` });
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              console.error(`[Preview] Error reverting sale ${param}: ${message}`);
              sendJson(res, 400, { error: message });
            }
            break;
          }

          case 'sale-cancel': {
            if (method !== 'POST') {
              sendJson(res, 405, { error: 'Method not allowed' });
              break;
            }
            try {
              await cancelSale(param!);
              sendJson(res, 200, { ok: true, message: `Sale "${param}" cancelled` });
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              console.error(`[Preview] Error cancelling sale ${param}: ${message}`);
              sendJson(res, 400, { error: message });
            }
            break;
          }

          case 'sales-check': {
            if (method !== 'POST') {
              sendJson(res, 405, { error: 'Method not allowed' });
              break;
            }
            try {
              await checkAndProcessSales();
              sendJson(res, 200, { ok: true, message: 'Sales checked and processed' });
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              console.error(`[Preview] Error checking sales: ${message}`);
              sendJson(res, 500, { error: 'Internal server error' });
            }
            break;
          }

          // Inventory Dashboard API (Phase 16)

          case 'inventory-products': {
            if (method !== 'GET') {
              sendJson(res, 405, { error: 'Method not allowed' });
              break;
            }
            try {
              const config = await loadConfig();
              const allProducts = await loadTrackedProducts(config);
              // Optional vendor filter via ?vendor= query param
              const invVendorFilter = parseVendorParam(req.url ?? '/');
              const hasVendorFilter = (req.url ?? '').includes('vendor=');
              const products = hasVendorFilter
                ? allProducts.filter(p => (p.vendor ?? 'sanmar') === invVendorFilter)
                : allProducts;
              const result = [];
              for (const p of products) {
                const snapshot = await loadLatestSnapshot(p.style, config);
                let totalSkus = 0;
                let outOfStockSkus = 0;
                let lowStockSkus = 0;
                let hasWarehouseData = false;
                if (snapshot) {
                  totalSkus = snapshot.skus.length;
                  for (const sku of snapshot.skus) {
                    if (sku.totalQty === 0) outOfStockSkus++;
                    else if (sku.totalQty <= config.lowStockThreshold) lowStockSkus++;
                    if (sku.warehouses && sku.warehouses.length > 0) hasWarehouseData = true;
                  }
                }
                result.push({
                  style: p.style,
                  name: p.name,
                  vendor: p.vendor ?? 'sanmar',
                  vendorName: vendorDisplayName(p.vendor ?? 'sanmar'),
                  priority: p.priority ?? 'normal',
                  lastPolledAt: p.lastPolledAt ?? null,
                  totalSkus,
                  outOfStockSkus,
                  lowStockSkus,
                  hasWarehouseData,
                });
              }
              sendJson(res, 200, { products: result });
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              console.error(`[Preview] Error loading inventory products: ${message}`);
              sendJson(res, 500, { error: 'Internal server error' });
            }
            break;
          }

          case 'inventory-product': {
            if (method !== 'GET') {
              sendJson(res, 405, { error: 'Method not allowed' });
              break;
            }
            try {
              const config = await loadConfig();
              const snapshot = await loadLatestSnapshot(param!, config);
              if (!snapshot) {
                sendJson(res, 404, { error: `No snapshot found for style "${param}"` });
                break;
              }
              // Aggregate per-warehouse totals across all SKUs
              const warehouseMap = new Map<string, { id: string; name: string; totalQty: number; skuCount: number }>();
              for (const sku of snapshot.skus) {
                if (sku.warehouses) {
                  for (const wh of sku.warehouses) {
                    const existing = warehouseMap.get(wh.warehouseId);
                    if (existing) {
                      existing.totalQty += wh.qty;
                      existing.skuCount++;
                    } else {
                      warehouseMap.set(wh.warehouseId, {
                        id: wh.warehouseId,
                        name: wh.warehouseName,
                        totalQty: wh.qty,
                        skuCount: 1,
                      });
                    }
                  }
                }
              }
              const warehouseSummary = Array.from(warehouseMap.values())
                .sort((a, b) => b.totalQty - a.totalQty);
              sendJson(res, 200, {
                style: snapshot.style,
                timestamp: snapshot.timestamp,
                warehouseSummary,
                skus: snapshot.skus,
              });
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              console.error(`[Preview] Error loading inventory for ${param}: ${message}`);
              sendJson(res, 500, { error: 'Internal server error' });
            }
            break;
          }

          case 'inventory-alerts': {
            if (method !== 'GET') {
              sendJson(res, 405, { error: 'Method not allowed' });
              break;
            }
            try {
              const config = await loadConfig();
              const urlObj = new URL(req.url ?? '/', `http://localhost`);
              const countParam = urlObj.searchParams.get('count');
              const count = countParam ? parseInt(countParam, 10) : 50;
              const alerts = await getRecentAlerts(config, count);
              sendJson(res, 200, { alerts });
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              console.error(`[Preview] Error loading inventory alerts: ${message}`);
              sendJson(res, 500, { error: 'Internal server error' });
            }
            break;
          }

          case 'inventory-health': {
            if (method !== 'GET') {
              sendJson(res, 405, { error: 'Method not allowed' });
              break;
            }
            try {
              const health = getSyncHealth();
              if (health) {
                sendJson(res, 200, { running: true, ...health });
              } else {
                sendJson(res, 200, { running: false });
              }
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              console.error(`[Preview] Error loading sync health: ${message}`);
              sendJson(res, 500, { error: 'Internal server error' });
            }
            break;
          }

          case 'inventory-config': {
            if (method !== 'GET') {
              sendJson(res, 405, { error: 'Method not allowed' });
              break;
            }
            try {
              const config = await loadConfig();
              sendJson(res, 200, {
                pollIntervals: {
                  hot: config.hotIntervalMinutes ?? 15,
                  normal: config.pollIntervalMinutes,
                  slow: config.slowIntervalMinutes ?? 120,
                },
                stockThresholds: {
                  outOfStock: config.outOfStockThreshold,
                  critical: config.criticalStockThreshold,
                  lowStock: config.lowStockThreshold,
                },
              });
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              console.error(`[Preview] Error loading inventory config: ${message}`);
              sendJson(res, 500, { error: 'Internal server error' });
            }
            break;
          }

          // ── SanMar Cart Automation API (Phase 19) ──────────────────────

          case 'cart-preview': {
            if (method !== 'GET') {
              sendJson(res, 405, { error: 'Method not allowed' });
              break;
            }
            // GET /api/cart/preview — Preview consolidated cart without executing
            try {
              const urlObj = new URL(req.url ?? '/', 'http://localhost');
              const statusParam = urlObj.searchParams.get('status');
              const statuses = statusParam
                ? (statusParam.split(',').map((s) => s.trim()) as OrderStatus[])
                : (['new'] as OrderStatus[]);

              const orders = await getOrdersForCartFill({ statuses });
              const request = consolidateOrders(orders);

              // Count skipped items
              const totalLineItems = orders.reduce((sum, o) => sum + o.lineItems.length, 0);
              const includedCount = request.items.reduce((sum, item) => sum + 1, 0);
              const skippedCount = totalLineItems - orders.reduce((sum, o) => {
                return sum + o.lineItems.filter((li) => {
                  return li.vendor !== 'ss' && !!li.vendorStyle && !!li.color && !!li.size;
                }).length;
              }, 0);

              sendJson(res, 200, {
                items: request.items,
                orderNumbers: request.orderNumbers,
                orderCount: orders.length,
                itemCount: request.items.length,
                skippedCount,
              });
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              console.error(`[Preview] Error previewing cart: ${message}`);
              sendJson(res, 500, { error: message });
            }
            break;
          }

          case 'cart-fill': {
            if (method !== 'POST') {
              sendJson(res, 405, { error: 'Method not allowed' });
              break;
            }
            // POST /api/cart/fill — Execute cart fill automation
            try {
              let statuses: OrderStatus[] = ['new'];
              let headless = true;

              const body = await readBody(req);
              if (body) {
                try {
                  const payload = JSON.parse(body);
                  if (payload.statuses && Array.isArray(payload.statuses)) {
                    statuses = payload.statuses as OrderStatus[];
                  }
                  if (typeof payload.headless === 'boolean') {
                    headless = payload.headless;
                  }
                } catch {
                  // Empty or invalid body — use defaults
                }
              }

              console.log(`[Preview] Starting cart fill (statuses: ${statuses.join(',')}, headless: ${headless})...`);
              const result = await fillCartForPendingOrders({ statuses, headless });

              if (!result) {
                sendJson(res, 200, { result: null, message: 'No orders to process' });
              } else {
                sendJson(res, result.status === 'failed' ? 500 : 200, { result });
              }
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              console.error(`[Preview] Error filling cart: ${message}`);
              sendJson(res, 500, { error: message });
            }
            break;
          }

          case 'cart-history': {
            if (method !== 'GET') {
              sendJson(res, 405, { error: 'Method not allowed' });
              break;
            }
            // GET /api/cart/history — List past cart fill results
            try {
              const cartFillsDir = path.join(process.cwd(), 'data', 'cart-fills');
              let fills: CartFillResult[] = [];

              if (fs.existsSync(cartFillsDir)) {
                const files = fs.readdirSync(cartFillsDir)
                  .filter((f) => f.endsWith('.json'))
                  .sort()
                  .reverse(); // Most recent first

                for (const file of files) {
                  try {
                    const content = fs.readFileSync(path.join(cartFillsDir, file), 'utf-8');
                    fills.push(JSON.parse(content) as CartFillResult);
                  } catch {
                    // Skip malformed files
                  }
                }
              }

              sendJson(res, 200, { fills });
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              console.error(`[Preview] Error reading cart history: ${message}`);
              sendJson(res, 500, { error: message });
            }
            break;
          }

          // ── Order Management API (Phase 18) ────────────────────────────

          case 'orders': {
            if (method === 'GET') {
              // GET /api/orders — List orders with optional filters
              try {
                const urlObj = new URL(req.url ?? '/', 'http://localhost');
                const statusFilter = urlObj.searchParams.get('status') as OrderStatus | null;
                const sourceFilter = urlObj.searchParams.get('source') as OrderSource | null;
                const filter: { status?: OrderStatus; source?: OrderSource } = {};
                if (statusFilter) filter.status = statusFilter;
                if (sourceFilter) filter.source = sourceFilter;
                const orders = await listOrders(Object.keys(filter).length > 0 ? filter : undefined);
                sendJson(res, 200, { orders, count: orders.length });
              } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                console.error(`[Preview] Error listing orders: ${message}`);
                sendJson(res, 500, { error: 'Internal server error' });
              }
            } else if (method === 'POST') {
              // POST /api/orders — Create manual order
              try {
                const body = await readBody(req);
                const payload = JSON.parse(body);

                if (!payload.customer || !payload.lineItems || !Array.isArray(payload.lineItems) || payload.lineItems.length === 0) {
                  sendJson(res, 400, { error: 'Missing required fields: customer, lineItems (non-empty array)' });
                  break;
                }

                // Calculate subtotal from lineItems
                const lineItems: OrderLineItem[] = payload.lineItems.map((item: OrderLineItem) => ({
                  ...item,
                  totalPrice: item.totalPrice ?? (item.quantity * item.unitPrice),
                }));
                const subtotal = lineItems.reduce((sum: number, li: OrderLineItem) => sum + li.totalPrice, 0);
                const shippingCost = payload.shippingCost ?? 0;
                const tax = payload.tax ?? 0;
                const discount = payload.discount ?? 0;
                const total = subtotal + shippingCost + tax - discount;

                const order = await addOrder({
                  source: 'manual',
                  status: 'new',
                  customer: payload.customer as OrderCustomer,
                  lineItems,
                  billingAddress: payload.billingAddress as OrderAddress | undefined,
                  shippingAddress: payload.shippingAddress as OrderAddress | undefined,
                  collection: payload.collection || undefined,
                  subtotal,
                  shippingCost,
                  tax,
                  discount,
                  total,
                  notes: payload.notes,
                });

                sendJson(res, 201, { order });
              } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                console.error(`[Preview] Error creating order: ${message}`);
                sendJson(res, 400, { error: message });
              }
            } else {
              sendJson(res, 405, { error: 'Method not allowed' });
            }
            break;
          }

          case 'order-by-id': {
            if (method !== 'GET') {
              sendJson(res, 405, { error: 'Method not allowed' });
              break;
            }
            // GET /api/orders/:id — Get single order by ID or order number
            try {
              const idParam = param!;
              // If the param is all digits, look up by orderNumber; otherwise by ID
              const isNumeric = /^\d+$/.test(idParam);
              const order = isNumeric
                ? await getOrderByNumber(parseInt(idParam, 10))
                : await getOrderById(idParam);

              if (!order) {
                sendJson(res, 404, { error: `Order not found: ${idParam}` });
                break;
              }
              sendJson(res, 200, { order });
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              console.error(`[Preview] Error getting order ${param}: ${message}`);
              sendJson(res, 500, { error: 'Internal server error' });
            }
            break;
          }

          case 'order-status': {
            if (method !== 'PATCH') {
              sendJson(res, 405, { error: 'Method not allowed. Use PATCH.' });
              break;
            }
            // PATCH /api/orders/:id/status — Update order status
            try {
              const body = await readBody(req);
              const payload = JSON.parse(body);

              if (!payload.status) {
                sendJson(res, 400, { error: 'Missing required field: status' });
                break;
              }

              const order = await updateOrderStatus(
                param!,
                payload.status as OrderStatus,
                payload.note,
              );
              sendJson(res, 200, { order });
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              // Distinguish validation errors (400) from not-found (404) from server errors (500)
              if (message.includes('not found')) {
                sendJson(res, 404, { error: message });
              } else if (message.includes('Cannot transition')) {
                sendJson(res, 400, { error: message });
              } else {
                console.error(`[Preview] Error updating order status: ${message}`);
                sendJson(res, 500, { error: 'Internal server error' });
              }
            }
            break;
          }

          case 'orders-sync': {
            if (method !== 'POST') {
              sendJson(res, 405, { error: 'Method not allowed' });
              break;
            }
            // POST /api/orders/sync — Trigger WIX order sync
            try {
              const body = await readBody(req);
              let days = 7;
              if (body) {
                try {
                  const payload = JSON.parse(body);
                  if (payload.days && typeof payload.days === 'number') {
                    days = payload.days;
                  }
                } catch {
                  // Empty or invalid body is fine — use default
                }
              }
              const result = await syncWixOrders(days);
              sendJson(res, 200, { result });
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              console.error(`[Preview] Error syncing WIX orders: ${message}`);
              sendJson(res, 500, { error: message });
            }
            break;
          }

          case 'order-invoice': {
            if (method !== 'GET') {
              sendJson(res, 405, { error: 'Method not allowed' });
              break;
            }
            // GET /api/orders/:id/invoice — Generate and return invoice PDF
            try {
              const idParam = param!;
              const isNumeric = /^\d+$/.test(idParam);
              const order = isNumeric
                ? await getOrderByNumber(parseInt(idParam, 10))
                : await getOrderById(idParam);

              if (!order) {
                sendJson(res, 404, { error: `Order not found: ${idParam}` });
                break;
              }

              const pdfBuffer = await generateInvoice(order);
              sendBuffer(res, 200, 'application/pdf', pdfBuffer, {
                'Content-Disposition': `inline; filename="INV-${order.orderNumber}.pdf"`,
              });
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              console.error(`[Preview] Error generating invoice for ${param}: ${message}`);
              sendJson(res, 500, { error: message });
            }
            break;
          }

          case 'order-label': {
            if (method !== 'GET') {
              sendJson(res, 405, { error: 'Method not allowed' });
              break;
            }
            // GET /api/orders/:id/label — Generate and return pickup label PDF
            try {
              const idParam = param!;
              const isNumeric = /^\d+$/.test(idParam);
              const order = isNumeric
                ? await getOrderByNumber(parseInt(idParam, 10))
                : await getOrderById(idParam);

              if (!order) {
                sendJson(res, 404, { error: `Order not found: ${idParam}` });
                break;
              }

              const pdfBuffer = await generateShippingLabel(order);
              sendBuffer(res, 200, 'application/pdf', pdfBuffer, {
                'Content-Disposition': `inline; filename="LABEL-${order.orderNumber}.pdf"`,
              });
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              console.error(`[Preview] Error generating label for ${param}: ${message}`);
              sendJson(res, 500, { error: message });
            }
            break;
          }

          case 'order-print-invoice': {
            if (method !== 'POST') {
              sendJson(res, 405, { error: 'Method not allowed' });
              break;
            }
            // POST /api/orders/:id/print-invoice — Print invoice
            try {
              const idParam = param!;
              const isNumeric = /^\d+$/.test(idParam);
              const order = isNumeric
                ? await getOrderByNumber(parseInt(idParam, 10))
                : await getOrderById(idParam);

              if (!order) {
                sendJson(res, 404, { error: `Order not found: ${idParam}` });
                break;
              }

              const result = await printInvoice(order);
              sendJson(res, 200, { result });
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              console.error(`[Preview] Error printing invoice for ${param}: ${message}`);
              sendJson(res, 500, { error: message });
            }
            break;
          }

          case 'order-print-label': {
            if (method !== 'POST') {
              sendJson(res, 405, { error: 'Method not allowed' });
              break;
            }
            // POST /api/orders/:id/print-label — Print pickup label
            try {
              const idParam = param!;
              const isNumeric = /^\d+$/.test(idParam);
              const order = isNumeric
                ? await getOrderByNumber(parseInt(idParam, 10))
                : await getOrderById(idParam);

              if (!order) {
                sendJson(res, 404, { error: `Order not found: ${idParam}` });
                break;
              }

              const result = await printShippingLabel(order);
              sendJson(res, 200, { result });
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              console.error(`[Preview] Error printing label for ${param}: ${message}`);
              sendJson(res, 500, { error: message });
            }
            break;
          }

          case 'printers': {
            if (method !== 'GET') {
              sendJson(res, 405, { error: 'Method not allowed' });
              break;
            }
            // GET /api/printers — List available system printers
            try {
              const printers = await listPrinters();
              sendJson(res, 200, { printers });
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              console.error(`[Preview] Error listing printers: ${message}`);
              sendJson(res, 500, { error: 'Internal server error' });
            }
            break;
          }

          default: {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[Preview] Unhandled error: ${message}`);
        sendJson(res, 500, { ok: false, error: 'Internal server error' });
      }
    },
  );

  server.listen(port, () => {
    const url = `http://localhost:${port}`;
    const styleParam = initialStyle ? `?style=${initialStyle}` : '';
    console.log(`\nPreview server running at ${url}${styleParam}`);
    console.log('Press Ctrl+C to stop.\n');

    // Try to auto-open browser (best effort, don't fail if it doesn't work)
    const openUrl = `${url}${styleParam ? `/${styleParam}` : ''}`;
    tryOpenBrowser(openUrl);
  });

  // Handle port in use -- try next port
  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} in use, trying ${port + 1}...`);
      startServer(port + 1, initialStyle);
    } else {
      console.error(`Server error: ${err.message}`);
      process.exit(1);
    }
  });
}

/**
 * Try to open a URL in the default browser.
 * Best effort -- silently ignores failures.
 */
function tryOpenBrowser(url: string): void {
  // Platform-specific open command
  const platform = process.platform;
  let cmd: string;
  if (platform === 'win32') {
    cmd = `start "" "${url}"`;
  } else if (platform === 'darwin') {
    cmd = `open "${url}"`;
  } else {
    cmd = `xdg-open "${url}"`;
  }

  exec(cmd, (err: Error | null) => {
    if (err) {
      // Silently ignore -- user can open manually
    }
  });
}

// =============================================================================
// Entry Point
// =============================================================================

// Parse command line args
const styleArg = process.argv[2];

startServer(DEFAULT_PORT, styleArg);
