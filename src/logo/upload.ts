/**
 * Logo Upload Processor
 *
 * Validates uploaded images, resizes to max 2000x2000, converts to PNG,
 * saves to {dataDir}/logos/{key}.png, and registers in the logo registry.
 *
 * Ported from scripts/pipeline/overlay.ts processLogoUpload for v2.0.
 *
 * Phase 48: Logo System
 */

import sharp from 'sharp';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { LogoRegistryEntry } from './types.js';
import { addLogo } from './registry.js';

/** Regex for valid logo registry keys: alphanumeric, dash, underscore only */
const VALID_KEY_REGEX = /^[a-zA-Z0-9_-]+$/;

/** Supported image formats for upload */
const SUPPORTED_FORMATS = ['png', 'jpeg', 'webp', 'gif'];

/** Configured data directory (set via setDataDir in registry.ts) */
let dataDir = './data';

/**
 * Set the data directory for upload file resolution.
 * Called alongside registry.setDataDir() at plugin registration.
 */
export function setUploadDataDir(dir: string): void {
  dataDir = dir;
}

/**
 * Process an uploaded logo file: validate, resize, convert to PNG, and register.
 *
 * Validates the image buffer using Sharp, resizes if any dimension exceeds 2000px,
 * converts to PNG for alpha channel support, saves to {dataDir}/logos/{key}.png,
 * and registers in the logo registry.
 *
 * @param fileBuffer - Raw image buffer from upload
 * @param originalName - Original filename (for logging)
 * @param key - Registry key (alphanumeric, dash, underscore only)
 * @param displayName - Human-readable display name
 * @returns The created LogoRegistryEntry
 * @throws Error if image is invalid, format unsupported, or key is invalid
 */
export async function processLogoUpload(
  fileBuffer: Buffer,
  originalName: string,
  key: string,
  displayName: string,
): Promise<LogoRegistryEntry> {
  // Validate key format
  if (!VALID_KEY_REGEX.test(key)) {
    throw new Error(
      `Invalid logo key "${key}". Keys must contain only alphanumeric characters, dashes, and underscores.`
    );
  }

  // Validate image using Sharp metadata
  const metadata = await sharp(fileBuffer).metadata();

  if (!metadata.format || !SUPPORTED_FORMATS.includes(metadata.format)) {
    throw new Error(
      `Unsupported image format: "${metadata.format ?? 'unknown'}". Accepted formats: PNG, JPEG, WebP, GIF.`
    );
  }

  // Process: resize if needed, convert to PNG
  let pipeline = sharp(fileBuffer);

  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  if (width > 2000 || height > 2000) {
    pipeline = pipeline.resize({
      width: 2000,
      height: 2000,
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  const pngBuffer = await pipeline.png({ compressionLevel: 9 }).toBuffer();

  // Ensure logos/ directory exists under dataDir
  const logosDir = path.resolve(dataDir, 'logos');
  if (!fs.existsSync(logosDir)) {
    fs.mkdirSync(logosDir, { recursive: true });
  }

  // Write processed PNG to disk
  const relativeFilePath = `logos/${key}.png`;
  const resolvedOutput = path.resolve(dataDir, relativeFilePath);
  fs.writeFileSync(resolvedOutput, pngBuffer);

  // Register in logo registry
  const entry: LogoRegistryEntry = {
    displayName,
    filePath: relativeFilePath,
    defaultScale: 0.25,
    defaultBlendMode: 'multiply',
    defaultOpacity: 0.88,
  };

  addLogo(key, entry);
  return entry;
}
