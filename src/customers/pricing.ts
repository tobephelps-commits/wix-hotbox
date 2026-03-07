/**
 * Customer-Aware Pricing Calculations
 *
 * Pure-function pricing module that calculates customer-specific retail
 * prices using the customer's markup percentage and royalty rate.
 *
 * All money calculations round to 2 decimal places using
 * Math.round(value * 100) / 100 at each step to prevent floating-point drift.
 *
 * Phase 53: Customer & Royalty System (v2.0 port)
 */

import type { CustomerPricingSummary } from './types.js';

// =============================================================================
// Helper
// =============================================================================

/** Round a number to 2 decimal places (money precision). */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// =============================================================================
// Calculation Functions
// =============================================================================

/**
 * Calculate customer retail price from wholesale cost with markup and rounding.
 *
 * Formula: wholesaleCost * (1 + customerMarkupPercent / 100)
 *
 * Rounding modes:
 * - 'nearest-99': rounds to X.99 (e.g., 14.00 -> 13.99)
 * - 'nearest-dollar': rounds to nearest whole dollar (e.g., 14.40 -> 14.00)
 * - 'none': rounds to 2 decimal places only
 */
export function calculateCustomerRetailPrice(
  wholesaleCost: number,
  customerMarkupPercent: number,
  rounding: 'none' | 'nearest-99' | 'nearest-dollar' = 'none',
): number {
  const rawPrice = wholesaleCost * (1 + customerMarkupPercent / 100);

  switch (rounding) {
    case 'nearest-99':
      return Math.floor(rawPrice) + 0.99;
    case 'nearest-dollar':
      return Math.round(rawPrice);
    case 'none':
      return round2(rawPrice);
  }
}

/**
 * Calculate variant price with size upcharge.
 *
 * Size upcharges are flat dollar add-ons applied after the base retail
 * price is calculated.
 */
export function calculateCustomerVariantPrice(
  customerRetailPrice: number,
  sizeUpcharge: number,
): number {
  return round2(customerRetailPrice + sizeUpcharge);
}

/**
 * Calculate customer profit margin.
 *
 * @param customerRetailPrice - The customer's retail selling price
 * @param totalCost - Total cost (wholesale + decoration)
 * @returns Margin in dollars and as a percentage of retail
 */
export function calculateCustomerMargin(
  customerRetailPrice: number,
  totalCost: number,
): { dollars: number; percent: number } {
  const dollars = round2(customerRetailPrice - totalCost);
  const percent = customerRetailPrice > 0
    ? round2((dollars / customerRetailPrice) * 100)
    : 0;
  return { dollars, percent };
}

/**
 * Calculate per-unit royalty owed to the brand customer.
 *
 * Formula: customerRetailPrice * (royaltyPercent / 100)
 */
export function calculateCustomerRoyalty(
  customerRetailPrice: number,
  royaltyPercent: number,
): number {
  return round2(customerRetailPrice * (royaltyPercent / 100));
}

/**
 * Calculate a complete customer pricing breakdown.
 *
 * Primary entry point -- given cost inputs and customer pricing parameters,
 * returns a full CustomerPricingSummary with retail price, margin, royalty,
 * net profit, and optional variant prices.
 */
export function calculateCustomerPricingSummary(params: {
  wholesaleCost: number;
  decorationCost: number;
  customerMarkupPercent: number;
  royaltyPercent: number;
  rounding?: 'none' | 'nearest-99' | 'nearest-dollar';
  sizeUpcharges?: Record<string, number>;
}): CustomerPricingSummary {
  const {
    wholesaleCost,
    decorationCost,
    customerMarkupPercent,
    royaltyPercent,
    rounding = 'none',
    sizeUpcharges,
  } = params;

  // Step 1: Total cost
  const totalCost = round2(wholesaleCost + decorationCost);

  // Step 2: Retail price with customer markup
  const retailPrice = calculateCustomerRetailPrice(wholesaleCost, customerMarkupPercent, rounding);

  // Step 3: Margin (retail - total cost)
  const margin = calculateCustomerMargin(retailPrice, totalCost);

  // Step 4: Royalty per unit
  const royaltyPerUnit = calculateCustomerRoyalty(retailPrice, royaltyPercent);

  // Step 5: Net after royalty
  const netAfterRoyalty = round2(retailPrice - totalCost - royaltyPerUnit);

  // Step 6: Variant prices (if size upcharges provided)
  let variantPrices: Record<string, number> | undefined;
  if (sizeUpcharges && Object.keys(sizeUpcharges).length > 0) {
    variantPrices = {};
    for (const [size, upcharge] of Object.entries(sizeUpcharges)) {
      variantPrices[size] = calculateCustomerVariantPrice(retailPrice, upcharge);
    }
  }

  return {
    wholesaleCost,
    decorationCost,
    totalCost,
    retailPrice,
    margin,
    royaltyPerUnit,
    netAfterRoyalty,
    variantPrices,
  };
}
