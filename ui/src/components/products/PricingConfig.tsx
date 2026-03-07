/**
 * PricingConfig -- Pricing configuration panel for the 'configure' step.
 *
 * Provides preset selector, editable markup/rounding/size upcharges,
 * live price preview with margin calculation, optional decoration cost,
 * and collection assignment.
 *
 * Phase 47: Product Pipeline Creation UI
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

// =============================================================================
// Types (frontend-only, mirroring backend pricing-rules.ts)
// =============================================================================

interface PricingConfigData {
  markupPercent: number;
  rounding: 'none' | 'nearest-99' | 'nearest-dollar';
  sizeUpcharges: Record<string, number>;
}

interface PricingPreset {
  name: string;
  description: string;
  config: PricingConfigData;
}

type DecorationType = 'none' | 'screen-print' | 'embroidery' | 'heat-transfer' | 'dtg';

export interface PricingConfigValues {
  pricingConfig: PricingConfigData;
  presetKey: string;
  decorationCost: number;
  decorationType: DecorationType;
  collections: string[];
}

interface PricingConfigProps {
  wholesalePrice: number;
  selectedSizes: string[];
  onSubmit: (values: PricingConfigValues) => void;
  /** Initial values from a loaded template */
  initialValues?: Partial<PricingConfigValues>;
}

// =============================================================================
// Constants (matching backend)
// =============================================================================

const UPCHARGE_SIZES = ['2XL', '3XL', '4XL', '5XL', '6XL'];
const DEFAULT_SIZE_UPCHARGES: Record<string, number> = {
  '2XL': 2.00,
  '3XL': 3.00,
  '4XL': 4.00,
  '5XL': 5.00,
  '6XL': 6.00,
};

const ROUNDING_OPTIONS: Array<{ value: PricingConfigData['rounding']; label: string }> = [
  { value: 'nearest-99', label: '.99' },
  { value: 'nearest-dollar', label: 'Round $' },
  { value: 'none', label: 'Exact' },
];

const DECORATION_TYPES: Array<{ value: DecorationType; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'screen-print', label: 'Screen Print' },
  { value: 'embroidery', label: 'Embroidery' },
  { value: 'heat-transfer', label: 'Heat Transfer' },
  { value: 'dtg', label: 'DTG' },
];

// =============================================================================
// Price calculation (mirrors backend pricing-rules.ts)
// =============================================================================

function calculateRetailPrice(
  wholesaleCost: number,
  markupPercent: number,
  rounding: PricingConfigData['rounding'],
): number {
  const rawPrice = wholesaleCost * (1 + markupPercent / 100);
  switch (rounding) {
    case 'nearest-99':
      return Math.floor(rawPrice) + 0.99;
    case 'nearest-dollar':
      return Math.round(rawPrice);
    case 'none':
      return Math.round(rawPrice * 100) / 100;
  }
}

function calculateMargin(
  retailPrice: number,
  wholesaleCost: number,
  decorationCost: number,
): { dollars: number; percent: number } {
  const totalCost = wholesaleCost + decorationCost;
  const dollars = Math.round((retailPrice - totalCost) * 100) / 100;
  const percent = retailPrice > 0
    ? Math.round(((retailPrice - totalCost) / retailPrice) * 10000) / 100
    : 0;
  return { dollars, percent };
}

// =============================================================================
// Component
// =============================================================================

function PricingConfig({
  wholesalePrice,
  selectedSizes,
  onSubmit,
  initialValues,
}: PricingConfigProps) {
  const [presets, setPresets] = useState<Record<string, PricingPreset>>({});
  const [presetKey, setPresetKey] = useState(initialValues?.presetKey ?? 'standard-tee');
  const [markupPercent, setMarkupPercent] = useState(initialValues?.pricingConfig?.markupPercent ?? 100);
  const [rounding, setRounding] = useState<PricingConfigData['rounding']>(
    initialValues?.pricingConfig?.rounding ?? 'nearest-99',
  );
  const [sizeUpcharges, setSizeUpcharges] = useState<Record<string, number>>(
    initialValues?.pricingConfig?.sizeUpcharges ?? { ...DEFAULT_SIZE_UPCHARGES },
  );
  const [decorationCost, setDecorationCost] = useState(initialValues?.decorationCost ?? 0);
  const [decorationType, setDecorationType] = useState<DecorationType>(
    initialValues?.decorationType ?? 'none',
  );
  const [collectionsText, setCollectionsText] = useState(
    initialValues?.collections?.join(', ') ?? '',
  );

  // Fetch presets on mount
  useEffect(() => {
    fetch('/api/pipeline/presets')
      .then((r) => r.json())
      .then((data) => setPresets(data as Record<string, PricingPreset>))
      .catch(() => {
        // Ignore fetch errors - presets are optional enhancement
      });
  }, []);

  // When preset changes, populate fields
  const handlePresetChange = useCallback(
    (key: string) => {
      setPresetKey(key);
      const preset = presets[key];
      if (preset) {
        setMarkupPercent(preset.config.markupPercent);
        setRounding(preset.config.rounding);
        setSizeUpcharges({ ...preset.config.sizeUpcharges });
      }
    },
    [presets],
  );

  // Size upcharge handler
  const handleUpchargeChange = useCallback((size: string, value: string) => {
    const num = parseFloat(value);
    setSizeUpcharges((prev) => ({
      ...prev,
      [size]: isNaN(num) ? 0 : Math.round(num * 100) / 100,
    }));
  }, []);

  // Which upcharge sizes are relevant (intersection of selectedSizes and UPCHARGE_SIZES)
  const relevantUpchargeSizes = useMemo(
    () => UPCHARGE_SIZES.filter((s) => selectedSizes.includes(s)),
    [selectedSizes],
  );

  // Live price preview
  const retailPrice = useMemo(
    () => calculateRetailPrice(wholesalePrice, markupPercent, rounding),
    [wholesalePrice, markupPercent, rounding],
  );

  const margin = useMemo(
    () => calculateMargin(retailPrice, wholesalePrice, decorationCost),
    [retailPrice, wholesalePrice, decorationCost],
  );

  // Submit handler
  const handleSubmit = useCallback(() => {
    const collections = collectionsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    onSubmit({
      pricingConfig: {
        markupPercent,
        rounding,
        sizeUpcharges,
      },
      presetKey,
      decorationCost,
      decorationType,
      collections,
    });
  }, [markupPercent, rounding, sizeUpcharges, presetKey, decorationCost, decorationType, collectionsText, onSubmit]);

  // Apply initial values when they change (template load)
  useEffect(() => {
    if (initialValues) {
      if (initialValues.presetKey) setPresetKey(initialValues.presetKey);
      if (initialValues.pricingConfig) {
        setMarkupPercent(initialValues.pricingConfig.markupPercent);
        setRounding(initialValues.pricingConfig.rounding);
        setSizeUpcharges({ ...initialValues.pricingConfig.sizeUpcharges });
      }
      if (initialValues.decorationCost != null) setDecorationCost(initialValues.decorationCost);
      if (initialValues.decorationType) setDecorationType(initialValues.decorationType);
      if (initialValues.collections) setCollectionsText(initialValues.collections.join(', '));
    }
  }, [initialValues]);

  return (
    <div className="pricing-config">
      {/* Preset selector */}
      <div className="pricing-config__section">
        <label className="pricing-config__label" htmlFor="preset-select">
          Pricing Preset
        </label>
        <div className="pricing-config__presets">
          {Object.entries(presets).map(([key, preset]) => (
            <button
              key={key}
              type="button"
              className={`pricing-config__preset-btn${presetKey === key ? ' pricing-config__preset-btn--active' : ''}`}
              onClick={() => handlePresetChange(key)}
              title={preset.description}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Markup % */}
      <div className="pricing-config__section">
        <label className="pricing-config__label" htmlFor="markup-input">
          Markup %
        </label>
        <input
          id="markup-input"
          className="pricing-config__number-input"
          type="number"
          min="0"
          max="500"
          step="5"
          value={markupPercent}
          onChange={(e) => {
            setMarkupPercent(parseFloat(e.target.value) || 0);
            setPresetKey('custom');
          }}
        />
      </div>

      {/* Rounding */}
      <div className="pricing-config__section">
        <span className="pricing-config__label">Rounding</span>
        <div className="pricing-config__rounding">
          {ROUNDING_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`pricing-config__rounding-btn${rounding === opt.value ? ' pricing-config__rounding-btn--active' : ''}`}
              onClick={() => {
                setRounding(opt.value);
                setPresetKey('custom');
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Size upcharges */}
      {relevantUpchargeSizes.length > 0 && (
        <div className="pricing-config__section">
          <span className="pricing-config__label">Size Upcharges</span>
          <div className="pricing-config__upcharges">
            {relevantUpchargeSizes.map((size) => (
              <div key={size} className="pricing-config__upcharge-row">
                <span className="pricing-config__upcharge-size">{size}</span>
                <div className="pricing-config__upcharge-input-wrap">
                  <span className="pricing-config__upcharge-dollar">$</span>
                  <input
                    className="pricing-config__upcharge-input"
                    type="number"
                    min="0"
                    step="0.50"
                    value={sizeUpcharges[size] ?? 0}
                    onChange={(e) => handleUpchargeChange(size, e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live price preview */}
      <div className="pricing-config__price-preview">
        <div className="pricing-config__price-preview-row">
          <span className="pricing-config__price-preview-label">Wholesale</span>
          <span className="pricing-config__price-preview-value">
            ${wholesalePrice.toFixed(2)}
          </span>
        </div>
        <div className="pricing-config__price-preview-row">
          <span className="pricing-config__price-preview-label">Retail</span>
          <span className="pricing-config__price-preview-value pricing-config__price-preview-value--retail">
            ${retailPrice.toFixed(2)}
          </span>
        </div>
        <div className="pricing-config__price-preview-row">
          <span className="pricing-config__price-preview-label">Margin</span>
          <span className={`pricing-config__price-preview-value ${margin.percent >= 30 ? 'pricing-config__price-preview-value--good' : 'pricing-config__price-preview-value--warn'}`}>
            ${margin.dollars.toFixed(2)} ({margin.percent}%)
          </span>
        </div>
      </div>

      {/* Decoration cost */}
      <div className="pricing-config__section pricing-config__section--row">
        <div className="pricing-config__half">
          <label className="pricing-config__label" htmlFor="deco-cost">
            Decoration Cost
          </label>
          <div className="pricing-config__upcharge-input-wrap">
            <span className="pricing-config__upcharge-dollar">$</span>
            <input
              id="deco-cost"
              className="pricing-config__upcharge-input"
              type="number"
              min="0"
              step="0.25"
              value={decorationCost}
              onChange={(e) => setDecorationCost(parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>
        <div className="pricing-config__half">
          <label className="pricing-config__label" htmlFor="deco-type">
            Decoration Type
          </label>
          <select
            id="deco-type"
            className="pricing-config__select"
            value={decorationType}
            onChange={(e) => setDecorationType(e.target.value as DecorationType)}
          >
            {DECORATION_TYPES.map((dt) => (
              <option key={dt.value} value={dt.value}>
                {dt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Collections */}
      <div className="pricing-config__section">
        <label className="pricing-config__label" htmlFor="collections-input">
          Collections (comma-separated)
        </label>
        <input
          id="collections-input"
          className="pricing-config__text-input"
          type="text"
          value={collectionsText}
          onChange={(e) => setCollectionsText(e.target.value)}
          placeholder="e.g. T-Shirts, Summer 2026"
        />
      </div>

      {/* Create button */}
      <button
        type="button"
        className="pricing-config__submit"
        onClick={handleSubmit}
      >
        Create Product
      </button>
    </div>
  );
}

export default PricingConfig;
export type { PricingConfigData, DecorationType };
