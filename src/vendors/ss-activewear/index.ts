/**
 * S&S Activewear API Client - Public API
 *
 * Main entry point for the S&S Activewear client library.
 * Import from this file for all consumer-facing functionality.
 *
 * Usage:
 *   import {
 *     getSSProductsByStyle,
 *     getSSStyleInventory,
 *     getSSStyleInfo,
 *     validateSSCredentials,
 *   } from './src/vendors/ss-activewear/index.js';
 *
 * NOTE: Internal client functions (ssGet, ssGetWithRetry) are NOT exported.
 * Use the service functions instead.
 */

// =============================================================================
// Services — Product Data
// =============================================================================

export {
  getSSProductsByStyle,
  getSSProductBySku,
  getSSProductsByBrand,
  extractSSUniqueColors,
  extractSSAvailableSizes,
  resolveSSImageUrl,
} from './services/product.js';

// =============================================================================
// Services — Inventory
// =============================================================================

export {
  getSSStyleInventory,
  getSSInventoryBatch,
  getSSTotalQuantity,
  isSSInStock,
} from './services/inventory.js';

// =============================================================================
// Services — Style Metadata
// =============================================================================

export {
  getSSStyleInfo,
  searchSSStyles,
} from './services/styles.js';

// =============================================================================
// Auth — Credential Validation
// =============================================================================

export { validateSSCredentials } from './auth.js';

// =============================================================================
// Types — All Public Interfaces
// =============================================================================

export type {
  // Product types
  SSProduct,
  SSWarehouse,
  // Inventory types
  SSInventoryItem,
  SSInventoryWarehouse,
  // Common types
  SSStyle,
  SSCategory,
  SSBrand,
  SSErrorResponse,
  SSErrorDetail,
} from './types/index.js';

// =============================================================================
// Constants
// =============================================================================

export {
  SS_API_BASE_URL,
  SS_IMAGE_BASE_URL,
  SS_RATE_LIMIT,
  SS_RATE_WINDOW,
  SS_WAREHOUSES,
} from './constants.js';

export type { SSWarehouseInfo } from './constants.js';

// =============================================================================
// Error Handling — For Consumer Error Handling
// =============================================================================

export {
  SSError,
  SSErrorType,
  isSSRetryable,
} from './utils/error-handler.js';
