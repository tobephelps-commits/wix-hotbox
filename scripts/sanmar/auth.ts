/**
 * SanMar Auth Module
 *
 * Loads credentials from environment variables and builds auth objects
 * for both SanMar Standard and PromoStandards API families.
 *
 * Usage:
 *   import { getSanMarAuth, getPromoStandardsAuth } from './auth.js';
 *   const auth = getSanMarAuth();        // For SanMar Standard calls
 *   const psAuth = getPromoStandardsAuth(); // For PromoStandards calls
 *
 * IMPORTANT: Never hardcode credentials. Never log credential values.
 */

import 'dotenv/config';
import type {
  SanMarAuth,
  PromoStandardsAuth,
  SanMarCredentials,
} from './types/index.js';

/**
 * Load SanMar credentials from environment variables.
 * Throws a descriptive error if any required variable is missing.
 */
export function loadCredentials(): SanMarCredentials {
  const customerNumber = process.env.SANMAR_CUSTOMER_NUMBER;
  const username = process.env.SANMAR_USERNAME;
  const password = process.env.SANMAR_PASSWORD;

  if (!customerNumber) {
    throw new Error(
      'Missing SanMar credential: SANMAR_CUSTOMER_NUMBER. Set it in .env file. See .env.example for required variables.'
    );
  }

  if (!username) {
    throw new Error(
      'Missing SanMar credential: SANMAR_USERNAME. Set it in .env file. See .env.example for required variables.'
    );
  }

  if (!password) {
    throw new Error(
      'Missing SanMar credential: SANMAR_PASSWORD. Set it in .env file. See .env.example for required variables.'
    );
  }

  return { customerNumber, username, password };
}

/**
 * Build auth object for SanMar Standard API calls.
 * Used as the second argument (arg1) to standard service methods like
 * getProductInfoByStyleColorSize, getInventoryQtyForStyleColorSize, getPricing.
 */
export function getSanMarAuth(): SanMarAuth {
  const credentials = loadCredentials();
  return {
    sanMarCustomerNumber: credentials.customerNumber,
    sanMarUserName: credentials.username,
    sanMarUserPassword: credentials.password,
  };
}

/**
 * Build auth object for PromoStandards API calls.
 * Used within the request object to PS service methods like
 * GetProduct, GetInventoryLevels, GetMediaContent.
 *
 * Note: PromoStandards uses `id` (sanmar.com username), not customer number.
 *
 * @param wsVersion - PromoStandards web service version (default: '2.0.0')
 */
export function getPromoStandardsAuth(
  wsVersion: string = '2.0.0'
): PromoStandardsAuth {
  const credentials = loadCredentials();
  return {
    wsVersion,
    id: credentials.username,
    password: credentials.password,
  };
}

/**
 * Pre-flight check for credential availability.
 * Returns true if all three required environment variables are present.
 * Does NOT throw -- use this for validation before attempting API calls.
 */
export function validateCredentials(): boolean {
  try {
    loadCredentials();
    return true;
  } catch {
    return false;
  }
}
