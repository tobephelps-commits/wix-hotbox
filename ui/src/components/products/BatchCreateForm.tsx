/**
 * BatchCreateForm -- Multi-product batch creation UI with SSE progress streaming.
 *
 * Provides a multi-step flow:
 * 1. Style Input: textarea for entering style numbers, vendor selector
 * 2. Shared Pricing Config: markup, rounding, decoration, collections
 * 3. Progress Display: real-time SSE progress with per-item status
 * 4. Results Summary: created/failed counts with per-item results
 *
 * Phase 59: v1.x Feature Parity Audit — Batch Product Creation
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { PricingConfigValues } from './PricingConfig';
import './BatchCreateForm.css';

// =============================================================================
// Types
// =============================================================================

type VendorId = 'sanmar' | 'ss';

type BatchStep = 'input' | 'pricing' | 'progress' | 'results';

interface BatchItem {
  vendorId: VendorId;
  styleNumber: string;
}

type ItemStatus = 'queued' | 'fetching' | 'creating' | 'done' | 'error';

interface ProgressItem {
  style: string;
  status: ItemStatus;
  message?: string;
}

interface BatchResult {
  style: string;
  success: boolean;
  productId?: string;
  error?: string;
}

interface BatchCompleteData {
  created: number;
  failed: number;
  results: BatchResult[];
}

interface PricingPreset {
  name: string;
  description: string;
  config: {
    markupPercent: number;
    rounding: 'none' | 'nearest-99' | 'nearest-dollar';
    sizeUpcharges: Record<string, number>;
  };
}

type DecorationType = 'none' | 'screen-print' | 'embroidery' | 'heat-transfer' | 'dtg';

interface BatchCreateFormProps {
  onComplete: () => void;
  onCancel: () => void;
}

// =============================================================================
// Constants
// =============================================================================

const ROUNDING_OPTIONS: Array<{ value: 'none' | 'nearest-99' | 'nearest-dollar'; label: string }> = [
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
// Component
// =============================================================================

function BatchCreateForm({ onComplete, onCancel }: BatchCreateFormProps) {
  const [step, setStep] = useState<BatchStep>('input');

  // Input step state
  const [stylesText, setStylesText] = useState('');
  const [vendor, setVendor] = useState<VendorId>('sanmar');

  // Pricing step state
  const [presets, setPresets] = useState<Record<string, PricingPreset>>({});
  const [presetKey, setPresetKey] = useState('standard-tee');
  const [markupPercent, setMarkupPercent] = useState(100);
  const [rounding, setRounding] = useState<'none' | 'nearest-99' | 'nearest-dollar'>('nearest-99');
  const [decorationCost, setDecorationCost] = useState(0);
  const [decorationType, setDecorationType] = useState<DecorationType>('none');
  const [collectionsText, setCollectionsText] = useState('');

  // Progress step state
  const [progressItems, setProgressItems] = useState<ProgressItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Results step state
  const [batchResults, setBatchResults] = useState<BatchCompleteData | null>(null);

  // Parsed items ref
  const parsedItemsRef = useRef<BatchItem[]>([]);

  // Parse styles from textarea
  const parsedItems = useMemo<BatchItem[]>(() => {
    const lines = stylesText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    // Deduplicate
    const seen = new Set<string>();
    const items: BatchItem[] = [];
    for (const line of lines) {
      const key = `${vendor}:${line.toUpperCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        items.push({ vendorId: vendor, styleNumber: line.toUpperCase() });
      }
    }
    return items;
  }, [stylesText, vendor]);

  // Fetch presets on mount
  useEffect(() => {
    fetch('/api/pipeline/presets')
      .then((r) => r.json())
      .then((data) => setPresets(data as Record<string, PricingPreset>))
      .catch(() => {});
  }, []);

  // Preset change handler
  const handlePresetChange = useCallback((key: string) => {
    setPresetKey(key);
    const preset = presets[key];
    if (preset) {
      setMarkupPercent(preset.config.markupPercent);
      setRounding(preset.config.rounding);
    }
  }, [presets]);

  // Navigate to pricing step
  const handleGoToPricing = useCallback(() => {
    parsedItemsRef.current = parsedItems;
    setStep('pricing');
  }, [parsedItems]);

  // Start batch creation
  const handleStartBatch = useCallback(async () => {
    const items = parsedItemsRef.current;
    const collections = collectionsText.split(',').map((s) => s.trim()).filter(Boolean);

    // Initialize progress items
    setProgressItems(items.map((item) => ({
      style: item.styleNumber,
      status: 'queued' as ItemStatus,
    })));
    setCurrentIndex(0);
    setStep('progress');

    try {
      const body = {
        items: items.map((item) => ({
          vendorId: item.vendorId,
          styleNumber: item.styleNumber,
        })),
        pricingConfig: {
          markupPercent,
          rounding,
          sizeUpcharges: {},
        },
        presetKey,
        decorationCost: decorationCost > 0 ? decorationCost : undefined,
        decorationType: decorationType !== 'none' ? decorationType : undefined,
        collections: collections.length > 0 ? collections : undefined,
      };

      const response = await fetch('/api/pipeline/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Batch request failed (${response.status})`);
      }

      // Parse SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        let eventType = '';
        let eventData = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            eventData = line.slice(6);
          } else if (line === '' && eventType && eventData) {
            // Process event
            try {
              const data = JSON.parse(eventData);
              if (eventType === 'progress') {
                const { index, status, message } = data as {
                  index: number;
                  style: string;
                  status: ItemStatus;
                  message?: string;
                };
                setCurrentIndex(index);
                setProgressItems((prev) =>
                  prev.map((item, i) =>
                    i === index ? { ...item, status, message } : item,
                  ),
                );
              } else if (eventType === 'complete') {
                setBatchResults(data as BatchCompleteData);
                setStep('results');
              }
            } catch {
              // Ignore malformed events
            }
            eventType = '';
            eventData = '';
          }
        }
      }
    } catch (err) {
      // If stream fails, show error in results
      setBatchResults({
        created: 0,
        failed: parsedItemsRef.current.length,
        results: parsedItemsRef.current.map((item) => ({
          style: item.styleNumber,
          success: false,
          error: err instanceof Error ? err.message : 'Connection failed',
        })),
      });
      setStep('results');
    }
  }, [markupPercent, rounding, presetKey, decorationCost, decorationType, collectionsText]);

  // Reset to start
  const handleCreateMore = useCallback(() => {
    setStylesText('');
    setProgressItems([]);
    setBatchResults(null);
    setStep('input');
  }, []);

  // Input validation
  const canProceed = parsedItems.length >= 2 && parsedItems.length <= 50;

  // ---------------------------------------------------------------------------
  // Render: Input step
  // ---------------------------------------------------------------------------
  if (step === 'input') {
    return (
      <div className="batch-create">
        <div className="batch-create__header">
          <button type="button" className="batch-create__back-btn" onClick={onCancel} aria-label="Back to single product">
            &#8592;
          </button>
          <h2 className="batch-create__title">Batch Create Products</h2>
        </div>

        <div className="batch-create__section">
          <label className="batch-create__label">Vendor</label>
          <div className="batch-create__vendors">
            <button
              type="button"
              className={`batch-create__vendor-btn${vendor === 'sanmar' ? ' batch-create__vendor-btn--active' : ''}`}
              onClick={() => setVendor('sanmar')}
            >
              SanMar
            </button>
            <button
              type="button"
              className={`batch-create__vendor-btn${vendor === 'ss' ? ' batch-create__vendor-btn--active' : ''}`}
              onClick={() => setVendor('ss')}
            >
              S&amp;S Activewear
            </button>
          </div>
        </div>

        <div className="batch-create__section">
          <label className="batch-create__label" htmlFor="batch-styles-input">
            Style Numbers (one per line)
          </label>
          <textarea
            id="batch-styles-input"
            className="batch-create__textarea"
            value={stylesText}
            onChange={(e) => setStylesText(e.target.value)}
            placeholder={"PC54\nDT6000\nNF0A7V6K"}
            rows={8}
          />
          <div className="batch-create__count">
            {parsedItems.length} style{parsedItems.length !== 1 ? 's' : ''} entered
            {parsedItems.length > 0 && parsedItems.length < 2 && (
              <span className="batch-create__count-warn"> (minimum 2 for batch)</span>
            )}
            {parsedItems.length > 50 && (
              <span className="batch-create__count-warn"> (maximum 50)</span>
            )}
          </div>
        </div>

        <button
          type="button"
          className="batch-create__proceed-btn"
          disabled={!canProceed}
          onClick={handleGoToPricing}
        >
          Configure Pricing
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Pricing step
  // ---------------------------------------------------------------------------
  if (step === 'pricing') {
    return (
      <div className="batch-create">
        <div className="batch-create__header">
          <button type="button" className="batch-create__back-btn" onClick={() => setStep('input')} aria-label="Back to style input">
            &#8592;
          </button>
          <h2 className="batch-create__title">Shared Pricing</h2>
          <span className="batch-create__badge">{parsedItemsRef.current.length} styles</span>
        </div>

        {/* Preset selector */}
        <div className="batch-create__section">
          <label className="batch-create__label">Pricing Preset</label>
          <div className="batch-create__presets">
            {Object.entries(presets).map(([key, preset]) => (
              <button
                key={key}
                type="button"
                className={`batch-create__preset-btn${presetKey === key ? ' batch-create__preset-btn--active' : ''}`}
                onClick={() => handlePresetChange(key)}
                title={preset.description}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Markup % */}
        <div className="batch-create__section">
          <label className="batch-create__label" htmlFor="batch-markup">Markup %</label>
          <input
            id="batch-markup"
            className="batch-create__number-input"
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
        <div className="batch-create__section">
          <span className="batch-create__label">Rounding</span>
          <div className="batch-create__rounding">
            {ROUNDING_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`batch-create__rounding-btn${rounding === opt.value ? ' batch-create__rounding-btn--active' : ''}`}
                onClick={() => { setRounding(opt.value); setPresetKey('custom'); }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Decoration */}
        <div className="batch-create__section batch-create__section--row">
          <div className="batch-create__half">
            <label className="batch-create__label" htmlFor="batch-deco-cost">Decoration Cost</label>
            <input
              id="batch-deco-cost"
              className="batch-create__number-input"
              type="number"
              min="0"
              step="0.25"
              value={decorationCost}
              onChange={(e) => setDecorationCost(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="batch-create__half">
            <label className="batch-create__label" htmlFor="batch-deco-type">Decoration Type</label>
            <select
              id="batch-deco-type"
              className="batch-create__select"
              value={decorationType}
              onChange={(e) => setDecorationType(e.target.value as DecorationType)}
            >
              {DECORATION_TYPES.map((dt) => (
                <option key={dt.value} value={dt.value}>{dt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Collections */}
        <div className="batch-create__section">
          <label className="batch-create__label" htmlFor="batch-collections">Collections (comma-separated)</label>
          <input
            id="batch-collections"
            className="batch-create__text-input"
            type="text"
            value={collectionsText}
            onChange={(e) => setCollectionsText(e.target.value)}
            placeholder="e.g. T-Shirts, Summer 2026"
          />
        </div>

        <button
          type="button"
          className="batch-create__start-btn"
          onClick={handleStartBatch}
        >
          Create {parsedItemsRef.current.length} Products
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Progress step
  // ---------------------------------------------------------------------------
  if (step === 'progress') {
    const doneCount = progressItems.filter((p) => p.status === 'done' || p.status === 'error').length;
    const total = progressItems.length;
    const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

    return (
      <div className="batch-create">
        <div className="batch-create__header">
          <h2 className="batch-create__title">Creating Products...</h2>
        </div>

        {/* Progress bar */}
        <div className="batch-create__progress-bar-wrap">
          <div className="batch-create__progress-bar" style={{ width: `${pct}%` }} />
        </div>
        <div className="batch-create__progress-label">
          {doneCount} / {total} complete
        </div>

        {/* Per-item status list */}
        <div className="batch-create__item-list">
          {progressItems.map((item, i) => (
            <div
              key={i}
              className={`batch-create__item batch-create__item--${item.status}`}
            >
              <span className="batch-create__item-icon">
                {item.status === 'done' && '\u2713'}
                {item.status === 'error' && '\u2717'}
                {(item.status === 'fetching' || item.status === 'creating') && (
                  <span className="batch-create__spinner" />
                )}
                {item.status === 'queued' && '\u2022'}
              </span>
              <span className="batch-create__item-style">{item.style}</span>
              {item.message && (
                <span className="batch-create__item-message">{item.message}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Results step
  // ---------------------------------------------------------------------------
  if (step === 'results' && batchResults) {
    return (
      <div className="batch-create">
        <div className="batch-create__header">
          <h2 className="batch-create__title">Batch Complete</h2>
        </div>

        {/* Summary banner */}
        <div className={`batch-create__summary ${batchResults.failed === 0 ? 'batch-create__summary--success' : 'batch-create__summary--mixed'}`}>
          <div className="batch-create__summary-stat">
            <span className="batch-create__summary-value">{batchResults.created}</span>
            <span className="batch-create__summary-label">Created</span>
          </div>
          {batchResults.failed > 0 && (
            <div className="batch-create__summary-stat batch-create__summary-stat--failed">
              <span className="batch-create__summary-value">{batchResults.failed}</span>
              <span className="batch-create__summary-label">Failed</span>
            </div>
          )}
        </div>

        {/* Result list */}
        <div className="batch-create__result-list">
          {batchResults.results.map((result, i) => (
            <div
              key={i}
              className={`batch-create__result ${result.success ? 'batch-create__result--success' : 'batch-create__result--error'}`}
            >
              <span className="batch-create__result-icon">
                {result.success ? '\u2713' : '\u2717'}
              </span>
              <span className="batch-create__result-style">{result.style}</span>
              {result.success && result.productId && (
                <span className="batch-create__result-id">{result.productId}</span>
              )}
              {!result.success && result.error && (
                <span className="batch-create__result-error">{result.error}</span>
              )}
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="batch-create__result-actions">
          <button
            type="button"
            className="batch-create__done-btn"
            onClick={onComplete}
          >
            Done
          </button>
          <button
            type="button"
            className="batch-create__more-btn"
            onClick={handleCreateMore}
          >
            Create More
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default BatchCreateForm;
