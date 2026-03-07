/**
 * S&S Activewear Auth Module
 *
 * Loads credentials from environment variables and builds HTTP Basic Auth
 * headers for the S&S REST API V2.
 *
 * Usage:
 *   import { loadSSCredentials, buildAuthHeader, validateSSCredentials } from './auth.js';
 *   const header = buildAuthHeader(); // Returns "Basic <base64>"
 *
 * IMPORTANT: Never hardcode credentials. Never log credential values.
 */

import { SS_API_BASE_URL } from './constants.js';

// =============================================================================
// Types
// =============================================================================

/**
 * S&S Activewear API credentials.
 */
export interface SSCredentials {
  /** S&S Activewear account number */
  accountNumber: string;
  /** S&S Activewear API key */
  apiKey: string;
}

// =============================================================================
// Credential Loading
// =============================================================================

/**
 * Load S&S Activewear credentials from environment variables.
 * Throws a descriptive error if any required variable is missing.
 */
export function loadSSCredentials(): SSCredentials {
  const accountNumber = process.env.SS_ACCOUNT_NUMBER;
  const apiKey = process.env.SS_API_KEY;

  if (!accountNumber) {
    throw new Error(
      'Missing S&S Activewear credential: SS_ACCOUNT_NUMBER. Set it in .env file. ' +
      'Get your account number from S&S Activewear → My Account → Account Number.'
    );
  }

  if (!apiKey) {
    throw new Error(
      'Missing S&S Activewear credential: SS_API_KEY. Set it in .env file. ' +
      'Get your API key from S&S Activewear → My Account → API Key (click Show).'
    );
  }

  return { accountNumber, apiKey };
}

// =============================================================================
// Auth Header Builder
// =============================================================================

/**
 * Build the HTTP Basic Authorization header for S&S API calls.
 * Format: "Basic <base64(accountNumber:apiKey)>"
 *
 * @returns The full Authorization header value
 */
export function buildAuthHeader(): string {
  const { accountNumber, apiKey } = loadSSCredentials();
  return `Basic ${Buffer.from(`${accountNumber}:${apiKey}`).toString('base64')}`;
}

// =============================================================================
// Credential Validation
// =============================================================================

/**
 * Validate S&S Activewear credentials by making a lightweight API call.
 * Makes GET /v2/categories/ which is a small, fast response.
 *
 * @returns true if credentials are valid, false otherwise
 */
export async function validateSSCredentials(): Promise<boolean> {
  try {
    const authHeader = buildAuthHeader();
    const response = await fetch(`${SS_API_BASE_URL}/categories/`, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}
