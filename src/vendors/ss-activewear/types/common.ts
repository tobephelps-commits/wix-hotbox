/**
 * S&S Activewear Common / Shared Types
 *
 * Types for style metadata, categories, brands, and error responses
 * shared across multiple S&S API endpoints.
 *
 * Sources:
 * - https://api.ssactivewear.com/V2/Styles.aspx
 * - https://api.ssactivewear.com/V2/Categories.aspx
 * - https://api.ssactivewear.com/V2/Brands.aspx
 */

// =============================================================================
// Style Types
// =============================================================================

/**
 * Style metadata from GET /v2/styles/.
 * Contains title, description, and category info not available
 * on the flat product objects.
 */
export interface SSStyle {
  /** Style identifier */
  styleID: number;
  /** Part number / style name (e.g., "2000") */
  partNumber: string;
  /** Brand display name (e.g., "Gildan") */
  brandName: string;
  /** Style display name (e.g., "Ultra Cotton 100% US Cotton T-Shirt") */
  styleName: string;
  /** Full product title */
  title: string;
  /** Full product description (HTML or plain text) */
  description: string;
  /** Base category name */
  baseCategory: string;
  /** Array of category assignments */
  categories: SSCategory[];
  /** Whether this is a newly added style */
  newStyle: boolean;
  /** Whether this style is sustainable/eco-friendly */
  sustainableStyle: boolean;
  /** Relative path to brand logo image */
  brandImage: string;
  /** Relative path to style hero image */
  styleImage: string;
}

// =============================================================================
// Category Types
// =============================================================================

/**
 * Product category from GET /v2/categories/.
 */
export interface SSCategory {
  /** Category identifier */
  categoryID: number;
  /** Category display name (e.g., "T-Shirts", "Fleece", "Headwear") */
  name: string;
}

// =============================================================================
// Brand Types
// =============================================================================

/**
 * Brand metadata from GET /v2/brands/.
 */
export interface SSBrand {
  /** Brand identifier */
  brandID: number;
  /** Brand display name */
  name: string;
  /** Relative path to brand logo image */
  image: string;
  /** Whether NOE retailing restrictions apply to this brand */
  noeRetailing: boolean;
}

// =============================================================================
// Error Response Types
// =============================================================================

/**
 * Error response body from S&S API when request fails.
 * S&S returns an array of field-level errors.
 */
export interface SSErrorResponse {
  /** Array of error details */
  errors: SSErrorDetail[];
}

/**
 * Individual error detail within an error response.
 */
export interface SSErrorDetail {
  /** Field that caused the error (may be empty for general errors) */
  field: string;
  /** Human-readable error message */
  message: string;
}
