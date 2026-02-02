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
 * Uses /styles/?search= which matches catalog style numbers (styleName),
 * then filters for exact match. Falls back to path-based /styles/{id}
 * for direct styleID lookups.
 *
 * @param style - S&S catalog style number (e.g., "8512", "2000")
 * @returns Array of matching styles, or empty array if not found
 */
export async function getSSStyleInfo(style: string): Promise<SSStyle[]> {
  // Search matches against catalog styleName
  const results = await ssGetWithRetry<SSStyle[]>(`/styles/`, { search: style });
  const exactMatch = results.find(s => String(s.styleName) === style);
  if (exactMatch) return [exactMatch];

  // Fallback: treat input as styleID (path-based lookup)
  return ssGetWithRetry<SSStyle[]>(`/styles/${encodeURIComponent(style)}`);
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
