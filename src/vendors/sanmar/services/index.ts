/**
 * SanMar Services - Barrel Export
 *
 * Single import point for all SanMar service modules.
 *
 * Usage:
 *   import {
 *     getProductByStyle,
 *     getStylePricing,
 *     getStyleInventory,
 *     getProductImages,
 *   } from '../services/index.js';
 */

export * from './product.js';
export * from './media.js';
export * from './pricing.js';
export * from './inventory.js';
