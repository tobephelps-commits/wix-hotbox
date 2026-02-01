/**
 * WIX Coupons V2 API — Coupon Management Module
 *
 * Provides CRUD operations for WIX store-level discount coupon codes.
 * Coupons are store-level discounts that customers enter at checkout,
 * separate from per-product sale pricing.
 *
 * CLI interface for creating, listing, and deleting coupon codes
 * for marketing campaigns, loyalty rewards, and event-specific discounts.
 *
 * WIX Coupons V2 API base: https://www.wixapis.com/stores/v2/coupons
 * Required permission: WIX_STORES.MANAGE_COUPONS
 *
 * Phase 15: Cost Tracking & Sale/Promo Pricing
 */

import 'dotenv/config';
import { fileURLToPath } from 'url';
import path from 'path';
import type { WixCoupon, WixCouponCreate, WixCouponScope } from './types.js';
import { getCollectionByName } from './wix-api.js';

// =============================================================================
// Constants
// =============================================================================

/** WIX site ID (same as wix-api.ts) */
const WIX_SITE_ID = 'c744cbdb-46f8-4c66-ac76-eb31bd0d52c1';

/** WIX Coupons V2 API base URL */
const COUPONS_API_BASE = 'https://www.wixapis.com/stores/v2/coupons';

// =============================================================================
// Auth Helpers (local equivalents — avoids modifying wix-api.ts internals)
// =============================================================================

/**
 * Get the WIX API key from environment.
 * Throws an actionable error if not configured.
 */
function getApiKey(): string {
  const apiKey = process.env.WIX_API_KEY;
  if (!apiKey) {
    throw new Error(
      'WIX_API_KEY environment variable is not set.\n' +
      'To obtain your API key:\n' +
      '  1. Go to WIX Dashboard -> Developer Tools -> API Keys\n' +
      '  2. Generate an API Key with WIX_STORES.MANAGE_COUPONS permission\n' +
      '  3. Add WIX_API_KEY=your_key to your .env file\n' +
      'See .env.example for details.'
    );
  }
  return apiKey;
}

/**
 * Build standard headers for WIX API requests.
 */
function getHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getApiKey()}`,
    'wix-site-id': WIX_SITE_ID,
  };
}

/**
 * Handle WIX API error responses with descriptive messages.
 */
async function handleErrorResponse(
  response: Response,
  endpoint: string,
  context?: string,
): Promise<never> {
  let errorBody: string;
  try {
    errorBody = await response.text();
  } catch {
    errorBody = '(unable to read response body)';
  }

  let wixMessage = errorBody;
  try {
    const parsed = JSON.parse(errorBody);
    if (parsed.message) {
      wixMessage = parsed.message;
    } else if (parsed.details) {
      wixMessage = JSON.stringify(parsed.details);
    }
  } catch {
    // Use raw text
  }

  const contextStr = context ? ` [${context}]` : '';

  switch (response.status) {
    case 401:
      throw new Error(
        `WIX Coupons API 401 Unauthorized at ${endpoint}${contextStr}: ${wixMessage}\n` +
        'Check that WIX_API_KEY in .env is valid and has WIX_STORES.MANAGE_COUPONS permission.'
      );
    case 403:
      throw new Error(
        `WIX Coupons API 403 Forbidden at ${endpoint}${contextStr}: ${wixMessage}\n` +
        'The API key may lack the WIX_STORES.MANAGE_COUPONS permission.\n' +
        'Go to WIX Dashboard -> Developer Tools -> API Keys and verify permissions.'
      );
    case 404:
      throw new Error(
        `WIX Coupons API 404 Not Found at ${endpoint}${contextStr}: ${wixMessage}`
      );
    case 400:
      throw new Error(
        `WIX Coupons API 400 Bad Request at ${endpoint}${contextStr}: ${wixMessage}`
      );
    default:
      throw new Error(
        `WIX Coupons API ${response.status} at ${endpoint}${contextStr}: ${wixMessage}`
      );
  }
}

// =============================================================================
// Coupon CRUD API Functions
// =============================================================================

/**
 * Create a new coupon.
 *
 * POST /stores/v2/coupons
 *
 * @param params - Coupon creation parameters
 * @returns The created coupon
 */
export async function createCoupon(params: WixCouponCreate): Promise<WixCoupon> {
  const endpoint = COUPONS_API_BASE;

  console.log(`[Coupons] Creating coupon "${params.specification.code}" (${params.specification.type})...`);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ couponInfo: params }),
  });

  if (!response.ok) {
    await handleErrorResponse(response, endpoint, `code=${params.specification.code}`);
  }

  const data = await response.json() as WixCoupon;
  console.log(`[Coupons] Coupon created: ${data.id} (code: ${params.specification.code})`);
  return data;
}

/**
 * Get a coupon by ID.
 *
 * GET /stores/v2/coupons/{couponId}
 *
 * @param couponId - The coupon ID
 * @returns The coupon
 */
export async function getCoupon(couponId: string): Promise<WixCoupon> {
  const endpoint = `${COUPONS_API_BASE}/${couponId}`;

  console.log(`[Coupons] Fetching coupon ${couponId}...`);

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    await handleErrorResponse(response, endpoint, `couponId=${couponId}`);
  }

  const data = await response.json() as WixCoupon;
  return data;
}

/**
 * List all coupons using the query endpoint.
 *
 * POST /stores/v2/coupons/query
 *
 * Handles pagination to return all coupons.
 *
 * @returns Array of all coupons
 */
export async function listCoupons(): Promise<WixCoupon[]> {
  const endpoint = `${COUPONS_API_BASE}/query`;
  const pageSize = 100;
  const allCoupons: WixCoupon[] = [];
  let offset = 0;

  console.log('[Coupons] Listing all coupons...');

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const body = {
      query: {
        paging: { limit: pageSize, offset },
      },
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      await handleErrorResponse(response, endpoint, 'listCoupons');
    }

    const data = await response.json() as {
      coupons: WixCoupon[];
      totalResults: number;
    };

    allCoupons.push(...(data.coupons || []));

    // Check if there are more pages
    if (
      !data.coupons ||
      data.coupons.length === 0 ||
      allCoupons.length >= data.totalResults ||
      data.coupons.length < pageSize
    ) {
      break;
    }

    offset += pageSize;
  }

  console.log(`[Coupons] Found ${allCoupons.length} coupons.`);
  return allCoupons;
}

/**
 * Delete a coupon by ID.
 *
 * DELETE /stores/v2/coupons/{couponId}
 *
 * @param couponId - The coupon ID to delete
 */
export async function deleteCoupon(couponId: string): Promise<void> {
  const endpoint = `${COUPONS_API_BASE}/${couponId}`;

  console.log(`[Coupons] Deleting coupon ${couponId}...`);

  const response = await fetch(endpoint, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  if (!response.ok) {
    await handleErrorResponse(response, endpoint, `couponId=${couponId}`);
  }

  console.log(`[Coupons] Coupon ${couponId} deleted.`);
}

/**
 * Update a coupon by ID (partial update).
 *
 * PATCH /stores/v2/coupons/{couponId}
 *
 * @param couponId - The coupon ID to update
 * @param updates - Partial specification to update
 * @returns The updated coupon
 */
export async function updateCoupon(
  couponId: string,
  updates: Partial<WixCouponCreate['specification']>,
): Promise<WixCoupon> {
  const endpoint = `${COUPONS_API_BASE}/${couponId}`;

  console.log(`[Coupons] Updating coupon ${couponId}...`);

  const response = await fetch(endpoint, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ couponInfo: { specification: updates } }),
  });

  if (!response.ok) {
    await handleErrorResponse(response, endpoint, `couponId=${couponId}`);
  }

  const data = await response.json() as WixCoupon;
  console.log(`[Coupons] Coupon ${couponId} updated.`);
  return data;
}

// =============================================================================
// CLI Helpers
// =============================================================================

/**
 * Format a coupon discount amount for display.
 * Handles WIX API returning PascalCase types (e.g., "PercentOff" not "percentOff").
 */
function formatDiscount(coupon: WixCoupon): string {
  const spec = coupon.specification;
  const typeLower = (spec.type || '').toLowerCase();
  if (typeLower === 'percentoff') {
    return `${spec.percentOff ?? (spec as Record<string, unknown>)['percentOffRate'] ?? 0}% off`;
  }
  if (typeLower === 'moneyoff') {
    return `$${(spec.moneyOffAmount ?? 0).toFixed(2)} off`;
  }
  if (typeLower === 'freeshipping') {
    return 'Free shipping';
  }
  return spec.type;
}

/**
 * Format a date string for table display.
 * Handles various date formats from WIX API.
 */
function formatDate(isoDate?: string): string {
  if (!isoDate) return '—';
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

/**
 * Print a table of coupons to stdout.
 */
function printCouponTable(coupons: WixCoupon[]): void {
  if (coupons.length === 0) {
    console.log('\n  No coupons found.\n');
    return;
  }

  // Column headers
  const headers = ['Code', 'Type', 'Discount', 'Uses', 'Limit', 'Expires', 'Status', 'ID'];

  // Build rows
  const rows = coupons.map((c) => {
    const spec = c.specification;
    // Normalize type display (WIX returns PascalCase)
    const typeDisplay = (spec.type || '').toLowerCase().replace('off', '-off').replace('freeshipping', 'free-ship');
    return [
      spec.code,
      typeDisplay,
      formatDiscount(c),
      String(c.numberOfUsages ?? 0),
      spec.usageLimit != null ? String(spec.usageLimit) : 'unlimited',
      formatDate(spec.expirationTime),
      spec.active !== false ? 'Active' : 'Inactive',
      c.id,
    ];
  });

  // Calculate column widths
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => r[i].length))
  );

  // Print header
  const headerLine = headers.map((h, i) => h.padEnd(widths[i])).join('  ');
  const separator = widths.map((w) => '─'.repeat(w)).join('──');

  console.log();
  console.log(`  ${headerLine}`);
  console.log(`  ${separator}`);

  // Print rows
  for (const row of rows) {
    const line = row.map((cell, i) => cell.padEnd(widths[i])).join('  ');
    console.log(`  ${line}`);
  }

  console.log();
  console.log(`  ${coupons.length} coupon(s) total`);
  console.log();
}

/**
 * Parse CLI arguments into a map.
 * Supports --flag value and --flag=value formats.
 */
function parseArgs(args: string[]): { command: string; flags: Record<string, string>; positional: string[] } {
  const flags: Record<string, string> = {};
  const positional: string[] = [];
  let command = '';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (!command && !arg.startsWith('--')) {
      command = arg;
      continue;
    }

    if (arg.startsWith('--')) {
      const eqIdx = arg.indexOf('=');
      if (eqIdx !== -1) {
        // --flag=value
        const key = arg.slice(2, eqIdx);
        flags[key] = arg.slice(eqIdx + 1);
      } else {
        // --flag value
        const key = arg.slice(2);
        const next = args[i + 1];
        if (next && !next.startsWith('--')) {
          flags[key] = next;
          i++;
        } else {
          flags[key] = 'true';
        }
      }
    } else {
      positional.push(arg);
    }
  }

  return { command, flags, positional };
}

/**
 * Validate a coupon code (WIX requires 4+ chars, alphanumeric + dash).
 */
function validateCode(code: string): void {
  if (code.length < 4) {
    throw new Error(`Coupon code "${code}" is too short. WIX requires at least 4 characters.`);
  }
  if (!/^[A-Za-z0-9-]+$/.test(code)) {
    throw new Error(
      `Coupon code "${code}" contains invalid characters.\n` +
      'WIX allows only letters, numbers, and dashes (A-Z, 0-9, -).'
    );
  }
}

/**
 * Print usage help.
 */
function printUsage(): void {
  console.log(`
WIX Coupon Manager — CLI for store-level discount codes
========================================================

Usage:
  npx tsx scripts/pipeline/wix-coupons.ts <command> [options]

Commands:
  create    Create a new coupon code
  list      List all coupons
  delete    Delete a coupon by ID

Create Options:
  --code <CODE>           Promo code (required, 4+ chars, alphanumeric + dash)
  --type <TYPE>           Discount type: percentOff, moneyOff, freeShipping (required)
  --amount <N>            Discount amount (required for percentOff and moneyOff)
  --name <NAME>           Display name (optional, defaults to code)
  --limit <N>             Max total uses (optional, unlimited if omitted)
  --per-customer <N>      Max uses per customer (optional)
  --expires <DATE>        Expiration date ISO or YYYY-MM-DD (optional)
  --collection <NAME>     Scope to a collection by name (optional)
  --product <ID>          Scope to a specific product ID (optional)
  --one-item              Apply to one item only (optional flag)

Examples:
  npx tsx scripts/pipeline/wix-coupons.ts create --code BIGBARN20 --type percentOff --amount 20
  npx tsx scripts/pipeline/wix-coupons.ts create --code FREESHIP --type freeShipping --limit 50
  npx tsx scripts/pipeline/wix-coupons.ts create --code SAVE5 --type moneyOff --amount 5 --per-customer 1
  npx tsx scripts/pipeline/wix-coupons.ts create --code BB10 --type percentOff --amount 10 --collection "Big Barn Crossfit"
  npx tsx scripts/pipeline/wix-coupons.ts list
  npx tsx scripts/pipeline/wix-coupons.ts delete <COUPON_ID>
`);
}

// =============================================================================
// CLI Runner
// =============================================================================

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const cliArgs = process.argv.slice(2);
  const { command, flags, positional } = parseArgs(cliArgs);

  if (!command) {
    printUsage();
    process.exit(0);
  }

  try {
    switch (command) {
      case 'create': {
        // Validate required flags
        const code = flags['code'];
        const type = flags['type'] as 'percentOff' | 'moneyOff' | 'freeShipping' | undefined;

        if (!code) {
          console.error('Error: --code is required.');
          printUsage();
          process.exit(1);
        }

        if (!type || !['percentOff', 'moneyOff', 'freeShipping'].includes(type)) {
          console.error('Error: --type is required and must be one of: percentOff, moneyOff, freeShipping');
          printUsage();
          process.exit(1);
        }

        validateCode(code);

        // Build scope
        const scope: WixCouponScope = { namespace: 'stores' };

        if (flags['collection']) {
          console.log(`[Coupons] Resolving collection "${flags['collection']}"...`);
          const collection = await getCollectionByName(flags['collection']);
          scope.group = { name: 'collection', entityId: collection.id };
          console.log(`[Coupons] Scoped to collection: ${collection.name} (${collection.id})`);
        } else if (flags['product']) {
          scope.group = { name: 'product', entityId: flags['product'] };
          console.log(`[Coupons] Scoped to product: ${flags['product']}`);
        }

        // Build specification
        const spec: WixCouponCreate['specification'] = {
          name: flags['name'] || code,
          code: code.toUpperCase(),
          type,
          scope,
        };

        // Set discount amount based on type
        if (type === 'percentOff') {
          const amount = parseFloat(flags['amount']);
          if (isNaN(amount) || amount < 1 || amount > 100) {
            console.error('Error: --amount is required for percentOff and must be 1-100.');
            process.exit(1);
          }
          spec.percentOff = amount;
        } else if (type === 'moneyOff') {
          const amount = parseFloat(flags['amount']);
          if (isNaN(amount) || amount <= 0) {
            console.error('Error: --amount is required for moneyOff and must be positive.');
            process.exit(1);
          }
          spec.moneyOffAmount = amount;
        }
        // freeShipping needs no amount

        // Optional fields
        if (flags['limit']) {
          spec.usageLimit = parseInt(flags['limit'], 10);
        }
        if (flags['per-customer']) {
          spec.limitPerCustomer = parseInt(flags['per-customer'], 10);
        }
        if (flags['expires']) {
          // Accept YYYY-MM-DD or full ISO
          const expiresDate = flags['expires'].includes('T')
            ? flags['expires']
            : `${flags['expires']}T23:59:59.000Z`;
          spec.expirationTime = expiresDate;
        }
        if (flags['one-item'] === 'true') {
          spec.limitedToOneItem = true;
        }

        const coupon = await createCoupon({ specification: spec });
        console.log(`\nCoupon created successfully!`);
        console.log(`  ID:       ${coupon.id}`);
        console.log(`  Code:     ${coupon.specification.code}`);
        console.log(`  Type:     ${coupon.specification.type}`);
        console.log(`  Discount: ${formatDiscount(coupon)}`);
        if (spec.usageLimit) console.log(`  Limit:    ${spec.usageLimit} uses`);
        if (spec.expirationTime) console.log(`  Expires:  ${formatDate(spec.expirationTime)}`);
        if (scope.group) console.log(`  Scope:    ${scope.group.name} (${scope.group.entityId})`);
        console.log();
        break;
      }

      case 'list': {
        const coupons = await listCoupons();
        printCouponTable(coupons);
        break;
      }

      case 'delete': {
        const couponId = positional[0] || flags['id'];
        if (!couponId) {
          console.error('Error: Coupon ID is required.');
          console.error('Usage: npx tsx scripts/pipeline/wix-coupons.ts delete <COUPON_ID>');
          process.exit(1);
        }
        await deleteCoupon(couponId);
        console.log(`\nCoupon ${couponId} deleted successfully.\n`);
        break;
      }

      default:
        console.error(`Unknown command: "${command}"`);
        printUsage();
        process.exit(1);
    }
  } catch (err) {
    console.error('\nError:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}
