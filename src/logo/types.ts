/**
 * Logo System Type Definitions
 *
 * Ported from scripts/pipeline/types.ts for the v2.0 Pi appliance.
 * Self-contained types with no external dependencies.
 *
 * Phase 48: Logo System
 */

/** Position coordinates for logo placement on a product image */
export interface LogoPosition {
  /** Horizontal center point (0.0 = left edge, 0.5 = center, 1.0 = right edge) */
  x: number;
  /** Vertical center point (0.0 = top, 0.5 = center, 1.0 = bottom) */
  y: number;
}

/** Logo overlay configuration for a single product */
export interface LogoOverlayConfig {
  /** Logo name (key in logos.json registry) */
  logoName: string;
  /** Position on the product image (proportional coordinates) */
  position: LogoPosition;
  /** Logo size as proportion of product image width (0.0-1.0, default 0.25) */
  scale?: number;
  /** Opacity (0.0-1.0, default 0.88) */
  opacity?: number;
  /** Blend mode for screen-print effect (default "multiply") */
  blendMode?: string;
}

/**
 * Per-angle logo overlay configuration. Each angle is independent.
 *
 * Enables front/back/side images to have their own independent logo
 * placement, scale, and opacity settings. Angles set to null or omitted
 * are skipped (no logo applied).
 */
export interface AngleOverlayConfig {
  /** Logo name (key in logos.json registry) -- shared across all enabled angles */
  logoName: string;
  /** Front angle config (null = no logo on front) */
  front?: {
    position: LogoPosition;
    scale?: number;
    opacity?: number;
    blendMode?: string;
  } | null;
  /** Back angle config (null = no logo on back) */
  back?: {
    position: LogoPosition;
    scale?: number;
    opacity?: number;
    blendMode?: string;
  } | null;
  /** Side angle config (null = no logo on side) */
  side?: {
    position: LogoPosition;
    scale?: number;
    opacity?: number;
    blendMode?: string;
  } | null;
}

/** Logo entry in the logo registry (logos.json) */
export interface LogoRegistryEntry {
  /** Display name (e.g., "Big Barn Crossfit") */
  displayName: string;
  /** Path to PNG file relative to dataDir (e.g., "logos/bigbarn.png") */
  filePath: string;
  /** Default scale when applied (0.0-1.0) */
  defaultScale: number;
  /** Default blend mode */
  defaultBlendMode: string;
  /** Default opacity */
  defaultOpacity: number;
}

/** Logo registry file structure (logos.json) */
export interface LogoRegistry {
  logos: Record<string, LogoRegistryEntry>;
  /** Named position presets for quick placement */
  positionPresets: Record<string, LogoPosition>;
}
