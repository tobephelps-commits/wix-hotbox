/**
 * Pricing Rules Engine
 *
 * Calculates retail prices from wholesale cost using configurable markup
 * percentages and size-based upcharges. This module is pure business logic
 * with no external API dependencies -- it can be used by the mapper, preview
 * server, and any future UI without importing SanMar services.
 *
 * Functions:
 * 1. calculateRetailPrice  - wholesale + markup% -> retail price
 * 2. calculateVariantPrice - retail + size upcharge -> final variant price
 * 3. calculateMargin       - retail vs wholesale -> profit dollars and percent
 * 4. getPricingPreset      - get named preset by key (fallback to 'custom')
 * 5. getPresetConfig       - get just the PricingConfig from a preset
 *
 * Phase 7: Pricing & Variant Logic
 */

// =============================================================================
// Types
// =============================================================================

/** Configuration for calculating retail prices from wholesale cost */
export interface PricingConfig {
  /** Base markup percentage applied to wholesale cost (e.g., 100 = double the wholesale price) */
  markupPercent: number;
  /** Price rounding rule */
  rounding: 'none' | 'nearest-99' | 'nearest-dollar';
  /** Size-specific price adjustments. Key is size label (e.g., "2XL"), value is dollar amount to add */
  sizeUpcharges: Record<string, number>;
}

// =============================================================================
// Size Constants
// =============================================================================

/** Standard apparel size tiers for upcharge logic */
export const STANDARD_SIZES = ['XS', 'S', 'M', 'L', 'XL'] as const;
export const UPCHARGE_SIZES = ['2XL', '3XL', '4XL', '5XL', '6XL'] as const;

/** Default upcharge amounts for extended sizes (common apparel industry pattern) */
export const DEFAULT_SIZE_UPCHARGES: Record<string, number> = {
  '2XL': 2.00,
  '3XL': 3.00,
  '4XL': 4.00,
  '5XL': 5.00,
  '6XL': 6.00,
};

// =============================================================================
// Calculation Functions
// =============================================================================

/**
 * Calculate retail price from wholesale cost with markup and rounding.
 *
 * Formula: wholesaleCost * (1 + markupPercent / 100)
 *
 * Rounding modes:
 * - 'nearest-99': rounds to X.99 (e.g., 24.50 -> 24.99)
 * - 'nearest-dollar': rounds to nearest whole dollar (e.g., 24.50 -> 25.00)
 * - 'none': rounds to 2 decimal places
 *
 * @param wholesaleCost - The wholesale cost per unit
 * @param markupPercent - Markup percentage (e.g., 100 means double the cost)
 * @param rounding - Price rounding rule
 * @returns The calculated retail price
 */
export function calculateRetailPrice(
  wholesaleCost: number,
  markupPercent: number,
  rounding: PricingConfig['rounding'],
): number {
  const rawPrice = wholesaleCost * (1 + markupPercent / 100);

  switch (rounding) {
    case 'nearest-99':
      return Math.floor(rawPrice) + 0.99;
    case 'nearest-dollar':
      return Math.round(rawPrice);
    case 'none':
      return Math.round(rawPrice * 100) / 100;
  }
}

/**
 * Calculate the final price for a specific variant (color + size).
 *
 * Applies base markup first, then adds a flat dollar size upcharge if the
 * size has one configured. The upcharge is applied AFTER rounding -- it's
 * a flat add-on, not a percentage.
 *
 * @param wholesaleCost - The wholesale cost per unit
 * @param size - The size label (e.g., "M", "2XL")
 * @param config - Full pricing configuration with markup, rounding, and upcharges
 * @returns The final retail price for this variant
 */
export function calculateVariantPrice(
  wholesaleCost: number,
  size: string,
  config: PricingConfig,
): number {
  const baseRetail = calculateRetailPrice(wholesaleCost, config.markupPercent, config.rounding);
  const upcharge = config.sizeUpcharges[size] ?? 0;
  return Math.round((baseRetail + upcharge) * 100) / 100;
}

/**
 * Calculate profit margin in dollars and as a percentage of retail price.
 *
 * Used for UI display so the owner can see their margin on each product.
 *
 * @param retailPrice - The retail selling price
 * @param wholesaleCost - The wholesale cost
 * @returns Object with profit in dollars and as a percentage of retail
 */
export function calculateMargin(
  retailPrice: number,
  wholesaleCost: number,
): { dollars: number; percent: number } {
  const dollars = Math.round((retailPrice - wholesaleCost) * 100) / 100;
  const percent = retailPrice > 0
    ? Math.round(((retailPrice - wholesaleCost) / retailPrice) * 10000) / 100
    : 0;
  return { dollars, percent };
}

// =============================================================================
// Pricing Presets
// =============================================================================

/** Named pricing presets for common product categories */
export interface PricingPreset {
  /** Preset display name */
  name: string;
  /** Description of when to use this preset */
  description: string;
  /** The pricing configuration */
  config: PricingConfig;
}

/** Built-in pricing presets */
export const PRICING_PRESETS: Record<string, PricingPreset> = {
  'standard-tee': {
    name: 'Standard T-Shirt',
    description: 'Basic tees (PC61, 3001C, etc.) - 100% markup',
    config: {
      markupPercent: 100,
      rounding: 'nearest-99',
      sizeUpcharges: { ...DEFAULT_SIZE_UPCHARGES },
    },
  },
  'premium-tee': {
    name: 'Premium T-Shirt',
    description: 'Tri-blend, fashion fit tees - 120% markup',
    config: {
      markupPercent: 120,
      rounding: 'nearest-99',
      sizeUpcharges: { ...DEFAULT_SIZE_UPCHARGES },
    },
  },
  'hoodie-fleece': {
    name: 'Hoodie / Fleece',
    description: 'Hoodies, crewnecks, fleece - 80% markup',
    config: {
      markupPercent: 80,
      rounding: 'nearest-99',
      sizeUpcharges: {
        '2XL': 3.00,
        '3XL': 4.00,
        '4XL': 5.00,
        '5XL': 6.00,
        '6XL': 7.00,
      },
    },
  },
  'polo-woven': {
    name: 'Polo / Woven',
    description: 'Polos, button-downs, woven shirts - 90% markup',
    config: {
      markupPercent: 90,
      rounding: 'nearest-99',
      sizeUpcharges: { ...DEFAULT_SIZE_UPCHARGES },
    },
  },
  'outerwear': {
    name: 'Outerwear / Jacket',
    description: 'Jackets, vests, rain gear - 70% markup',
    config: {
      markupPercent: 70,
      rounding: 'nearest-99',
      sizeUpcharges: {
        '2XL': 4.00,
        '3XL': 5.00,
        '4XL': 6.00,
        '5XL': 8.00,
        '6XL': 10.00,
      },
    },
  },
  'headwear': {
    name: 'Headwear',
    description: 'Caps, beanies, visors - 100% markup, no size upcharges',
    config: {
      markupPercent: 100,
      rounding: 'nearest-99',
      sizeUpcharges: {},
    },
  },
  'custom': {
    name: 'Custom',
    description: 'Manual markup and upcharges',
    config: {
      markupPercent: 100,
      rounding: 'nearest-99',
      sizeUpcharges: { ...DEFAULT_SIZE_UPCHARGES },
    },
  },
};

// =============================================================================
// Preset Helpers
// =============================================================================

/**
 * Get a pricing preset by key, falling back to 'custom' if not found.
 *
 * @param key - Preset key (e.g., 'standard-tee', 'hoodie-fleece')
 * @returns The matching PricingPreset, or the 'custom' preset if key not found
 */
export function getPricingPreset(key: string): PricingPreset {
  return PRICING_PRESETS[key] ?? PRICING_PRESETS['custom'];
}

/**
 * Get just the config from a preset.
 *
 * Convenience wrapper for getPricingPreset(key).config.
 *
 * @param key - Preset key (e.g., 'standard-tee', 'hoodie-fleece')
 * @returns The PricingConfig from the matching preset
 */
export function getPresetConfig(key: string): PricingConfig {
  return getPricingPreset(key).config;
}
