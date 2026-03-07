/**
 * ProductPreview — Product preview display after successful style lookup.
 *
 * Shows brand/title/style header, pricing summary bar, color cards grid
 * with toggleable selection, size chips, and a "Continue to Pricing" button.
 *
 * Phase 47: Product Pipeline Creation UI
 */

import { useState, useCallback, useMemo } from 'react';
import ColorCard from './ColorCard';
import SizeChips from './SizeChips';
import type { PreviewData, VendorId } from './StyleLookup';

interface SelectedColorData {
  catalogColor: string;
  displayColor: string;
}

interface ProductPreviewProps {
  preview: PreviewData;
  vendorId: VendorId;
  style: string;
  onContinue: (selectedColors: SelectedColorData[], selectedSizes: string[]) => void;
}

function ProductPreview({ preview, style, onContinue }: ProductPreviewProps) {
  // Initialize selected colors to all in-stock (or unknown-stock) colors
  const initialColors = useMemo(() => {
    const inStock = new Set<string>();
    for (const c of preview.availableColors) {
      if (c.inStock || c.stockUnknown) {
        inStock.add(c.catalogColor);
      }
    }
    return inStock;
  }, [preview.availableColors]);

  // Initialize selected sizes to all available sizes
  const initialSizes = useMemo(
    () => new Set(preview.availableSizes),
    [preview.availableSizes],
  );

  const [selectedColors, setSelectedColors] = useState<Set<string>>(initialColors);
  const [selectedSizes, setSelectedSizes] = useState<Set<string>>(initialSizes);

  // Color toggle
  const toggleColor = useCallback((catalogColor: string) => {
    setSelectedColors((prev) => {
      const next = new Set(prev);
      if (next.has(catalogColor)) {
        next.delete(catalogColor);
      } else {
        next.add(catalogColor);
      }
      return next;
    });
  }, []);

  // Size toggle
  const toggleSize = useCallback((size: string) => {
    setSelectedSizes((prev) => {
      const next = new Set(prev);
      if (next.has(size)) {
        next.delete(size);
      } else {
        next.add(size);
      }
      return next;
    });
  }, []);

  // Select / Deselect all colors
  const selectAllColors = useCallback(() => {
    setSelectedColors(new Set(preview.availableColors.map((c) => c.catalogColor)));
  }, [preview.availableColors]);

  const deselectAllColors = useCallback(() => {
    setSelectedColors(new Set());
  }, []);

  // Select / Deselect all sizes
  const selectAllSizes = useCallback(() => {
    setSelectedSizes(new Set(preview.availableSizes));
  }, [preview.availableSizes]);

  const deselectAllSizes = useCallback(() => {
    setSelectedSizes(new Set());
  }, []);

  const { pricing } = preview;
  const canContinue = selectedColors.size > 0 && selectedSizes.size > 0;

  return (
    <div className="product-preview">
      {/* Header */}
      <div>
        <div className="product-preview__brand">{preview.brandName}</div>
        <div className="product-preview__title">{preview.productTitle}</div>
        <div className="product-preview__style">Style {style}</div>
      </div>

      {/* Pricing summary */}
      <div className="product-preview__pricing">
        <div className="product-preview__price-item">
          <span className="product-preview__price-label">Wholesale</span>
          <span className="product-preview__price-value">
            ${pricing.wholesalePrice.toFixed(2)}
          </span>
        </div>
        <div className="product-preview__price-item">
          <span className="product-preview__price-label">Suggested Retail</span>
          <span className="product-preview__price-value">
            ${pricing.suggestedRetail.toFixed(2)}
          </span>
        </div>
        {pricing.saleActive && (
          <span className="product-preview__sale-badge">Sale Active</span>
        )}
      </div>

      {/* Colors section */}
      <div className="product-preview__section-header">
        <span className="product-preview__section-title">
          Colors ({selectedColors.size}/{preview.availableColors.length})
        </span>
        <div className="product-preview__section-actions">
          <button
            type="button"
            className="product-preview__toggle-btn"
            onClick={selectAllColors}
          >
            Select All
          </button>
          <button
            type="button"
            className="product-preview__toggle-btn"
            onClick={deselectAllColors}
          >
            Deselect All
          </button>
        </div>
      </div>

      <div className="product-preview__colors">
        {preview.availableColors.map((color) => (
          <ColorCard
            key={color.catalogColor}
            catalogColor={color.catalogColor}
            displayColor={color.displayColor}
            swatchUrl={color.swatchUrl}
            frontImageUrl={color.frontImageUrl}
            inStock={color.inStock}
            stockUnknown={color.stockUnknown}
            selected={selectedColors.has(color.catalogColor)}
            onToggle={toggleColor}
          />
        ))}
      </div>

      {/* Sizes section */}
      <div className="product-preview__section-header">
        <span className="product-preview__section-title">
          Sizes ({selectedSizes.size}/{preview.availableSizes.length})
        </span>
        <div className="product-preview__section-actions">
          <button
            type="button"
            className="product-preview__toggle-btn"
            onClick={selectAllSizes}
          >
            Select All
          </button>
          <button
            type="button"
            className="product-preview__toggle-btn"
            onClick={deselectAllSizes}
          >
            Deselect All
          </button>
        </div>
      </div>

      <SizeChips
        sizes={preview.availableSizes}
        selectedSizes={selectedSizes}
        onToggle={toggleSize}
      />

      {/* Continue button */}
      <button
        type="button"
        className="product-preview__continue"
        disabled={!canContinue}
        onClick={() => {
          const colors: SelectedColorData[] = preview.availableColors
            .filter((c) => selectedColors.has(c.catalogColor))
            .map((c) => ({ catalogColor: c.catalogColor, displayColor: c.displayColor }));
          onContinue(colors, Array.from(selectedSizes));
        }}
      >
        {canContinue
          ? `Continue to Pricing (${selectedColors.size} colors, ${selectedSizes.size} sizes)`
          : 'Select colors and sizes to continue'}
      </button>
    </div>
  );
}

export default ProductPreview;
