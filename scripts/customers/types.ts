/**
 * Customer Account Types
 *
 * Type definitions for the B2B customer account system. Each customer
 * represents a brand relationship with configurable markup and royalty
 * rates. Customer accounts bridge the logo system (phases 21-24) with
 * royalty reporting (phase 26).
 *
 * Phase 25: Customer Account System
 */

// =============================================================================
// Customer Account
// =============================================================================

/**
 * A B2B customer account representing a brand relationship.
 *
 * Each customer has a single markup percentage applied to wholesale cost
 * and a royalty rate percentage for royalty reporting. Logo keys link
 * the customer to the logo registry (data/logos.json).
 */
export interface CustomerAccount {
  /** Unique identifier (UUID v4) */
  id: string;
  /** Brand/company name (e.g., "Board 30", "Big Barn") */
  name: string;
  /** Primary contact person */
  contactName: string;
  /** Contact email (optional, not a primary key) */
  email: string;
  /** Contact phone (optional) */
  phone?: string;
  /**
   * Array of logo registry keys (references data/logos.json keys
   * like "board-30-logo-black-6x6"). Links the logo system to
   * customer accounts.
   */
  logoKeys: string[];
  /**
   * Single markup percentage applied to wholesale cost for this customer.
   * e.g., 40 means cost * 1.40. This is the key pricing field.
   */
  markupPercent: number;
  /**
   * Royalty rate percentage on retail sales for this customer.
   * Used in phase 26 for royalty reporting.
   */
  royaltyPercent: number;
  /** Free-text notes (optional) */
  notes?: string;
  /** Whether account is currently active (default true) */
  active: boolean;
  /** ISO-8601 creation timestamp */
  createdAt: string;
  /** ISO-8601 last update timestamp */
  updatedAt: string;
}

// =============================================================================
// Customer Store
// =============================================================================

/**
 * Shape of the persisted customer store file.
 */
export interface CustomerStore {
  /** Array of all customer accounts */
  customers: CustomerAccount[];
  /** ISO-8601 timestamp of last update */
  lastUpdated: string;
}
