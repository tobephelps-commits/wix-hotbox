/**
 * ProductsTab — Main container for the product creation pipeline workflow.
 *
 * State machine with steps: lookup -> preview -> configure -> creating -> done.
 * Plans 03 implements lookup and preview. Plan 04 implements configure/creating/done.
 *
 * Phase 47: Product Pipeline Creation UI
 */

import { useState, useCallback } from 'react';
import StyleLookup from './StyleLookup';
import ProductPreview from './ProductPreview';
import type { PreviewData, VendorId } from './StyleLookup';
import './ProductsTab.css';

type Step = 'lookup' | 'preview' | 'configure' | 'creating' | 'done';

function ProductsTab() {
  const [step, setStep] = useState<Step>('lookup');
  const [currentPreview, setCurrentPreview] = useState<PreviewData | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<VendorId>('sanmar');
  const [selectedStyle, setSelectedStyle] = useState('');

  const handlePreviewReady = useCallback(
    (preview: PreviewData, vendorId: VendorId, style: string) => {
      setCurrentPreview(preview);
      setSelectedVendor(vendorId);
      setSelectedStyle(style);
      setStep('preview');
    },
    [],
  );

  const handleBack = useCallback(() => {
    setStep('lookup');
  }, []);

  const handleContinue = useCallback(() => {
    setStep('configure');
  }, []);

  return (
    <div className="products-tab">
      {/* Lookup step */}
      {step === 'lookup' && (
        <>
          <div className="products-tab__header">
            <h2 className="products-tab__title">Create Product</h2>
          </div>
          <StyleLookup onPreviewReady={handlePreviewReady} />
        </>
      )}

      {/* Preview step */}
      {step === 'preview' && currentPreview && (
        <>
          <div className="products-tab__header">
            <button
              type="button"
              className="products-tab__back-btn"
              onClick={handleBack}
              aria-label="Back to lookup"
            >
              &#8592;
            </button>
            <h2 className="products-tab__title">Preview</h2>
          </div>
          <ProductPreview
            preview={currentPreview}
            vendorId={selectedVendor}
            style={selectedStyle}
            onContinue={handleContinue}
          />
        </>
      )}

      {/* Future steps: configure, creating, done */}
      {(step === 'configure' || step === 'creating' || step === 'done') && (
        <div className="products-tab__placeholder">
          Coming in Plan 04 &mdash; {step}
        </div>
      )}
    </div>
  );
}

export default ProductsTab;
