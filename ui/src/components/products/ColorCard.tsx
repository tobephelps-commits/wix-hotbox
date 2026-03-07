/**
 * ColorCard — Individual color card component for product preview.
 *
 * Shows swatch image, front product image thumbnail, color name,
 * and stock badge. Entire card is tappable for selection toggle.
 *
 * Phase 47: Product Pipeline Creation UI
 */

interface ColorCardProps {
  catalogColor: string;
  displayColor: string;
  swatchUrl: string | null;
  frontImageUrl: string | null;
  inStock: boolean;
  stockUnknown?: boolean;
  selected: boolean;
  onToggle: (catalogColor: string) => void;
}

function ColorCard({
  catalogColor,
  displayColor,
  swatchUrl,
  frontImageUrl,
  inStock,
  stockUnknown,
  selected,
  onToggle,
}: ColorCardProps) {
  const stockClass = stockUnknown
    ? 'color-card__badge--unknown'
    : inStock
      ? 'color-card__badge--in-stock'
      : 'color-card__badge--out-of-stock';

  const stockLabel = stockUnknown ? 'Unknown' : inStock ? 'In Stock' : 'Out of Stock';

  let cardClass = 'color-card';
  if (selected) cardClass += ' color-card--selected';
  if (!inStock && !stockUnknown) cardClass += ' color-card--out-of-stock';

  return (
    <div
      className={cardClass}
      onClick={() => onToggle(catalogColor)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle(catalogColor);
        }
      }}
      aria-pressed={selected}
      aria-label={`${displayColor} - ${stockLabel}`}
    >
      <div className="color-card__image-row">
        {swatchUrl ? (
          <img
            className="color-card__swatch"
            src={swatchUrl}
            alt={`${displayColor} swatch`}
            loading="lazy"
          />
        ) : (
          <div className="color-card__swatch-placeholder" />
        )}
      </div>

      {frontImageUrl ? (
        <img
          className="color-card__front-image"
          src={frontImageUrl}
          alt={`${displayColor} front`}
          loading="lazy"
        />
      ) : (
        <div className="color-card__front-placeholder">No image</div>
      )}

      <div className="color-card__info">
        <span className="color-card__name" title={displayColor}>
          {displayColor}
        </span>
        <span className={`color-card__badge ${stockClass}`}>{stockLabel}</span>
      </div>
    </div>
  );
}

export default ColorCard;
