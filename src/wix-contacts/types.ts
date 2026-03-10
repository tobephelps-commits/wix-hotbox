/**
 * WIX Contacts Types
 *
 * Type definitions for the WIX CRM contact sync system.
 * WIX contacts are separate from B2B customer accounts — they represent
 * raw contact data from the WIX CRM that can optionally be linked to
 * customer accounts.
 *
 * Phase 60: WIX Customer Sync
 */

// =============================================================================
// Local Database Model
// =============================================================================

/**
 * A WIX CRM contact as stored in the local SQLite database.
 * Maps to the wix_contacts table (camelCase).
 */
export interface WixContact {
  /** WIX contact ID (primary key) */
  wixContactId: string;
  /** First name */
  firstName: string | null;
  /** Last name */
  lastName: string | null;
  /** Primary email address */
  email: string | null;
  /** Primary phone number */
  phone: string | null;
  /** Company name */
  company: string | null;
  /** Job title */
  jobTitle: string | null;
  /** Optional FK to customers table (B2B account link) */
  customerId: string | null;
  /** ISO timestamp from WIX when contact was created */
  wixCreatedDate: string | null;
  /** ISO timestamp from WIX when contact was last updated */
  wixUpdatedDate: string | null;
  /** ISO timestamp of last successful sync */
  lastSyncedAt: string;
  /** ISO timestamp when record was created locally */
  createdAt: string;
  /** ISO timestamp when record was last updated locally */
  updatedAt: string;
}

// =============================================================================
// WIX Contacts API v4 Response Types
// =============================================================================

/**
 * A contact as returned by the WIX Contacts API v4.
 * Matches the WIX REST API response shape.
 */
export interface WixApiContact {
  /** WIX contact ID */
  id: string;
  /** Primary contact info (email, phone) */
  primaryInfo?: {
    email?: string;
    phone?: string;
  };
  /** Detailed contact information */
  info?: {
    name?: {
      first?: string;
      last?: string;
    };
    company?: string;
    jobTitle?: string;
  };
  /** ISO timestamp when the contact was created in WIX */
  createdDate?: string;
  /** ISO timestamp when the contact was last updated in WIX */
  updatedDate?: string;
}

/**
 * Response from the WIX Contacts v4 query endpoint.
 */
export interface WixContactsQueryResponse {
  /** Array of contacts matching the query */
  contacts: WixApiContact[];
  /** Paging metadata for pagination */
  pagingMetadata: {
    /** Current offset */
    offset: number;
    /** Number of contacts returned in this page */
    count: number;
    /** Total number of contacts matching the query */
    total: number;
  };
}

// =============================================================================
// Sync Types
// =============================================================================

/**
 * Health metrics for the customer contact sync daemon.
 * Mirrors SyncHealth from sync/types.ts but tracks contact-specific metrics.
 */
export interface CustomerSyncHealth {
  /** ISO timestamp when the sync daemon started */
  startedAt: string;
  /** ISO timestamp of the last sync tick, or null if none yet */
  lastTickAt: string | null;
  /** ISO timestamp of the last successful tick, or null if none yet */
  lastSuccessAt: string | null;
  /** Number of consecutive errors (resets on success) */
  consecutiveErrors: number;
  /** Total number of completed sync cycles */
  totalCycles: number;
  /** Total number of errored sync cycles */
  totalErrors: number;
  /** Total number of contacts synced across all cycles */
  contactsSynced: number;
  /** Duration of the last tick in milliseconds */
  lastTickDurationMs: number;
  /** Cumulative moving average tick duration in milliseconds */
  avgTickDurationMs: number;
  /** Maximum tick duration seen in milliseconds */
  maxTickDurationMs: number;
}

/**
 * Result of a single customer contact sync cycle.
 */
export interface CustomerSyncResult {
  /** Number of contacts fetched from WIX API */
  contactsFetched: number;
  /** Number of new contacts created locally */
  contactsCreated: number;
  /** Number of existing contacts updated locally */
  contactsUpdated: number;
  /** Number of contacts unchanged (no diff) */
  contactsUnchanged: number;
  /** Error messages encountered during sync */
  errors: string[];
}
