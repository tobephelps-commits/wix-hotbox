/**
 * WIX Product Creation Orchestrator
 *
 * Takes a CuratedProduct and executes the full WIX V1 creation flow:
 *   1. Create base product (with options/variants structure)
 *   2. Add media images (external URLs from vendor CDN)
 *   3. Update variant pricing/SKU/weight
 *   4. Verify creation (get product, confirm variants)
 *
 * This is the final step of the pipeline:
 *   fetchProductData(style, vendor) -> curate (UI) -> createWixProduct(curated, data)
 *
 * Phase 6: Product Creation Pipeline
 * Phase 7: Per-variant pricing via PricingConfig
 * Phase 17: Vendor-agnostic support (--vendor flag)
 */

import { fileURLToPath } from 'url';
import path from 'path';

import type { CuratedProduct, ProductTemplate, LogoOverlayConfig } from './types.js';
import type { ProductData } from './fetch-product.js';
import { fetchProductData } from './fetch-product.js';
import { parseVendorFlag } from '../vendor/index.js';
import type { VendorId } from '../vendor/types.js';
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
import { calculateRetailPrice, calculateFullMargin, calculateTotalCost, getPresetConfig, PRICING_PRESETS } from './pricing-rules.js';
import { getTemplate, saveTemplate, listTemplates } from './templates.js';
import { recordProductCost } from './cost-tracker.js';
import type { ProductCostRecord } from './types.js';
import {
  loadLogoRegistry,
  getLogoEntry,
  getPositionPreset,
  listLogos,
  listPositionPresets,
  overlayProductImages,
} from './overlay.js';

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

  // --list-logos: print all logos from registry and exit (no style needed)
  if (process.argv.includes('--list-logos')) {
    const registry = loadLogoRegistry();
    const logos = Object.entries(registry.logos);
    console.log('Available logos:');
    if (logos.length === 0) {
      console.log('  (none registered)');
      console.log('  Add logo PNG files to media/logos/ and register them in data/logos.json');
    } else {
      for (const [key, entry] of logos) {
        console.log(`  ${key.padEnd(18)} ${entry.displayName} (scale: ${entry.defaultScale}, blend: ${entry.defaultBlendMode})`);
      }
    }
    process.exit(0);
  }

  // --list-positions: print all position presets and exit (no style needed)
  if (process.argv.includes('--list-positions')) {
    const presets = listPositionPresets();
    console.log('Available position presets:');
    for (const [name, pos] of Object.entries(presets)) {
      console.log(`  ${name.padEnd(18)} x: ${pos.x}, y: ${pos.y}`);
    }
    console.log('');
    console.log('Custom coordinates: Use "x,y" format (e.g., "0.5,0.3")');
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
        const logoInfo = t.logoOverlay
          ? `Logo: ${t.logoOverlay.logoName} at ${t.logoOverlay.position}`
          : 'No logo';
        console.log(`  ${t.name.padEnd(20)} ${presetInfo} | ${sizesInfo} | ${collectionsInfo} | ${logoInfo}`);
      }
    }
    process.exit(0);
  }

  // Parse optional --vendor argument (Phase 17)
  const vendorArgIdx = process.argv.indexOf('--vendor');
  const vendorFlagValue = vendorArgIdx !== -1 ? process.argv[vendorArgIdx + 1] : undefined;
  let vendorId: VendorId | undefined;
  try {
    vendorId = parseVendorFlag(vendorFlagValue);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  // Find style: first positional arg that isn't a flag or flag value
  // Flags that take a value (skip their next arg):
  const flagsWithValues = new Set([
    '--vendor', '--template', '--save-template', '--preset', '--price',
    '--collection', '--logo', '--logo-position', '--logo-scale',
    '--decoration-cost', '--decoration-type',
  ]);
  let style: string | undefined;
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (flagsWithValues.has(arg)) {
      i++; // skip flag value
      continue;
    }
    if (arg.startsWith('--')) continue; // standalone flags
    style = arg;
    break;
  }

  if (!style || style === '--help' || process.argv.includes('--help')) {
    console.error(
      'Usage: npx tsx scripts/pipeline/create-product.ts [--vendor sanmar|ss] <STYLE> [--template "name"] [--save-template "name"] [--preset KEY] [--price N] [--collection "Name" ...] [--logo NAME] [--logo-position PRESET] [--logo-scale N] [--decoration-cost N] [--decoration-type TYPE]',
    );
    console.error('');
    console.error('Options:');
    console.error('  --vendor sanmar|ss     Select vendor (default: sanmar)');
    console.error('  --template "name"      Apply saved template (pricing, sizes, colors, collections, logo)');
    console.error('  --save-template "name" Save current settings as reusable template after creation');
    console.error('  --preset KEY           Select pricing preset (default: standard-tee)');
    console.error('  --price N              Set retail price (overrides preset pricing)');
    console.error('  --collection "Name"    Assign to WIX collection (repeatable)');
    console.error('  --logo NAME            Apply logo overlay from registry (e.g., "bigbarn")');
    console.error('  --logo-position PRESET Position preset or "x,y" coordinates (default: center-chest)');
    console.error('  --logo-scale N         Logo scale as proportion of image width (0.1-0.8)');
    console.error('  --decoration-cost N    Per-unit decoration cost in dollars (default: 0)');
    console.error('  --decoration-type TYPE Decoration method: screen-print, embroidery, heat-transfer, dtg, none (default: none)');
    console.error('  --list-presets         Show available pricing presets');
    console.error('  --list-templates       Show saved product templates');
    console.error('  --list-logos           Show available logos from registry');
    console.error('  --list-positions       Show available position presets');
    console.error('');
    console.error('Precedence (highest to lowest):');
    console.error('  Pricing:    --price > --preset > --template pricing > default (standard-tee)');
    console.error('  Logo:       --logo > --template logoOverlay > none');
    console.error('  Decoration: --decoration-cost > template decorationCost > 0');
    console.error('');
    console.error('Examples:');
    console.error('  npx tsx scripts/pipeline/create-product.ts PC61');
    console.error('  npx tsx scripts/pipeline/create-product.ts --vendor ss 2000');
    console.error('  npx tsx scripts/pipeline/create-product.ts --vendor ss 2000 --template "bigbarn-tee"');
    console.error('  npx tsx scripts/pipeline/create-product.ts PC61 --template "bigbarn-tee"');
    console.error('  npx tsx scripts/pipeline/create-product.ts PC61 --save-template "bigbarn-tee"');
    console.error('  npx tsx scripts/pipeline/create-product.ts PC61 --preset hoodie-fleece');
    console.error('  npx tsx scripts/pipeline/create-product.ts PC61 --price 24.99');
    console.error('  npx tsx scripts/pipeline/create-product.ts PC61 --collection "Big Barn Crossfit" --collection "Clothing"');
    console.error('  npx tsx scripts/pipeline/create-product.ts PC61 --logo bigbarn --logo-position center-chest');
    console.error('  npx tsx scripts/pipeline/create-product.ts PC61 --logo bigbarn --logo-position "0.5,0.3" --logo-scale 0.3');
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

  // Parse optional --logo argument
  const logoArgIdx = process.argv.indexOf('--logo');
  const logoName = logoArgIdx !== -1 ? process.argv[logoArgIdx + 1] : null;

  // Parse optional --logo-position argument
  const logoPosArgIdx = process.argv.indexOf('--logo-position');
  const logoPositionArg = logoPosArgIdx !== -1 ? process.argv[logoPosArgIdx + 1] : null;

  // Parse optional --logo-scale argument
  const logoScaleArgIdx = process.argv.indexOf('--logo-scale');
  const logoScaleArg = logoScaleArgIdx !== -1 ? parseFloat(process.argv[logoScaleArgIdx + 1]) : null;

  // Parse optional --decoration-cost argument
  const decorCostArgIdx = process.argv.indexOf('--decoration-cost');
  const decorCostArg = decorCostArgIdx !== -1 ? parseFloat(process.argv[decorCostArgIdx + 1]) : null;

  // Parse optional --decoration-type argument
  const decorTypeArgIdx = process.argv.indexOf('--decoration-type');
  const decorTypeArg = decorTypeArgIdx !== -1 ? process.argv[decorTypeArgIdx + 1] : null;
  const validDecorTypes = ['screen-print', 'embroidery', 'heat-transfer', 'dtg', 'none'] as const;
  if (decorTypeArg && !validDecorTypes.includes(decorTypeArg as typeof validDecorTypes[number])) {
    console.error(`Error: Invalid decoration type "${decorTypeArg}". Valid types: ${validDecorTypes.join(', ')}`);
    process.exit(1);
  }

  // Validate --logo name against registry if provided
  if (logoName) {
    const registry = loadLogoRegistry();
    if (!registry.logos[logoName]) {
      const available = Object.keys(registry.logos);
      console.error(`Error: Logo "${logoName}" not found in registry.`);
      if (available.length > 0) {
        console.error(`Available logos: ${available.join(', ')}`);
      } else {
        console.error('No logos registered. Add logo PNG files to media/logos/ and register them in data/logos.json');
      }
      process.exit(1);
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
    // Log vendor selection
    const vendorName = vendorId === 'ss' ? 'S&S Activewear' : 'SanMar';
    console.log(`\nVendor: ${vendorName}`);

    const data = await fetchProductData(style, vendorId);

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

    // --- Determine logo overlay config ---
    // Precedence: --logo > template logoOverlay > none
    let logoOverlayConfig: LogoOverlayConfig | null = null;
    let logoSource: string = 'none';

    if (logoName) {
      // CLI --logo flag takes precedence
      const logoEntry = getLogoEntry(logoName);
      const positionName = logoPositionArg ?? 'center-chest';
      const position = getPositionPreset(positionName);
      logoOverlayConfig = {
        logoName,
        position,
        scale: logoScaleArg ?? logoEntry.defaultScale,
        opacity: logoEntry.defaultOpacity,
        blendMode: logoEntry.defaultBlendMode,
      };
      logoSource = `--logo ${logoName} at ${positionName}`;
    } else if (template?.logoOverlay) {
      // Template provides logo overlay defaults
      const tLogo = template.logoOverlay;
      const position = getPositionPreset(tLogo.position);
      const logoEntry = getLogoEntry(tLogo.logoName);
      logoOverlayConfig = {
        logoName: tLogo.logoName,
        position,
        scale: tLogo.scale ?? logoEntry.defaultScale,
        opacity: tLogo.opacity ?? logoEntry.defaultOpacity,
        blendMode: logoEntry.defaultBlendMode,
      };
      logoSource = `template: ${tLogo.logoName} at ${tLogo.position}`;
    }

    // --- Determine decoration cost and type ---
    // Precedence: --decoration-cost > template.decorationCost > 0
    const decorationCost = decorCostArg ?? template?.decorationCost ?? 0;
    const decorationType = (decorTypeArg ?? template?.decorationType ?? 'none') as ProductCostRecord['decorationType'];

    // Print template application summary
    if (template) {
      console.log(`\nApplied template "${template.name}":`);
      console.log(`  Pricing: ${pricingSource}`);
      console.log(`  Sizes: ${selectedSizes.join(', ')} (filtered from ${data.preview.availableSizes.length} available)`);
      console.log(`  Colors: ${selectedColors.length} of ${data.preview.availableColors.length} available`);
      if (allCollections.length > 0) {
        console.log(`  Collections: ${allCollections.join(', ')}`);
      }
      console.log(`  Logo overlay: ${logoOverlayConfig ? `${logoOverlayConfig.logoName} at ${logoSource.split(' at ')[1] || 'center-chest'}` : 'none'}`);
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
      vendor: vendorId,
      ...(allCollections.length > 0 ? { collections: allCollections } : {}),
      ...(decorationCost > 0 ? { decorationCost, decorationType } : {}),
    };

    // --- Apply logo overlay to product images (before WIX creation) ---
    let overlayPaths: string[] = [];
    if (logoOverlayConfig) {
      const mediaPayload = buildMediaPayload(curated, data.imagesByColor);
      const imageUrls = mediaPayload.map((m) => m.url).filter(Boolean);

      if (imageUrls.length > 0) {
        console.log(`\nApplying logo overlay: ${logoOverlayConfig.logoName} at ${logoSource.split(' at ')[1] || 'center-chest'}...`);
        overlayPaths = await overlayProductImages(imageUrls, logoOverlayConfig, 'media/overlays/');
        console.log(`  Logo overlay: Applied ${logoOverlayConfig.logoName} to ${overlayPaths.length} images`);
        console.log(`  Overlaid images saved to media/overlays/`);
        console.log(`  Note: Upload overlaid images to WIX Media Manager to replace SanMar photos`);
      }
    }

    const result = await createWixProduct(curated, data);

    // --- Record cost data after successful creation ---
    const baseRetailPrice = calculateRetailPrice(curated.wholesaleCost, curated.pricingConfig.markupPercent, curated.pricingConfig.rounding);
    const presetName = presetKey ?? template?.pricingPreset ?? 'standard-tee';
    try {
      await recordProductCost({
        style: curated.style,
        productName: `${curated.brandName} ${curated.productTitle}`,
        wixProductId: result.productId,
        wholesaleCost: curated.wholesaleCost,
        decorationCost,
        decorationType,
        retailPrice: baseRetailPrice,
        pricingPreset: presetName,
      });
    } catch (costErr) {
      // Non-fatal: product was created, cost tracking is supplementary
      console.warn(`  Warning: Failed to record cost data: ${costErr instanceof Error ? costErr.message : String(costErr)}`);
    }

    // Calculate margin info for display
    const totalCost = calculateTotalCost(curated.wholesaleCost, decorationCost);
    const fullMargin = calculateFullMargin(baseRetailPrice, curated.wholesaleCost, decorationCost);

    console.log(`\nResult:`);
    console.log(`  Vendor: ${vendorName}`);
    console.log(`  Product ID: ${result.productId}`);
    console.log(`  URL: ${result.productUrl}`);
    console.log(`  Variants: ${result.variantsCreated}`);
    console.log(`  Media: ${result.mediaAdded}`);
    console.log(`  Collections: ${result.collectionsAssigned.length > 0 ? result.collectionsAssigned.join(', ') : '(none)'}`);
    console.log(`  Logo overlay: ${logoOverlayConfig ? `${logoOverlayConfig.logoName} (saved to media/overlays/)` : 'none'}`);
    console.log(`  Margin: $${fullMargin.dollars.toFixed(2)} (${fullMargin.percent.toFixed(1)}%) [wholesale: $${curated.wholesaleCost.toFixed(2)} + decoration: $${decorationCost.toFixed(2)} = total cost: $${totalCost.toFixed(2)}]`);
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
        ...(logoOverlayConfig ? {
          logoOverlay: {
            logoName: logoOverlayConfig.logoName,
            position: logoPositionArg ?? template?.logoOverlay?.position ?? 'center-chest',
            scale: logoOverlayConfig.scale,
            opacity: logoOverlayConfig.opacity,
          },
        } : {}),
        ...(decorationCost > 0 ? { decorationCost, decorationType } : {}),
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
