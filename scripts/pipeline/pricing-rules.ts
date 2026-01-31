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
