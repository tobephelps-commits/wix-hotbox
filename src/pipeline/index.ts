/**
 * Pipeline Module - Barrel Export
 *
 * Re-exports all pipeline business logic for convenient importing:
 * - Pricing rules and presets
 * - WIX V1 type definitions
 * - Product mapper (vendor-agnostic)
 * - WIX REST API client
 * - Template system
 *
 * v2.0 architecture: src/pipeline/
 * Phase 47: Product Pipeline Creation UI
 */

// Pricing rules
export {
  calculateRetailPrice,
  calculateVariantPrice,
  calculateMargin,
  calculateTotalCost,
  calculateFullMargin,
  getPricingPreset,
  getPresetConfig,
  PRICING_PRESETS,
  STANDARD_SIZES,
  UPCHARGE_SIZES,
  DEFAULT_SIZE_UPCHARGES,
} from './pricing-rules.js';
export type { PricingConfig, PricingPreset } from './pricing-rules.js';

// Pipeline types
export type {
  ProductTemplate,
  WixCreateProductRequest,
  WixProductOption,
  WixChoice,
  WixInfoSection,
  WixMediaItem,
  WixVariantUpdate,
  CuratedProduct,
  CuratedColor,
  ProductPreview,
  ColorPreview,
  PricingPreview,
  LogoPosition,
  LogoOverlayConfig,
  AngleOverlayConfig,
  LogoRegistryEntry,
  LogoRegistry,
  ProductCostRecord,
  CostHistoryEntry,
  CostHistoryFile,
  SaleConfig,
  ActiveSalesFile,
  WixCouponScope,
  WixCouponCreate,
  WixCoupon,
  WixInventoryVariant,
  WixInventoryUpdate,
  BatchItem,
  BatchCreateRequest,
  BatchItemProgress,
  BatchProgress,
} from './types.js';

// Mapper functions
export {
  buildProductPreview,
  buildCreateProductPayload,
  buildMediaPayload,
  buildVariantUpdates,
  buildInventoryUpdate,
} from './mapper.js';

// WIX API client
export {
  setWixConfig,
  createProduct,
  addProductMedia,
  updateProductVariants,
  updateProduct,
  updateProductPrice,
  getProduct,
  addProductToCollection,
  queryProducts,
  listAllProducts,
  listCollections,
  getCollectionByName,
  getInventory,
  updateInventory,
} from './wix-api.js';
export type {
  WixProductPageUrl,
  WixVariantStock,
  WixVariantPriceData,
  WixVariantData,
  WixVariant,
  WixProduct,
  WixCollection,
  WixInventoryItemVariant,
  WixInventoryItem,
} from './wix-api.js';

// Template system
export {
  setTemplatesDir,
  loadTemplates,
  saveTemplate,
  getTemplate,
  deleteTemplate,
  listTemplates,
} from './templates.js';

// Fetch product orchestrator
export { fetchProductPreview } from './fetch-product.js';
export type { ProductFetchResult } from './fetch-product.js';

// Create product orchestrator
export { createWixProduct } from './create-product.js';
export type { CreationResult } from './create-product.js';
