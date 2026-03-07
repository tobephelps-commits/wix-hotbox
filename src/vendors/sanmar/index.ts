/**
 * SanMar API Client - Public API
 *
 * Main entry point for the SanMar client library.
 * Import from this file for all consumer-facing functionality.
 *
 * Usage:
 *   import {
 *     getProductByStyle,
 *     getStylePricing,
 *     getStyleInventory,
 *     getProductImages,
 *     validateCredentials,
 *   } from './vendors/sanmar/index.js';
 *
 * NOTE: Internal auth builders (getSanMarAuth, getPromoStandardsAuth),
 * raw getClient, raw service functions that take query objects, and
 * retry internals are NOT exported. Use convenience functions instead.
 */

// =============================================================================
// Services -- Product Data
// =============================================================================

export {
  getProductByStyle,
  getProductByStyleAndColor,
  getProductVariant,
  extractUniqueColors,
  extractAvailableSizes,
} from './services/product.js';

// =============================================================================
// Services -- Pricing
// =============================================================================

export {
  getStylePricing,
  getVariantPricing,
  isSaleActive,
  getEffectivePrice,
  getSuggestedRetail,
  formatPricingSummary,
} from './services/pricing.js';

// =============================================================================
// Services -- Inventory
// =============================================================================

export {
  getStyleInventory,
  getInventoryBatch,
  getTotalQuantity,
  isInStock,
  isWellStocked,
  getWarehouseBreakdown,
  formatInventorySummary,
} from './services/inventory.js';

// =============================================================================
// Services -- Media Content
// =============================================================================

export {
  getProductImages,
  getFrontImages,
  getSwatchImages,
  getImagesByColor,
  groupImagesByColor,
} from './services/media.js';

// =============================================================================
// Auth -- Credential Validation
// =============================================================================

export { validateCredentials } from './auth.js';

// =============================================================================
// Client -- Debug / Recovery
// =============================================================================

export { describeClient, clearClientCache } from './client.js';

// =============================================================================
// Types -- All Public Interfaces
// =============================================================================

export type {
  // Auth types
  SanMarAuth,
  PromoStandardsAuth,
  SanMarCredentials,
  // Product types
  ProductBasicInfo,
  ProductImageInfo,
  ProductPriceInfo,
  ProductInfo,
  ProductInfoResponse,
  // Pricing types
  PricingInfo,
  PricingResponse,
  // Inventory types
  WarehouseInventory,
  SkuInventory,
  InventoryResponse,
  PSInventoryLocation,
  PSPartInventory,
  // Media types
  MediaClassType,
  MediaContent,
  MediaContentResponse,
} from './types/index.js';

// =============================================================================
// Constants
// =============================================================================

export {
  WSDL_URLS,
  WAREHOUSES,
  RESTRICTED_BRANDS,
  ACTIVE_PRODUCT_STATUSES,
  PRICING_CODES,
  INVENTORY_CAP,
} from './constants.js';

// =============================================================================
// Error Handling -- For Consumer Error Handling
// =============================================================================

export { SanMarError, SanMarErrorType, isRetryable } from './utils/error-handler.js';
