/**
 * SanMar Services - Barrel Export
 *
 * Single import point for all SanMar service modules.
 *
 * Usage:
 *   import {
 *     getStylePricing,
 *     getStyleInventory,
 *     getProductByStyle,
 *     getProductImages,
 *   } from '../services/index.js';
 *
 * Note: Product and media services are added by plan 05-03.
 * Pricing and inventory services are added by plan 05-04.
 * Both plans execute in the same wave and may complete in any order.
 */

export * from './pricing.js';
export * from './inventory.js';
