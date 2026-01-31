/**
 * Pipeline Module - Public API
 *
 * Barrel export for the product creation pipeline.
 * Import from this file for all pipeline functionality.
 *
 * Phase 6: Product Creation Pipeline
 */

// Types
export type {
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
} from './types.js';

// Mapper functions
export {
  buildProductPreview,
  buildCreateProductPayload,
  buildMediaPayload,
  buildVariantUpdates,
} from './mapper.js';

// Data fetcher
export { fetchProductData } from './fetch-product.js';
export type { ProductData } from './fetch-product.js';

// WIX product creator
export { createWixProduct } from './create-product.js';
export type { CreationResult } from './create-product.js';

// WIX API service
export {
  createProduct,
  addProductMedia,
  updateProductVariants,
  getProduct,
  addProductToCollection,
  queryProducts,
  listAllProducts,
} from './wix-api.js';

export type {
  WixProduct,
  WixVariant,
  WixVariantData,
  WixVariantPriceData,
  WixVariantStock,
  WixProductPageUrl,
} from './wix-api.js';
