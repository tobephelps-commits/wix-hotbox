/**
 * SizeChips — Horizontal scrollable row of toggleable size chips.
 *
 * Each chip is a pill button with selected state filled with accent color.
 * Touch-friendly with min 44px height and momentum scrolling.
 *
 * Phase 47: Product Pipeline Creation UI
 */

interface SizeChipsProps {
  sizes: string[];
  selectedSizes: Set<string>;
  onToggle: (size: string) => void;
}

function SizeChips({ sizes, selectedSizes, onToggle }: SizeChipsProps) {
  return (
    <div className="size-chips">
      {sizes.map((size) => (
        <button
          key={size}
          type="button"
          className={`size-chip${selectedSizes.has(size) ? ' size-chip--selected' : ''}`}
          onClick={() => onToggle(size)}
          aria-pressed={selectedSizes.has(size)}
        >
          {size}
        </button>
      ))}
    </div>
  );
}

export default SizeChips;
