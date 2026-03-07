/**
 * ProductsTab -- Main container for the product creation pipeline workflow.
 *
 * State machine with steps: lookup -> preview -> configure -> creating -> done.
 * Plan 03: lookup and preview. Plan 04: configure, creating, done.
 *
 * Phase 47: Product Pipeline Creation UI
 */

import { useState, useCallback, useRef } from 'react';
import StyleLookup from './StyleLookup';
import ProductPreview from './ProductPreview';
import PricingConfig from './PricingConfig';
import TemplateSelector from './TemplateSelector';
import CreateFlow from './CreateFlow';
import CreationResult from './CreationResult';
import type { PreviewData, VendorId } from './StyleLookup';
import type { PricingConfigValues } from './PricingConfig';
import type { CreationResult as CreationResultData, SelectedColor } from './CreateFlow';
import './ProductsTab.css';

type Step = 'lookup' | 'preview' | 'configure' | 'creating' | 'done';

function ProductsTab() {
  const [step, setStep] = useState<Step>('lookup');
  const [currentPreview, setCurrentPreview] = useState<PreviewData | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<VendorId>('sanmar');
  const [selectedStyle, setSelectedStyle] = useState('');
  const [selectedColors, setSelectedColors] = useState<SelectedColor[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [pricingValues, setPricingValues] = useState<PricingConfigValues | null>(null);
  const [creationResult, setCreationResult] = useState<CreationResultData | null>(null);
  const [templateInitialValues, setTemplateInitialValues] = useState<Partial<PricingConfigValues> | undefined>(undefined);

  // Ref for getting current pricing values (used by TemplateSelector save)
  const pricingValuesRef = useRef<PricingConfigValues>({
    pricingConfig: { markupPercent: 100, rounding: 'nearest-99', sizeUpcharges: {} },
    presetKey: 'standard-tee',
    decorationCost: 0,
    decorationType: 'none',
    collections: [],
  });

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

  const handleBackToConfigure = useCallback(() => {
    setStep('configure');
  }, []);

  const handleContinue = useCallback(
    (colors: SelectedColor[], sizes: string[]) => {
      setSelectedColors(colors);
      setSelectedSizes(sizes);
      setStep('configure');
    },
    [],
  );

  const handlePricingSubmit = useCallback((values: PricingConfigValues) => {
    setPricingValues(values);
    pricingValuesRef.current = values;
    setStep('creating');
  }, []);

  const handleCreationComplete = useCallback((result: CreationResultData) => {
    setCreationResult(result);
    setStep('done');
  }, []);

  const handleCreationError = useCallback((_error: string) => {
    // Error is displayed by CreateFlow itself; user can retry or go back
  }, []);

  const handleCreateAnother = useCallback(() => {
    setCurrentPreview(null);
    setSelectedColors([]);
    setSelectedSizes([]);
    setPricingValues(null);
    setCreationResult(null);
    setTemplateInitialValues(undefined);
    setStep('lookup');
  }, []);

  const handleTemplateLoad = useCallback((values: Partial<PricingConfigValues>) => {
    setTemplateInitialValues(values);
  }, []);

  const getCurrentPricingValues = useCallback(() => {
    return pricingValuesRef.current;
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

      {/* Configure step */}
      {step === 'configure' && currentPreview && (
        <>
          <div className="products-tab__header">
            <button
              type="button"
              className="products-tab__back-btn"
              onClick={() => setStep('preview')}
              aria-label="Back to preview"
            >
              &#8592;
            </button>
            <h2 className="products-tab__title">Configure Pricing</h2>
          </div>
          <TemplateSelector
            onLoad={handleTemplateLoad}
            getCurrentValues={getCurrentPricingValues}
          />
          <PricingConfig
            wholesalePrice={currentPreview.pricing.wholesalePrice}
            selectedSizes={selectedSizes}
            onSubmit={handlePricingSubmit}
            initialValues={templateInitialValues}
          />
        </>
      )}

      {/* Creating step */}
      {step === 'creating' && currentPreview && pricingValues && (
        <>
          <div className="products-tab__header">
            <h2 className="products-tab__title">Creating Product</h2>
          </div>
          <CreateFlow
            vendorId={selectedVendor}
            style={selectedStyle}
            productTitle={currentPreview.productTitle}
            selectedColors={selectedColors}
            selectedSizes={selectedSizes}
            pricingValues={pricingValues}
            onComplete={handleCreationComplete}
            onError={handleCreationError}
          />
        </>
      )}

      {/* Done step */}
      {step === 'done' && creationResult && (
        <>
          <div className="products-tab__header">
            <h2 className="products-tab__title">Product Created</h2>
          </div>
          <CreationResult
            result={creationResult}
            onCreateAnother={handleCreateAnother}
          />
        </>
      )}
    </div>
  );
}

export default ProductsTab;
