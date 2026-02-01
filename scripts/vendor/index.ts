/**
 * Vendor Abstraction Layer
 *
 * Public API for the multi-vendor system. Re-exports all unified types,
 * the VendorAdapter interface, and registry functions.
 *
 * Usage:
 *   import { VendorAdapter, UnifiedProduct, getVendor, parseVendorFlag } from '../vendor/index.js';
 *
 * Phase 17: S&S Activewear API Integration
 */

export * from './types.js';
export * from './registry.js';
