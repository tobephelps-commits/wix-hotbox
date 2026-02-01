/**
 * S&S Activewear Types — Barrel Export
 *
 * Re-exports all S&S API types from a single entry point.
 */

export type {
  SSProduct,
  SSWarehouse,
} from './product.js';

export type {
  SSInventoryItem,
  SSInventoryWarehouse,
} from './inventory.js';

export type {
  SSStyle,
  SSCategory,
  SSBrand,
  SSErrorResponse,
  SSErrorDetail,
} from './common.js';
