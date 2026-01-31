/**
 * Cost Tracker - Product cost recording and history persistence
 *
 * Records per-product costs (wholesale + decoration), maintains a history
 * of cost changes over time, and provides read access to cost data for
 * the margin report CLI.
 *
 * Data is persisted to data/cost-history.json (gitignored like other local data files).
 *
 * Functions:
 * 1. loadCostHistory    - Read cost history from JSON file
 * 2. saveCostHistory    - Write cost history to JSON file
 * 3. recordProductCost  - Upsert product cost record with history tracking
 * 4. getProductCost     - Get single product cost record by style
 * 5. getAllProductCosts  - Get all product cost records
 * 6. getCostHistory     - Get cost history entries for a style
 *
 * Phase 15: Cost Tracking & Sale/Promo Pricing
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import type { CostHistoryFile, ProductCostRecord, CostHistoryEntry } from './types.js';
import { calculateTotalCost, calculateFullMargin } from './pricing-rules.js';

// =============================================================================
// Constants
// =============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Path to the cost history JSON data file */
const COST_HISTORY_FILE = path.resolve(__dirname, '../../data/cost-history.json');

// =============================================================================
// File I/O
// =============================================================================

/**
 * Read cost history from data/cost-history.json.
 * Creates an empty file if it doesn't exist.
 */
export async function loadCostHistory(): Promise<CostHistoryFile> {
  try {
    const raw = await readFile(COST_HISTORY_FILE, 'utf-8');
    return JSON.parse(raw) as CostHistoryFile;
  } catch (err: unknown) {
    if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
      const empty: CostHistoryFile = {
        products: {},
        lastUpdated: new Date().toISOString(),
      };
      await saveCostHistory(empty);
      return empty;
    }
    throw err;
  }
}

/**
 * Write cost history to data/cost-history.json.
 * Creates the data/ directory if it doesn't exist.
 */
export async function saveCostHistory(data: CostHistoryFile): Promise<void> {
  const dir = path.dirname(COST_HISTORY_FILE);
  await mkdir(dir, { recursive: true });
  await writeFile(COST_HISTORY_FILE, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

// =============================================================================
// Record & Query Functions
// =============================================================================

/** Parameters for recording a product cost entry */
export interface RecordCostParams {
  style: string;
  productName: string;
  wixProductId: string;
  wholesaleCost: number;
  decorationCost: number;
  decorationType: ProductCostRecord['decorationType'];
  retailPrice: number;
  pricingPreset: string;
}

/**
 * Record or update product cost data.
 *
 * If the style already exists and costs/prices have changed, appends a
 * history entry with the appropriate reason. If this is a new product,
 * creates the initial record with reason "initial".
 *
 * @param params - Product cost parameters
 * @returns The upserted ProductCostRecord
 */
export async function recordProductCost(params: RecordCostParams): Promise<ProductCostRecord> {
  const data = await loadCostHistory();
  const now = new Date().toISOString();

  const totalCost = calculateTotalCost(params.wholesaleCost, params.decorationCost);
  const margin = calculateFullMargin(params.retailPrice, params.wholesaleCost, params.decorationCost);

  const record: ProductCostRecord = {
    style: params.style,
    productName: params.productName,
    wixProductId: params.wixProductId,
    wholesaleCost: params.wholesaleCost,
    decorationCost: params.decorationCost,
    decorationType: params.decorationType,
    totalCost,
    retailPrice: params.retailPrice,
    margin,
    pricingPreset: params.pricingPreset,
    createdAt: data.products[params.style]?.current.createdAt ?? now,
    updatedAt: now,
  };

  // Determine history reason
  let reason: CostHistoryEntry['reason'] = 'initial';
  const existing = data.products[params.style];
  if (existing) {
    const prev = existing.current;
    if (prev.wholesaleCost !== params.wholesaleCost || prev.decorationCost !== params.decorationCost) {
      reason = 'cost-change';
    } else if (prev.retailPrice !== params.retailPrice) {
      reason = 'price-change';
    } else {
      // No change in cost or price -- still update record but skip history entry
      data.products[params.style] = {
        current: record,
        history: existing.history,
      };
      data.lastUpdated = now;
      await saveCostHistory(data);
      return record;
    }
  }

  // Create history entry
  const historyEntry: CostHistoryEntry = {
    timestamp: now,
    wholesaleCost: params.wholesaleCost,
    decorationCost: params.decorationCost,
    totalCost,
    retailPrice: params.retailPrice,
    margin,
    reason,
  };

  // Upsert
  if (!data.products[params.style]) {
    data.products[params.style] = {
      current: record,
      history: [historyEntry],
    };
  } else {
    data.products[params.style].current = record;
    data.products[params.style].history.push(historyEntry);
  }

  data.lastUpdated = now;
  await saveCostHistory(data);
  return record;
}

/**
 * Get the current cost record for a product style.
 * Returns null if style not tracked.
 */
export async function getProductCost(style: string): Promise<ProductCostRecord | null> {
  const data = await loadCostHistory();
  return data.products[style]?.current ?? null;
}

/**
 * Get all tracked product cost records.
 */
export async function getAllProductCosts(): Promise<ProductCostRecord[]> {
  const data = await loadCostHistory();
  return Object.values(data.products).map((p) => p.current);
}

/**
 * Get cost history entries for a product style.
 * Returns empty array if style not tracked.
 */
export async function getCostHistory(style: string): Promise<CostHistoryEntry[]> {
  const data = await loadCostHistory();
  return data.products[style]?.history ?? [];
}
