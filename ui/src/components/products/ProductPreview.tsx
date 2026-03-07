/**
 * ProductPreview — Product preview display after successful style lookup.
 *
 * Stub for Task 1 compilation. Full implementation in Task 2.
 *
 * Phase 47: Product Pipeline Creation UI
 */

import type { PreviewData, VendorId } from './StyleLookup';

interface ProductPreviewProps {
  preview: PreviewData;
  vendorId: VendorId;
  style: string;
  onContinue: () => void;
}

function ProductPreview({ preview, onContinue }: ProductPreviewProps) {
  return (
    <div className="product-preview">
      <div className="product-preview__brand">{preview.brandName}</div>
      <div className="product-preview__title">{preview.productTitle}</div>
      <button type="button" className="product-preview__continue" onClick={onContinue}>
        Continue to Pricing
      </button>
    </div>
  );
}

export default ProductPreview;
