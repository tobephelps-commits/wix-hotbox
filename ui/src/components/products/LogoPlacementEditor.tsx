/**
 * LogoPlacementEditor -- Visual drag-and-drop logo positioning on product images.
 *
 * Port of the placement engine from scripts/pipeline/preview.html to React.
 * Supports per-angle placement (front/back/side), position presets,
 * scale control, and alignment guides.
 *
 * Phase 48: Logo System
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { PreviewData } from './StyleLookup';

// =============================================================================
// Types
// =============================================================================

interface LogoPosition {
  x: number;
  y: number;
}

interface AngleConfig {
  position: LogoPosition;
  scale?: number;
  opacity?: number;
  blendMode?: string;
}

/** Per-angle logo overlay config -- matches src/logo/types.ts AngleOverlayConfig */
interface AngleOverlayConfig {
  logoName: string;
  front?: AngleConfig | null;
  back?: AngleConfig | null;
  side?: AngleConfig | null;
}

interface LogoEntry {
  displayName: string;
  filePath: string;
  defaultScale: number;
  defaultBlendMode: string;
  defaultOpacity: number;
}

interface LogoPlacementEditorProps {
  previewData: PreviewData;
  selectedColors: string[];
  onComplete: (config: AngleOverlayConfig | null) => void;
  onBack: () => void;
  onManageLogos: () => void;
}

type Angle = 'front' | 'back' | 'side';

interface AnglePlacement {
  enabled: boolean;
  position: LogoPosition;
  scale: number;
}

const SNAP_THRESHOLD = 0.02;
const DEFAULT_SCALE = 0.25;
const MIN_SCALE = 0.05;
const MAX_SCALE = 0.80;

// =============================================================================
// Component
// =============================================================================

function LogoPlacementEditor({
  previewData,
  selectedColors,
  onComplete,
  onBack,
  onManageLogos,
}: LogoPlacementEditorProps) {
  // Logo data from API
  const [logos, setLogos] = useState<Record<string, LogoEntry>>({});
  const [presets, setPresets] = useState<Record<string, LogoPosition>>({});
  const [selectedLogo, setSelectedLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Per-angle placement state
  const [activeAngle, setActiveAngle] = useState<Angle>('front');
  const [placements, setPlacements] = useState<Record<Angle, AnglePlacement>>({
    front: { enabled: true, position: { x: 0.5, y: 0.33 }, scale: DEFAULT_SCALE },
    back: { enabled: false, position: { x: 0.5, y: 0.30 }, scale: DEFAULT_SCALE },
    side: { enabled: false, position: { x: 0.5, y: 0.32 }, scale: DEFAULT_SCALE },
  });

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageBounds, setImageBounds] = useState({ left: 0, top: 0, width: 0, height: 0 });

  // Get representative color images (first selected color)
  const representativeColor = previewData.availableColors.find(
    (c) => selectedColors.includes(c.catalogColor),
  ) ?? previewData.availableColors[0];

  const angleImages: Record<Angle, string | null> = {
    front: representativeColor?.frontImageUrl ?? null,
    back: representativeColor?.backImageUrl ?? null,
    side: representativeColor?.sideImageUrl ?? null,
  };

  const currentImage = angleImages[activeAngle];
  const currentPlacement = placements[activeAngle];

  // =========================================================================
  // Fetch logos and presets
  // =========================================================================

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/logos');
        if (!res.ok) throw new Error('Failed to load logos');
        const data = await res.json();
        if (cancelled) return;
        setLogos(data.logos ?? {});
        setPresets(data.positionPresets ?? {});

        // Auto-select first logo if available
        const keys = Object.keys(data.logos ?? {});
        if (keys.length > 0 && !selectedLogo) {
          setSelectedLogo(keys[0]);
          // Apply the logo's default scale to all placements
          const entry = data.logos[keys[0]];
          if (entry) {
            setPlacements((prev) => {
              const next = { ...prev };
              for (const angle of ['front', 'back', 'side'] as Angle[]) {
                next[angle] = { ...next[angle], scale: entry.defaultScale || DEFAULT_SCALE };
              }
              return next;
            });
          }
        }
      } catch {
        // Logos are optional; editor can function without them
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // =========================================================================
  // Image bounds tracking via ResizeObserver
  // =========================================================================

  useEffect(() => {
    const img = imageRef.current;
    if (!img) return;

    const updateBounds = () => {
      const container = containerRef.current;
      if (!container || !img) return;

      const containerRect = container.getBoundingClientRect();
      const imgRect = img.getBoundingClientRect();

      setImageBounds({
        left: imgRect.left - containerRect.left,
        top: imgRect.top - containerRect.top,
        width: imgRect.width,
        height: imgRect.height,
      });
    };

    const ro = new ResizeObserver(updateBounds);
    ro.observe(img);
    img.addEventListener('load', updateBounds);

    // Initial update
    updateBounds();

    return () => {
      ro.disconnect();
      img.removeEventListener('load', updateBounds);
    };
  }, [activeAngle, currentImage]);

  // =========================================================================
  // Drag handling (pointer events for unified mouse + touch)
  // =========================================================================

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setIsDragging(true);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      e.preventDefault();

      const container = containerRef.current;
      if (!container || imageBounds.width === 0) return;

      const containerRect = container.getBoundingClientRect();
      const relX = e.clientX - containerRect.left - imageBounds.left;
      const relY = e.clientY - containerRect.top - imageBounds.top;

      let x = relX / imageBounds.width;
      let y = relY / imageBounds.height;

      // Clamp to [0, 1]
      x = Math.max(0, Math.min(1, x));
      y = Math.max(0, Math.min(1, y));

      setPlacements((prev) => ({
        ...prev,
        [activeAngle]: { ...prev[activeAngle], position: { x, y } },
      }));
    },
    [isDragging, imageBounds, activeAngle],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      setIsDragging(false);
    },
    [],
  );

  // =========================================================================
  // Preset click handler
  // =========================================================================

  const handlePresetClick = useCallback(
    (presetKey: string) => {
      const preset = presets[presetKey];
      if (!preset) return;
      setPlacements((prev) => ({
        ...prev,
        [activeAngle]: { ...prev[activeAngle], position: { x: preset.x, y: preset.y } },
      }));
    },
    [presets, activeAngle],
  );

  // =========================================================================
  // Scale change
  // =========================================================================

  const handleScaleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const scale = parseFloat(e.target.value);
      setPlacements((prev) => ({
        ...prev,
        [activeAngle]: { ...prev[activeAngle], scale },
      }));
    },
    [activeAngle],
  );

  // =========================================================================
  // Angle toggle
  // =========================================================================

  const handleAngleToggle = useCallback(
    (angle: Angle) => {
      setPlacements((prev) => ({
        ...prev,
        [angle]: { ...prev[angle], enabled: !prev[angle].enabled },
      }));
    },
    [],
  );

  // =========================================================================
  // Logo selection
  // =========================================================================

  const handleLogoSelect = useCallback(
    (key: string) => {
      setSelectedLogo(key);
      const entry = logos[key];
      if (entry) {
        setPlacements((prev) => {
          const next = { ...prev };
          for (const angle of ['front', 'back', 'side'] as Angle[]) {
            next[angle] = { ...next[angle], scale: entry.defaultScale || DEFAULT_SCALE };
          }
          return next;
        });
      }
    },
    [logos],
  );

  // =========================================================================
  // Build output config
  // =========================================================================

  const buildConfig = useCallback((): AngleOverlayConfig | null => {
    if (!selectedLogo) return null;
    const entry = logos[selectedLogo];
    if (!entry) return null;

    const config: AngleOverlayConfig = { logoName: selectedLogo };

    for (const angle of ['front', 'back', 'side'] as Angle[]) {
      const p = placements[angle];
      if (p.enabled && angleImages[angle]) {
        config[angle] = {
          position: { x: Math.round(p.position.x * 1000) / 1000, y: Math.round(p.position.y * 1000) / 1000 },
          scale: Math.round(p.scale * 1000) / 1000,
          opacity: entry.defaultOpacity,
          blendMode: entry.defaultBlendMode,
        };
      } else {
        config[angle] = null;
      }
    }

    return config;
  }, [selectedLogo, logos, placements, angleImages]);

  // =========================================================================
  // Alignment guides
  // =========================================================================

  const showHGuide = currentPlacement && Math.abs(currentPlacement.position.x - 0.5) < SNAP_THRESHOLD;
  const showVGuide = currentPlacement && Math.abs(currentPlacement.position.y - 0.5) < SNAP_THRESHOLD;

  // =========================================================================
  // Logo pixel position for overlay display
  // =========================================================================

  const logoPixelStyle = currentPlacement && imageBounds.width > 0
    ? {
        left: imageBounds.left + currentPlacement.position.x * imageBounds.width,
        top: imageBounds.top + currentPlacement.position.y * imageBounds.height,
        width: imageBounds.width * currentPlacement.scale,
        transform: 'translate(-50%, -50%)',
      }
    : undefined;

  // =========================================================================
  // Render
  // =========================================================================

  if (loading) {
    return <div className="logo-placement__loading">Loading logos...</div>;
  }

  const logoKeys = Object.keys(logos);
  const hasLogos = logoKeys.length > 0;

  return (
    <div className="logo-placement">
      {/* Logo selector */}
      <div className="logo-placement__selector">
        <div className="logo-placement__selector-header">
          <span className="logo-placement__label">Select Logo</span>
          <button
            type="button"
            className="logo-placement__manage-btn"
            onClick={onManageLogos}
          >
            Manage Logos
          </button>
        </div>

        {!hasLogos && (
          <div className="logo-placement__empty">
            No logos uploaded yet. Upload logos to use placement editor.
          </div>
        )}

        {hasLogos && (
          <div className="logo-placement__logo-strip">
            {logoKeys.map((key) => (
              <button
                key={key}
                type="button"
                className={`logo-placement__logo-thumb${selectedLogo === key ? ' logo-placement__logo-thumb--active' : ''}`}
                onClick={() => handleLogoSelect(key)}
              >
                <img
                  src={`/api/logos/file/${key}`}
                  alt={logos[key].displayName}
                  className="logo-placement__logo-thumb-img"
                />
                <span className="logo-placement__logo-thumb-name">{logos[key].displayName}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Per-angle tabs */}
      <div className="logo-placement__tabs">
        {(['front', 'back', 'side'] as Angle[]).map((angle) => {
          const hasImage = !!angleImages[angle];
          const isActive = activeAngle === angle;
          const isEnabled = placements[angle].enabled;

          return (
            <div key={angle} className="logo-placement__tab-group">
              <button
                type="button"
                className={`logo-placement__tab${isActive ? ' logo-placement__tab--active' : ''}${!hasImage ? ' logo-placement__tab--disabled' : ''}`}
                onClick={() => hasImage && setActiveAngle(angle)}
                disabled={!hasImage}
              >
                {angle.charAt(0).toUpperCase() + angle.slice(1)}
              </button>
              {hasImage && (
                <label className="logo-placement__tab-toggle">
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={() => handleAngleToggle(angle)}
                  />
                </label>
              )}
            </div>
          );
        })}
      </div>

      {/* Placement container */}
      {currentImage && selectedLogo && currentPlacement.enabled ? (
        <>
          <div
            ref={containerRef}
            className="logo-placement__container"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <img
              ref={imageRef}
              src={currentImage}
              alt={`${activeAngle} view`}
              className="logo-placement__product-image"
              draggable={false}
            />

            {/* Logo overlay draggable */}
            {logoPixelStyle && (
              <div
                className={`logo-placement__logo-draggable${isDragging ? ' logo-placement__logo-draggable--grabbing' : ''}`}
                style={{
                  position: 'absolute',
                  left: `${logoPixelStyle.left}px`,
                  top: `${logoPixelStyle.top}px`,
                  width: `${logoPixelStyle.width}px`,
                  transform: logoPixelStyle.transform,
                  touchAction: 'none',
                }}
                onPointerDown={handlePointerDown}
              >
                <img
                  src={`/api/logos/file/${selectedLogo}`}
                  alt="Logo"
                  className="logo-placement__logo-overlay-img"
                  draggable={false}
                />
              </div>
            )}

            {/* Alignment guides */}
            {showHGuide && (
              <div
                className="logo-placement__guide logo-placement__guide--vertical"
                style={{
                  left: `${imageBounds.left + imageBounds.width * 0.5}px`,
                  top: `${imageBounds.top}px`,
                  height: `${imageBounds.height}px`,
                }}
              />
            )}
            {showVGuide && (
              <div
                className="logo-placement__guide logo-placement__guide--horizontal"
                style={{
                  left: `${imageBounds.left}px`,
                  top: `${imageBounds.top + imageBounds.height * 0.5}px`,
                  width: `${imageBounds.width}px`,
                }}
              />
            )}

            {/* Coordinate pill */}
            <div className="logo-placement__coord-pill">
              x: {(currentPlacement.position.x * 100).toFixed(0)}%
              {' '}y: {(currentPlacement.position.y * 100).toFixed(0)}%
              {' '}scale: {(currentPlacement.scale * 100).toFixed(0)}%
            </div>
          </div>

          {/* Position presets */}
          {Object.keys(presets).length > 0 && (
            <div className="logo-placement__presets">
              <span className="logo-placement__label">Presets</span>
              <div className="logo-placement__preset-row">
                {Object.keys(presets).map((key) => (
                  <button
                    key={key}
                    type="button"
                    className="logo-placement__preset-btn"
                    onClick={() => handlePresetClick(key)}
                  >
                    {key.replace(/-/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Scale slider */}
          <div className="logo-placement__scale">
            <span className="logo-placement__label">
              Scale: {(currentPlacement.scale * 100).toFixed(0)}%
            </span>
            <input
              type="range"
              min={MIN_SCALE}
              max={MAX_SCALE}
              step={0.01}
              value={currentPlacement.scale}
              onChange={handleScaleChange}
              className="logo-placement__scale-slider"
            />
          </div>
        </>
      ) : currentImage && !currentPlacement.enabled ? (
        <div className="logo-placement__disabled-msg">
          Logo disabled for {activeAngle} angle. Enable the checkbox above to place a logo.
        </div>
      ) : !currentImage ? (
        <div className="logo-placement__disabled-msg">
          No image available for {activeAngle} angle.
        </div>
      ) : !selectedLogo ? (
        <div className="logo-placement__disabled-msg">
          Select a logo above to begin placement.
        </div>
      ) : null}

      {/* Action buttons */}
      <div className="logo-placement__actions">
        <button
          type="button"
          className="logo-placement__back-btn"
          onClick={onBack}
        >
          Back
        </button>
        <button
          type="button"
          className="logo-placement__skip-btn"
          onClick={() => onComplete(null)}
        >
          Skip Logo
        </button>
        <button
          type="button"
          className="logo-placement__continue-btn"
          onClick={() => onComplete(buildConfig())}
          disabled={!selectedLogo}
        >
          Continue with Logo
        </button>
      </div>
    </div>
  );
}

export default LogoPlacementEditor;
export type { AngleOverlayConfig };
