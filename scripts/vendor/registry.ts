/**
 * Vendor Adapter Interface & Registry
 *
 * Defines the VendorAdapter contract that both SanMar and S&S Activewear
 * adapters must implement, plus a module-level registry for looking up
 * adapters by vendor ID.
 *
 * Phase 17: S&S Activewear API Integration
 */

import type {
  VendorId,
  UnifiedProduct,
  UnifiedPricing,
  UnifiedInventory,
  UnifiedMedia,
  UnifiedProductData,
} from './types.js';

// =============================================================================
// Vendor Adapter Interface
// =============================================================================

/**
 * Contract for vendor-specific API adapters.
 *
 * Each vendor (SanMar, S&S Activewear) implements this interface,
 * mapping their native API responses to unified types. The pipeline,
 * monitor, and sync systems consume only this interface -- they never
 * call vendor APIs directly.
 */
export interface VendorAdapter {
  /** Unique vendor identifier */
  readonly vendorId: VendorId;
  /** Human-readable vendor name (e.g., "SanMar", "S&S Activewear") */
  readonly vendorName: string;

  /**
   * Fetch all product SKUs for a given style.
   * Returns one UnifiedProduct per color+size combination.
   */
  getProductsByStyle(style: string): Promise<UnifiedProduct[]>;

  /**
   * Fetch pricing for all SKUs of a given style.
   * Returns one UnifiedPricing per color+size combination.
   */
  getStylePricing(style: string): Promise<UnifiedPricing[]>;

  /**
   * Fetch per-SKU inventory with warehouse breakdown for a given style.
   * Returns one UnifiedInventory per color+size combination.
   */
  getStyleInventory(style: string): Promise<UnifiedInventory[]>;

  /**
   * Fetch product images for all colors of a given style.
   * Returns one UnifiedMedia per color.
   */
  getProductImages(style: string): Promise<UnifiedMedia[]>;

  /**
   * Convenience method: fetch all product data in parallel.
   *
   * Calls getProductsByStyle, getStylePricing, getStyleInventory, and
   * getProductImages concurrently and returns the aggregated result.
   * Mirrors the existing fetchProductData pattern in the SanMar pipeline.
   */
  fetchAllProductData(style: string): Promise<UnifiedProductData>;

  /**
   * Validate that the vendor's API credentials are configured and working.
   * Returns true if credentials are valid, false otherwise.
   * Should NOT throw on invalid credentials -- just return false.
   */
  validateCredentials(): Promise<boolean>;
}

// =============================================================================
// Vendor Registry
// =============================================================================

/** Module-level adapter storage */
const adapters = new Map<VendorId, VendorAdapter>();

/**
 * Register a vendor adapter.
 * Overwrites any previously registered adapter for the same vendorId.
 */
export function registerVendor(adapter: VendorAdapter): void {
  adapters.set(adapter.vendorId, adapter);
}

/**
 * Get a registered vendor adapter by ID.
 * @throws Error if no adapter is registered for the given ID.
 */
export function getVendor(id: VendorId): VendorAdapter {
  const adapter = adapters.get(id);
  if (!adapter) {
    throw new Error(
      `Unknown vendor: "${id}". Registered vendors: [${listVendors().join(', ')}]`
    );
  }
  return adapter;
}

/**
 * Get the default vendor adapter (SanMar).
 * Provides backward compatibility -- existing code that doesn't specify
 * a vendor gets SanMar automatically.
 * @throws Error if SanMar adapter is not registered.
 */
export function getDefaultVendor(): VendorAdapter {
  return getVendor('sanmar');
}

/**
 * List all registered vendor IDs.
 * Returns an empty array if no vendors are registered.
 */
export function listVendors(): VendorId[] {
  return Array.from(adapters.keys());
}

/**
 * Check whether a vendor adapter is registered without throwing.
 */
export function isVendorRegistered(id: VendorId): boolean {
  return adapters.has(id);
}

// =============================================================================
// CLI Flag Parsing
// =============================================================================

/** Accepted string values that map to 'ss' vendor ID */
const SS_ALIASES = ['ss', 'ss-activewear', 's&s'] as const;

/**
 * Parse a CLI --vendor flag value into a VendorId.
 *
 * Accepts:
 * - 'sanmar' -> 'sanmar'
 * - 'ss', 'ss-activewear', 's&s' -> 'ss'
 * - undefined/empty -> 'sanmar' (default, backward compatible)
 *
 * @throws Error on unrecognized vendor flag values.
 */
export function parseVendorFlag(flag: string | undefined): VendorId {
  if (!flag || flag.trim() === '') {
    return 'sanmar';
  }

  const normalized = flag.trim().toLowerCase();

  if (normalized === 'sanmar') {
    return 'sanmar';
  }

  if ((SS_ALIASES as readonly string[]).includes(normalized)) {
    return 'ss';
  }

  throw new Error(
    `Unrecognized vendor: "${flag}". Valid values: sanmar, ss, ss-activewear, s&s`
  );
}
