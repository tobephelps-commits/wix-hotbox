/**
 * Template System - CRUD operations for product templates
 *
 * Saves, loads, lists, and deletes reusable product configurations
 * (pricing preset, color/size selections, collections) from a local
 * JSON file at {dataDir}/templates.json.
 *
 * Functions:
 * 1. setTemplatesDir - Initialize with data directory path
 * 2. loadTemplates   - Read all templates from JSON file
 * 3. saveTemplate    - Save/overwrite a template by name
 * 4. getTemplate     - Get single template by name (case-insensitive)
 * 5. deleteTemplate  - Remove a template by name
 * 6. listTemplates   - Return all templates sorted by name
 *
 * v2.0 architecture: ported from scripts/pipeline/templates.ts
 * Phase 13 origin, ported Phase 47.
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';

import type { ProductTemplate } from './types.js';

// =============================================================================
// Module-level Config
// =============================================================================

/** Configurable path to templates JSON file */
let templatesFilePath: string | undefined;

/**
 * Initialize the template system with a data directory path.
 *
 * Must be called before any template function. Route handlers call this
 * at registration time with fastify.config.dataDir.
 *
 * @param dir - Path to the data directory (templates stored at {dir}/templates.json)
 */
export function setTemplatesDir(dir: string): void {
  templatesFilePath = path.join(dir, 'templates.json');
}

/**
 * Get the resolved templates file path.
 * Throws if setTemplatesDir() has not been called.
 */
function getTemplatesFile(): string {
  if (!templatesFilePath) {
    throw new Error(
      'Templates directory not configured.\n' +
      'Call setTemplatesDir() before using template functions.'
    );
  }
  return templatesFilePath;
}

// =============================================================================
// Internal Helpers
// =============================================================================

/** Shape of the templates JSON file on disk */
interface TemplatesFile {
  templates: Record<string, ProductTemplate>;
  lastUpdated: string;
}

/**
 * Read the templates file from disk.
 * Returns empty structure if file doesn't exist.
 */
async function readTemplatesFile(): Promise<TemplatesFile> {
  try {
    const raw = await readFile(getTemplatesFile(), 'utf-8');
    return JSON.parse(raw) as TemplatesFile;
  } catch (err: unknown) {
    // File doesn't exist or is invalid -- return empty
    if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
      return { templates: {}, lastUpdated: new Date().toISOString() };
    }
    throw err;
  }
}

/**
 * Write the templates file to disk.
 * Creates the data/ directory if it doesn't exist.
 */
async function writeTemplatesFile(data: TemplatesFile): Promise<void> {
  const filePath = getTemplatesFile();
  const dir = path.dirname(filePath);
  await mkdir(dir, { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

/**
 * Normalize a template name for case-insensitive lookup.
 * Converts to lowercase and trims whitespace.
 */
function normalizeKey(name: string): string {
  return name.trim().toLowerCase();
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Load all templates from {dataDir}/templates.json.
 * Returns empty object if file doesn't exist.
 */
export async function loadTemplates(): Promise<Record<string, ProductTemplate>> {
  const data = await readTemplatesFile();
  return data.templates;
}

/**
 * Save or overwrite a template by name.
 * Sets createdAt on new templates, always updates updatedAt.
 */
export async function saveTemplate(template: ProductTemplate): Promise<void> {
  const data = await readTemplatesFile();
  const key = normalizeKey(template.name);
  const now = new Date().toISOString();

  // Preserve original createdAt if updating existing template
  const existing = data.templates[key];
  const saved: ProductTemplate = {
    ...template,
    createdAt: existing?.createdAt ?? template.createdAt ?? now,
    updatedAt: now,
  };

  data.templates[key] = saved;
  data.lastUpdated = now;
  await writeTemplatesFile(data);
}

/**
 * Get a single template by name (case-insensitive match).
 * Returns null if not found.
 */
export async function getTemplate(name: string): Promise<ProductTemplate | null> {
  const data = await readTemplatesFile();
  const key = normalizeKey(name);
  return data.templates[key] ?? null;
}

/**
 * Delete a template by name (case-insensitive match).
 * Returns true if the template existed and was removed, false otherwise.
 */
export async function deleteTemplate(name: string): Promise<boolean> {
  const data = await readTemplatesFile();
  const key = normalizeKey(name);

  if (!(key in data.templates)) {
    return false;
  }

  delete data.templates[key];
  data.lastUpdated = new Date().toISOString();
  await writeTemplatesFile(data);
  return true;
}

/**
 * Return all templates sorted alphabetically by name.
 */
export async function listTemplates(): Promise<ProductTemplate[]> {
  const data = await readTemplatesFile();
  return Object.values(data.templates).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}
