/**
 * S&S Activewear Vendor Adapter
 *
 * Implements VendorAdapter for S&S Activewear, mapping the flat S&S
 * SSProduct objects into unified types (UnifiedProduct, UnifiedPricing,
 * UnifiedInventory, UnifiedMedia).
 *
 * Key difference from SanMar: S&S /v2/products/?style=X returns FLAT
 * objects where each SSProduct contains product info, pricing, images,
 * AND inventory inline. One API call returns everything; the adapter
 * decomposes that single response into four unified type arrays.
 *
 * Usage:
 *   import { ssAdapter } from './scripts/ss-activewear/adapter.js';
 *   const data = await ssAdapter.fetchAllProductData('2000');
 *
 * CLI:
 *   npx tsx scripts/ss-activewear/adapter.ts [STYLE]
 *
 * Phase 17: S&S Activewear API Integration
 */

import type { VendorAdapter } from '../vendor/registry.js';
import type {
  UnifiedProduct,
  UnifiedPricing,
  UnifiedInventory,
  UnifiedMedia,
  UnifiedProductData,
} from '../vendor/types.js';
import type { SSProduct } from './types/index.js';
import { registerVendor } from '../vendor/registry.js';
import { getSSProductsByStyle, resolveSSImageUrl } from './services/product.js';
import { getSSStyleInfo } from './services/styles.js';
import { validateSSCredentials } from './auth.js';
import { SS_WAREHOUSES } from './constants.js';

// =============================================================================
// Private Mapping Functions
// =============================================================================

/**
 * Map an S&S flat product object to a UnifiedProduct.
 *
 * S&S products don't have a separate title field on the products endpoint;
 * we compose it from brandName + styleName.
 */
function mapSSProduct(ss: SSProduct): UnifiedProduct {
  return {
    vendor: 'ss',
    brandName: ss.brandName,
    style: ss.styleName,
    productTitle: `${ss.brandName} ${ss.styleName}`,
    description: '',
    color: ss.colorName,
    colorCode: ss.colorCode,
    size: ss.sizeName,
    sizeOrder: ss.sizeOrder,
    category: '',
    pieceWeight: ss.unitWeight,
    status: 'Active',
    caseQty: ss.caseQty,
  };
}

/**
 * Map an S&S flat product object to a UnifiedPricing.
 *
 * S&S sale expiration is MM/DD/YYYY; we convert to ISO YYYY-MM-DD.
 */
function mapSSPricing(ss: SSProduct): UnifiedPricing {
  return {
    vendor: 'ss',
    piecePrice: ss.piecePrice,
    casePrice: ss.casePrice,
    salePrice: ss.salePrice > 0 ? ss.salePrice : null,
    saleExpiration: parseSaleExpiration(ss.saleExpiration),
    customerPrice: ss.customerPrice,
    mapPrice: ss.mapPrice,
  };
}

/**
 * Parse S&S sale expiration from MM/DD/YYYY to ISO YYYY-MM-DD.
 * Returns null if empty, falsy, or unparseable.
 */
function parseSaleExpiration(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === '') return null;

  // Match MM/DD/YYYY pattern
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  const [, month, day, year] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/**
 * Map an S&S flat product object to a UnifiedInventory.
 *
 * S&S products include qty (total) and warehouses[] inline.
 * Warehouse abbreviations are mapped to display names from SS_WAREHOUSES.
 */
function mapSSInventory(ss: SSProduct): UnifiedInventory {
  return {
    vendor: 'ss',
    style: ss.styleName,
    color: ss.colorName,
    size: ss.sizeName,
    totalQty: ss.qty,
    warehouses: ss.warehouses.map((w) => ({
      id: w.warehouseAbbr,
      name: SS_WAREHOUSES[w.warehouseAbbr]?.name ?? w.warehouseAbbr,
      qty: w.qty,
    })),
  };
}

/**
 * Map an S&S flat product object to a UnifiedMedia.
 *
 * All image paths are resolved to absolute URLs with full-size (_fl) suffix,
 * except swatch images which use medium (_fm) for appropriate thumbnail size.
 */
function mapSSMedia(ss: SSProduct): UnifiedMedia {
  return {
    vendor: 'ss',
    color: ss.colorName,
    frontImage: resolveSSImageUrl(ss.colorFrontImage),
    backImage: resolveSSImageUrl(ss.colorBackImage),
    sideImage: resolveSSImageUrl(ss.colorSideImage),
    swatchImage: resolveSSImageUrl(ss.colorSwatchImage, 'fm'),
    onModelFront: resolveSSImageUrl(ss.colorOnModelFrontImage),
    onModelBack: resolveSSImageUrl(ss.colorOnModelBackImage),
    onModelSide: resolveSSImageUrl(ss.colorOnModelSideImage),
  };
}

/**
 * Deduplicate media entries by color.
 *
 * S&S returns one SSProduct per SKU (color+size), so the same color images
 * repeat for each size. We keep only the first occurrence per unique color
 * to produce one UnifiedMedia per color.
 */
function deduplicateMediaByColor(media: UnifiedMedia[]): UnifiedMedia[] {
  const seen = new Set<string>();
  const unique: UnifiedMedia[] = [];

  for (const m of media) {
    if (!seen.has(m.color)) {
      seen.add(m.color);
      unique.push(m);
    }
  }

  return unique;
}

// =============================================================================
// SSAdapter Class
// =============================================================================

/**
 * S&S Activewear adapter implementing VendorAdapter.
 *
 * Wraps S&S REST API service functions and maps flat SSProduct responses
 * into unified types consumable by the pipeline, monitor, and sync systems.
 */
class SSAdapter implements VendorAdapter {
  readonly vendorId = 'ss' as const;
  readonly vendorName = 'S&S Activewear';

  /**
   * Fetch all product SKUs for a given S&S style.
   * Returns one UnifiedProduct per color+size combination.
   */
  async getProductsByStyle(style: string): Promise<UnifiedProduct[]> {
    const products = await getSSProductsByStyle(style);
    return products.map(mapSSProduct);
  }

  /**
   * Fetch pricing for all SKUs of a given S&S style.
   * Returns one UnifiedPricing per color+size combination.
   */
  async getStylePricing(style: string): Promise<UnifiedPricing[]> {
    const products = await getSSProductsByStyle(style);
    return products.map(mapSSPricing);
  }

  /**
   * Fetch per-SKU inventory with warehouse breakdown for a given S&S style.
   *
   * Uses the full products endpoint rather than the lighter /v2/inventory/
   * endpoint because inventory items don't include color/size names --
   * only sku/gtin. The products endpoint provides color/size context
   * alongside inventory data in a single call.
   */
  async getStyleInventory(style: string): Promise<UnifiedInventory[]> {
    const products = await getSSProductsByStyle(style);
    return products.map(mapSSInventory);
  }

  /**
   * Fetch product images for all colors of a given S&S style.
   * Returns one UnifiedMedia per unique color (deduplicated from per-SKU data).
   */
  async getProductImages(style: string): Promise<UnifiedMedia[]> {
    const products = await getSSProductsByStyle(style);
    const allMedia = products.map(mapSSMedia);
    return deduplicateMediaByColor(allMedia);
  }

  /**
   * Fetch all product data for a style in one shot.
   *
   * S&S is fundamentally different from SanMar: ONE API call to
   * /v2/products/?style=X returns everything (product info, pricing,
   * images, inventory). We optionally call /v2/styles/ for enriched
   * title and description. This is MORE efficient than SanMar
   * (1-2 API calls vs 4).
   */
  async fetchAllProductData(style: string): Promise<UnifiedProductData> {
    // Single call gets all product data (flat SSProduct objects)
    const ssProducts = await getSSProductsByStyle(style);

    // Optionally enrich with style metadata (title, description, category)
    let enrichedTitle = '';
    let enrichedDescription = '';
    let enrichedCategory = '';

    try {
      const styleInfo = await getSSStyleInfo(style);
      if (styleInfo.length > 0) {
        enrichedTitle = styleInfo[0].title || '';
        enrichedDescription = styleInfo[0].description || '';
        enrichedCategory = styleInfo[0].baseCategory || '';
      }
    } catch {
      // Style info is optional enrichment; continue without it
    }

    // Decompose flat data into four unified type arrays
    const products = ssProducts.map((ss) => {
      const product = mapSSProduct(ss);
      if (enrichedTitle) product.productTitle = enrichedTitle;
      if (enrichedDescription) product.description = enrichedDescription;
      if (enrichedCategory) product.category = enrichedCategory;
      return product;
    });

    const pricing = ssProducts.map(mapSSPricing);
    const inventory = ssProducts.map(mapSSInventory);
    const media = deduplicateMediaByColor(ssProducts.map(mapSSMedia));

    return {
      vendor: 'ss',
      style,
      products,
      pricing,
      inventory,
      media,
    };
  }

  /**
   * Validate that S&S API credentials are configured and working.
   * Returns true if credentials are valid, false otherwise.
   */
  async validateCredentials(): Promise<boolean> {
    return validateSSCredentials();
  }
}

// =============================================================================
// Auto-Registration
// =============================================================================

export const ssAdapter = new SSAdapter();
registerVendor(ssAdapter);

// =============================================================================
// CLI Runner
// =============================================================================

/**
 * CLI entry point: show unified type summary for an S&S style.
 * Usage: npx tsx scripts/ss-activewear/adapter.ts [STYLE]
 */
async function main() {
  const style = process.argv[2];
  if (!style) {
    console.log('Usage: npx tsx scripts/ss-activewear/adapter.ts [STYLE]');
    console.log('Example: npx tsx scripts/ss-activewear/adapter.ts 2000');
    process.exit(1);
  }

  console.log(`\nFetching S&S Activewear data for style: ${style}`);
  console.log('='.repeat(60));

  try {
    // Validate credentials first
    console.log('\nValidating credentials...');
    const valid = await ssAdapter.validateCredentials();
    if (!valid) {
      console.error('ERROR: S&S credentials invalid. Check SS_ACCOUNT_NUMBER and SS_API_KEY in .env');
      process.exit(1);
    }
    console.log('Credentials valid.');

    // Fetch all data
    console.log('\nFetching all product data...');
    const data = await ssAdapter.fetchAllProductData(style);

    // Display summary
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Style: ${data.style} (via ${ssAdapter.vendorName})`);
    console.log(`${'='.repeat(60)}`);

    // Products summary
    console.log(`\nProducts: ${data.products.length} SKUs`);
    if (data.products.length > 0) {
      const first = data.products[0];
      console.log(`  Brand: ${first.brandName}`);
      console.log(`  Title: ${first.productTitle}`);
      console.log(`  Category: ${first.category || '(none)'}`);
      const uniqueColors = new Set(data.products.map((p) => p.color));
      const uniqueSizes = new Set(data.products.map((p) => p.size));
      console.log(`  Colors: ${uniqueColors.size} unique`);
      console.log(`  Sizes: ${uniqueSizes.size} unique`);
    }

    // Pricing summary
    console.log(`\nPricing: ${data.pricing.length} entries`);
    if (data.pricing.length > 0) {
      const prices = data.pricing.map((p) => p.piecePrice);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      console.log(`  Piece price range: $${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`);
      const onSale = data.pricing.filter((p) => p.salePrice !== null);
      if (onSale.length > 0) {
        console.log(`  On sale: ${onSale.length} SKUs`);
      }
    }

    // Inventory summary
    console.log(`\nInventory: ${data.inventory.length} SKUs`);
    if (data.inventory.length > 0) {
      const totalQty = data.inventory.reduce((sum, inv) => sum + inv.totalQty, 0);
      console.log(`  Total quantity: ${totalQty.toLocaleString()}`);
      const warehouseSet = new Set<string>();
      for (const inv of data.inventory) {
        for (const w of inv.warehouses) {
          if (w.qty > 0) warehouseSet.add(w.name);
        }
      }
      console.log(`  Active warehouses: ${warehouseSet.size}`);
    }

    // Media summary
    console.log(`\nMedia: ${data.media.length} color entries`);
    if (data.media.length > 0) {
      const withFront = data.media.filter((m) => m.frontImage).length;
      const withModel = data.media.filter((m) => m.onModelFront).length;
      console.log(`  With front image: ${withFront}`);
      console.log(`  With on-model: ${withModel}`);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('Done.');
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run CLI if executed directly
const isDirectRun = process.argv[1]?.replace(/\\/g, '/').includes('ss-activewear/adapter');
if (isDirectRun) {
  main();
}
