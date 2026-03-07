/**
 * Vendor Abstraction Layer
 *
 * Public API for the multi-vendor system. Re-exports all unified types,
 * the VendorAdapter interface, and registry functions.
 *
 * Usage:
 *   import { VendorAdapter, UnifiedProduct, getVendor, parseVendorFlag } from '../vendors/index.js';
 *
 * v2.0 architecture: ported from scripts/vendor/ to src/vendors/
 */

export * from './types.js';
export * from './registry.js';
