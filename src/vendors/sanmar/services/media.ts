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
 * Mockup images are added separately in the WIX product creation flow.
 */

import { getPSMediaClient, getLastResponse } from '../client.js';
import { getPromoStandardsAuth } from '../auth.js';
import type { MediaContent } from '../types/index.js';
import { MEDIA_CLASS_TYPES } from '../types/media.js';
import { withRetry } from '../utils/retry.js';
import type * as soap from 'soap';

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

  // WSDL exposes "getMediaContent" (lowercase g), not "GetMediaContent".
  // Pass request fields directly -- the WSDL input is flat (not wrapped).
  const args = requestArgs;

  // The media WSDL has namespace collisions ("Target-Namespace already in use")
  // that cause node-soap to fail during response parsing, even though the SOAP
  // request succeeds and the server returns valid data. We catch the parse
  // error and fall back to parsing the raw XML response from client.lastResponse.
  try {
    // Try the normal node-soap path first
    const soapResult = await withRetry(
      () => client.getMediaContentAsync(args) as Promise<unknown[]>
    );

    // Extract the data result (first element of the array)
    const result = soapResult[0] as Record<string, unknown> | undefined;

    // Parse response: extract MediaContentArray.MediaContent
    const mediaContentArray = result?.MediaContentArray as
      | Record<string, unknown>
      | undefined;
    const rawContent = mediaContentArray?.MediaContent;

    return normalizeMediaContent(rawContent);
  } catch (error: unknown) {
    // node-soap's response parser fails on this WSDL due to namespace collisions.
    // The SOAP request DID succeed -- the raw XML response is in client.lastResponse.
    // Fall back to parsing the raw XML response.
    const rawXml = getLastResponse(client as soap.Client);
    if (rawXml && rawXml.includes('MediaContent')) {
      return parseMediaContentFromXml(rawXml);
    }

    // If there's no valid response, re-throw the original error
    throw error;
  }
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
 * of all images for that color. Useful when assigning images to
 * WIX product variants.
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

  // Single object -- wrap in array
  return [parseMediaContentItem(raw)];
}

/**
 * Parse a raw media content item from SOAP response into typed MediaContent.
 * Ensures all expected fields are present with sensible defaults.
 */
function parseMediaContentItem(raw: unknown): MediaContent {
  const item = raw as Record<string, unknown>;

  // Parse classType -- may be nested in ClassTypeArray.ClassType
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

// =============================================================================
// XML Fallback Parser
// =============================================================================

/**
 * Parse media content directly from raw SOAP XML response.
 *
 * This is a fallback for when node-soap's auto-parser fails due to namespace
 * collisions in the MediaContent WSDL. The XML structure is consistent and
 * well-defined, so regex-based extraction is reliable here.
 *
 * Expected XML structure per MediaContent element:
 *   <ns2:MediaContent>
 *     <productId>K420</productId>
 *     <ns2:url>https://cdnm.sanmar.com/imglib/...</ns2:url>
 *     <mediaType>Image</mediaType>
 *     <ns2:ClassTypeArray>
 *       <ns2:ClassType>
 *         <ns2:classTypeId>1008</ns2:classTypeId>
 *         <ns2:classTypeName>Rear</ns2:classTypeName>
 *       </ns2:ClassType>
 *     </ns2:ClassTypeArray>
 *     <ns2:color>Black</ns2:color>
 *     <ns2:singlePart>true</ns2:singlePart>
 *   </ns2:MediaContent>
 */
function parseMediaContentFromXml(xml: string): MediaContent[] {
  const results: MediaContent[] = [];

  // Check for error response first
  const errorMatch = xml.match(/<(?:\w+:)?errorMessage>[\s\S]*?<(?:\w+:)?description>(.*?)<\/(?:\w+:)?description>/);
  if (errorMatch) {
    // API returned an error -- return empty array (no images available)
    return [];
  }

  // Extract each MediaContent block (handles ns2: prefix or no prefix)
  const mediaContentRegex = /<(?:\w+:)?MediaContent>([\s\S]*?)<\/(?:\w+:)?MediaContent>/g;
  let match: RegExpExecArray | null;

  while ((match = mediaContentRegex.exec(xml)) !== null) {
    const block = match[1];

    const productId = extractXmlField(block, 'productId') ?? '';
    const url = extractXmlField(block, 'url') ?? '';
    const mediaType = extractXmlField(block, 'mediaType') ?? 'Image';
    const color = extractXmlField(block, 'color') ?? '';
    const partId = extractXmlField(block, 'partId');

    // Extract classType from nested ClassType element
    const classTypeId = Number(extractXmlField(block, 'classTypeId') ?? '0');
    const classTypeName = extractXmlField(block, 'classTypeName') ?? 'Unknown';

    results.push({
      productId,
      partId: partId ?? null,
      url,
      mediaType,
      classType: { classTypeId, classTypeName },
      color,
    });
  }

  return results;
}

/**
 * Extract a field value from an XML block.
 * Handles namespace-prefixed tags (e.g., <ns2:url>value</ns2:url>).
 */
function extractXmlField(xml: string, fieldName: string): string | null {
  // Match both prefixed and non-prefixed: <ns2:fieldName>value</ns2:fieldName> or <fieldName>value</fieldName>
  const regex = new RegExp(`<(?:\\w+:)?${fieldName}>(.*?)<\\/(?:\\w+:)?${fieldName}>`);
  const match = xml.match(regex);
  return match ? match[1] : null;
}
