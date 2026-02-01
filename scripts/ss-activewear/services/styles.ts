/**
 * S&S Activewear Styles Service
 *
 * Style metadata queries against the S&S REST API V2 /v2/styles/ endpoint.
 * The styles endpoint provides title, description, categories, and other
 * metadata not available on the flat product objects.
 *
 * Usage:
 *   import { getSSStyleInfo, searchSSStyles } from '../ss-activewear/index.js';
 *   const styles = await getSSStyleInfo('2000');
 *   const results = await searchSSStyles('ultra cotton');
 */

import { ssGetWithRetry } from '../client.js';
import type { SSStyle } from '../types/index.js';

// =============================================================================
// Style Queries
// =============================================================================

/**
 * Get style metadata for a given style/part number.
 * Returns title, description, categories, and brand info.
 *
 * @param style - S&S style/part number (e.g., "2000")
 * @returns Array of matching styles, or empty array if not found
 */
export async function getSSStyleInfo(style: string): Promise<SSStyle[]> {
  return ssGetWithRetry<SSStyle[]>(`/styles/`, { style });
}

/**
 * Search styles by keyword query.
 * Searches across style names, descriptions, and brand names.
 *
 * @param query - Search keyword (e.g., "ultra cotton", "performance")
 * @returns Array of matching styles
 */
export async function searchSSStyles(query: string): Promise<SSStyle[]> {
  return ssGetWithRetry<SSStyle[]>(`/styles/`, { search: query });
}
