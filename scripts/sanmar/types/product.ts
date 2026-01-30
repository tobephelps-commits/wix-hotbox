/**
 * SanMar Product Types
 *
 * TypeScript interfaces for product data returned by the SanMar Standard
 * getProductInfoByStyleColorSize endpoint.
 */

/**
 * Basic product information fields.
 */
export interface ProductBasicInfo {
  brandName: string;
  style: string;
  productTitle: string;
  productDescription: string;
  color: string;
  catalogColor: string;
  size: string;
  availableSizes: string;
  productStatus: string;
  caseSize: string;
  inventoryKey: string;
  sizeIndex: string;
  uniqueKey: string;
  category: string;
  keywords: string;
  pieceWeight: number;
}

/**
 * Product image URLs.
 * All fields may be null if no image is available for that view.
 */
export interface ProductImageInfo {
  frontModel: string | null;
  backModel: string | null;
  sideModel: string | null;
  threeQModel: string | null;
  frontFlat: string | null;
  backFlat: string | null;
  colorProductImage: string | null;
  colorSquareImage: string | null;
  brandLogoImage: string | null;
  specSheet: string | null;
}

/**
 * Product pricing information.
 * Note: dozenPrice is deprecated -- it now returns the same value as piecePrice.
 */
export interface ProductPriceInfo {
  piecePrice: number;
  casePrice: number;
  dozenPrice: number;
  pieceSalePrice: number;
  caseSalePrice: number;
  priceCode: string;
  priceText: string;
  saleStartDate: string | null;
  saleEndDate: string | null;
}

/**
 * Combined product info returned for each item in the list response.
 */
export interface ProductInfo {
  productBasicInfo: ProductBasicInfo;
  productImageInfo: ProductImageInfo;
  productPriceInfo: ProductPriceInfo;
}

/**
 * Full response from getProductInfoByStyleColorSize.
 * Note: SanMar uses the misspelling "errorOccured" (missing 'r') in their API.
 */
export interface ProductInfoResponse {
  errorOccured: boolean;
  message: string;
  listResponse: ProductInfo[];
}
