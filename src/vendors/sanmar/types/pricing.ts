/**
 * SanMar Pricing Types
 *
 * TypeScript interfaces for pricing data returned by the SanMar Standard
 * getPricing endpoint.
 */

/**
 * Pricing details for a specific style/color/size.
 */
export interface PricingInfo {
  piecePrice: number;
  casePrice: number;
  pieceSalePrice: number;
  caseSalePrice: number;
  priceCode: string;
  priceText: string;
  saleStartDate: string | null;
  saleEndDate: string | null;
}

/**
 * Full response from getPricing.
 * Note: SanMar uses the misspelling "errorOccured" (missing 'r') in their API.
 */
export interface PricingResponse {
  errorOccured: boolean;
  message: string;
  pricing: PricingInfo | null;
}
