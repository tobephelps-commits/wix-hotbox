/**
 * Logo Overlay Engine
 *
 * Sharp-based image compositing that downloads a product image,
 * composites a PNG logo onto it with a realistic screen-print effect,
 * and returns the result as a JPEG buffer.
 *
 * Ported from scripts/pipeline/overlay.ts for the v2.0 Pi appliance.
 *
 * Phase 48: Logo System
 */

import sharp from 'sharp';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import type { LogoOverlayConfig, AngleOverlayConfig } from './types.js';
import { getLogoEntry, resolveLogoPath } from './registry.js';

// =============================================================================
// Constants
// =============================================================================

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
  const logoPath = resolveLogoPath(logoEntry);

  if (!fs.existsSync(logoPath)) {
    throw new Error(`Logo file not found at ${logoPath}. Check the filePath in logos.json for "${config.logoName}".`);
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
    finalLogo = await sharp(resizedLogo)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
      .then(({ data, info }) => {
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
 * @param outputDir - Directory to save output files
 * @returns Array of local file paths for successfully processed images
 */
export async function overlayProductImages(
  imageUrls: string[],
  config: LogoOverlayConfig,
  outputDir: string,
): Promise<string[]> {
  const resolvedDir = path.resolve(outputDir);
  if (!fs.existsSync(resolvedDir)) {
    fs.mkdirSync(resolvedDir, { recursive: true });
  }

  const outputPaths: string[] = [];

  for (const url of imageUrls) {
    try {
      const resultBuffer = await compositeLogoOnImage(url, config);
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
 * @param angleImages - Map of angle to image URL
 * @param config - Per-angle overlay configuration
 * @param outputDir - Output directory
 * @returns Map of angle to local overlay file path
 */
export async function overlayProductImagesByAngle(
  angleImages: { front?: string; back?: string; side?: string },
  config: AngleOverlayConfig,
  outputDir: string,
): Promise<{ front?: string; back?: string; side?: string }> {
  const resolvedDir = path.resolve(outputDir);
  if (!fs.existsSync(resolvedDir)) {
    fs.mkdirSync(resolvedDir, { recursive: true });
  }

  const result: { front?: string; back?: string; side?: string } = {};
  const angles = ['front', 'back', 'side'] as const;

  for (const angle of angles) {
    const imageUrl = angleImages[angle];
    const angleConfig = config[angle];

    if (!imageUrl || angleConfig === null || angleConfig === undefined) {
      continue;
    }

    try {
      const overlayConfig: LogoOverlayConfig = {
        logoName: config.logoName,
        position: angleConfig.position,
        scale: angleConfig.scale,
        opacity: angleConfig.opacity,
        blendMode: angleConfig.blendMode,
      };

      const resultBuffer = await compositeLogoOnImage(imageUrl, overlayConfig);
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
