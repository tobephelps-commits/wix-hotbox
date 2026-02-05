/**
 * Enable Inventory Tracking for Existing WIX Products
 *
 * Products created before Phase 31 (or outside the pipeline) don't have
 * WIX Inventory tracking enabled. This script:
 *   1. Finds a WIX product by style number (searches by name)
 *   2. Fetches vendor inventory for that style
 *   3. Enables trackQuantity=true on the WIX product
 *   4. Sets correct per-variant inventory quantities
 *
 * Usage:
 *   npx tsx scripts/pipeline/enable-inventory.ts <STYLE> [--vendor sanmar|ss]
 *
 * Examples:
 *   npx tsx scripts/pipeline/enable-inventory.ts SXU005
 *   npx tsx scripts/pipeline/enable-inventory.ts PC61 --vendor sanmar
 *   npx tsx scripts/pipeline/enable-inventory.ts 2000 --vendor ss
 *
 * Phase 31: Stock Visibility
 */

import 'dotenv/config';
import { fileURLToPath } from 'url';
import path from 'path';

import { queryProducts, getProduct, getInventory, updateInventory } from './wix-api.js';
import type { WixProduct, WixInventoryItem } from './wix-api.js';
import type { WixInventoryVariant } from './types.js';
import { fetchProductData } from './fetch-product.js';
import type { VendorId } from '../vendor/types.js';
import { getTotalQuantity } from '../sanmar/index.js';

// Register vendor adapters
import '../sanmar/adapter.js';
import '../ss-activewear/adapter.js';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Parse SKU to extract color and size.
 * SKU format: {style}-{color}-{size}
 */
function parseSku(sku: string, style: string): { color: string; size: string } | null {
  const prefix = `${style}-`;
  if (!sku.toUpperCase().startsWith(prefix.toUpperCase())) {
    return null;
  }

  const remainder = sku.slice(prefix.length);
  const lastDash = remainder.lastIndexOf('-');
  if (lastDash === -1 || lastDash === 0) {
    return null;
  }

  return {
    color: remainder.slice(0, lastDash),
    size: remainder.slice(lastDash + 1),
  };
}

/**
 * Find a WIX product by searching for style number or product name.
 * Supports partial matches and common product name patterns.
 */
async function findProductByStyle(style: string): Promise<WixProduct | null> {
  console.log(`[Enable Inventory] Searching for products matching "${style}"...`);

  // Query all products (WIX V1 filter is limited)
  const products = await queryProducts();

  // Try multiple search strategies:
  // 1. Exact style match in name
  // 2. Partial style match (first few chars)
  // 3. Product title match

  const styleUpper = style.toUpperCase();

  // Strategy 1: Exact match
  let matches = products.filter(p =>
    p.name.toUpperCase().includes(styleUpper)
  );

  // Strategy 2: If no exact match, try partial (for truncated names)
  if (matches.length === 0 && style.length > 3) {
    const partialStyle = styleUpper.substring(0, 5);
    matches = products.filter(p =>
      p.name.toUpperCase().includes(partialStyle)
    );
    if (matches.length > 0) {
      console.log(`[Enable Inventory] No exact match, trying partial "${partialStyle}"...`);
    }
  }

  // Strategy 3: Search by common product keywords
  if (matches.length === 0) {
    // Try known brand patterns
    const keywords = ['Cultivator', 'Nora', 'Stanley', 'Stella'];
    for (const kw of keywords) {
      if (styleUpper.includes(kw.toUpperCase()) || kw.toUpperCase().includes(styleUpper.substring(0, 3))) {
        matches = products.filter(p => p.name.toUpperCase().includes(kw.toUpperCase()));
        if (matches.length > 0) {
          console.log(`[Enable Inventory] Trying keyword search "${kw}"...`);
          break;
        }
      }
    }
  }

  if (matches.length === 0) {
    console.log(`[Enable Inventory] No products found matching "${style}"`);
    console.log(`\nAvailable products with 'SX' or 'Stanley' in name:`);
    for (const p of products) {
      if (p.name.toUpperCase().includes('SX') || p.name.toUpperCase().includes('STANLEY')) {
        console.log(`  - ${p.name}`);
        console.log(`    ID: ${p.id}`);
      }
    }
    return null;
  }

  if (matches.length > 1) {
    console.log(`[Enable Inventory] Found ${matches.length} products:`);
    for (const p of matches) {
      console.log(`  - ${p.name} (ID: ${p.id})`);
    }
    console.log(`[Enable Inventory] Using first match: ${matches[0].name}`);
  }

  return matches[0];
}

/**
 * Diagnose and display inventory tracking status for a product.
 */
async function diagnoseInventory(productId: string): Promise<WixInventoryItem | null> {
  try {
    const inventory = await getInventory(productId);

    console.log('\n[Inventory Status]');
    console.log(`  Product ID: ${inventory.productId}`);
    console.log(`  Track Quantity: ${inventory.trackQuantity}`);
    console.log(`  Variants: ${inventory.variants.length}`);

    if (inventory.variants.length > 0) {
      console.log('\n  Variant Inventory:');
      for (const v of inventory.variants.slice(0, 10)) {
        console.log(`    - ${v.variantId}: inStock=${v.inStock}, qty=${v.quantity}`);
      }
      if (inventory.variants.length > 10) {
        console.log(`    ... and ${inventory.variants.length - 10} more`);
      }
    }

    return inventory;
  } catch (err) {
    console.error(`[Enable Inventory] Could not fetch inventory: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

/**
 * Enable inventory tracking and set quantities from vendor data.
 *
 * Supports two matching strategies:
 * 1. SKU-based: Parse SKU format {style}-{color}-{size}
 * 2. Choice-based: Match by WIX variant choices (Color/Size options)
 *
 * Falls back to choice-based matching if SKUs are missing or don't match.
 */
async function enableInventoryTracking(
  product: WixProduct,
  style: string,
  vendor: VendorId,
): Promise<void> {
  console.log(`\n[Enable Inventory] Fetching vendor inventory for ${style} from ${vendor}...`);

  // Fetch current vendor inventory
  const productData = await fetchProductData(style, vendor);
  const inventory = productData.inventory;

  if (inventory.length === 0) {
    console.warn(`[Enable Inventory] No inventory data from ${vendor} for ${style}`);
  }

  // Build inventory maps for both matching strategies:
  // Map 1: "color|size" -> quantity (using catalog color)
  // Map 2: "displayColor|size" -> quantity (using display color for WIX choice matching)
  const inventoryByCatalogColor = new Map<string, number>();
  const inventoryByDisplayColor = new Map<string, number>();

  for (const sku of inventory) {
    const catalogKey = `${sku.color.toLowerCase()}|${sku.size}`;
    inventoryByCatalogColor.set(catalogKey, getTotalQuantity(sku));
  }

  // Also build a map using display colors from the preview
  for (const colorPreview of productData.preview.availableColors) {
    const catalogColor = colorPreview.catalogColor.toLowerCase();
    const displayColor = colorPreview.displayColor.toLowerCase();

    for (const sku of inventory) {
      if (sku.color.toLowerCase() === catalogColor) {
        const displayKey = `${displayColor}|${sku.size}`;
        inventoryByDisplayColor.set(displayKey, getTotalQuantity(sku));
      }
    }
  }

  console.log(`[Enable Inventory] Found ${inventory.length} SKUs from vendor`);

  // Build variant updates from WIX product variants
  const variantUpdates: WixInventoryVariant[] = [];
  let inStockCount = 0;
  let outOfStockCount = 0;
  let skuMatchCount = 0;
  let choiceMatchCount = 0;
  let noMatchCount = 0;

  if (!product.variants || product.variants.length === 0) {
    console.error(`[Enable Inventory] Product has no variants!`);
    return;
  }

  for (const variant of product.variants) {
    let color: string | null = null;
    let size: string | null = null;
    let matchMethod = 'none';

    // Strategy 1: Try SKU-based matching
    const parsed = parseSku(variant.variant.sku, style);
    if (parsed) {
      color = parsed.color;
      size = parsed.size;
      matchMethod = 'sku';
      skuMatchCount++;
    }

    // Strategy 2: Fall back to choice-based matching
    if (!color || !size) {
      const choices = variant.choices;
      if (choices) {
        // WIX variant choices are keyed by option name (e.g., "Color", "Size")
        const colorChoice = choices['Color'] || choices['color'];
        const sizeChoice = choices['Size'] || choices['size'];

        if (colorChoice && sizeChoice) {
          color = colorChoice;
          size = sizeChoice;
          matchMethod = 'choice';
          choiceMatchCount++;
        }
      }
    }

    if (!color || !size) {
      noMatchCount++;
      continue;
    }

    // Look up quantity (try catalog color first, then display color)
    const catalogKey = `${color.toLowerCase()}|${size}`;
    let qty = inventoryByCatalogColor.get(catalogKey);

    if (qty === undefined) {
      // Try display color match (case-insensitive)
      const displayKey = `${color.toLowerCase()}|${size}`;
      qty = inventoryByDisplayColor.get(displayKey);
    }

    qty = qty ?? 0;
    const inStock = qty > 0;

    variantUpdates.push({
      variantId: variant.id,
      inStock,
      quantity: qty,
    });

    if (inStock) {
      inStockCount++;
    } else {
      outOfStockCount++;
    }
  }

  console.log(`\n[Enable Inventory] Matching results:`);
  console.log(`  SKU matches: ${skuMatchCount}`);
  console.log(`  Choice matches: ${choiceMatchCount}`);
  console.log(`  No match: ${noMatchCount}`);

  console.log(`\n[Enable Inventory] Preparing update:`);
  console.log(`  Total variants: ${variantUpdates.length}`);
  console.log(`  In stock: ${inStockCount}`);
  console.log(`  Out of stock: ${outOfStockCount}`);

  if (variantUpdates.length === 0) {
    console.error(`[Enable Inventory] No variants to update!`);
    console.error(`\nThe product's variants could not be matched to vendor inventory.`);
    console.error(`This usually means the product was created manually in WIX and doesn't have:`);
    console.error(`  - SKUs in the format: ${style}-{COLOR}-{SIZE}`);
    console.error(`  - Color/Size choices that match the vendor catalog`);
    console.error(`\nTo fix this, you can:`);
    console.error(`  1. Re-create the product through the pipeline (recommended)`);
    console.error(`  2. Manually configure inventory in WIX Dashboard > Store Products > Inventory`);
    return;
  }

  // Update inventory with trackQuantity=true
  console.log(`\n[Enable Inventory] Enabling inventory tracking...`);
  await updateInventory(product.id, {
    trackQuantity: true,
    variants: variantUpdates,
  });

  console.log(`\n[Enable Inventory] SUCCESS!`);
  console.log(`  Inventory tracking enabled for ${product.name}`);
  console.log(`  ${outOfStockCount} variants will now show "Out of Stock"`);
  console.log(`  ${inStockCount} variants will show available`);
}

// =============================================================================
// CLI Runner
// =============================================================================

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const args = process.argv.slice(2);

  // Parse arguments
  let style: string | null = null;
  let vendor: VendorId = 'sanmar';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--vendor' && i + 1 < args.length) {
      const v = args[i + 1].toLowerCase();
      if (v === 'ss') vendor = 'ss';
      i++;
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log('Usage: npx tsx scripts/pipeline/enable-inventory.ts <STYLE> [--vendor sanmar|ss]');
      console.log('');
      console.log('Enable inventory tracking for an existing WIX product.');
      console.log('This is needed for products created before Phase 31 or outside the pipeline.');
      console.log('');
      console.log('Examples:');
      console.log('  npx tsx scripts/pipeline/enable-inventory.ts SXU005');
      console.log('  npx tsx scripts/pipeline/enable-inventory.ts PC61 --vendor sanmar');
      console.log('  npx tsx scripts/pipeline/enable-inventory.ts 2000 --vendor ss');
      process.exit(0);
    } else if (!args[i].startsWith('--')) {
      style = args[i];
    }
  }

  // Parse --product-id flag for direct product ID lookup
  const productIdArgIdx = args.indexOf('--product-id');
  const productIdArg = productIdArgIdx !== -1 ? args[productIdArgIdx + 1] : null;

  if (!style && !productIdArg) {
    console.error('Error: Style number or --product-id is required');
    console.error('Usage: npx tsx scripts/pipeline/enable-inventory.ts <STYLE> [--vendor sanmar|ss]');
    console.error('       npx tsx scripts/pipeline/enable-inventory.ts --product-id <WIX_ID> <STYLE> --vendor sanmar|ss');
    process.exit(1);
  }

  const vendorName = vendor === 'ss' ? 'S&S Activewear' : 'SanMar';
  console.log(`\n=== Enable Inventory Tracking ===`);
  console.log(`Style: ${style}`);
  console.log(`Vendor: ${vendorName}`);
  if (productIdArg) {
    console.log(`Product ID: ${productIdArg}`);
  }

  try {
    // Step 1: Find the WIX product (by ID or search)
    let product: WixProduct | null;
    if (productIdArg) {
      console.log(`[Enable Inventory] Using provided product ID: ${productIdArg}`);
      product = await getProduct(productIdArg);
    } else {
      product = await findProductByStyle(style!);
    }

    if (!product) {
      console.error(`\nProduct not found. Make sure the style "${style}" is in a WIX product name.`);
      console.error(`Or use --product-id <WIX_PRODUCT_ID> to specify the product directly.`);
      process.exit(1);
    }

    console.log(`\nFound: ${product.name} (ID: ${product.id})`);

    // Step 2: Get full product with variants
    const fullProduct = await getProduct(product.id);
    console.log(`Variants: ${fullProduct.variants?.length ?? 0}`);

    // Step 3: Diagnose current inventory status
    await diagnoseInventory(product.id);

    // Step 4: Enable inventory tracking
    await enableInventoryTracking(fullProduct, style!.toUpperCase(), vendor);

    // Step 5: Verify the change
    console.log(`\n[Enable Inventory] Verifying...`);
    await diagnoseInventory(product.id);

  } catch (err) {
    console.error(`\nError: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}
