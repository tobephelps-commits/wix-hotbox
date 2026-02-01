/**
 * S&S Activewear API Constants
 *
 * Base URLs, rate limits, warehouse definitions, and other reference data
 * used across all S&S Activewear service modules.
 *
 * Sources:
 * - S&S Activewear REST API V2 documentation
 * - https://api.ssactivewear.com/V2/Default.aspx
 */

// =============================================================================
// API URLs
// =============================================================================

/**
 * Base URL for S&S Activewear REST API V2.
 * All service endpoints are relative to this URL.
 */
export const SS_API_BASE_URL = 'https://api.ssactivewear.com/v2';

/**
 * Base URL for S&S Activewear image assets.
 * Product images are returned as relative paths — prepend this base URL.
 */
export const SS_IMAGE_BASE_URL = 'https://www.ssactivewear.com/';

// =============================================================================
// Rate Limiting
// =============================================================================

/**
 * Maximum API requests allowed per rate limit window.
 * S&S enforces a hard 60 requests/minute limit.
 * Exceeding this returns HTTP 429 Too Many Requests.
 */
export const SS_RATE_LIMIT = 60;

/**
 * Rate limit window duration in milliseconds (1 minute).
 */
export const SS_RATE_WINDOW = 60_000;

// =============================================================================
// Warehouses
// =============================================================================

export interface SSWarehouseInfo {
  name: string;
  location: string;
}

/**
 * All known S&S Activewear distribution warehouses.
 * Keyed by warehouse abbreviation as returned in API responses.
 *
 * Note: S&S is consolidating warehouses in 2026. Some locations
 * (IL, TX-Dallas, GA-Duluth, PA-Harrisburg, CA-Fresno) are scheduled
 * to close. The API will naturally reflect closures as they happen.
 */
export const SS_WAREHOUSES: Record<string, SSWarehouseInfo> = {
  IL: { name: 'Bolingbrook', location: 'Bolingbrook, IL' },
  TX: { name: 'Fort Worth', location: 'Fort Worth, TX' },
  GA: { name: 'McDonough', location: 'McDonough, GA' },
  KS: { name: 'Olathe', location: 'Olathe, KS' },
  NV: { name: 'Reno', location: 'Reno, NV' },
  NJ: { name: 'Robbinsville', location: 'Robbinsville, NJ' },
  PA: { name: 'Reading', location: 'Reading, PA' },
  AZ: { name: 'Tempe', location: 'Tempe, AZ' },
  CA: { name: 'Santa Fe Springs', location: 'Santa Fe Springs, CA' },
  MA: { name: 'Middleborough', location: 'Middleborough, MA' },
  FL: { name: 'Orlando', location: 'Orlando, FL' },
  OH: { name: 'West Chester Township', location: 'West Chester Township, OH' },
};
