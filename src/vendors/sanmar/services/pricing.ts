/**
 * SanMar Pricing Service
 *
 * Queries SanMar for product pricing via the Standard getPricing endpoint.
 * Provides wholesale price lookups, sale detection, effective price calculation,
 * and suggested retail price calculation from pricing codes.
 *
 * Usage:
 *   import { getStylePricing, getEffectivePrice, isSaleActive } from '../services/pricing.js';
 *   const pricing = await getStylePricing('PC61');
 *   console.log(`Effective price: $${getEffectivePrice(pricing).toFixed(2)}`);
 *
 * IMPORTANT: "Dozens pricing" is deprecated (RESEARCH.md SOTA).
 * The dozenPrice field now returns the piece price. Do NOT display or
 * calculate with dozen pricing -- just ignore the field.
 */

import { getPricingClient } from '../client.js';
import { getSanMarAuth } from '../auth.js';
import type { PricingInfo, PricingResponse } from '../types/index.js';
import { PRICING_CODES } from '../constants.js';
import { withRetry } from '../utils/retry.js';
import { classifyError } from '../utils/error-handler.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Query parameters for pricing lookups.
 * Style is always required. Color and size are optional for broader queries.
 */
export interface PricingQuery {
  /** SanMar style number (required, e.g., "PC61", "K420") */
  style: string;
  /** Catalog/mainframe color (optional -- use catalogColor, NOT display color) */
  color?: string;
  /** Size code (optional, e.g., "S", "M", "L", "XL") */
  size?: string;
}

// =============================================================================
// Core Pricing Function
// =============================================================================

/**
 * Query SanMar for pricing data.
 *
 * Calls the SanMar Standard getPricing endpoint with optional color and size filters.
 * Wraps the call in withRetry() for transient error resilience.
 *
 * @param query - Style (required), color and size (optional)
 * @returns Parsed PricingResponse with pricing info or error details
 * @throws SanMarError if API returns an error or network fails after retries
 */
export async function getPricing(query: PricingQuery): Promise<PricingResponse> {
  const client = await getPricingClient();
  const auth = getSanMarAuth();

  // WSDL defines arg0 as an array (arg0[]) -- wrap query in array
  const args = {
    arg0: [{
      style: query.style,
      color: query.color ?? '',
      size: query.size ?? '',
    }],
    arg1: {
      sanMarCustomerNumber: auth.sanMarCustomerNumber,
      sanMarUserName: auth.sanMarUserName,
      sanMarUserPassword: auth.sanMarUserPassword,
    },
  };

  // node-soap's *Async methods return [result, rawResponse, soapHeader, rawRequest]
  const soapResult = await withRetry(
    () => client.getPricingAsync(args) as Promise<unknown[]>
  );

  // Extract the data result (first element of the array)
  const result = soapResult[0] as Record<string, unknown> | undefined;

  // Parse raw SOAP response into typed PricingResponse
  const response = (result?.return ?? result) as Record<string, unknown> | undefined;

  // Check for SanMar response-level errors
  // NOTE: Pricing WSDL uses "errorOccurred" (double-r), unlike product info's "errorOccured" (single-r).
  // Check both spellings for safety.
  const hasError =
    response?.errorOccurred === true || response?.errorOccurred === 'true' ||
    response?.errorOccured === true || response?.errorOccured === 'true';
  if (hasError) {
    const errorMsg = response?.message ?? 'Unknown pricing error';
    throw classifyError({ errorOccured: true, message: errorMsg });
  }

  // Extract pricing info from response
  // SanMar getPricing returns listResponse[] where each item has pricing fields directly
  // (piecePrice, casePrice, etc.) -- NOT nested under productPriceInfo.
  // The listResponse is an array of per-color/size pricing items.
  // For style-level queries, take the first item as the base price.
  const rawListResponse = response?.listResponse;
  const listResponse = normalizeArray(rawListResponse);
  const firstItem = listResponse[0] as Record<string, unknown> | undefined;

  const pricing: PricingInfo | null = firstItem
    ? {
        piecePrice: Number(firstItem.piecePrice ?? 0),
        casePrice: Number(firstItem.casePrice ?? 0),
        pieceSalePrice: Number(firstItem.pieceSalePrice ?? firstItem.salePrice ?? 0),
        caseSalePrice: Number(firstItem.caseSalePrice ?? 0),
        priceCode: String(firstItem.priceCode ?? ''),
        priceText: String(firstItem.priceText ?? ''),
        saleStartDate: (firstItem.saleStartDate as string | null) ?? null,
        saleEndDate: (firstItem.saleEndDate as string | null) ?? null,
      }
    : null;

  return {
    errorOccured: false,
    message: String(response?.message ?? 'Success'),
    pricing,
  };
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Get pricing for an entire style.
 * Returns pricing info (piece, case, sale prices) for the style.
 *
 * @param style - SanMar style number (e.g., "PC61")
 * @returns PricingInfo for the style
 * @throws SanMarError if style not found or API error
 */
export async function getStylePricing(style: string): Promise<PricingInfo> {
  const response = await getPricing({ style });

  if (!response.pricing) {
    throw classifyError({
      errorOccured: true,
      message: `No pricing data found for style "${style}"`,
    });
  }

  return response.pricing;
}

/**
 * Get pricing for a specific variant (style + color + size).
 *
 * @param style - SanMar style number
 * @param catalogColor - Catalog/mainframe color (NOT display color)
 * @param size - Size code
 * @returns PricingInfo for the specific variant
 * @throws SanMarError if variant not found or API error
 */
export async function getVariantPricing(
  style: string,
  catalogColor: string,
  size: string
): Promise<PricingInfo> {
  const response = await getPricing({ style, color: catalogColor, size });

  if (!response.pricing) {
    throw classifyError({
      errorOccured: true,
      message: `No pricing data found for variant "${style}" / "${catalogColor}" / "${size}"`,
    });
  }

  return response.pricing;
}

// =============================================================================
// Sale Pricing Utilities
// =============================================================================

/**
 * Check if a sale is currently active for the given pricing info.
 *
 * Parses saleStartDate and saleEndDate and compares to current date.
 * Returns true only if current date is within the sale window.
 *
 * NOTE: Sale pricing updates every Monday and Wednesday (RESEARCH.md pitfall 6).
 * Always re-query pricing when creating/updating products rather than using cached data.
 *
 * @param pricing - PricingInfo from a pricing query
 * @returns true if sale is currently active
 */
export function isSaleActive(pricing: PricingInfo): boolean {
  if (!pricing.saleStartDate || !pricing.saleEndDate) {
    return false;
  }

  const now = new Date();
  const start = new Date(pricing.saleStartDate);
  const end = new Date(pricing.saleEndDate);

  // Validate parsed dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return false;
  }

  return now >= start && now <= end;
}

/**
 * Get the effective wholesale cost HotBox pays.
 *
 * If a sale is active and pieceSalePrice > 0, returns the sale price.
 * Otherwise returns the regular piecePrice.
 *
 * HotBox then applies their own markup -- this is the input cost.
 *
 * @param pricing - PricingInfo from a pricing query
 * @returns Effective wholesale piece price
 */
export function getEffectivePrice(pricing: PricingInfo): number {
  if (isSaleActive(pricing) && pricing.pieceSalePrice > 0) {
    return pricing.pieceSalePrice;
  }
  return pricing.piecePrice;
}

// =============================================================================
// Suggested Retail Calculation
// =============================================================================

/**
 * Calculate SanMar's suggested retail price based on pricing code.
 *
 * Looks up the priceCode in PRICING_CODES to get the markup percentage,
 * then applies: piecePrice * (1 + markupPercentage / 100).
 *
 * NOTE: HotBox may use different markup logic, but SanMar's
 * suggested retail is useful as a reference price.
 *
 * @param pricing - PricingInfo with priceCode
 * @returns Suggested retail price, or piecePrice if code unknown
 */
export function getSuggestedRetail(pricing: PricingInfo): number {
  const codeInfo = PRICING_CODES[pricing.priceCode];

  if (!codeInfo) {
    // Unknown pricing code -- return piece price as fallback
    return pricing.piecePrice;
  }

  return pricing.piecePrice * (1 + codeInfo.markup / 100);
}

// =============================================================================
// Formatting
// =============================================================================

/**
 * Format pricing info into a human-readable summary string.
 *
 * Output: "Piece: $X.XX, Case: $X.XX, Sale: $X.XX (until MM/DD), Code: X (Y% markup)"
 * Useful for CLI output and logging.
 *
 * @param pricing - PricingInfo from a pricing query
 * @returns Formatted pricing summary string
 */
export function formatPricingSummary(pricing: PricingInfo): string {
  const parts: string[] = [
    `Piece: $${pricing.piecePrice.toFixed(2)}`,
    `Case: $${pricing.casePrice.toFixed(2)}`,
  ];

  // Sale pricing
  if (isSaleActive(pricing) && pricing.pieceSalePrice > 0) {
    const endDate = pricing.saleEndDate ? new Date(pricing.saleEndDate) : null;
    const endStr = endDate && !isNaN(endDate.getTime())
      ? ` (until ${(endDate.getMonth() + 1).toString().padStart(2, '0')}/${endDate.getDate().toString().padStart(2, '0')})`
      : '';
    parts.push(`Sale: $${pricing.pieceSalePrice.toFixed(2)}${endStr}`);
  }

  // Pricing code
  const codeInfo = PRICING_CODES[pricing.priceCode];
  if (codeInfo) {
    parts.push(`Code: ${pricing.priceCode} (${codeInfo.markup}% markup)`);
  } else if (pricing.priceCode) {
    parts.push(`Code: ${pricing.priceCode}`);
  }

  return parts.join(', ');
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Normalize a value to always be an array.
 * Handles cases where SOAP returns a single object instead of an array.
 */
function normalizeArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}
