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
 *   GET  /api/product/:style  -> Fetch SanMar data, return ProductPreview JSON
 *   POST /api/create          -> Accept CuratedProduct, create WIX draft
 *
 * Usage:
 *   npx tsx scripts/pipeline/preview-server.ts [STYLE]
 *   npm run preview [-- STYLE]
 *
 * No external dependencies -- uses Node.js built-in http, fs, path, url.
 *
 * Phase 6: Product Creation Pipeline
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

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_PORT = 3456;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================================================================
// In-Memory Cache
// =============================================================================

/**
 * Simple in-memory cache for fetched product data.
 * Keyed by style number. Reused between GET /api/product and POST /api/create
 * so we don't refetch the same style. Cleared when a new style is fetched.
 */
const productCache = new Map<string, ProductData>();

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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

// =============================================================================
// Route Handlers
// =============================================================================

/**
 * GET /api/product/:style
 *
 * Fetch SanMar data for a style and return the ProductPreview JSON.
 * Caches the full ProductData for reuse in POST /api/create.
 */
async function handleGetProduct(
  res: http.ServerResponse,
  style: string,
): Promise<void> {
  try {
    console.log(`[Preview] Fetching product data for style: ${style}`);

    const data = await fetchProductData(style);

    // Cache for later use by POST /api/create
    productCache.clear();
    productCache.set(style.toUpperCase(), data);

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
    if (!curated.style || !curated.selectedColors?.length || !curated.selectedSizes?.length) {
      sendJson(res, 200, {
        ok: false,
        error: 'Missing required fields: style, selectedColors, selectedSizes',
      });
      return;
    }

    // Get cached product data (or re-fetch)
    let productData = productCache.get(curated.style.toUpperCase());
    if (!productData) {
      console.log(`[Preview] Cache miss for ${curated.style}, re-fetching...`);
      productData = await fetchProductData(curated.style);
      productCache.set(curated.style.toUpperCase(), productData);
    }

    console.log(`[Preview] Creating WIX draft for ${curated.style}...`);
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
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
            await handleGetProduct(res, param!);
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
