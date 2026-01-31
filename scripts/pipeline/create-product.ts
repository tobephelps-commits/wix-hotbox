/**
 * WIX Product Creation Orchestrator
 *
 * Takes a CuratedProduct and executes the full WIX V1 creation flow:
 *   1. Create base product (with options/variants structure)
 *   2. Add media images (external URLs from SanMar CDN)
 *   3. Update variant pricing/SKU/weight
 *   4. Verify creation (get product, confirm variants)
 *
 * This is the final step of the pipeline:
 *   fetchProductData(style) -> curate (UI) -> createWixProduct(curated, data)
 *
 * Phase 6: Product Creation Pipeline
 * Phase 7: Per-variant pricing via PricingConfig
 */

import { fileURLToPath } from 'url';
import path from 'path';

import type { CuratedProduct } from './types.js';
import type { ProductData } from './fetch-product.js';
import { fetchProductData } from './fetch-product.js';
import {
  buildCreateProductPayload,
  buildMediaPayload,
  buildVariantUpdates,
} from './mapper.js';
import {
  createProduct,
  addProductMedia,
  updateProductVariants,
  getProduct,
  addProductToCollection,
  getCollectionByName,
} from './wix-api.js';
import { calculateRetailPrice, getPresetConfig, PRICING_PRESETS } from './pricing-rules.js';
import { getTemplate, saveTemplate, listTemplates } from './templates.js';
import type { ProductTemplate } from './types.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Result of a WIX product creation.
 *
 * On full success, warnings is empty. On partial failure (media or variant
 * steps failed but product was created), warnings contains actionable messages.
 */
export interface CreationResult {
  /** WIX product ID */
  productId: string;
  /** WIX product page URL */
  productUrl: string;
  /** Number of color x size variants created */
  variantsCreated: number;
  /** Number of images attached */
  mediaAdded: number;
  /** Always "draft" (visible: false) */
  status: 'draft';
  /** Warnings from partial failures (empty on full success) */
  warnings: string[];
  /** Collections this product was added to (empty if none specified) */
  collectionsAssigned: string[];
}

// =============================================================================
// Main Function
// =============================================================================

/**
 * Create a WIX draft product from a curated selection.
 *
 * Executes the full 4-step V1 flow: create -> media -> variants -> verify.
 * Products are ALWAYS created as invisible drafts.
 *
 * @param curated - The curated product with owner's color/size/price selections
 * @param productData - Aggregated SanMar data from fetchProductData
 * @returns CreationResult with product ID, URL, and counts
 */
export async function createWixProduct(
  curated: CuratedProduct,
  productData: ProductData,
): Promise<CreationResult> {
  console.log(`\nCreating WIX product for ${curated.style}...`);
  const warnings: string[] = [];

  // Step 1: Create base product (REQUIRED -- failure here is fatal)
  const payload = buildCreateProductPayload(curated);
  const product = await createProduct(payload);
  const productId = product.id;
  console.log(
    `  \u2713 Product created: ${curated.brandName} ${curated.productTitle} (ID: ${productId})`,
  );

  // Step 2: Add media images (OPTIONAL -- continue on failure)
  let mediaCount = 0;
  try {
    const mediaPayload = buildMediaPayload(curated, productData.imagesByColor);
    if (mediaPayload.length > 0) {
      await addProductMedia(productId, mediaPayload);
    }
    mediaCount = mediaPayload.length;
    const colorSpecific = mediaPayload.filter((m) => m.choice).length;
    const general = mediaPayload.length - colorSpecific;
    console.log(
      `  \u2713 Media added: ${mediaPayload.length} images (${colorSpecific} color-specific, ${general} general)`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const warning = `Media upload failed for ${productId}: ${msg}. Product created but images need manual upload.`;
    warnings.push(warning);
    console.warn(`  \u2717 ${warning}`);
  }

  // Step 3: Update variant pricing, SKU, weight, visibility (OPTIONAL -- continue on failure)
  let variantCount = curated.selectedColors.length * curated.selectedSizes.length;
  try {
    const variantUpdates = buildVariantUpdates(
      curated,
      productData.products,
      productData.pricing,
      productData.inventory,
    );
    await updateProductVariants(productId, variantUpdates);
    variantCount = variantUpdates.length;
    console.log(
      `  \u2713 Variants updated: ${variantUpdates.length} variants (${curated.selectedColors.length} colors \u00d7 ${curated.selectedSizes.length} sizes)`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const warning = `Variant update failed for ${productId}: ${msg}. Product exists as draft but variants need manual configuration.`;
    warnings.push(warning);
    console.error(`  \u2717 ${warning}`);
  }

  // Step 4: Verify creation (OPTIONAL -- product was already created)
  let productUrl = `https://hotboxclothing.shop/product-page/${productId}`;
  try {
    const verified = await getProduct(productId);
    variantCount = verified.variants?.length ?? variantCount;
    const basePrice = calculateRetailPrice(curated.wholesaleCost, curated.pricingConfig.markupPercent, curated.pricingConfig.rounding);
    console.log(
      `  \u2713 Verified: ${variantCount} variants, base price $${basePrice.toFixed(2)} (${curated.pricingConfig.markupPercent}% markup)`,
    );
    productUrl = verified.productPageUrl
      ? `${verified.productPageUrl.base}${verified.productPageUrl.path}`
      : productUrl;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const warning = `Verification failed for ${productId}: ${msg}. Product was created but could not confirm final state.`;
    warnings.push(warning);
    console.warn(`  \u2717 ${warning}`);
  }

  // Step 5: Assign to collections (OPTIONAL -- continue on failure per collection)
  const collectionsAssigned: string[] = [];
  if (curated.collections && curated.collections.length > 0) {
    for (const collectionRef of curated.collections) {
      try {
        // Determine if it's a UUID or a name to resolve
        const isUuid = /^[0-9a-f]{8}-[0-9a-f-]+$/i.test(collectionRef) && collectionRef.length >= 36;
        let collectionId: string;
        let collectionName: string;

        if (isUuid) {
          collectionId = collectionRef;
          collectionName = collectionRef; // UUID used as display name
        } else {
          const collection = await getCollectionByName(collectionRef);
          collectionId = collection.id;
          collectionName = collection.name;
        }

        await addProductToCollection(productId, collectionId);
        collectionsAssigned.push(collectionName);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const warning = `Collection assignment failed for "${collectionRef}": ${msg}. Product created but needs manual collection assignment.`;
        warnings.push(warning);
        console.warn(`  \u2717 ${warning}`);
      }
    }
    if (collectionsAssigned.length > 0) {
      console.log(
        `  \u2713 Collections: added to ${collectionsAssigned.length} collections (${collectionsAssigned.join(', ')})`,
      );
    }
  }

  console.log(`\nDraft product ready for review:`);
  console.log(`  ${productUrl}`);

  return {
    productId,
    productUrl,
    variantsCreated: variantCount,
    mediaAdded: mediaCount,
    status: 'draft',
    warnings,
    collectionsAssigned,
  };
}

// =============================================================================
// CLI Runner
// =============================================================================

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  // --list-presets: print all pricing presets and exit (no style needed)
  if (process.argv.includes('--list-presets')) {
    console.log('Available pricing presets:');
    for (const [key, preset] of Object.entries(PRICING_PRESETS)) {
      console.log(`  ${key.padEnd(18)} ${preset.name} (${preset.config.markupPercent}% markup) - ${preset.description}`);
    }
    process.exit(0);
  }

  // --list-templates: print all saved product templates and exit (no style needed)
  if (process.argv.includes('--list-templates')) {
    const templates = await listTemplates();
    if (templates.length === 0) {
      console.log('Saved templates:');
      console.log('  (none saved)');
    } else {
      console.log('Saved templates:');
      for (const t of templates) {
        const presetInfo = t.pricingPreset
          ? `Preset: ${t.pricingPreset}`
          : t.pricingConfig
          ? `Custom: ${t.pricingConfig.markupPercent}%`
          : 'No pricing';
        const sizesInfo = t.selectedSizes
          ? `Sizes: ${t.selectedSizes.join(',')}`
          : 'All sizes';
        const collectionsInfo = t.collections && t.collections.length > 0
          ? `Collections: ${t.collections.join(', ')}`
          : 'No collections';
        console.log(`  ${t.name.padEnd(20)} ${presetInfo} | ${sizesInfo} | ${collectionsInfo}`);
      }
    }
    process.exit(0);
  }

  const style = process.argv[2];
  if (!style || style === '--help') {
    console.error(
      'Usage: npx tsx scripts/pipeline/create-product.ts <STYLE> [--template "name"] [--save-template "name"] [--preset KEY] [--price N] [--collection "Name" ...]',
    );
    console.error('');
    console.error('Options:');
    console.error('  --template "name"      Apply saved template (pricing, sizes, colors, collections)');
    console.error('  --save-template "name" Save current settings as reusable template after creation');
    console.error('  --preset KEY           Select pricing preset (default: standard-tee)');
    console.error('  --price N              Set retail price (overrides preset pricing)');
    console.error('  --collection "Name"    Assign to WIX collection (repeatable)');
    console.error('  --list-presets         Show available pricing presets');
    console.error('  --list-templates       Show saved product templates');
    console.error('');
    console.error('Precedence (highest to lowest):');
    console.error('  --price > --preset > --template pricing > default (standard-tee)');
    console.error('');
    console.error('Examples:');
    console.error('  npx tsx scripts/pipeline/create-product.ts PC61');
    console.error('  npx tsx scripts/pipeline/create-product.ts PC61 --template "bigbarn-tee"');
    console.error('  npx tsx scripts/pipeline/create-product.ts PC61 --save-template "bigbarn-tee"');
    console.error('  npx tsx scripts/pipeline/create-product.ts PC61 --preset hoodie-fleece');
    console.error('  npx tsx scripts/pipeline/create-product.ts PC61 --price 24.99');
    console.error('  npx tsx scripts/pipeline/create-product.ts PC61 --collection "Big Barn Crossfit" --collection "Clothing"');
    if (!style) process.exit(1);
    process.exit(0);
  }

  // Parse optional --template argument
  const templateArgIdx = process.argv.indexOf('--template');
  const templateName =
    templateArgIdx !== -1 ? process.argv[templateArgIdx + 1] : null;

  // Parse optional --save-template argument
  const saveTemplateArgIdx = process.argv.indexOf('--save-template');
  const saveTemplateName =
    saveTemplateArgIdx !== -1 ? process.argv[saveTemplateArgIdx + 1] : null;

  // Parse optional --preset argument
  const presetArgIdx = process.argv.indexOf('--preset');
  const presetKey =
    presetArgIdx !== -1 ? process.argv[presetArgIdx + 1] : null;

  // Parse optional --price argument
  const priceArgIdx = process.argv.indexOf('--price');
  const price =
    priceArgIdx !== -1 ? parseFloat(process.argv[priceArgIdx + 1]) : null;

  // Parse optional --collection arguments (repeatable)
  const collections: string[] = [];
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === '--collection' && i + 1 < process.argv.length) {
      collections.push(process.argv[i + 1]);
      i++; // skip the value
    }
  }

  // Load template if specified
  let template: ProductTemplate | null = null;
  if (templateName) {
    template = await getTemplate(templateName);
    if (!template) {
      const available = await listTemplates();
      console.error(`Error: Template "${templateName}" not found.`);
      if (available.length > 0) {
        console.error(`Available templates: ${available.map((t) => t.name).join(', ')}`);
      } else {
        console.error('No templates saved yet. Use --save-template to create one.');
      }
      process.exit(1);
    }
  }

  try {
    const data = await fetchProductData(style);

    // --- Determine pricing config ---
    // Precedence: --price > --preset > --template > default (standard-tee)
    let pricingConfig;
    let pricingSource: string;
    if (price != null) {
      pricingConfig = { markupPercent: ((price / data.preview.pricing.wholesalePrice) - 1) * 100, rounding: 'none' as const, sizeUpcharges: {} };
      pricingSource = `--price $${price}`;
    } else if (presetKey) {
      pricingConfig = getPresetConfig(presetKey);
      pricingSource = `--preset ${presetKey}`;
    } else if (template?.pricingConfig) {
      pricingConfig = template.pricingConfig;
      pricingSource = `template custom (${template.pricingConfig.markupPercent}% markup)`;
    } else if (template?.pricingPreset) {
      pricingConfig = getPresetConfig(template.pricingPreset);
      pricingSource = `template preset: ${template.pricingPreset}`;
    } else {
      pricingConfig = getPresetConfig('standard-tee');
      pricingSource = 'default (standard-tee)';
    }

    // --- Determine sizes ---
    let selectedSizes = data.preview.availableSizes;
    if (template?.selectedSizes && template.selectedSizes.length > 0) {
      selectedSizes = data.preview.availableSizes.filter((s) =>
        template!.selectedSizes!.includes(s),
      );
    }

    // --- Determine colors ---
    let selectedColors = data.preview.availableColors.map((c) => ({
      catalogColor: c.catalogColor,
      displayColor: c.displayColor,
    }));
    if (template?.colorFilter && template.colorFilter !== 'all' && Array.isArray(template.colorFilter)) {
      selectedColors = selectedColors.filter((c) =>
        (template!.colorFilter as string[]).includes(c.catalogColor),
      );
    }

    // --- Determine collections ---
    // Template collections serve as defaults; CLI --collection flags ADD to them
    const templateCollections = template?.collections ?? [];
    const allCollections = [...new Set([...templateCollections, ...collections])];

    // Print template application summary
    if (template) {
      console.log(`\nApplied template "${template.name}":`);
      console.log(`  Pricing: ${pricingSource}`);
      console.log(`  Sizes: ${selectedSizes.join(', ')} (filtered from ${data.preview.availableSizes.length} available)`);
      console.log(`  Colors: ${selectedColors.length} of ${data.preview.availableColors.length} available`);
      if (allCollections.length > 0) {
        console.log(`  Collections: ${allCollections.join(', ')}`);
      }
    }

    // Auto-curate: select colors and sizes (filtered by template if applicable)
    const curated: CuratedProduct = {
      style: data.style,
      brandName: data.preview.brandName,
      productTitle: data.preview.productTitle,
      description: data.preview.description,
      selectedColors,
      selectedSizes,
      pricingConfig,
      wholesaleCost: data.preview.pricing.wholesalePrice,
      ...(allCollections.length > 0 ? { collections: allCollections } : {}),
    };

    const result = await createWixProduct(curated, data);
    console.log(`\nResult:`);
    console.log(`  Product ID: ${result.productId}`);
    console.log(`  URL: ${result.productUrl}`);
    console.log(`  Variants: ${result.variantsCreated}`);
    console.log(`  Media: ${result.mediaAdded}`);
    console.log(`  Collections: ${result.collectionsAssigned.length > 0 ? result.collectionsAssigned.join(', ') : '(none)'}`);
    console.log(`  Status: ${result.status}`);

    if (result.warnings.length > 0) {
      console.log(`\nWarnings (${result.warnings.length}):`);
      for (const warning of result.warnings) {
        console.warn(`  ! ${warning}`);
      }
    }

    // Save template if --save-template was specified
    if (saveTemplateName) {
      const newTemplate: ProductTemplate = {
        name: saveTemplateName,
        description: `Auto-saved from ${curated.style} product creation`,
        pricingConfig: curated.pricingConfig,
        selectedSizes: curated.selectedSizes,
        colorFilter: 'all', // Save as "all" since we used all available (or template-filtered) colors
        ...(curated.collections && curated.collections.length > 0
          ? { collections: curated.collections }
          : {}),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveTemplate(newTemplate);
      console.log(`\nTemplate "${saveTemplateName}" saved. Use --template "${saveTemplateName}" for future products.`);
    }
  } catch (err) {
    console.error(
      'Error:',
      err instanceof Error ? err.message : String(err),
    );
    process.exit(1);
  }
}
