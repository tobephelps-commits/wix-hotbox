/**
 * SanMar API Constants
 *
 * WSDL URLs, warehouse definitions, brand restrictions, pricing codes,
 * and other reference data used across all SanMar service modules.
 *
 * Sources:
 * - SanMar Web Services Integration Guide v24.2 (September 2025)
 * - SanMar FTP Integration Guide v23.3 (September 2025)
 */

// =============================================================================
// WSDL URLs
// =============================================================================

/**
 * Production WSDL URLs for all 7 SanMar services.
 * SanMar Standard endpoints (3) + PromoStandards endpoints (4).
 */
export const WSDL_URLS = {
  // SanMar Standard endpoints
  productInfo:
    'https://ws.sanmar.com:8080/SanMarWebService/SanMarProductInfoServicePort?wsdl',
  inventory:
    'https://ws.sanmar.com:8080/SanMarWebService/SanMarWebServicePort?wsdl',
  pricing:
    'https://ws.sanmar.com:8080/SanMarWebService/SanMarPricingServicePort?wsdl',
  // PromoStandards endpoints
  psProductData:
    'https://ws.sanmar.com:8080/promostandards/ProductDataServiceV2.xml?wsdl',
  psInventory:
    'https://ws.sanmar.com:8080/promostandards/InventoryServiceBindingV2final?WSDL',
  psMediaContent:
    'https://ws.sanmar.com:8080/promostandards/MediaContentServiceBinding?wsdl',
  psPricing:
    'https://ws.sanmar.com:8080/promostandards/PricingAndConfigServiceBinding?wsdl',
} as const;

/**
 * Test environment WSDL URLs.
 * Same structure as production but using test-ws.sanmar.com.
 * Note: Test env was renamed from "Edev" to "Test" in March 2025.
 */
export const TEST_WSDL_URLS = {
  productInfo:
    'https://test-ws.sanmar.com:8080/SanMarWebService/SanMarProductInfoServicePort?wsdl',
  inventory:
    'https://test-ws.sanmar.com:8080/SanMarWebService/SanMarWebServicePort?wsdl',
  pricing:
    'https://test-ws.sanmar.com:8080/SanMarWebService/SanMarPricingServicePort?wsdl',
  psProductData:
    'https://test-ws.sanmar.com:8080/promostandards/ProductDataServiceV2.xml?wsdl',
  psInventory:
    'https://test-ws.sanmar.com:8080/promostandards/InventoryServiceBindingV2final?WSDL',
  psMediaContent:
    'https://test-ws.sanmar.com:8080/promostandards/MediaContentServiceBinding?wsdl',
  psPricing:
    'https://test-ws.sanmar.com:8080/promostandards/PricingAndConfigServiceBinding?wsdl',
} as const;

// =============================================================================
// Warehouses
// =============================================================================

export interface Warehouse {
  id: number;
  name: string;
  location: string;
}

/**
 * All 9 SanMar distribution warehouses.
 * Warehouse 31 (Richmond, VA) added July 2024.
 */
export const WAREHOUSES: readonly Warehouse[] = [
  { id: 1, name: 'Seattle', location: 'Seattle, WA' },
  { id: 2, name: 'Cincinnati', location: 'Cincinnati, OH' },
  { id: 3, name: 'Dallas', location: 'Dallas, TX' },
  { id: 4, name: 'Reno', location: 'Reno, NV' },
  { id: 5, name: 'Robbinsville', location: 'Robbinsville, NJ' },
  { id: 6, name: 'Jacksonville', location: 'Jacksonville, FL' },
  { id: 7, name: 'Minneapolis', location: 'Minneapolis, MN' },
  { id: 12, name: 'Phoenix', location: 'Phoenix, AZ' },
  { id: 31, name: 'Richmond', location: 'Richmond, VA' },
] as const;

// =============================================================================
// Brand Restrictions
// =============================================================================

/**
 * Brands that cannot be sold blank/undecorated on consumer websites.
 * HotBox sells decorated apparel, so this is a warning flag, not a blocker.
 */
export const RESTRICTED_BRANDS: readonly string[] = [
  'Brooks Brothers',
  'Carhartt',
  'Cotopaxi',
  'Eddie Bauer',
  'New Era',
  'Nike',
  'OGIO',
  'Outdoor Research',
  'Stanley/Stella',
  'tentree',
  'The North Face',
  'Tommy Bahama',
  'Travis Mathew',
] as const;

// =============================================================================
// Product Statuses
// =============================================================================

/**
 * Product statuses considered safe for use in HotBox store.
 * Filter out "Coming Soon" (incomplete data) and "Discontinued".
 */
export const ACTIVE_PRODUCT_STATUSES: readonly string[] = [
  'New',
  'Regular',
  'Active',
] as const;

// =============================================================================
// Pricing Codes
// =============================================================================

export interface PricingCode {
  markup: number;
  description: string;
}

/**
 * SanMar pricing code letters and their suggested retail markup percentages.
 * Codes come in pairs (letter/letter) representing the same tier.
 */
export const PRICING_CODES: Record<string, PricingCode> = {
  A: { markup: 50, description: '50% suggested retail markup' },
  P: { markup: 50, description: '50% suggested retail markup' },
  B: { markup: 45, description: '45% suggested retail markup' },
  Q: { markup: 45, description: '45% suggested retail markup' },
  C: { markup: 40, description: '40% suggested retail markup' },
  R: { markup: 40, description: '40% suggested retail markup' },
  D: { markup: 35, description: '35% suggested retail markup' },
  S: { markup: 35, description: '35% suggested retail markup' },
  E: { markup: 30, description: '30% suggested retail markup' },
  T: { markup: 30, description: '30% suggested retail markup' },
};

// =============================================================================
// Inventory
// =============================================================================

/**
 * Per-warehouse inventory cap in API responses.
 * Values of 1500 mean "1500 or more" -- treat as "well stocked".
 * Updated from 500 to 1500 in July 2025.
 */
export const INVENTORY_CAP = 1500;
