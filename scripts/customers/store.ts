/**
 * Customer Store
 *
 * JSON-file-backed customer account storage with CRUD operations.
 * Follows the same pattern as scripts/orders/order-store.ts (loadOrders/saveOrders
 * with data/ directory). All customers persist to data/customers/customers.json.
 *
 * Features:
 * - CRUD operations for customer accounts
 * - Atomic file writes (write to .tmp then rename)
 * - Missing field normalization on load
 * - Active/inactive filtering
 *
 * Phase 25: Customer Account System
 */

import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import type { CustomerAccount, CustomerStore } from './types.js';

// =============================================================================
// Constants
// =============================================================================

/** Directory for customer data files */
const CUSTOMERS_DIR = './data/customers';

/** Path to the customers JSON file */
const CUSTOMERS_FILE = path.join(CUSTOMERS_DIR, 'customers.json');

// =============================================================================
// Persistence
// =============================================================================

/**
 * Load customers from data/customers/customers.json.
 *
 * Creates the directory and file with empty data if missing.
 * Normalizes any customers that may be missing fields added after
 * initial creation.
 *
 * @returns Parsed CustomerStore
 */
export async function loadCustomers(): Promise<CustomerStore> {
  try {
    const raw = await readFile(CUSTOMERS_FILE, 'utf-8');
    const store = JSON.parse(raw) as CustomerStore;

    // Normalize customers that may be missing fields added after initial creation
    for (const customer of store.customers) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const c = customer as any;
      if (!c.logoKeys) c.logoKeys = [];
      if (c.markupPercent == null) c.markupPercent = 0;
      if (c.royaltyPercent == null) c.royaltyPercent = 0;
      if (c.active == null) c.active = true;
      if (!c.email) c.email = '';
      if (!c.contactName) c.contactName = '';
    }

    return store;
  } catch {
    // File doesn't exist or is invalid — return empty store
    const emptyStore: CustomerStore = {
      customers: [],
      lastUpdated: '',
    };

    // Ensure directory exists and write initial file
    await mkdir(CUSTOMERS_DIR, { recursive: true });
    await writeFile(CUSTOMERS_FILE, JSON.stringify(emptyStore, null, 2), 'utf-8');

    return emptyStore;
  }
}

/**
 * Save customers atomically (write to .tmp then rename).
 *
 * @param store - The full customer store to persist
 */
export async function saveCustomers(store: CustomerStore): Promise<void> {
  await mkdir(CUSTOMERS_DIR, { recursive: true });
  const tmpPath = CUSTOMERS_FILE + '.tmp';
  await writeFile(tmpPath, JSON.stringify(store, null, 2), 'utf-8');
  await rename(tmpPath, CUSTOMERS_FILE);
}

// =============================================================================
// Read Operations
// =============================================================================

/**
 * Find a customer by their unique ID.
 *
 * @param id - Customer UUID
 * @returns The customer, or undefined if not found
 */
export async function getCustomer(id: string): Promise<CustomerAccount | undefined> {
  const store = await loadCustomers();
  return store.customers.find((c) => c.id === id);
}

/**
 * List customers with optional active-only filtering.
 *
 * @param activeOnly - If true, return only active customers
 * @returns Array of customers
 */
export async function listCustomers(activeOnly?: boolean): Promise<CustomerAccount[]> {
  const store = await loadCustomers();
  if (activeOnly) {
    return store.customers.filter((c) => c.active);
  }
  return store.customers;
}

// =============================================================================
// Write Operations
// =============================================================================

/**
 * Add a new customer account to the store.
 *
 * Generates a UUID for id, sets createdAt/updatedAt to now, defaults
 * active to true if not specified, defaults logoKeys to empty array.
 *
 * @param data - Customer data without auto-generated fields
 * @returns The complete CustomerAccount with all generated fields
 */
export async function addCustomer(
  data: Omit<CustomerAccount, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<CustomerAccount> {
  const store = await loadCustomers();
  const now = new Date().toISOString();

  const customer: CustomerAccount = {
    ...data,
    id: crypto.randomUUID(),
    logoKeys: data.logoKeys ?? [],
    active: data.active ?? true,
    createdAt: now,
    updatedAt: now,
  };

  store.customers.push(customer);
  store.lastUpdated = now;
  await saveCustomers(store);

  return customer;
}

/**
 * Update a customer account.
 *
 * Merges the provided updates into the existing customer, sets updatedAt
 * to now, and saves the store.
 *
 * @param id - Customer UUID
 * @param updates - Partial customer fields to update
 * @returns The updated customer
 * @throws Error if customer not found
 */
export async function updateCustomer(
  id: string,
  updates: Partial<Pick<CustomerAccount, 'name' | 'contactName' | 'email' | 'phone' | 'logoKeys' | 'markupPercent' | 'royaltyPercent' | 'notes' | 'active'>>,
): Promise<CustomerAccount> {
  const store = await loadCustomers();
  const customer = store.customers.find((c) => c.id === id);

  if (!customer) {
    throw new Error(`Customer not found: ${id}`);
  }

  const now = new Date().toISOString();

  // Merge updates
  if (updates.name !== undefined) customer.name = updates.name;
  if (updates.contactName !== undefined) customer.contactName = updates.contactName;
  if (updates.email !== undefined) customer.email = updates.email;
  if (updates.phone !== undefined) customer.phone = updates.phone;
  if (updates.logoKeys !== undefined) customer.logoKeys = updates.logoKeys;
  if (updates.markupPercent !== undefined) customer.markupPercent = updates.markupPercent;
  if (updates.royaltyPercent !== undefined) customer.royaltyPercent = updates.royaltyPercent;
  if (updates.notes !== undefined) customer.notes = updates.notes;
  if (updates.active !== undefined) customer.active = updates.active;
  customer.updatedAt = now;

  store.lastUpdated = now;
  await saveCustomers(store);

  return customer;
}

/**
 * Delete a customer account from the store.
 *
 * @param id - Customer UUID
 * @returns true if customer was found and removed, false if not found
 */
export async function deleteCustomer(id: string): Promise<boolean> {
  const store = await loadCustomers();
  const idx = store.customers.findIndex((c) => c.id === id);

  if (idx < 0) {
    return false;
  }

  store.customers.splice(idx, 1);
  store.lastUpdated = new Date().toISOString();
  await saveCustomers(store);

  return true;
}
