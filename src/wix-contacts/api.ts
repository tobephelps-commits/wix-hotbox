/**
 * WIX Contacts API Client
 *
 * REST client for the WIX Contacts v4 API. Fetches contacts from
 * WIX CRM using the same auth pattern as the order sync (Bearer token
 * + wix-site-id header).
 *
 * Uses native fetch (Node 18+). No axios or node-fetch.
 *
 * Phase 60: WIX Customer Sync
 */

import type { Config } from '../config.js';
import type { WixApiContact, WixContactsQueryResponse } from './types.js';

// =============================================================================
// Constants
// =============================================================================

/** WIX Contacts v4 API base URL */
const CONTACTS_API_BASE = 'https://www.wixapis.com/contacts/v4';

/** Delay between API calls to respect WIX rate limits (ms) */
const WIX_RATE_LIMIT_DELAY_MS = 200;

/** Default page size for contact queries */
const DEFAULT_PAGE_SIZE = 100;

// =============================================================================
// Auth Helpers
// =============================================================================

/**
 * Build standard headers for WIX Contacts API requests.
 * Uses the same Config pattern as wix-sync.ts (wixApiKey + wixSiteId).
 */
function getHeaders(config: Config): Record<string, string> {
  if (!config.wixApiKey) {
    throw new Error(
      'WIX_API_KEY is not configured.\n' +
      'Set WIX_API_KEY in your .env file.\n' +
      'To obtain your API key:\n' +
      '  1. Go to WIX Dashboard -> Developer Tools -> API Keys\n' +
      '  2. Generate an API Key with "Manage Contacts" permission\n' +
      '  3. Add WIX_API_KEY=your_key to your .env file'
    );
  }

  if (!config.wixSiteId) {
    throw new Error(
      'WIX_SITE_ID is not configured.\n' +
      'Set WIX_SITE_ID in your .env file or config.'
    );
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.wixApiKey}`,
    'wix-site-id': config.wixSiteId,
  };
}

// =============================================================================
// Error Handling
// =============================================================================

/**
 * Handle WIX Contacts API error responses with descriptive messages.
 * Matches the error pattern from wix-sync.ts with status-specific guidance.
 */
async function handleErrorResponse(
  response: Response,
  endpoint: string,
  context?: string,
): Promise<never> {
  let errorBody: string;
  try {
    errorBody = await response.text();
  } catch {
    errorBody = '(unable to read response body)';
  }

  let wixMessage = errorBody;
  try {
    const parsed = JSON.parse(errorBody);
    if (parsed.message) {
      wixMessage = parsed.message;
    } else if (parsed.details) {
      wixMessage = JSON.stringify(parsed.details);
    }
  } catch {
    // Use raw text
  }

  const contextStr = context ? ` [${context}]` : '';

  switch (response.status) {
    case 401:
      throw new Error(
        `WIX Contacts API 401 Unauthorized at ${endpoint}${contextStr}: ${wixMessage}\n` +
        'Check that WIX_API_KEY is valid and has "Manage Contacts" or "Read Contacts" permission.'
      );
    case 403:
      throw new Error(
        `WIX Contacts API 403 Forbidden at ${endpoint}${contextStr}: ${wixMessage}\n` +
        'The API key may lack the required "Manage Contacts" or "Read Contacts" permission.'
      );
    case 404:
      throw new Error(
        `WIX Contacts API 404 Not Found at ${endpoint}${contextStr}: ${wixMessage}`
      );
    case 400:
      throw new Error(
        `WIX Contacts API 400 Bad Request at ${endpoint}${contextStr}: ${wixMessage}`
      );
    default:
      throw new Error(
        `WIX Contacts API ${response.status} at ${endpoint}${contextStr}: ${wixMessage}`
      );
  }
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Query contacts from the WIX Contacts v4 API.
 *
 * POST /contacts/v4/contacts/query
 *
 * @param config - Application config with WIX credentials
 * @param options - Optional paging parameters
 * @returns Query response with contacts and paging metadata
 */
export async function queryContacts(
  config: Config,
  options?: { offset?: number; limit?: number },
): Promise<WixContactsQueryResponse> {
  const endpoint = `${CONTACTS_API_BASE}/contacts/query`;
  const offset = options?.offset ?? 0;
  const limit = options?.limit ?? DEFAULT_PAGE_SIZE;

  const body = {
    query: {
      paging: { offset, limit },
      sort: [{ fieldName: 'createdDate', order: 'ASC' }],
    },
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: getHeaders(config),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    await handleErrorResponse(response, endpoint, `offset=${offset}`);
  }

  const data = await response.json() as WixContactsQueryResponse;
  return data;
}

/**
 * Fetch ALL contacts from WIX by paging through the query endpoint.
 *
 * Async generator that yields batches of WixApiContact[].
 * Stops when returned count < limit (no more pages).
 * Includes a 200ms delay between API calls for rate limiting.
 *
 * @param config - Application config with WIX credentials
 * @yields Batches of WixApiContact arrays
 */
export async function* fetchAllContacts(
  config: Config,
): AsyncGenerator<WixApiContact[], void, undefined> {
  let offset = 0;
  const limit = DEFAULT_PAGE_SIZE;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const response = await queryContacts(config, { offset, limit });
    const contacts = response.contacts ?? [];

    if (contacts.length > 0) {
      console.log(`[WixContacts] Fetched ${contacts.length} contacts (offset ${offset})`);
      yield contacts;
    }

    // Stop when we've received fewer contacts than requested (last page)
    if (contacts.length < limit) {
      break;
    }

    offset += limit;

    // Rate limit delay between API calls
    await new Promise((resolve) => setTimeout(resolve, WIX_RATE_LIMIT_DELAY_MS));
  }
}
