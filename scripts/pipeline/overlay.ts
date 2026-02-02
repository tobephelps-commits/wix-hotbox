/**
 * Logo Overlay Engine
 *
 * Sharp-based image compositing that downloads a SanMar product image,
 * composites a PNG logo onto it with a realistic screen-print effect,
 * and saves the result locally.
 *
 * Functions:
 * - loadLogoRegistry()       - Load logo registry from data/logos.json
 * - getLogoEntry()           - Get a logo by name
 * - getPositionPreset()      - Get a position preset by name or "x,y" coords
 * - listLogos()              - List available logo names
 * - listPositionPresets()    - List all position presets
 * - compositeLogoOnImage()   - Composite a logo onto a product image
 * - overlayProductImages()   - Batch overlay for multiple images
 *
 * Phase 14: Logo Overlay Engine
 */

import sharp from 'sharp';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import type {
  LogoRegistry,
  LogoRegistryEntry,
  LogoPosition,
  LogoOverlayConfig,
  AngleOverlayConfig,
} from './types.js';

// =============================================================================
// Constants
// =============================================================================

/** Path to the logo registry file */
const REGISTRY_PATH = path.resolve('data/logos.json');

/** Default output directory for overlay images */
const DEFAULT_OUTPUT_DIR = path.resolve('media/overlays');

/** Download timeout in milliseconds */
const DOWNLOAD_TIMEOUT_MS = 30_000;

/** Default logo scale (proportion of product image width) */
const DEFAULT_SCALE = 0.25;

/** Default opacity for logo overlay */
const DEFAULT_OPACITY = 0.88;

/** Default blend mode for screen-print effect */
const DEFAULT_BLEND_MODE = 'multiply';

/** JPEG output quality */
const JPEG_QUALITY = 85;

// =============================================================================
// Default Registry
// =============================================================================

/** Default empty registry with position presets */
const DEFAULT_REGISTRY: LogoRegistry = {
  logos: {},
  positionPresets: {
    'center-chest': { x: 0.5, y: 0.33 },
    'left-chest': { x: 0.35, y: 0.28 },
    'full-front': { x: 0.5, y: 0.40 },
    'center-back': { x: 0.5, y: 0.30 },
    'left-sleeve': { x: 0.80, y: 0.32 },
  },
};

// =============================================================================
// Logo Registry Functions
// =============================================================================

/**
 * Load the logo registry from data/logos.json.
 * Creates a default empty registry if the file doesn't exist.
 *
 * @returns Parsed LogoRegistry
 */
export function loadLogoRegistry(): LogoRegistry {
  const registryPath = REGISTRY_PATH;

  if (!fs.existsSync(registryPath)) {
    // Create default registry
    const dir = path.dirname(registryPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(registryPath, JSON.stringify(DEFAULT_REGISTRY, null, 2), 'utf-8');
    return { ...DEFAULT_REGISTRY };
  }

  const raw = fs.readFileSync(registryPath, 'utf-8');
  return JSON.parse(raw) as LogoRegistry;
}

/**
 * Get a logo entry by name from the registry.
 *
 * @param logoName - Key in the logos object
 * @returns LogoRegistryEntry
 * @throws Error if logo not found
 */
export function getLogoEntry(logoName: string): LogoRegistryEntry {
  const registry = loadLogoRegistry();
  const entry = registry.logos[logoName];

  if (!entry) {
    const available = Object.keys(registry.logos);
    const hint = available.length > 0
      ? `Available logos: ${available.join(', ')}`
      : 'No logos registered. Add logo files to media/logos/ and register them in data/logos.json';
    throw new Error(`Logo "${logoName}" not found. ${hint}`);
  }

  return entry;
}

/**
 * Get a position preset by name.
 * Also accepts "x,y" format for custom coordinates (e.g., "0.5,0.3").
 *
 * @param presetName - Preset name (e.g., "center-chest") or "x,y" coordinates
 * @returns LogoPosition
 * @throws Error if preset not found and not valid coordinates
 */
export function getPositionPreset(presetName: string): LogoPosition {
  // Check for "x,y" custom coordinate format
  if (presetName.includes(',')) {
    const parts = presetName.split(',').map((s) => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return { x: parts[0], y: parts[1] };
    }
  }

  const registry = loadLogoRegistry();
  const preset = registry.positionPresets[presetName];

  if (!preset) {
    const available = Object.keys(registry.positionPresets);
    throw new Error(
      `Position preset "${presetName}" not found. Available presets: ${available.join(', ')}. ` +
      `You can also use custom coordinates in "x,y" format (e.g., "0.5,0.3").`
    );
  }

  return preset;
}

/**
 * List available logo names from the registry.
 *
 * @returns Array of logo name keys
 */
export function listLogos(): string[] {
  const registry = loadLogoRegistry();
  return Object.keys(registry.logos);
}

/**
 * List all position presets from the registry.
 *
 * @returns Record of preset name -> LogoPosition
 */
export function listPositionPresets(): Record<string, LogoPosition> {
  const registry = loadLogoRegistry();
  return { ...registry.positionPresets };
}

// =============================================================================
// Image Compositing
// =============================================================================

/**
 * Composite a PNG logo onto a product image with screen-print effect.
 *
 * Accepts an image as a URL, file path, or Buffer. Downloads if URL.
 * Loads the logo from the registry, resizes it proportionally, and
 * composites it at the specified position with multiply blend mode.
 *
 * @param imageSource - URL (http/https), file path, or Buffer of the product image
 * @param config - Logo overlay configuration (logo name, position, scale, opacity, blend)
 * @returns JPEG Buffer of the composited image
 */
export async function compositeLogoOnImage(
  imageSource: string | Buffer,
  config: LogoOverlayConfig,
): Promise<Buffer> {
  // 1. Resolve the product image to a Buffer
  let imageBuffer: Buffer;

  if (Buffer.isBuffer(imageSource)) {
    imageBuffer = imageSource;
  } else if (typeof imageSource === 'string' && imageSource.startsWith('http')) {
    imageBuffer = await downloadImage(imageSource);
  } else if (typeof imageSource === 'string') {
    const filePath = path.resolve(imageSource);
    imageBuffer = fs.readFileSync(filePath);
  } else {
    throw new Error('imageSource must be a URL string, file path string, or Buffer');
  }

  // 2. Load the logo PNG from the registry
  const logoEntry = getLogoEntry(config.logoName);
  const logoPath = path.resolve(logoEntry.filePath);

  if (!fs.existsSync(logoPath)) {
    throw new Error(`Logo file not found at ${logoPath}. Check the filePath in data/logos.json for "${config.logoName}".`);
  }

  const logoBuffer = fs.readFileSync(logoPath);

  // 3. Get product image dimensions
  const metadata = await sharp(imageBuffer).metadata();
  const productWidth = metadata.width ?? 800;
  const productHeight = metadata.height ?? 800;

  // 4. Calculate logo size
  const scale = config.scale ?? logoEntry.defaultScale ?? DEFAULT_SCALE;
  const targetWidth = Math.round(productWidth * scale);

  // 5. Resize logo maintaining aspect ratio
  const resizedLogo = await sharp(logoBuffer)
    .resize({
      width: targetWidth,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .toBuffer();

  // Get resized logo dimensions
  const logoMeta = await sharp(resizedLogo).metadata();
  const logoWidth = logoMeta.width ?? targetWidth;
  const logoHeight = logoMeta.height ?? targetWidth;

  // 6. Apply opacity to logo if not fully opaque
  const opacity = config.opacity ?? logoEntry.defaultOpacity ?? DEFAULT_OPACITY;
  let finalLogo: Buffer;

  if (opacity < 1.0) {
    // Apply opacity by compositing the logo with an alpha channel adjustment
    finalLogo = await sharp(resizedLogo)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
      .then(({ data, info }) => {
        // Multiply each pixel's alpha by the desired opacity
        const pixels = Buffer.from(data);
        for (let i = 3; i < pixels.length; i += 4) {
          pixels[i] = Math.round(pixels[i] * opacity);
        }
        return sharp(pixels, {
          raw: {
            width: info.width,
            height: info.height,
            channels: 4,
          },
        })
          .png()
          .toBuffer();
      });
  } else {
    finalLogo = resizedLogo;
  }

  // 7. Calculate pixel position (center the logo on the position point)
  const position = config.position;
  let left = Math.round(productWidth * position.x - logoWidth / 2);
  let top = Math.round(productHeight * position.y - logoHeight / 2);

  // Clamp to image bounds
  left = Math.max(0, Math.min(left, productWidth - logoWidth));
  top = Math.max(0, Math.min(top, productHeight - logoHeight));

  // 8. Composite the logo onto the product image
  const blendMode = config.blendMode ?? logoEntry.defaultBlendMode ?? DEFAULT_BLEND_MODE;

  const result = await sharp(imageBuffer)
    .composite([
      {
        input: finalLogo,
        top,
        left,
        blend: blendMode as
          | 'clear' | 'source' | 'over' | 'in' | 'out' | 'atop'
          | 'dest' | 'dest-over' | 'dest-in' | 'dest-out' | 'dest-atop'
          | 'xor' | 'add' | 'saturate' | 'multiply' | 'screen' | 'overlay'
          | 'darken' | 'lighten' | 'color-dodge' | 'colour-dodge'
          | 'color-burn' | 'colour-burn' | 'hard-light' | 'soft-light'
          | 'difference' | 'exclusion',
      },
    ])
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();

  return result;
}

/**
 * Apply logo overlay to multiple product images sequentially.
 *
 * Processes images one at a time to avoid memory pressure with large images.
 * Skips failed downloads with a warning instead of failing the entire batch.
 *
 * @param imageUrls - Array of image URLs to process
 * @param config - Logo overlay configuration
 * @param outputDir - Directory to save output files (default: media/overlays/)
 * @returns Array of local file paths for successfully processed images
 */
export async function overlayProductImages(
  imageUrls: string[],
  config: LogoOverlayConfig,
  outputDir: string = DEFAULT_OUTPUT_DIR,
): Promise<string[]> {
  // Create output directory if it doesn't exist
  const resolvedDir = path.resolve(outputDir);
  if (!fs.existsSync(resolvedDir)) {
    fs.mkdirSync(resolvedDir, { recursive: true });
  }

  const outputPaths: string[] = [];

  // Process images sequentially to avoid memory pressure
  for (const url of imageUrls) {
    try {
      const resultBuffer = await compositeLogoOnImage(url, config);

      // Generate filename from MD5 hash of the URL
      const hash = crypto.createHash('md5').update(url).digest('hex');
      const filename = `${hash}_overlay.jpg`;
      const outputPath = path.join(resolvedDir, filename);

      fs.writeFileSync(outputPath, resultBuffer);
      outputPaths.push(outputPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Warning: Failed to process ${url}: ${message}`);
    }
  }

  return outputPaths;
}

/**
 * Apply logo overlay to product images with per-angle configuration.
 * Each angle (front/back/side) gets its own independent placement.
 * Angles set to null or omitted are skipped (no logo applied).
 *
 * Processes images sequentially to avoid memory pressure.
 * Skips failed downloads with a warning instead of failing the entire batch.
 *
 * @param angleImages - Map of angle to image URL { front?: string, back?: string, side?: string }
 * @param config - Per-angle overlay configuration
 * @param outputDir - Output directory (default: media/overlays/)
 * @returns Map of angle to local overlay file path { front?: string, back?: string, side?: string }
 *
 * Phase 22: Multi-Angle Logo Overlay
 */
export async function overlayProductImagesByAngle(
  angleImages: { front?: string; back?: string; side?: string },
  config: AngleOverlayConfig,
  outputDir: string = DEFAULT_OUTPUT_DIR,
): Promise<{ front?: string; back?: string; side?: string }> {
  // Create output directory if it doesn't exist
  const resolvedDir = path.resolve(outputDir);
  if (!fs.existsSync(resolvedDir)) {
    fs.mkdirSync(resolvedDir, { recursive: true });
  }

  const result: { front?: string; back?: string; side?: string } = {};
  const angles = ['front', 'back', 'side'] as const;

  // Process each angle sequentially
  for (const angle of angles) {
    const imageUrl = angleImages[angle];
    const angleConfig = config[angle];

    // Skip if no image URL or config is null/undefined for this angle
    if (!imageUrl || angleConfig === null || angleConfig === undefined) {
      continue;
    }

    try {
      // Build a LogoOverlayConfig from the angle-specific fields + shared logoName
      const overlayConfig: LogoOverlayConfig = {
        logoName: config.logoName,
        position: angleConfig.position,
        scale: angleConfig.scale,
        opacity: angleConfig.opacity,
        blendMode: angleConfig.blendMode,
      };

      const resultBuffer = await compositeLogoOnImage(imageUrl, overlayConfig);

      // Generate filename from MD5 hash of the URL + angle suffix
      const hash = crypto.createHash('md5').update(imageUrl).digest('hex');
      const filename = `${hash}_overlay_${angle}.jpg`;
      const outputPath = path.join(resolvedDir, filename);

      fs.writeFileSync(outputPath, resultBuffer);
      result[angle] = outputPath;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Warning: Failed to process ${angle} image (${imageUrl}): ${message}`);
    }
  }

  return result;
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Download an image from a URL to a Buffer.
 *
 * @param url - Image URL to download
 * @returns Buffer containing the image data
 * @throws Error if download fails or times out
 */
async function downloadImage(url: string): Promise<Buffer> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } finally {
    clearTimeout(timeout);
  }
}

// =============================================================================
// CLI Test Runner
// =============================================================================

/**
 * CLI entry point for quick manual testing.
 *
 * Usage: npm run overlay-test -- <image-url> <logo-name> [position-preset]
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Logo Overlay Engine - Quick Test');
    console.log('');
    console.log('Usage: npm run overlay-test -- <image-url> <logo-name> [position-preset]');
    console.log('');
    console.log('Arguments:');
    console.log('  image-url        URL or local path to a product image');
    console.log('  logo-name        Name of logo from data/logos.json registry');
    console.log('  position-preset  Position preset name or "x,y" coordinates (default: center-chest)');
    console.log('');

    // Show available logos and presets
    const logos = listLogos();
    const presets = listPositionPresets();

    if (logos.length > 0) {
      console.log('Available logos:', logos.join(', '));
    } else {
      console.log('No logos registered. Add logo files to media/logos/ and register them in data/logos.json');
    }

    console.log('');
    console.log('Position presets:');
    for (const [name, pos] of Object.entries(presets)) {
      console.log(`  ${name}: (${pos.x}, ${pos.y})`);
    }

    process.exit(0);
  }

  if (args.length < 2) {
    console.error('Error: Both <image-url> and <logo-name> are required.');
    console.error('Run without arguments for usage information.');
    process.exit(1);
  }

  const [imageUrl, logoName, positionPreset = 'center-chest'] = args;

  // Verify logo exists
  const logos = listLogos();
  if (logos.length === 0) {
    console.error('No logos registered. Add logo files to media/logos/ and register them in data/logos.json');
    process.exit(1);
  }

  try {
    const position = getPositionPreset(positionPreset);
    const config: LogoOverlayConfig = {
      logoName,
      position,
    };

    console.log(`Compositing logo "${logoName}" at position ${positionPreset}...`);
    const result = await compositeLogoOnImage(imageUrl, config);

    // Save to test output
    const outputDir = path.resolve('media/overlays');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, 'test-output.jpg');
    fs.writeFileSync(outputPath, result);
    console.log(`Overlay saved to ${outputPath}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    process.exit(1);
  }
}

// Run CLI if this is the main module
const isMainModule = process.argv[1] &&
  (path.resolve(process.argv[1]) === path.resolve(import.meta.url.replace('file:///', '').replace('file://', '')) ||
   process.argv[1].endsWith('overlay.ts'));

if (isMainModule) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
