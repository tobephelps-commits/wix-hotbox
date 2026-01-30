#!/usr/bin/env npx tsx
/**
 * SanMar API Demo Script
 *
 * Exercises all SanMar service modules end-to-end against real endpoints.
 * Serves as both integration validation and usage reference.
 *
 * Usage:
 *   npx tsx scripts/sanmar/demo.ts [style]
 *   npm run demo
 *   npm run demo:style -- PC61
 *
 * Default style: PC61 (Port & Company Essential Tee)
 */

import {
  validateCredentials,
  getProductByStyle,
  extractUniqueColors,
  extractAvailableSizes,
  getStylePricing,
  isSaleActive,
  getEffectivePrice,
  getSuggestedRetail,
  formatPricingSummary,
  getStyleInventory,
  getTotalQuantity,
  isInStock,
  isWellStocked,
  formatInventorySummary,
  getProductImages,
  SanMarError,
} from './index.js';

import { getProductInfoClient, describeClient } from './client.js';

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_STYLE = 'PC61';
const SEPARATOR = '============================================================';
const SECTION_SEP = '------------------------------------------------------------';

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  const style = process.argv[2] ?? DEFAULT_STYLE;

  console.log(SEPARATOR);
  console.log(`SanMar API Demo — Style: ${style}`);
  console.log(SEPARATOR);
  console.log();

  // Validate credentials
  if (!validateCredentials()) {
    console.log('SanMar API credentials not configured.');
    console.log();
    console.log('To set up:');
    console.log('  1. Copy .env.example to .env');
    console.log('  2. Fill in your SanMar credentials:');
    console.log('     - SANMAR_CUSTOMER_NUMBER: Your SanMar account number');
    console.log('     - SANMAR_USERNAME: Your sanmar.com login username');
    console.log('     - SANMAR_PASSWORD: Your sanmar.com login password');
    console.log();
    console.log("Don't have API access? Email sanmarintegrations@sanmar.com");
    process.exit(1);
  }

  let sectionsSucceeded = 0;
  const totalSections = 5;

  // --- Section 1: Product Info ---
  try {
    console.log('--- Product Info ---');
    const products = await getProductByStyle(style);

    if (products.length === 0) {
      console.log(`No active products found for style "${style}".`);
    } else {
      const first = products[0].productBasicInfo;
      const description = first.productDescription.length > 100
        ? first.productDescription.slice(0, 100) + '...'
        : first.productDescription;

      console.log(`Brand:       ${first.brandName}`);
      console.log(`Style:       ${first.style}`);
      console.log(`Title:       ${first.productTitle}`);
      console.log(`Description: ${description}`);

      const colors = extractUniqueColors(products);
      const sizes = extractAvailableSizes(products);

      console.log(`Colors:      ${colors.length} available`);
      console.log(`Sizes:       ${sizes.length} available (${sizes.join(', ')})`);

      // Show first 3 color mappings
      const sampleColors = colors.slice(0, 3);
      if (sampleColors.length > 0) {
        console.log();
        console.log('Sample colors:');
        for (const c of sampleColors) {
          console.log(`  ${c.catalogColor} → ${c.displayColor}`);
        }
      }
    }

    sectionsSucceeded++;
  } catch (error) {
    printSectionError('Product Info', error);
  }

  console.log();

  // --- Section 2: Pricing ---
  try {
    console.log('--- Pricing ---');
    const pricing = await getStylePricing(style);

    console.log(`Piece Price:     $${pricing.piecePrice.toFixed(2)}`);
    console.log(`Case Price:      $${pricing.casePrice.toFixed(2)}`);
    console.log(`Effective Price: $${getEffectivePrice(pricing).toFixed(2)}`);

    const saleActive = isSaleActive(pricing);
    if (saleActive) {
      console.log(`Sale Status:     ACTIVE ($${pricing.pieceSalePrice.toFixed(2)})`);
      if (pricing.saleStartDate && pricing.saleEndDate) {
        console.log(`Sale Window:     ${pricing.saleStartDate} to ${pricing.saleEndDate}`);
      }
    } else {
      console.log('Sale Status:     No active sale');
    }

    if (pricing.priceCode) {
      const suggestedRetail = getSuggestedRetail(pricing);
      console.log(`Price Code:      ${pricing.priceCode}`);
      console.log(`Suggested Retail: $${suggestedRetail.toFixed(2)}`);
    }

    console.log();
    console.log('Formatted summary:');
    console.log(`  ${formatPricingSummary(pricing)}`);

    sectionsSucceeded++;
  } catch (error) {
    printSectionError('Pricing', error);
  }

  console.log();

  // --- Section 3: Inventory ---
  try {
    console.log('--- Inventory ---');
    const skus = await getStyleInventory(style);

    console.log(`Total SKUs: ${skus.length}`);

    // Show first 5 SKUs with warehouse breakdown
    const sampleSkus = skus.slice(0, 5);
    if (sampleSkus.length > 0) {
      console.log();
      console.log('Sample SKUs (first 5):');
      for (const sku of sampleSkus) {
        const total = getTotalQuantity(sku);
        const stockStatus = isWellStocked(sku)
          ? 'Well Stocked'
          : isInStock(sku)
            ? 'In Stock'
            : 'Out of Stock';
        const warehouseBreakdown = sku.whse
          .filter((w) => w.qty > 0)
          .map((w) => `${w.whseName}: ${w.qty}`)
          .join(', ');
        console.log(`  ${sku.color} / ${sku.size}: ${total} total (${stockStatus})`);
        if (warehouseBreakdown) {
          console.log(`    Warehouses: ${warehouseBreakdown}`);
        }
      }
    }

    // Summary stats
    const inStockCount = skus.filter((s) => isInStock(s)).length;
    const outOfStockCount = skus.length - inStockCount;
    const wellStockedCount = skus.filter((s) => isWellStocked(s)).length;
    console.log();
    console.log(`In Stock:     ${inStockCount}`);
    console.log(`Out of Stock: ${outOfStockCount}`);
    console.log(`Well Stocked: ${wellStockedCount}`);

    // Formatted summary (first 10 rows)
    const summarySkus = skus.slice(0, 10);
    if (summarySkus.length > 0) {
      console.log();
      console.log('Formatted inventory (first 10):');
      console.log(formatInventorySummary(summarySkus));
    }

    sectionsSucceeded++;
  } catch (error) {
    printSectionError('Inventory', error);
  }

  console.log();

  // --- Section 4: Media Content ---
  try {
    console.log('--- Media Content ---');
    const images = await getProductImages(style);

    console.log(`Total images: ${images.length}`);

    // Count by classType
    if (images.length > 0) {
      const typeCounts = new Map<string, number>();
      for (const img of images) {
        const typeName = img.classType.classTypeName;
        typeCounts.set(typeName, (typeCounts.get(typeName) ?? 0) + 1);
      }

      console.log();
      console.log('By type:');
      for (const [typeName, count] of typeCounts.entries()) {
        console.log(`  ${typeName}: ${count}`);
      }

      // First 3 image URLs
      const sampleImages = images.slice(0, 3);
      console.log();
      console.log('Sample URLs:');
      for (const img of sampleImages) {
        console.log(`  [${img.classType.classTypeName}] ${img.url}`);
      }
    }

    sectionsSucceeded++;
  } catch (error) {
    printSectionError('Media Content', error);
  }

  console.log();

  // --- Section 5: Client Debug Info ---
  try {
    console.log('--- Client Debug Info ---');
    const client = await getProductInfoClient();
    const description = describeClient(client);

    // Extract service/port/method names from description
    const services = Object.keys(description as Record<string, unknown>);
    console.log(`Services: ${services.join(', ')}`);

    for (const serviceName of services) {
      const service = (description as Record<string, unknown>)[serviceName] as Record<string, unknown>;
      const ports = Object.keys(service);
      for (const portName of ports) {
        const port = service[portName] as Record<string, unknown>;
        const methods = Object.keys(port);
        console.log(`  ${serviceName}.${portName}: ${methods.length} methods`);
        console.log(`    Methods: ${methods.join(', ')}`);
      }
    }

    sectionsSucceeded++;
  } catch (error) {
    printSectionError('Client Debug Info', error);
  }

  // --- Summary ---
  console.log();
  console.log(SEPARATOR);
  console.log(`Demo complete. ${sectionsSucceeded}/${totalSections} sections succeeded.`);
  console.log(SEPARATOR);
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Print a section error with SanMarError details if available.
 */
function printSectionError(sectionName: string, error: unknown): void {
  console.log(`[ERROR] ${sectionName} section failed:`);

  if (error instanceof SanMarError) {
    console.log(`  Type: ${error.type}`);
    console.log(`  Message: ${error.message}`);
    if (error.suggestion) {
      console.log(`  Suggestion: ${error.suggestion}`);
    }
  } else if (error instanceof Error) {
    console.log(`  ${error.message}`);
  } else {
    console.log(`  ${String(error)}`);
  }
}

// =============================================================================
// Run
// =============================================================================

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
