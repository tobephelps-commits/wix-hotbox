/**
 * TemplateSelector -- Template load/save UI for pricing configuration.
 *
 * Provides a dropdown of saved templates, load/save/delete controls,
 * and a name input for saving new templates.
 *
 * Phase 47: Product Pipeline Creation UI
 */

import { useState, useEffect, useCallback } from 'react';
import type { PricingConfigValues } from './PricingConfig';

interface TemplateSummary {
  name: string;
  description?: string;
  pricingPreset?: string;
  pricingConfig?: {
    markupPercent: number;
    rounding: 'none' | 'nearest-99' | 'nearest-dollar';
    sizeUpcharges: Record<string, number>;
  };
  collections?: string[];
  decorationCost?: number;
  decorationType?: string;
}

interface TemplateSelectorProps {
  onLoad: (values: Partial<PricingConfigValues>) => void;
  getCurrentValues: () => PricingConfigValues;
}

function TemplateSelector({ onLoad, getCurrentValues }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [selectedName, setSelectedName] = useState('');
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch templates on mount
  const fetchTemplates = useCallback(() => {
    fetch('/api/pipeline/templates')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTemplates(data as TemplateSummary[]);
        }
      })
      .catch(() => {
        // Ignore fetch errors
      });
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Load selected template
  const handleLoad = useCallback(() => {
    const template = templates.find((t) => t.name === selectedName);
    if (!template) return;

    const values: Partial<PricingConfigValues> = {};
    if (template.pricingPreset) values.presetKey = template.pricingPreset;
    if (template.pricingConfig) values.pricingConfig = template.pricingConfig;
    if (template.collections) values.collections = template.collections;
    if (template.decorationCost != null) values.decorationCost = template.decorationCost;
    if (template.decorationType) {
      values.decorationType = template.decorationType as PricingConfigValues['decorationType'];
    }

    onLoad(values);
    setMessage({ type: 'success', text: `Loaded "${template.name}"` });
    setTimeout(() => setMessage(null), 2000);
  }, [templates, selectedName, onLoad]);

  // Save current config as template
  const handleSave = useCallback(async () => {
    const name = saveName.trim();
    if (!name) return;

    setSaving(true);
    setMessage(null);

    try {
      const current = getCurrentValues();
      const body = {
        name,
        pricingPreset: current.presetKey,
        pricingConfig: current.pricingConfig,
        collections: current.collections.length > 0 ? current.collections : undefined,
        decorationCost: current.decorationCost > 0 ? current.decorationCost : undefined,
        decorationType: current.decorationType !== 'none' ? current.decorationType : undefined,
      };

      const res = await fetch('/api/pipeline/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Save failed');
      }

      setSaveName('');
      setShowSave(false);
      setMessage({ type: 'success', text: `Saved "${name}"` });
      setTimeout(() => setMessage(null), 2000);
      fetchTemplates();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  }, [saveName, getCurrentValues, fetchTemplates]);

  // Delete template
  const handleDelete = useCallback(async () => {
    if (!selectedName) return;

    try {
      const res = await fetch(`/api/pipeline/templates/${encodeURIComponent(selectedName)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Delete failed');
      }

      setSelectedName('');
      setMessage({ type: 'success', text: 'Template deleted' });
      setTimeout(() => setMessage(null), 2000);
      fetchTemplates();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Delete failed' });
    }
  }, [selectedName, fetchTemplates]);

  return (
    <div className="template-selector">
      <div className="template-selector__header">
        <span className="template-selector__label">Templates</span>
      </div>

      <div className="template-selector__controls">
        {/* Dropdown + load/delete */}
        <div className="template-selector__row">
          <select
            className="template-selector__select"
            value={selectedName}
            onChange={(e) => setSelectedName(e.target.value)}
          >
            <option value="">-- Select template --</option>
            {templates.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="template-selector__btn"
            disabled={!selectedName}
            onClick={handleLoad}
          >
            Load
          </button>
          <button
            type="button"
            className="template-selector__btn template-selector__btn--danger"
            disabled={!selectedName}
            onClick={handleDelete}
          >
            Delete
          </button>
        </div>

        {/* Save toggle / form */}
        {showSave ? (
          <div className="template-selector__row">
            <input
              className="template-selector__name-input"
              type="text"
              placeholder="Template name"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
              }}
            />
            <button
              type="button"
              className="template-selector__btn template-selector__btn--save"
              disabled={saving || !saveName.trim()}
              onClick={handleSave}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              className="template-selector__btn"
              onClick={() => {
                setShowSave(false);
                setSaveName('');
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="template-selector__btn template-selector__btn--save"
            onClick={() => setShowSave(true)}
          >
            Save as Template
          </button>
        )}
      </div>

      {/* Status message */}
      {message && (
        <div className={`template-selector__message template-selector__message--${message.type}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}

export default TemplateSelector;
