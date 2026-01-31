/**
 * Margin Report CLI - Product profitability viewer
 *
 * Reads cost data from data/cost-history.json and displays a formatted
 * table of product costs, retail prices, and margins.
 *
 * Usage:
 *   npx tsx scripts/pipeline/margin-report.ts                    # All products
 *   npx tsx scripts/pipeline/margin-report.ts --style PC61       # Single product history
 *   npx tsx scripts/pipeline/margin-report.ts --sort margin      # Sort by margin%
 *   npx tsx scripts/pipeline/margin-report.ts --sort cost        # Sort by total cost
 *   npx tsx scripts/pipeline/margin-report.ts --sort retail      # Sort by retail price
 *   npx tsx scripts/pipeline/margin-report.ts --below 30         # Products with margin% < 30
 *
 * Phase 15: Cost Tracking & Sale/Promo Pricing
 */

import { fileURLToPath } from 'url';
import path from 'path';

import { getAllProductCosts, getCostHistory } from './cost-tracker.js';
import type { ProductCostRecord, CostHistoryEntry } from './types.js';

// =============================================================================
// CLI Argument Parsing
// =============================================================================

const __filename = fileURLToPath(import.meta.url);

function printUsage(): void {
  console.log('Margin Report - Product Profitability Viewer');
  console.log('');
  console.log('Usage: npx tsx scripts/pipeline/margin-report.ts [options]');
  console.log('');
  console.log('Options:');
  console.log('  --style STYLE   Show detailed cost history for a single product');
  console.log('  --sort KEY      Sort by: margin (default), cost, retail');
  console.log('  --below N       Only show products with margin% below N');
  console.log('  --help          Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  npx tsx scripts/pipeline/margin-report.ts');
  console.log('  npx tsx scripts/pipeline/margin-report.ts --style PC61');
  console.log('  npx tsx scripts/pipeline/margin-report.ts --sort cost --below 40');
}

function getArg(flag: string): string | null {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 && idx + 1 < process.argv.length ? process.argv[idx + 1] : null;
}

// =============================================================================
// Table Formatting
// =============================================================================

function pad(str: string, len: number, align: 'left' | 'right' = 'left'): string {
  if (align === 'right') {
    return str.padStart(len);
  }
  return str.padEnd(len);
}

function formatDollars(n: number): string {
  return `$${n.toFixed(2)}`;
}

function formatPercent(n: number): string {
  return `${n.toFixed(1)}%`;
}

function printAllProductsTable(products: ProductCostRecord[], sortKey: string, belowThreshold: number | null): void {
  // Sort
  const sorted = [...products].sort((a, b) => {
    switch (sortKey) {
      case 'cost':
        return a.totalCost - b.totalCost;
      case 'retail':
        return a.retailPrice - b.retailPrice;
      case 'margin':
      default:
        return a.margin.percent - b.margin.percent;
    }
  });

  // Filter
  const filtered = belowThreshold != null
    ? sorted.filter((p) => p.margin.percent < belowThreshold)
    : sorted;

  if (filtered.length === 0) {
    if (products.length === 0) {
      console.log('No products tracked yet.');
      console.log('Create products with `npx tsx scripts/pipeline/create-product.ts` to start tracking costs.');
    } else {
      console.log(`No products with margin below ${belowThreshold}%.`);
    }
    return;
  }

  // Column headers and widths
  const headers = ['Style', 'Name', 'Wholesale', 'Decor', 'Total Cost', 'Retail', 'Margin $', 'Margin %', 'Preset'];
  const widths  = [12,      20,     10,          8,       11,           9,        10,         10,         16];

  // Print header
  const headerLine = headers.map((h, i) => pad(h, widths[i])).join(' | ');
  const separator = widths.map((w) => '-'.repeat(w)).join('-+-');
  console.log(headerLine);
  console.log(separator);

  // Print rows
  for (const p of filtered) {
    const row = [
      pad(p.style, widths[0]),
      pad(p.productName.length > widths[1] ? p.productName.substring(0, widths[1] - 2) + '..' : p.productName, widths[1]),
      pad(formatDollars(p.wholesaleCost), widths[2], 'right'),
      pad(formatDollars(p.decorationCost), widths[3], 'right'),
      pad(formatDollars(p.totalCost), widths[4], 'right'),
      pad(formatDollars(p.retailPrice), widths[5], 'right'),
      pad(formatDollars(p.margin.dollars), widths[6], 'right'),
      pad(formatPercent(p.margin.percent), widths[7], 'right'),
      pad(p.pricingPreset, widths[8]),
    ];
    console.log(row.join(' | '));
  }

  console.log('');
  console.log(`${filtered.length} product(s) shown${belowThreshold != null ? ` (margin < ${belowThreshold}%)` : ''}, sorted by ${sortKey}.`);
}

function printProductHistory(style: string, record: ProductCostRecord, history: CostHistoryEntry[]): void {
  console.log(`Cost History: ${record.style} - ${record.productName}`);
  console.log('');

  // Current summary
  console.log('Current:');
  console.log(`  WIX Product ID:  ${record.wixProductId}`);
  console.log(`  Wholesale Cost:  ${formatDollars(record.wholesaleCost)}`);
  console.log(`  Decoration Cost: ${formatDollars(record.decorationCost)} (${record.decorationType})`);
  console.log(`  Total Cost:      ${formatDollars(record.totalCost)}`);
  console.log(`  Retail Price:    ${formatDollars(record.retailPrice)}`);
  console.log(`  Margin:          ${formatDollars(record.margin.dollars)} (${formatPercent(record.margin.percent)})`);
  console.log(`  Pricing Preset:  ${record.pricingPreset}`);
  console.log(`  Last Updated:    ${record.updatedAt}`);
  console.log('');

  // History table
  if (history.length === 0) {
    console.log('No history entries.');
    return;
  }

  const headers = ['Date', 'Wholesale', 'Decor', 'Total', 'Retail', 'Margin %', 'Reason'];
  const widths  = [20,     10,          8,       9,       9,        10,         14];

  const headerLine = headers.map((h, i) => pad(h, widths[i])).join(' | ');
  const separator = widths.map((w) => '-'.repeat(w)).join('-+-');
  console.log('History:');
  console.log(headerLine);
  console.log(separator);

  for (const entry of history) {
    const dateStr = entry.timestamp.substring(0, 19).replace('T', ' ');
    const row = [
      pad(dateStr, widths[0]),
      pad(formatDollars(entry.wholesaleCost), widths[1], 'right'),
      pad(formatDollars(entry.decorationCost), widths[2], 'right'),
      pad(formatDollars(entry.totalCost), widths[3], 'right'),
      pad(formatDollars(entry.retailPrice), widths[4], 'right'),
      pad(formatPercent(entry.margin.percent), widths[5], 'right'),
      pad(entry.reason, widths[6]),
    ];
    console.log(row.join(' | '));
  }

  console.log('');
  console.log(`${history.length} history entry/entries.`);
}

// =============================================================================
// Main
// =============================================================================

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  if (process.argv.includes('--help')) {
    printUsage();
    process.exit(0);
  }

  const styleArg = getArg('--style');
  const sortArg = getArg('--sort') ?? 'margin';
  const belowArg = getArg('--below');
  const belowThreshold = belowArg != null ? parseFloat(belowArg) : null;

  if (!['margin', 'cost', 'retail'].includes(sortArg)) {
    console.error(`Invalid sort key: "${sortArg}". Use: margin, cost, or retail.`);
    process.exit(1);
  }

  try {
    if (styleArg) {
      // Single product detail view
      const allProducts = await getAllProductCosts();
      const record = allProducts.find((p) => p.style === styleArg);
      if (!record) {
        console.error(`No cost data found for style "${styleArg}".`);
        const styles = allProducts.map((p) => p.style);
        if (styles.length > 0) {
          console.error(`Tracked styles: ${styles.join(', ')}`);
        }
        process.exit(1);
      }
      const history = await getCostHistory(styleArg);
      printProductHistory(styleArg, record, history);
    } else {
      // All products table
      const products = await getAllProductCosts();
      printAllProductsTable(products, sortArg, belowThreshold);
    }
  } catch (err) {
    console.error('Error:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}
