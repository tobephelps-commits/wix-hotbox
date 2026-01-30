/**
 * SanMar Media Content Service
 *
 * Retrieves product images from SanMar via the PromoStandards
 * GetMediaContent v1.1.0 endpoint.
 *
 * Usage:
 *   import { getProductImages, getFrontImages, groupImagesByColor } from './services/media.js';
 *   const images = await getProductImages('PC61');
 *   const byColor = groupImagesByColor(images);
 *
 * NOTE: HotBox uses mockup images (not SanMar product photos) for their
 * custom decorated products. This service is still valuable for:
 * (1) blank product reference images during product creation,
 * (2) color swatches for variant selection,
 * (3) spec sheets for product details.
 * Mockup images are added separately in the WIX product creation flow (Phase 6).
 */

import { getPSMediaClient } from '../client.js';
import { getPromoStandardsAuth } from '../auth.js';
import type { MediaContent } from '../types/index.js';
import { MEDIA_CLASS_TYPES } from '../types/media.js';
import { withRetry } from '../utils/retry.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Query parameters for media content requests.
 *
 * @property productId - SanMar style number (required). Examples: "PC61", "K420"
 * @property partId - Specific SKU/part ID for one variant's images (optional)
 * @property classType - Filter by image type using MEDIA_CLASS_TYPES values (optional)
 * @property mediaType - 'Image' or 'Document' (default: 'Image')
 */
export interface MediaQuery {
  productId: string;
  partId?: string;
  classType?: number;
  mediaType?: 'Image' | 'Document';
}

// =============================================================================
// Core Query Function
// =============================================================================

/**
 * Query SanMar for media content via PromoStandards GetMediaContent v1.1.0.
 *
 * Returns all matching media items with classification metadata (classType),
 * image URLs, and color information.
 *
 * @param query - Product ID (required), partId, classType, mediaType (optional)
 * @returns Array of MediaContent items
 * @throws SanMarError if API returns an error or call fails
 */
export async function getMediaContent(
  query: MediaQuery
): Promise<MediaContent[]> {
  const client = await getPSMediaClient();
  const auth = getPromoStandardsAuth('1.1.0');

  // Build SOAP args for GetMediaContent request
  const requestArgs: Record<string, unknown> = {
    ...auth,
    mediaType: query.mediaType ?? 'Image',
    productId: query.productId,
  };

  if (query.partId !== undefined) {
    requestArgs.partId = query.partId;
  }

  if (query.classType !== undefined) {
    requestArgs.classType = query.classType;
  }

  const args = {
    GetMediaContentRequest: requestArgs,
  };

  // Call with retry for transient errors
  // node-soap's *Async methods return [result, rawResponse, soapHeader, rawRequest]
  const soapResult = await withRetry(
    () => client.GetMediaContentAsync(args) as Promise<unknown[]>
  );

  // Extract the data result (first element of the array)
  const result = soapResult[0] as Record<string, unknown> | undefined;

  // Parse response: extract MediaContentArray.MediaContent
  // May be array, single object, or undefined
  const mediaContentArray = result?.MediaContentArray as
    | Record<string, unknown>
    | undefined;
  const rawContent = mediaContentArray?.MediaContent;

  // Normalize to always return an array
  return normalizeMediaContent(rawContent);
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Get all images for a style number.
 *
 * @param style - SanMar style number (e.g., "PC61")
 * @returns Array of all image MediaContent items
 */
export async function getProductImages(
  style: string
): Promise<MediaContent[]> {
  return getMediaContent({ productId: style, mediaType: 'Image' });
}

/**
 * Get front-view images for a style number.
 *
 * Front images (classType 1007) are typically the primary product images
 * used for product listings and thumbnails.
 *
 * @param style - SanMar style number
 * @returns Array of front-view MediaContent items
 */
export async function getFrontImages(
  style: string
): Promise<MediaContent[]> {
  return getMediaContent({
    productId: style,
    classType: MEDIA_CLASS_TYPES.Front,
  });
}

/**
 * Get color swatch images for a style number.
 *
 * Swatch images (classType 1004) show small color samples,
 * useful for variant selection UI and color picker displays.
 *
 * @param style - SanMar style number
 * @returns Array of swatch MediaContent items
 */
export async function getSwatchImages(
  style: string
): Promise<MediaContent[]> {
  return getMediaContent({
    productId: style,
    classType: MEDIA_CLASS_TYPES.Swatch,
  });
}

/**
 * Get all images for a specific color of a style.
 *
 * Fetches all images for the style, then filters by color name.
 * Returns all image types (front, rear, swatch, etc.) for that color.
 *
 * @param style - SanMar style number
 * @param color - Color name to filter by (matches MediaContent.color field)
 * @returns Array of MediaContent items for the specified color
 */
export async function getImagesByColor(
  style: string,
  color: string
): Promise<MediaContent[]> {
  const allImages = await getProductImages(style);
  return allImages.filter(
    (image) => image.color.toLowerCase() === color.toLowerCase()
  );
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Group a flat image array by color.
 *
 * Returns a Map where keys are color names and values are arrays
 * of all images for that color. Useful for Phase 6 when assigning
 * images to WIX product variants.
 *
 * @param images - Flat array of MediaContent items
 * @returns Map of color name -> MediaContent[] for that color
 */
export function groupImagesByColor(
  images: MediaContent[]
): Map<string, MediaContent[]> {
  const grouped = new Map<string, MediaContent[]>();

  for (const image of images) {
    const colorKey = image.color;
    const existing = grouped.get(colorKey);

    if (existing) {
      existing.push(image);
    } else {
      grouped.set(colorKey, [image]);
    }
  }

  return grouped;
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Normalize raw media content response to always be a typed array.
 * Handles cases where SOAP returns a single object, an array, or undefined.
 */
function normalizeMediaContent(raw: unknown): MediaContent[] {
  if (raw === undefined || raw === null) {
    return [];
  }

  if (Array.isArray(raw)) {
    return raw.map(parseMediaContentItem);
  }

  // Single object — wrap in array
  return [parseMediaContentItem(raw)];
}

/**
 * Parse a raw media content item from SOAP response into typed MediaContent.
 * Ensures all expected fields are present with sensible defaults.
 */
function parseMediaContentItem(raw: unknown): MediaContent {
  const item = raw as Record<string, unknown>;

  // Parse classType — may be nested in ClassTypeArray.ClassType
  const classTypeData = extractClassType(item);

  return {
    productId: String(item.productId ?? ''),
    partId: item.partId != null ? String(item.partId) : null,
    url: String(item.url ?? ''),
    mediaType: String(item.mediaType ?? 'Image'),
    classType: classTypeData,
    color: String(item.color ?? ''),
  };
}

/**
 * Extract classType data from a media content item.
 * PromoStandards nests this in ClassTypeArray.ClassType.
 */
function extractClassType(
  item: Record<string, unknown>
): MediaContent['classType'] {
  // Direct classType fields
  if (item.classTypeId !== undefined && item.classTypeName !== undefined) {
    return {
      classTypeId: Number(item.classTypeId),
      classTypeName: String(item.classTypeName),
    };
  }

  // Nested in ClassTypeArray.ClassType (PromoStandards format)
  const classTypeArray = item.ClassTypeArray as Record<string, unknown> | undefined;
  if (classTypeArray) {
    const classType = classTypeArray.ClassType as Record<string, unknown> | undefined;
    if (classType) {
      return {
        classTypeId: Number(classType.classTypeId ?? 0),
        classTypeName: String(classType.classTypeName ?? 'Unknown'),
      };
    }
  }

  // Fallback
  return {
    classTypeId: 0,
    classTypeName: 'Unknown',
  };
}
