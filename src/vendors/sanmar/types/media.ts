/**
 * SanMar Media Content Types
 *
 * TypeScript interfaces for media data returned by the PromoStandards
 * GetMediaContent v1.1.0 endpoint.
 */

/**
 * Media classification type identifiers.
 * Used to categorize images by view/purpose.
 */
export const MEDIA_CLASS_TYPES = {
  Swatch: 1004,
  Primary: 1006,
  Front: 1007,
  Rear: 1008,
  High: 2001,
} as const;

/**
 * Class type metadata on a media item.
 */
export interface MediaClassType {
  classTypeId: number;
  classTypeName: string;
}

/**
 * A single media content item from GetMediaContent response.
 */
export interface MediaContent {
  productId: string;
  partId: string | null;
  url: string;
  mediaType: string;
  classType: MediaClassType;
  color: string;
}

/**
 * Full response from GetMediaContent -- an array of MediaContent items.
 */
export type MediaContentResponse = MediaContent[];
