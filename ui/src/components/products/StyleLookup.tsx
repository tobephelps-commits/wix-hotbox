/**
 * StyleLookup — Style number entry form with vendor selector.
 *
 * Allows the user to enter a vendor style number and choose SanMar or S&S,
 * then fetches a product preview from the pipeline API.
 *
 * Phase 47: Product Pipeline Creation UI
 */

import { useState, useCallback } from 'react';
import type { FormEvent } from 'react';

type VendorId = 'sanmar' | 'ss';

interface PreviewData {
  style: string;
  brandName: string;
  productTitle: string;
  description: string;
  availableColors: Array<{
    catalogColor: string;
    displayColor: string;
    swatchUrl: string | null;
    frontImageUrl: string | null;
    backImageUrl: string | null;
    sideImageUrl: string | null;
    inStock: boolean;
    stockUnknown?: boolean;
  }>;
  availableSizes: string[];
  pricing: {
    wholesalePrice: number;
    suggestedRetail: number;
    saleActive: boolean;
  };
}

interface StyleLookupProps {
  onPreviewReady: (preview: PreviewData, vendorId: VendorId, style: string) => void;
}

const vendors: Array<{ id: VendorId; label: string }> = [
  { id: 'sanmar', label: 'SanMar' },
  { id: 'ss', label: 'S&S' },
];

function StyleLookup({ onPreviewReady }: StyleLookupProps) {
  const [style, setStyle] = useState('');
  const [vendor, setVendor] = useState<VendorId>('sanmar');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const trimmed = style.trim().toUpperCase();
      if (!trimmed) return;

      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/pipeline/preview/${vendor}/${encodeURIComponent(trimmed)}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || `Request failed (${res.status})`);
          return;
        }

        onPreviewReady(data as PreviewData, vendor, trimmed);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Network error');
      } finally {
        setLoading(false);
      }
    },
    [style, vendor, onPreviewReady],
  );

  return (
    <form className="style-lookup" onSubmit={handleSubmit}>
      <div className="style-lookup__section">
        <label className="style-lookup__label" htmlFor="style-input">
          Style Number
        </label>
        <input
          id="style-input"
          className="style-lookup__input"
          type="text"
          value={style}
          onChange={(e) => setStyle(e.target.value)}
          placeholder="e.g. PC61, 2000"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          disabled={loading}
        />
      </div>

      <div className="style-lookup__section">
        <span className="style-lookup__label">Vendor</span>
        <div className="style-lookup__vendors">
          {vendors.map((v) => (
            <button
              key={v.id}
              type="button"
              className={`style-lookup__vendor-btn${vendor === v.id ? ' style-lookup__vendor-btn--active' : ''}`}
              onClick={() => setVendor(v.id)}
              disabled={loading}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        className="style-lookup__submit"
        disabled={!style.trim() || loading}
      >
        {loading && <span className="style-lookup__spinner" />}
        {loading ? 'Looking up...' : 'Look Up'}
      </button>

      {error && <div className="style-lookup__error">{error}</div>}
    </form>
  );
}

export default StyleLookup;
export type { PreviewData, VendorId };
