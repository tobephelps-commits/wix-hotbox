/**
 * CreationResult -- Success result display for the 'done' step.
 *
 * Shows green success banner, product details, stats (variants, images,
 * collections), warnings if any, and a "Create Another" button.
 *
 * Phase 47: Product Pipeline Creation UI
 */

import type { CreationResult as CreationResultData } from './CreateFlow';

interface CreationResultProps {
  result: CreationResultData;
  onCreateAnother: () => void;
}

function CreationResult({ result, onCreateAnother }: CreationResultProps) {
  return (
    <div className="creation-result">
      {/* Success banner */}
      <div className="creation-result__banner">
        <span className="creation-result__check">{'\u2713'}</span>
        <span className="creation-result__banner-text">Product Created (Draft)</span>
      </div>

      {/* Product details */}
      <div className="creation-result__details">
        <div className="creation-result__detail-row">
          <span className="creation-result__detail-label">Product ID</span>
          <span className="creation-result__detail-value creation-result__detail-value--mono">
            {result.productId}
          </span>
        </div>
        <div className="creation-result__detail-row">
          <span className="creation-result__detail-label">WIX URL</span>
          <a
            className="creation-result__detail-link"
            href={result.productUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {result.productUrl}
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="creation-result__stats">
        <div className="creation-result__stat">
          <span className="creation-result__stat-value">{result.variantsCreated}</span>
          <span className="creation-result__stat-label">Variants</span>
        </div>
        <div className="creation-result__stat">
          <span className="creation-result__stat-value">{result.mediaAdded}</span>
          <span className="creation-result__stat-label">Images</span>
        </div>
        <div className="creation-result__stat">
          <span className="creation-result__stat-value">{result.collectionsAssigned.length}</span>
          <span className="creation-result__stat-label">Collections</span>
        </div>
      </div>

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="creation-result__warnings">
          <span className="creation-result__warnings-title">Warnings</span>
          <ul className="creation-result__warnings-list">
            {result.warnings.map((w, i) => (
              <li key={i} className="creation-result__warning-item">{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Collections */}
      {result.collectionsAssigned.length > 0 && (
        <div className="creation-result__collections">
          <span className="creation-result__collections-title">Collections</span>
          <div className="creation-result__collections-list">
            {result.collectionsAssigned.map((c) => (
              <span key={c} className="creation-result__collection-chip">{c}</span>
            ))}
          </div>
        </div>
      )}

      {/* Create another */}
      <button
        type="button"
        className="creation-result__create-another"
        onClick={onCreateAnother}
      >
        Create Another
      </button>
    </div>
  );
}

export default CreationResult;
