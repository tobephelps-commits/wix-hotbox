/**
 * Pipeline Types - WIX V1 Product Schema & Pipeline Intermediates
 *
 * TypeScript interfaces for:
 * 1. WIX Catalog V1 API request/response shapes (Create Product, Add Media, Update Variants)
 * 2. Pipeline intermediate types for the preview -> curate -> create workflow
 *
 * All field mappings follow the WIX V1 product API specification.
 * Products are ALWAYS created as invisible drafts (draft-first workflow per PROJECT.md).
 *
 * Phase 6: Product Creation Pipeline
 * Phase 7: Pricing & Variant Logic updates (per-variant pricing via PricingConfig)
 */

// Import PricingConfig for use in CuratedProduct and ProductTemplate, and re-export for other pipeline modules
import type { PricingConfig } from './pricing-rules.js';
export type { PricingConfig } from './pricing-rules.js';

// =============================================================================
// Template Types
// =============================================================================

/**
 * A saved product template for reusable configurations.
 *
 * Templates store pricing presets, color/size selections, and collection
 * assignments so the owner doesn't re-enter the same settings for every
 * product in the same category. All fields except name and timestamps
 * are optional -- a template can specify just pricing, just collections,
 * or any combination. When applied, template values serve as defaults
 * that CLI flags can still override.
 *
 * Phase 13: Template Presets & Pipeline Speed
 */
export interface ProductTemplate {
  /** Template display name (e.g., "BigBarn Tee") */
  name: string;
  /** Optional description */
  description?: string;
  /** Key into PRICING_PRESETS (e.g., "standard-tee") */
  pricingPreset?: string;
  /** Custom pricing override (takes precedence over pricingPreset) */
  pricingConfig?: PricingConfig;
  /** Default sizes to select (e.g., ["S", "M", "L", "XL", "2XL"]) */
  selectedSizes?: string[];
  /** "all" = all available, or specific catalog colors */
  colorFilter?: 'all' | string[];
  /** Default collection names */
  collections?: string[];
  /** ISO timestamp of creation */
  createdAt: string;
  /** ISO timestamp of last update */
  updatedAt: string;
}

// =============================================================================
// WIX V1 Product Creation Types
// =============================================================================

/**
 * Request body for POST /v1/products (WIX Create Product).
 *
 * Products are ALWAYS created as invisible (draft-first workflow).
 * manageVariants is ALWAYS true -- we need per-variant pricing and inventory.
 * The `visible: false` and `manageVariants: true` literals enforce this at
 * the type level to prevent accidental publishing.
 */
export interface WixCreateProductRequest {
  product: {
    /** Product display name. Max 80 chars. Format: "{brandName} {productTitle}" */
    name: string;
    /** Always "physical" for apparel */
    productType: 'physical';
    /** Always false -- draft-first workflow per PROJECT.md decision */
    visible: false;
    /** Product description from SanMar productDescription */
    description: string;
    /** Brand name from SanMar brandName */
    brand: string;
    /** Product weight in lbs from SanMar pieceWeight (first variant) */
    weight: number;
    /** Always true -- we need per-variant pricing */
    manageVariants: true;
    /** Base price (minimum variant price, used as product listing price) */
    priceData: {
      price: number;
    };
    /** Wholesale cost from SanMar effective price */
    costAndProfitData: {
      itemCost: number;
    };
    /** Product options: Color and Size */
    productOptions: WixProductOption[];
    /** Additional info sections (empty array for Phase 6 -- size guides added in Phase 4) */
    additionalInfoSections: WixInfoSection[];
  };
}

/**
 * A product option (Color or Size) for WIX product creation.
 *
 * WIX V1 uses optionType to determine display rendering:
 * - "color" renders as color swatches in the storefront
 * - "drop_down" renders as a dropdown selector
 */
export interface WixProductOption {
  /** Option name: "Color" or "Size" */
  name: string;
  /** Display type: "color" for Color option, "drop_down" for Size option */
  optionType?: 'color' | 'drop_down';
  /** Available choices for this option */
  choices: WixChoice[];
}

/**
 * A single choice within a product option.
 */
export interface WixChoice {
  /** Display value: color name or size label */
  value: string;
  /** Description: same as value for simplicity */
  description: string;
}

/**
 * An additional info section on a WIX product page.
 * Used for size guides, care instructions, etc.
 */
export interface WixInfoSection {
  /** Section title (e.g., "Size Guide", "Care Instructions") */
  title: string;
  /** Rich text content */
  description: string;
}

// =============================================================================
// WIX V1 Media Types
// =============================================================================

/**
 * A media item for POST /v1/products/{id}/media (Add Product Media).
 *
 * WIX V1 accepts external image URLs directly -- no upload required.
 * Each image can optionally be assigned to a specific option choice (e.g., a color).
 */
export interface WixMediaItem {
  /** External image URL (SanMar CDN URL) */
  url: string;
  /** Optional: assign this image to a specific option choice */
  choice?: {
    /** Option name, e.g., "Color" */
    option: string;
    /** Choice value, e.g., "Black" (display color name, NOT catalog color) */
    choice: string;
  };
}

// =============================================================================
// WIX V1 Variant Types
// =============================================================================

/**
 * A variant update for PATCH /v1/products/{id}/variants.
 *
 * After product creation with manageVariants: true, WIX auto-generates
 * variant combinations from product options. We then update each variant
 * with pricing, SKU, weight, and visibility.
 */
export interface WixVariantUpdate {
  /** Option choices that identify this variant, e.g., { "Color": "Black", "Size": "M" } */
  choices: Record<string, string>;
  /** Retail price for this variant */
  price: number;
  /** Wholesale cost for this variant */
  cost: number;
  /** Variant weight in lbs (from SanMar pieceWeight) */
  weight: number;
  /** SKU identifier: "{style}-{catalogColor}-{size}" format */
  sku: string;
  /** true if this color+size combo has inventory, false if out of stock */
  visible: boolean;
}

// =============================================================================
// Pipeline Intermediate Types - Curation
// =============================================================================

/**
 * A curated product ready for WIX creation.
 *
 * This is the output of the curation step -- the owner has reviewed
 * the ProductPreview, selected which colors and sizes to offer,
 * and set the retail price.
 */
export interface CuratedProduct {
  /** SanMar style number (e.g., "PC61", "K420") */
  style: string;
  /** Brand name from SanMar (e.g., "Port & Company") */
  brandName: string;
  /** Product title from SanMar (e.g., "Essential Tee") */
  productTitle: string;
  /** Product description from SanMar productDescription */
  description: string;
  /** Owner-selected colors to offer */
  selectedColors: CuratedColor[];
  /** Owner-selected sizes to offer */
  selectedSizes: string[];
  /** Pricing configuration for calculating per-variant retail prices */
  pricingConfig: PricingConfig;
  /** SanMar effective wholesale cost */
  wholesaleCost: number;
  /** Target WIX collection names or IDs for this product (optional) */
  collections?: string[];
}

/**
 * A color selection for a curated product.
 *
 * Maintains both the catalog color (for SanMar API queries)
 * and the display color (for WIX customer-facing display).
 * ALWAYS use displayColor in WIX-facing data -- WIX shows these to customers.
 * Use catalogColor ONLY for SanMar API queries.
 */
export interface CuratedColor {
  /** SanMar mainframe/catalog color (for API queries, e.g., "Ath. Maroon") */
  catalogColor: string;
  /** Human-readable display color name (for WIX display, e.g., "Athletic Maroon") */
  displayColor: string;
}

// =============================================================================
// Pipeline Intermediate Types - Preview
// =============================================================================

/**
 * A product preview shown before curation.
 *
 * Contains all available options from SanMar so the owner can
 * see everything and pick what to offer. Each color is shown as
 * a card with swatch image, front product image, and stock status.
 */
export interface ProductPreview {
  /** SanMar style number */
  style: string;
  /** Brand name */
  brandName: string;
  /** Product title */
  productTitle: string;
  /** Product description */
  description: string;
  /** All available colors with visual info and stock status */
  availableColors: ColorPreview[];
  /** All available sizes in SanMar sort order */
  availableSizes: string[];
  /** Pricing information for curation decisions */
  pricing: PricingPreview;
}

/**
 * A color option in the product preview.
 *
 * Shows the color with swatch image, front product image,
 * and stock status so the owner can make informed selections.
 */
export interface ColorPreview {
  /** SanMar mainframe/catalog color (for API queries) */
  catalogColor: string;
  /** Human-readable display color name */
  displayColor: string;
  /** Color swatch image URL, or null if unavailable */
  swatchUrl: string | null;
  /** Front product image URL, or null if unavailable */
  frontImageUrl: string | null;
  /** true if any size for this color is in stock */
  inStock: boolean;
  /** true if inventory data was unavailable (distinct from out-of-stock) */
  stockUnknown?: boolean;
}

/**
 * Pricing information in the product preview.
 *
 * Shows wholesale cost and suggested retail so the owner
 * can set an appropriate retail price during curation.
 */
export interface PricingPreview {
  /** SanMar effective wholesale price (sale price if active, otherwise piece price) */
  wholesalePrice: number;
  /** SanMar suggested retail price (calculated from pricing code markup) */
  suggestedRetail: number;
  /** Whether a SanMar sale is currently active for this style */
  saleActive: boolean;
}

// =============================================================================
// Logo Overlay Types
// =============================================================================

/**
 * Logo placement position as proportional coordinates (0.0-1.0).
 *
 * Phase 14: Logo Overlay Engine
 */
export interface LogoPosition {
  /** Horizontal center point (0.0 = left edge, 0.5 = center, 1.0 = right edge) */
  x: number;
  /** Vertical center point (0.0 = top, 0.5 = center, 1.0 = bottom) */
  y: number;
}

/**
 * Logo overlay configuration for a single product.
 *
 * Phase 14: Logo Overlay Engine
 */
export interface LogoOverlayConfig {
  /** Logo name (key in logos.json registry) */
  logoName: string;
  /** Position on the product image (proportional coordinates) */
  position: LogoPosition;
  /** Logo size as proportion of product image width (0.0-1.0, default 0.25) */
  scale?: number;
  /** Opacity (0.0-1.0, default 0.88) */
  opacity?: number;
  /** Blend mode for screen-print effect (default "multiply") */
  blendMode?: string;
}

/**
 * Logo entry in the logo registry (data/logos.json).
 *
 * Phase 14: Logo Overlay Engine
 */
export interface LogoRegistryEntry {
  /** Display name (e.g., "Big Barn Crossfit") */
  displayName: string;
  /** Path to PNG file relative to project root (e.g., "media/logos/bigbarn.png") */
  filePath: string;
  /** Default scale when applied (0.0-1.0) */
  defaultScale: number;
  /** Default blend mode */
  defaultBlendMode: string;
  /** Default opacity */
  defaultOpacity: number;
}

/**
 * Logo registry file structure (data/logos.json).
 *
 * Phase 14: Logo Overlay Engine
 */
export interface LogoRegistry {
  logos: Record<string, LogoRegistryEntry>;
  /** Named position presets for quick placement */
  positionPresets: Record<string, LogoPosition>;
}
