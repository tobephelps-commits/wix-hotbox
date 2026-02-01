/**
 * Sale Pricing Engine
 *
 * Manages time-limited retail price changes (flash sales, seasonal promotions,
 * clearance pricing) on WIX products. Provides:
 * - Sale CRUD (create, list, cancel)
 * - Price application to WIX (apply sale prices, revert to originals)
 * - Scheduled processing (activate scheduled sales, end expired sales)
 * - CLI interface for all operations
 *
 * Data is persisted to data/active-sales.json (gitignored like other local data files).
 *
 * Phase 15: Cost Tracking & Sale/Promo Pricing
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import type { SaleConfig, ActiveSalesFile } from './types.js';
import {
  getProduct,
  updateProduct,
  updateProductVariants,
} from './wix-api.js';
import {
  loadCostHistory,
  saveCostHistory,
} from './cost-tracker.js';

// =============================================================================
// Constants
// =============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Path to the active sales JSON data file */
const ACTIVE_SALES_FILE = path.resolve(__dirname, '../../data/active-sales.json');

// =============================================================================
// Data Layer
// =============================================================================

/**
 * Read active sales from data/active-sales.json.
 * Creates an empty file if it doesn't exist.
 */
export async function loadActiveSales(): Promise<ActiveSalesFile> {
  try {
    const raw = await readFile(ACTIVE_SALES_FILE, 'utf-8');
    return JSON.parse(raw) as ActiveSalesFile;
  } catch (err: unknown) {
    if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
      const empty: ActiveSalesFile = {
        sales: {},
        lastUpdated: new Date().toISOString(),
      };
      await saveActiveSales(empty);
      return empty;
    }
    throw err;
  }
}

/**
 * Write active sales to data/active-sales.json.
 * Creates the data/ directory if it doesn't exist.
 */
export async function saveActiveSales(data: ActiveSalesFile): Promise<void> {
  const dir = path.dirname(ACTIVE_SALES_FILE);
  await mkdir(dir, { recursive: true });
  await writeFile(ACTIVE_SALES_FILE, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

// =============================================================================
// Sale CRUD
// =============================================================================

/** Parameters for creating a new sale */
export interface CreateSaleParams {
  name: string;
  discountType: SaleConfig['discountType'];
  discountValue: number;
  productStyles: string[];
  startDate: string;
  endDate: string;
}

/**
 * Create a new sale/promotion.
 *
 * Status is set to "scheduled" if startDate is in the future,
 * or "active" if startDate is now/past and endDate is in the future.
 */
export async function createSale(params: CreateSaleParams): Promise<SaleConfig> {
  const data = await loadActiveSales();
  const now = new Date();
  const start = new Date(params.startDate);
  const end = new Date(params.endDate);

  if (end <= start) {
    throw new Error('End date must be after start date');
  }

  const id = `sale-${Math.floor(now.getTime() / 1000)}`;
  const status: SaleConfig['status'] = start <= now && end > now ? 'active' : 'scheduled';

  const sale: SaleConfig = {
    id,
    name: params.name,
    discountType: params.discountType,
    discountValue: params.discountValue,
    productStyles: params.productStyles,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    status,
    originalPrices: {},
    createdAt: now.toISOString(),
  };

  data.sales[id] = sale;
  data.lastUpdated = now.toISOString();
  await saveActiveSales(data);

  console.log(`[Sale] Created sale "${sale.name}" (${id}) — status: ${status}`);
  return sale;
}

/**
 * Get a sale by ID. Returns null if not found.
 */
export async function getSale(id: string): Promise<SaleConfig | null> {
  const data = await loadActiveSales();
  return data.sales[id] ?? null;
}

/**
 * List sales with optional status filter.
 */
export async function listSales(filter?: 'active' | 'scheduled' | 'ended' | 'cancelled'): Promise<SaleConfig[]> {
  const data = await loadActiveSales();
  const all = Object.values(data.sales);
  if (!filter) return all;
  return all.filter((s) => s.status === filter);
}

/**
 * Cancel a sale. If it was active, reverts prices first.
 */
export async function cancelSale(id: string): Promise<void> {
  const data = await loadActiveSales();
  const sale = data.sales[id];
  if (!sale) {
    throw new Error(`Sale "${id}" not found`);
  }
  if (sale.status === 'ended' || sale.status === 'cancelled') {
    throw new Error(`Sale "${id}" is already ${sale.status}`);
  }

  if (sale.status === 'active') {
    console.log(`[Sale] Reverting active sale "${sale.name}" before cancellation...`);
    await revertSale(id);
    // Reload data after revert
    const refreshed = await loadActiveSales();
    refreshed.sales[id].status = 'cancelled';
    refreshed.lastUpdated = new Date().toISOString();
    await saveActiveSales(refreshed);
  } else {
    sale.status = 'cancelled';
    data.lastUpdated = new Date().toISOString();
    await saveActiveSales(data);
  }

  console.log(`[Sale] Cancelled sale "${sale.name}" (${id})`);
}

// =============================================================================
// Price Calculation
// =============================================================================

/**
 * Calculate the sale price given original price and discount configuration.
 *
 * - "percent": originalPrice * (1 - discountValue / 100)
 * - "fixed": originalPrice - discountValue (min 0.01)
 * - "override": discountValue (exact price)
 *
 * Result is rounded to 2 decimal places.
 */
export function calculateSalePrice(
  originalPrice: number,
  discountType: SaleConfig['discountType'],
  discountValue: number,
): number {
  let salePrice: number;

  switch (discountType) {
    case 'percent':
      salePrice = originalPrice * (1 - discountValue / 100);
      break;
    case 'fixed':
      salePrice = originalPrice - discountValue;
      break;
    case 'override':
      salePrice = discountValue;
      break;
  }

  // Ensure minimum price of $0.01
  salePrice = Math.max(0.01, salePrice);

  // Round to 2 decimal places
  return Math.round(salePrice * 100) / 100;
}

// =============================================================================
// WIX Price Application
// =============================================================================

/**
 * Apply sale prices to WIX products.
 *
 * For each product style in the sale:
 * 1. Load cost history to get wixProductId
 * 2. Get current product from WIX to snapshot original prices
 * 3. Store original prices in sale's originalPrices map
 * 4. Calculate sale prices for each variant
 * 5. Update variants in WIX
 * 6. Update base product price in WIX
 * 7. Record sale-start in cost history
 * 8. Set sale status to "active"
 */
export async function applySale(saleId: string): Promise<void> {
  const salesData = await loadActiveSales();
  const sale = salesData.sales[saleId];
  if (!sale) {
    throw new Error(`Sale "${saleId}" not found`);
  }
  if (sale.status === 'active') {
    throw new Error(`Sale "${saleId}" is already active`);
  }
  if (sale.status === 'ended' || sale.status === 'cancelled') {
    throw new Error(`Sale "${saleId}" is ${sale.status} and cannot be applied`);
  }

  const costData = await loadCostHistory();

  // Determine which styles to apply to
  let targetStyles = sale.productStyles;
  if (targetStyles.length === 0) {
    // Empty = all tracked products
    targetStyles = Object.keys(costData.products);
  }

  if (targetStyles.length === 0) {
    throw new Error('No tracked products found. Run the creation pipeline first to track products.');
  }

  console.log(`[Sale] Applying sale "${sale.name}" to ${targetStyles.length} product(s)...`);

  for (const style of targetStyles) {
    const costRecord = costData.products[style];
    if (!costRecord) {
      console.warn(`[Sale] Style "${style}" not found in cost history — skipping`);
      continue;
    }

    const productId = costRecord.current.wixProductId;
    console.log(`[Sale] Processing ${style} (WIX: ${productId})...`);

    // Get current product from WIX to snapshot prices
    const product = await getProduct(productId);

    // Snapshot original prices
    const variantPrices: Record<string, number> = {};
    if (product.variants) {
      for (const v of product.variants) {
        const sku = v.variant?.sku || `${v.choices?.Color ?? 'Unknown'}-${v.choices?.Size ?? 'Unknown'}`;
        variantPrices[sku] = v.variant?.priceData?.price ?? 0;
      }
    }

    // Extract base retail price from product
    const basePrice = (product as Record<string, unknown>).priceData
      ? ((product as Record<string, unknown>).priceData as { price: number }).price
      : costRecord.current.retailPrice;

    sale.originalPrices[style] = {
      retailPrice: basePrice,
      variantPrices,
    };

    // Calculate and apply sale prices to variants
    if (product.variants && product.variants.length > 0) {
      const variantUpdates = product.variants.map((v) => {
        const originalPrice = v.variant?.priceData?.price ?? basePrice;
        const salePrice = calculateSalePrice(originalPrice, sale.discountType, sale.discountValue);
        return {
          choices: v.choices,
          price: salePrice,
          cost: v.variant?.weight ? 0 : 0, // Keep cost unchanged
          weight: v.variant?.weight ?? 0,
          sku: v.variant?.sku ?? '',
          visible: v.variant?.visible ?? true,
        };
      });

      await updateProductVariants(productId, variantUpdates);
    }

    // Update base product price
    const salePriceBase = calculateSalePrice(basePrice, sale.discountType, sale.discountValue);
    await updateProduct(productId, {
      priceData: { price: salePriceBase },
    });

    // Update cost history with sale-start event
    costRecord.current.retailPrice = salePriceBase;
    costRecord.current.updatedAt = new Date().toISOString();
    const margin = {
      dollars: Math.round((salePriceBase - costRecord.current.totalCost) * 100) / 100,
      percent: salePriceBase > 0
        ? Math.round(((salePriceBase - costRecord.current.totalCost) / salePriceBase) * 10000) / 100
        : 0,
    };
    costRecord.current.margin = margin;
    costRecord.history.push({
      timestamp: new Date().toISOString(),
      wholesaleCost: costRecord.current.wholesaleCost,
      decorationCost: costRecord.current.decorationCost,
      totalCost: costRecord.current.totalCost,
      retailPrice: salePriceBase,
      margin,
      reason: 'sale-start',
    });

    console.log(`[Sale] ${style}: $${basePrice} -> $${salePriceBase}`);
  }

  // Save updated cost history
  costData.lastUpdated = new Date().toISOString();
  await saveCostHistory(costData);

  // Update sale status
  sale.status = 'active';
  salesData.lastUpdated = new Date().toISOString();
  await saveActiveSales(salesData);

  console.log(`[Sale] Sale "${sale.name}" applied successfully`);
}

/**
 * Revert sale prices to original values.
 *
 * For each style in the sale's originalPrices:
 * 1. Restore original variant prices in WIX
 * 2. Restore base product price in WIX
 * 3. Record sale-end in cost history
 * 4. Set sale status to "ended"
 */
export async function revertSale(saleId: string): Promise<void> {
  const salesData = await loadActiveSales();
  const sale = salesData.sales[saleId];
  if (!sale) {
    throw new Error(`Sale "${saleId}" not found`);
  }
  if (sale.status !== 'active') {
    throw new Error(`Sale "${saleId}" is not active (status: ${sale.status})`);
  }
  if (Object.keys(sale.originalPrices).length === 0) {
    console.warn(`[Sale] No original prices stored for sale "${saleId}" — marking as ended`);
    sale.status = 'ended';
    salesData.lastUpdated = new Date().toISOString();
    await saveActiveSales(salesData);
    return;
  }

  const costData = await loadCostHistory();

  console.log(`[Sale] Reverting sale "${sale.name}"...`);

  for (const [style, origPrices] of Object.entries(sale.originalPrices)) {
    const costRecord = costData.products[style];
    if (!costRecord) {
      console.warn(`[Sale] Style "${style}" not in cost history — skipping revert`);
      continue;
    }

    const productId = costRecord.current.wixProductId;
    console.log(`[Sale] Reverting ${style} (WIX: ${productId})...`);

    // Restore variant prices
    const product = await getProduct(productId);
    if (product.variants && product.variants.length > 0) {
      const variantUpdates = product.variants.map((v) => {
        const sku = v.variant?.sku || `${v.choices?.Color ?? 'Unknown'}-${v.choices?.Size ?? 'Unknown'}`;
        const originalPrice = origPrices.variantPrices[sku] ?? origPrices.retailPrice;
        return {
          choices: v.choices,
          price: originalPrice,
          cost: v.variant?.weight ? 0 : 0,
          weight: v.variant?.weight ?? 0,
          sku: v.variant?.sku ?? '',
          visible: v.variant?.visible ?? true,
        };
      });

      await updateProductVariants(productId, variantUpdates);
    }

    // Restore base product price
    await updateProduct(productId, {
      priceData: { price: origPrices.retailPrice },
    });

    // Update cost history with sale-end event
    costRecord.current.retailPrice = origPrices.retailPrice;
    costRecord.current.updatedAt = new Date().toISOString();
    const margin = {
      dollars: Math.round((origPrices.retailPrice - costRecord.current.totalCost) * 100) / 100,
      percent: origPrices.retailPrice > 0
        ? Math.round(((origPrices.retailPrice - costRecord.current.totalCost) / origPrices.retailPrice) * 10000) / 100
        : 0,
    };
    costRecord.current.margin = margin;
    costRecord.history.push({
      timestamp: new Date().toISOString(),
      wholesaleCost: costRecord.current.wholesaleCost,
      decorationCost: costRecord.current.decorationCost,
      totalCost: costRecord.current.totalCost,
      retailPrice: origPrices.retailPrice,
      margin,
      reason: 'sale-end',
    });

    console.log(`[Sale] ${style}: reverted to $${origPrices.retailPrice}`);
  }

  // Save updated cost history
  costData.lastUpdated = new Date().toISOString();
  await saveCostHistory(costData);

  // Update sale status
  sale.status = 'ended';
  salesData.lastUpdated = new Date().toISOString();
  await saveActiveSales(salesData);

  console.log(`[Sale] Sale "${sale.name}" reverted successfully`);
}

/**
 * Check and process all sales — activate scheduled sales whose startDate
 * has passed, end active sales whose endDate has passed.
 *
 * This is the "cron-like" function meant to be called periodically or manually.
 */
export async function checkAndProcessSales(): Promise<void> {
  const data = await loadActiveSales();
  const now = new Date();
  let changed = false;

  console.log(`[Sale] Checking ${Object.keys(data.sales).length} sale(s)...`);

  for (const sale of Object.values(data.sales)) {
    const start = new Date(sale.startDate);
    const end = new Date(sale.endDate);

    // Activate scheduled sales whose start date has passed
    if (sale.status === 'scheduled' && start <= now) {
      if (end <= now) {
        // Already past end date — skip activation, mark as ended
        console.log(`[Sale] "${sale.name}" — start and end date both passed, marking as ended`);
        sale.status = 'ended';
        changed = true;
      } else {
        console.log(`[Sale] "${sale.name}" — start date passed, activating...`);
        try {
          await applySale(sale.id);
          changed = true;
        } catch (err) {
          console.error(`[Sale] Failed to activate "${sale.name}":`, err instanceof Error ? err.message : String(err));
        }
      }
    }

    // End active sales whose end date has passed
    if (sale.status === 'active' && end <= now) {
      console.log(`[Sale] "${sale.name}" — end date passed, reverting...`);
      try {
        await revertSale(sale.id);
        changed = true;
      } catch (err) {
        console.error(`[Sale] Failed to revert "${sale.name}":`, err instanceof Error ? err.message : String(err));
      }
    }
  }

  if (changed) {
    // Reload to get updated data (applySale/revertSale may have modified)
    console.log('[Sale] Processing complete — sales updated');
  } else {
    console.log('[Sale] No sales needed processing');
  }
}

// =============================================================================
// Discount Format Parsing
// =============================================================================

/**
 * Parse discount format string into type and value.
 *
 * Formats:
 * - "20%" = percent 20
 * - "$5" = fixed 5
 * - "@19.99" = override 19.99
 */
function parseDiscount(input: string): { discountType: SaleConfig['discountType']; discountValue: number } {
  if (input.endsWith('%')) {
    const value = parseFloat(input.slice(0, -1));
    if (isNaN(value) || value <= 0 || value > 100) {
      throw new Error(`Invalid percent discount: "${input}". Must be between 0 and 100.`);
    }
    return { discountType: 'percent', discountValue: value };
  }

  if (input.startsWith('$')) {
    const value = parseFloat(input.slice(1));
    if (isNaN(value) || value <= 0) {
      throw new Error(`Invalid fixed discount: "${input}". Must be a positive dollar amount.`);
    }
    return { discountType: 'fixed', discountValue: value };
  }

  if (input.startsWith('@')) {
    const value = parseFloat(input.slice(1));
    if (isNaN(value) || value <= 0) {
      throw new Error(`Invalid override price: "${input}". Must be a positive dollar amount.`);
    }
    return { discountType: 'override', discountValue: value };
  }

  throw new Error(
    `Invalid discount format: "${input}"\n` +
    'Supported formats:\n' +
    '  20%     — 20% off\n' +
    '  $5      — $5 off\n' +
    '  @19.99  — set price to $19.99'
  );
}

/**
 * Parse a date string. Supports "now" for current time, or ISO dates / common formats.
 */
function parseDate(input: string): string {
  if (input.toLowerCase() === 'now') {
    return new Date().toISOString();
  }

  // Try parsing as-is
  const d = new Date(input);
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date: "${input}". Use ISO format (YYYY-MM-DD) or "now".`);
  }
  return d.toISOString();
}

// =============================================================================
// CLI Interface
// =============================================================================

function printUsage(): void {
  console.log(`
Sale Pricing Engine — Manage time-limited price changes on WIX products

Usage:
  npx tsx scripts/pipeline/sale-pricing.ts <command> [options]

Commands:
  create    Create a new sale
  list      List sales (optionally filtered by status)
  apply     Manually apply a sale to WIX products
  revert    Manually revert a sale (restore original prices)
  cancel    Cancel a sale (reverts if active)
  check     Process scheduled/expired sales (activate or end as needed)

Create options:
  --name <name>        Sale display name (required)
  --discount <value>   Discount: "20%" | "$5" | "@19.99" (required)
  --styles <s1,s2>     Comma-separated style numbers (optional, default: all)
  --start <date>       Start date: ISO date or "now" (required)
  --end <date>         End date: ISO date (required)

Examples:
  npx tsx scripts/pipeline/sale-pricing.ts create --name "Flash Sale" --discount 20% --styles PC61,K420 --start 2026-02-01 --end 2026-02-03
  npx tsx scripts/pipeline/sale-pricing.ts create --name "Clearance" --discount $5 --styles PC61 --start now --end 2026-02-15
  npx tsx scripts/pipeline/sale-pricing.ts create --name "Fixed Price" --discount @19.99 --styles PC61 --start now --end 2026-02-15
  npx tsx scripts/pipeline/sale-pricing.ts list --active
  npx tsx scripts/pipeline/sale-pricing.ts apply sale-1706745600
  npx tsx scripts/pipeline/sale-pricing.ts revert sale-1706745600
  npx tsx scripts/pipeline/sale-pricing.ts cancel sale-1706745600
  npx tsx scripts/pipeline/sale-pricing.ts check
`);
}

/**
 * Parse CLI arguments into a map.
 */
function parseArgs(args: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        result[key] = next;
        i++;
      } else {
        result[key] = 'true';
      }
    }
  }
  return result;
}

// =============================================================================
// CLI Runner
// =============================================================================

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const command = process.argv[2];
  const args = process.argv.slice(3);
  const opts = parseArgs(args);

  try {
    switch (command) {
      case 'create': {
        if (!opts.name || !opts.discount || !opts.start || !opts.end) {
          console.error('Error: --name, --discount, --start, and --end are required for create');
          printUsage();
          process.exit(1);
        }
        const { discountType, discountValue } = parseDiscount(opts.discount);
        const productStyles = opts.styles ? opts.styles.split(',').map((s) => s.trim()) : [];
        const startDate = parseDate(opts.start);
        const endDate = parseDate(opts.end);

        const sale = await createSale({
          name: opts.name,
          discountType,
          discountValue,
          productStyles,
          startDate,
          endDate,
        });

        console.log('\nSale created:');
        console.log(`  ID:        ${sale.id}`);
        console.log(`  Name:      ${sale.name}`);
        console.log(`  Discount:  ${sale.discountType === 'percent' ? `${sale.discountValue}%` : sale.discountType === 'fixed' ? `$${sale.discountValue} off` : `$${sale.discountValue} (override)`}`);
        console.log(`  Styles:    ${sale.productStyles.length === 0 ? 'all tracked products' : sale.productStyles.join(', ')}`);
        console.log(`  Start:     ${sale.startDate}`);
        console.log(`  End:       ${sale.endDate}`);
        console.log(`  Status:    ${sale.status}`);
        break;
      }

      case 'list': {
        const filter = (opts.active ? 'active' : opts.scheduled ? 'scheduled' : opts.ended ? 'ended' : undefined) as 'active' | 'scheduled' | 'ended' | undefined;
        const sales = await listSales(filter);

        if (sales.length === 0) {
          console.log(`No ${filter ?? ''} sales found.`);
        } else {
          console.log(`\n${filter ? filter.charAt(0).toUpperCase() + filter.slice(1) : 'All'} Sales (${sales.length}):\n`);
          for (const s of sales) {
            const discountStr = s.discountType === 'percent'
              ? `${s.discountValue}% off`
              : s.discountType === 'fixed'
              ? `$${s.discountValue} off`
              : `$${s.discountValue} (override)`;
            console.log(`  ${s.id}  "${s.name}"  ${discountStr}  [${s.status}]`);
            console.log(`    Styles: ${s.productStyles.length === 0 ? 'all' : s.productStyles.join(', ')}`);
            console.log(`    ${new Date(s.startDate).toLocaleDateString()} — ${new Date(s.endDate).toLocaleDateString()}`);
            console.log('');
          }
        }
        break;
      }

      case 'apply': {
        const saleId = args[0];
        if (!saleId) {
          console.error('Error: Sale ID required. Usage: sale-pricing.ts apply <SALE_ID>');
          process.exit(1);
        }
        await applySale(saleId);
        break;
      }

      case 'revert': {
        const saleId = args[0];
        if (!saleId) {
          console.error('Error: Sale ID required. Usage: sale-pricing.ts revert <SALE_ID>');
          process.exit(1);
        }
        await revertSale(saleId);
        break;
      }

      case 'cancel': {
        const saleId = args[0];
        if (!saleId) {
          console.error('Error: Sale ID required. Usage: sale-pricing.ts cancel <SALE_ID>');
          process.exit(1);
        }
        await cancelSale(saleId);
        break;
      }

      case 'check': {
        await checkAndProcessSales();
        break;
      }

      default:
        printUsage();
        break;
    }
  } catch (err) {
    console.error('Error:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}
