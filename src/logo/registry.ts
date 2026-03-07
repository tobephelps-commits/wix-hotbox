/**
 * Logo Registry
 *
 * Manages the logo registry file (logos.json) and logo file paths.
 * Uses setDataDir() init pattern so file paths resolve relative to
 * config.dataDir instead of hardcoded project root.
 *
 * Phase 48: Logo System
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  LogoRegistry,
  LogoRegistryEntry,
  LogoPosition,
} from './types.js';

// =============================================================================
// Data Directory Configuration
// =============================================================================

/** Configured data directory (set via setDataDir) */
let dataDir = './data';

/**
 * Set the data directory for logo file resolution.
 * Must be called before using registry functions.
 *
 * @param dir - Absolute or relative path to the data directory
 */
export function setDataDir(dir: string): void {
  dataDir = dir;
}

/** Get the resolved path to logos.json */
function getRegistryPath(): string {
  return path.resolve(dataDir, 'logos.json');
}

/** Get the resolved path to the logos directory */
function getLogosDir(): string {
  return path.resolve(dataDir, 'logos');
}

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

/** Regex for valid logo registry keys: alphanumeric, dash, underscore only */
const VALID_KEY_REGEX = /^[a-zA-Z0-9_-]+$/;

// =============================================================================
// Registry CRUD
// =============================================================================

/**
 * Load the logo registry from logos.json.
 * Creates a default empty registry if the file doesn't exist.
 */
export function loadLogoRegistry(): LogoRegistry {
  const registryPath = getRegistryPath();

  if (!fs.existsSync(registryPath)) {
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
 * Save the logo registry to logos.json.
 */
export function saveLogoRegistry(registry: LogoRegistry): void {
  const registryPath = getRegistryPath();
  const dir = path.dirname(registryPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf-8');
}

/**
 * Get a logo entry by name from the registry.
 *
 * @throws Error if logo not found
 */
export function getLogoEntry(logoName: string): LogoRegistryEntry {
  const registry = loadLogoRegistry();
  const entry = registry.logos[logoName];

  if (!entry) {
    const available = Object.keys(registry.logos);
    const hint = available.length > 0
      ? `Available logos: ${available.join(', ')}`
      : 'No logos registered. Upload logos via the API.';
    throw new Error(`Logo "${logoName}" not found. ${hint}`);
  }

  return entry;
}

/**
 * Get a position preset by name.
 * Also accepts "x,y" format for custom coordinates (e.g., "0.5,0.3").
 *
 * @throws Error if preset not found and not valid coordinates
 */
export function getPositionPreset(presetName: string): LogoPosition {
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
 */
export function listLogos(): string[] {
  const registry = loadLogoRegistry();
  return Object.keys(registry.logos);
}

/**
 * List all position presets from the registry.
 */
export function listPositionPresets(): Record<string, LogoPosition> {
  const registry = loadLogoRegistry();
  return { ...registry.positionPresets };
}

/**
 * Add a new logo entry to the registry.
 *
 * @throws Error if key already exists, key is invalid, or filePath doesn't exist
 */
export function addLogo(key: string, entry: LogoRegistryEntry): LogoRegistry {
  if (!VALID_KEY_REGEX.test(key)) {
    throw new Error(
      `Invalid logo key "${key}". Keys must contain only alphanumeric characters, dashes, and underscores.`
    );
  }

  const registry = loadLogoRegistry();

  if (registry.logos[key]) {
    throw new Error(`Logo key "${key}" already exists. Use updateLogo() to modify it.`);
  }

  // Resolve filePath relative to dataDir
  const filePath = path.resolve(dataDir, entry.filePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Logo file not found at "${entry.filePath}" (resolved: ${filePath}).`);
  }

  registry.logos[key] = entry;
  saveLogoRegistry(registry);
  return registry;
}

/**
 * Update an existing logo entry in the registry.
 *
 * @throws Error if key doesn't exist
 */
export function updateLogo(key: string, updates: Partial<LogoRegistryEntry>): LogoRegistryEntry {
  const registry = loadLogoRegistry();

  if (!registry.logos[key]) {
    throw new Error(`Logo key "${key}" not found. Available logos: ${Object.keys(registry.logos).join(', ')}`);
  }

  Object.assign(registry.logos[key], updates);
  saveLogoRegistry(registry);
  return registry.logos[key];
}

/**
 * Remove a logo from the registry and optionally delete the file.
 *
 * @throws Error if key doesn't exist
 */
export function removeLogo(key: string, deleteFile?: boolean): void {
  const registry = loadLogoRegistry();

  if (!registry.logos[key]) {
    throw new Error(`Logo key "${key}" not found. Available logos: ${Object.keys(registry.logos).join(', ')}`);
  }

  const entry = registry.logos[key];
  delete registry.logos[key];
  saveLogoRegistry(registry);

  if (deleteFile) {
    const filePath = path.resolve(dataDir, entry.filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

/**
 * Resolve a logo's file path to an absolute path using the configured dataDir.
 */
export function resolveLogoPath(entry: LogoRegistryEntry): string {
  return path.resolve(dataDir, entry.filePath);
}
