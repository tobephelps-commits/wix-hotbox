/**
 * Template System - CRUD operations for product templates
 *
 * Saves, loads, lists, and deletes reusable product configurations
 * (pricing preset, color/size selections, collections) from a local
 * JSON file at data/templates.json.
 *
 * Functions:
 * 1. loadTemplates  - Read all templates from JSON file
 * 2. saveTemplate   - Save/overwrite a template by name
 * 3. getTemplate    - Get single template by name (case-insensitive)
 * 4. deleteTemplate - Remove a template by name
 * 5. listTemplates  - Return all templates sorted by name
 *
 * Phase 13: Template Presets & Pipeline Speed
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import type { ProductTemplate } from './types.js';

// =============================================================================
// Constants
// =============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Path to the templates JSON data file */
const TEMPLATES_FILE = path.resolve(__dirname, '../../data/templates.json');

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
    const raw = await readFile(TEMPLATES_FILE, 'utf-8');
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
  const dir = path.dirname(TEMPLATES_FILE);
  await mkdir(dir, { recursive: true });
  await writeFile(TEMPLATES_FILE, JSON.stringify(data, null, 2) + '\n', 'utf-8');
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
 * Load all templates from data/templates.json.
 * Returns empty object if file doesn't exist.
 */
export async function loadTemplates(): Promise<Record<string, ProductTemplate>> {
  const data = await readTemplatesFile();
  return data.templates;
}

/**
 * Save or overwrite a template by name.
 * Sets createdAt on new templates, always updates updatedAt.
 * Writes to data/templates.json.
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
