/**
 * ProductPicker -- Modal for browsing and selecting products from WIX catalog
 * or vendor lookup when building manual orders.
 *
 * Two-step flow:
 *   Step 1: Search (WIX Catalog tab or Vendor Lookup tab)
 *   Step 2: Color/Size selection from preview data
 *
 * Phase 62: Manual Order Product Picker (Plan 01)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { FormEvent } from 'react';
import type { PreviewData, VendorId } from '../products/StyleLookup';
import './ProductPicker.css';

// =============================================================================
// Types
// =============================================================================

export interface PickedProduct {
  productName: string;
  vendorStyle: string;
  vendor: VendorId;
  color: string;
  size: string;
  unitPrice: number;
  imageUrl: string | null;
}

interface ProductPickerProps {
  onPick: (product: PickedProduct) => void;
  onClose: () => void;
}

interface CatalogEntry {
  style: string;
  vendor: VendorId;
  productName: string;
  wixProductId: string;
}

type SearchTab = 'catalog' | 'vendor';

const VENDOR_LABELS: Record<VendorId, string> = {
  sanmar: 'SanMar',
  ss: 'S&S',
};

// =============================================================================
// Component
// =============================================================================

function ProductPicker({ onPick, onClose }: ProductPickerProps) {
  // ---------------------------------------------------------------------------
  // Step state
  // ---------------------------------------------------------------------------
  const [step, setStep] = useState<1 | 2>(1);

  // ---------------------------------------------------------------------------
  // Step 1: Search state
  // ---------------------------------------------------------------------------
  const [activeTab, setActiveTab] = useState<SearchTab>('catalog');

  // Catalog search
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogResults, setCatalogResults] = useState<CatalogEntry[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Vendor lookup
  const [vendorLookupStyle, setVendorLookupStyle] = useState('');
  const [vendorLookupVendor, setVendorLookupVendor] = useState<VendorId>('sanmar');
  const [vendorLoading, setVendorLoading] = useState(false);
  const [vendorError, setVendorError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Step 2: Preview & selection state
  // ---------------------------------------------------------------------------
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<VendorId>('sanmar');
  const [selectedStyle, setSelectedStyle] = useState('');
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Catalog search with debounce
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!catalogSearch.trim()) {
      setCatalogResults([]);
      setCatalogError(null);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      setCatalogLoading(true);
      setCatalogError(null);
      try {
        const res = await fetch(
          `/api/orders/catalog?search=${encodeURIComponent(catalogSearch.trim())}&limit=20`,
        );
        const data = await res.json();
        if (!res.ok) {
          setCatalogError(data.error || `Request failed (${res.status})`);
          return;
        }
        setCatalogResults(data.products ?? []);
      } catch (err) {
        setCatalogError(err instanceof Error ? err.message : 'Network error');
      } finally {
        setCatalogLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [catalogSearch]);

  // ---------------------------------------------------------------------------
  // Fetch preview data
  // ---------------------------------------------------------------------------
  const fetchPreview = useCallback(async (vendor: VendorId, style: string) => {
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const res = await fetch(
        `/api/pipeline/preview/${vendor}/${encodeURIComponent(style)}`,
      );
      const data = await res.json();
      if (!res.ok) {
        setPreviewError(data.error || `Request failed (${res.status})`);
        return;
      }
      setPreview(data as PreviewData);
      setSelectedVendor(vendor);
      setSelectedStyle(style);
      setSelectedColor(null);
      setSelectedSize(null);
      setQuantity(1);
      setStep(2);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Catalog item click
  // ---------------------------------------------------------------------------
  const handleCatalogSelect = useCallback(
    (entry: CatalogEntry) => {
      fetchPreview(entry.vendor, entry.style);
    },
    [fetchPreview],
  );

  // ---------------------------------------------------------------------------
  // Vendor lookup submit
  // ---------------------------------------------------------------------------
  const handleVendorLookup = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const trimmed = vendorLookupStyle.trim().toUpperCase();
      if (!trimmed) return;

      setVendorLoading(true);
      setVendorError(null);
      try {
        await fetchPreview(vendorLookupVendor, trimmed);
      } catch (err) {
        setVendorError(err instanceof Error ? err.message : 'Network error');
      } finally {
        setVendorLoading(false);
      }
    },
    [vendorLookupStyle, vendorLookupVendor, fetchPreview],
  );

  // ---------------------------------------------------------------------------
  // Add to order
  // ---------------------------------------------------------------------------
  const handleAddToOrder = useCallback(() => {
    if (!preview || !selectedColor || !selectedSize) return;

    const colorData = preview.availableColors.find(
      (c) => c.displayColor === selectedColor,
    );

    const picked: PickedProduct = {
      productName: `${preview.brandName} ${preview.productTitle}`,
      vendorStyle: selectedStyle,
      vendor: selectedVendor,
      color: selectedColor,
      size: selectedSize,
      unitPrice: preview.pricing.suggestedRetail,
      imageUrl: colorData?.frontImageUrl ?? null,
    };

    onPick(picked);
  }, [preview, selectedColor, selectedSize, selectedStyle, selectedVendor, onPick]);

  // ---------------------------------------------------------------------------
  // Back to step 1
  // ---------------------------------------------------------------------------
  const handleBack = useCallback(() => {
    setStep(1);
    setPreview(null);
    setPreviewError(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Resolve selected color data for image display
  // ---------------------------------------------------------------------------
  const selectedColorData = preview?.availableColors.find(
    (c) => c.displayColor === selectedColor,
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const isLoading = catalogLoading || vendorLoading || previewLoading;

  return (
    <div className="product-picker__overlay" onClick={onClose}>
      <div className="product-picker" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="product-picker__header">
          <h2 className="product-picker__title">
            {step === 1 ? 'Browse Products' : 'Select Options'}
          </h2>
          <button
            className="product-picker__close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="product-picker__body">
          {/* Loading overlay */}
          {isLoading && (
            <div className="product-picker__loading">
              <span className="product-picker__spinner" />
              Loading...
            </div>
          )}

          {/* ============================================================= */}
          {/* STEP 1: Search */}
          {/* ============================================================= */}
          {step === 1 && (
            <>
              {/* Tabs */}
              <div className="product-picker__tabs">
                <button
                  type="button"
                  className={`product-picker__tab${activeTab === 'catalog' ? ' product-picker__tab--active' : ''}`}
                  onClick={() => setActiveTab('catalog')}
                >
                  WIX Catalog
                </button>
                <button
                  type="button"
                  className={`product-picker__tab${activeTab === 'vendor' ? ' product-picker__tab--active' : ''}`}
                  onClick={() => setActiveTab('vendor')}
                >
                  Vendor Lookup
                </button>
              </div>

              {/* Catalog search tab */}
              {activeTab === 'catalog' && (
                <div className="product-picker__panel">
                  <input
                    className="product-picker__search-input"
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Search by product name or style..."
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />

                  {catalogError && (
                    <div className="product-picker__error">{catalogError}</div>
                  )}
                  {previewError && activeTab === 'catalog' && (
                    <div className="product-picker__error">{previewError}</div>
                  )}

                  {catalogResults.length > 0 && (
                    <div className="product-picker__results">
                      {catalogResults.map((entry) => (
                        <button
                          key={`${entry.vendor}-${entry.style}`}
                          type="button"
                          className="product-picker__result-item"
                          onClick={() => handleCatalogSelect(entry)}
                          disabled={isLoading}
                        >
                          <span className="product-picker__result-name">
                            {entry.productName}
                          </span>
                          <span className="product-picker__result-meta">
                            <span className="product-picker__result-style">
                              {entry.style}
                            </span>
                            <span
                              className={`product-picker__vendor-badge product-picker__vendor-badge--${entry.vendor}`}
                            >
                              {VENDOR_LABELS[entry.vendor]}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {catalogSearch.trim() &&
                    !catalogLoading &&
                    catalogResults.length === 0 &&
                    !catalogError && (
                      <div className="product-picker__empty">
                        No products found
                      </div>
                    )}
                </div>
              )}

              {/* Vendor lookup tab */}
              {activeTab === 'vendor' && (
                <div className="product-picker__panel">
                  <form
                    className="product-picker__vendor-form"
                    onSubmit={handleVendorLookup}
                  >
                    <div className="product-picker__vendor-toggle">
                      {(['sanmar', 'ss'] as VendorId[]).map((v) => (
                        <button
                          key={v}
                          type="button"
                          className={`product-picker__vendor-btn${vendorLookupVendor === v ? ' product-picker__vendor-btn--active' : ''}`}
                          onClick={() => setVendorLookupVendor(v)}
                          disabled={isLoading}
                        >
                          {VENDOR_LABELS[v]}
                        </button>
                      ))}
                    </div>
                    <input
                      className="product-picker__search-input"
                      type="text"
                      value={vendorLookupStyle}
                      onChange={(e) => setVendorLookupStyle(e.target.value)}
                      placeholder="Enter style number (e.g. PC61, 2000)"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      disabled={isLoading}
                    />
                    <button
                      type="submit"
                      className="product-picker__lookup-btn"
                      disabled={!vendorLookupStyle.trim() || isLoading}
                    >
                      {vendorLoading ? 'Looking up...' : 'Look Up'}
                    </button>
                  </form>

                  {vendorError && (
                    <div className="product-picker__error">{vendorError}</div>
                  )}
                  {previewError && activeTab === 'vendor' && (
                    <div className="product-picker__error">{previewError}</div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ============================================================= */}
          {/* STEP 2: Color/Size Selection */}
          {/* ============================================================= */}
          {step === 2 && preview && (
            <div className="product-picker__selection">
              {/* Product header */}
              <div className="product-picker__product-header">
                <h3 className="product-picker__product-title">
                  {preview.brandName} {preview.productTitle}
                </h3>
                {preview.description && (
                  <p className="product-picker__product-desc">
                    {preview.description}
                  </p>
                )}
              </div>

              {/* Color selector */}
              <div className="product-picker__section">
                <label className="product-picker__section-label">Color</label>
                <div className="product-picker__color-grid">
                  {preview.availableColors.map((color) => (
                    <button
                      key={color.displayColor}
                      type="button"
                      className={`product-picker__color-swatch${selectedColor === color.displayColor ? ' product-picker__color-swatch--selected' : ''}`}
                      onClick={() => setSelectedColor(color.displayColor)}
                      title={color.displayColor}
                    >
                      {color.frontImageUrl ? (
                        <img
                          className="product-picker__color-img"
                          src={color.frontImageUrl}
                          alt={color.displayColor}
                        />
                      ) : color.swatchUrl ? (
                        <img
                          className="product-picker__color-img"
                          src={color.swatchUrl}
                          alt={color.displayColor}
                        />
                      ) : (
                        <span className="product-picker__color-placeholder">
                          {color.displayColor.charAt(0)}
                        </span>
                      )}
                      <span className="product-picker__color-label">
                        {color.displayColor}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Size selector */}
              <div className="product-picker__section">
                <label className="product-picker__section-label">Size</label>
                <div className="product-picker__size-row">
                  {preview.availableSizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      className={`product-picker__size-btn${selectedSize === size ? ' product-picker__size-btn--selected' : ''}`}
                      onClick={() => setSelectedSize(size)}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pricing */}
              <div className="product-picker__section">
                <label className="product-picker__section-label">Pricing</label>
                <div className="product-picker__pricing">
                  <div className="product-picker__price-row">
                    <span>Wholesale</span>
                    <span>${preview.pricing.wholesalePrice.toFixed(2)}</span>
                  </div>
                  <div className="product-picker__price-row product-picker__price-row--retail">
                    <span>Retail</span>
                    <span>${preview.pricing.suggestedRetail.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Selected color preview image */}
              {selectedColorData?.frontImageUrl && (
                <div className="product-picker__preview-image">
                  <img
                    src={selectedColorData.frontImageUrl}
                    alt={`${preview.brandName} ${preview.productTitle} - ${selectedColor}`}
                  />
                </div>
              )}

              {/* Quantity */}
              <div className="product-picker__section">
                <label className="product-picker__section-label">Quantity</label>
                <input
                  className="product-picker__qty-input"
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                  }
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="product-picker__footer">
          {step === 2 && (
            <button
              type="button"
              className="product-picker__back-btn"
              onClick={handleBack}
            >
              Back
            </button>
          )}
          <div className="product-picker__footer-spacer" />
          <button
            type="button"
            className="product-picker__cancel-btn"
            onClick={onClose}
          >
            Cancel
          </button>
          {step === 2 && (
            <button
              type="button"
              className="product-picker__add-btn"
              disabled={!selectedColor || !selectedSize}
              onClick={handleAddToOrder}
            >
              Add to Order
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductPicker;
export type { PickedProduct, ProductPickerProps };
