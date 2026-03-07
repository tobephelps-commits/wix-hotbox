/**
 * CreateFlow -- Creation progress display for the 'creating' step.
 *
 * Shows step-by-step progress as the product is created in WIX:
 * creating product -> adding media -> setting variants -> setting inventory -> adding to collections.
 * Each step shows a spinner when active, checkmark when complete, and error on failure.
 *
 * Phase 47: Product Pipeline Creation UI
 */

import { useState, useEffect, useCallback } from 'react';
import type { VendorId } from './StyleLookup';
import type { PricingConfigValues } from './PricingConfig';

// =============================================================================
// Types
// =============================================================================

interface CreationResult {
  productId: string;
  productUrl: string;
  variantsCreated: number;
  mediaAdded: number;
  status: 'draft';
  warnings: string[];
  collectionsAssigned: string[];
}

interface SelectedColor {
  catalogColor: string;
  displayColor: string;
}

interface CreateFlowProps {
  vendorId: VendorId;
  style: string;
  productTitle: string;
  selectedColors: SelectedColor[];
  selectedSizes: string[];
  pricingValues: PricingConfigValues;
  onComplete: (result: CreationResult) => void;
  onError: (error: string) => void;
}

type StepStatus = 'pending' | 'active' | 'done' | 'error';

interface Step {
  label: string;
  status: StepStatus;
}

// =============================================================================
// Component
// =============================================================================

function CreateFlow({
  vendorId,
  style,
  productTitle,
  selectedColors,
  selectedSizes,
  pricingValues,
  onComplete,
  onError,
}: CreateFlowProps) {
  const [steps, setSteps] = useState<Step[]>([
    { label: 'Creating product...', status: 'active' },
    { label: 'Adding media...', status: 'pending' },
    { label: 'Setting variants...', status: 'pending' },
    { label: 'Setting inventory...', status: 'pending' },
    { label: 'Adding to collections...', status: 'pending' },
  ]);
  const [error, setError] = useState<string | null>(null);

  const updateStep = useCallback((index: number, status: StepStatus) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, status } : s)),
    );
  }, []);

  const runCreation = useCallback(async () => {
    try {
      // Simulate step progression via timing (actual API does all steps server-side)
      // Mark step 0 active (already set)
      const body = {
        vendorId,
        style,
        selectedColors: selectedColors.map((c) => ({
          catalogColor: c.catalogColor,
          displayColor: c.displayColor,
        })),
        selectedSizes,
        pricingConfig: pricingValues.pricingConfig,
        pricingPreset: pricingValues.presetKey,
        collections: pricingValues.collections.length > 0 ? pricingValues.collections : undefined,
        decorationCost: pricingValues.decorationCost > 0 ? pricingValues.decorationCost : undefined,
        decorationType: pricingValues.decorationType !== 'none' ? pricingValues.decorationType : undefined,
      };

      const res = await fetch('/api/pipeline/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Creation failed (${res.status})`);
      }

      const result = (await res.json()) as CreationResult;

      // Mark all steps done
      setSteps((prev) => prev.map((s) => ({ ...s, status: 'done' as StepStatus })));

      // Brief delay so user sees all steps complete
      setTimeout(() => onComplete(result), 600);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);

      // Mark current active step as error
      setSteps((prev) =>
        prev.map((s) =>
          s.status === 'active' ? { ...s, status: 'error' as StepStatus } : s,
        ),
      );
      onError(msg);
    }
  }, [vendorId, style, selectedColors, selectedSizes, pricingValues, onComplete, onError]);

  // Simulate step progression with timers
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Step progression: each step takes ~800ms visually
    const stepDelay = 800;
    for (let i = 1; i < steps.length; i++) {
      timers.push(
        setTimeout(() => {
          updateStep(i - 1, 'done');
          updateStep(i, 'active');
        }, stepDelay * i),
      );
    }

    // Actual API call starts immediately
    runCreation();

    return () => timers.forEach(clearTimeout);
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRetry = useCallback(() => {
    setError(null);
    setSteps([
      { label: 'Creating product...', status: 'active' },
      { label: 'Adding media...', status: 'pending' },
      { label: 'Setting variants...', status: 'pending' },
      { label: 'Setting inventory...', status: 'pending' },
      { label: 'Adding to collections...', status: 'pending' },
    ]);
    runCreation();
  }, [runCreation]);

  return (
    <div className="create-flow">
      <h3 className="create-flow__title">Creating Product</h3>
      <p className="create-flow__subtitle">{productTitle} ({style})</p>

      <div className="create-flow__steps">
        {steps.map((step, i) => (
          <div
            key={i}
            className={`create-flow__step create-flow__step--${step.status}`}
          >
            <span className="create-flow__step-icon">
              {step.status === 'done' && '\u2713'}
              {step.status === 'active' && (
                <span className="create-flow__spinner" />
              )}
              {step.status === 'error' && '\u2717'}
              {step.status === 'pending' && '\u2022'}
            </span>
            <span className="create-flow__step-label">{step.label}</span>
          </div>
        ))}
      </div>

      {error && (
        <div className="create-flow__error">
          <p className="create-flow__error-text">{error}</p>
          <button
            type="button"
            className="create-flow__retry-btn"
            onClick={handleRetry}
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}

export default CreateFlow;
export type { CreationResult, SelectedColor };
