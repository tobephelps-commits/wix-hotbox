/**
 * SanMar Authentication Types
 *
 * Defines credential shapes for both SanMar Standard and PromoStandards API families.
 */

/**
 * Auth object for SanMar Standard API calls.
 * Passed as the second argument (arg1) to standard service methods.
 */
export interface SanMarAuth {
  sanMarCustomerNumber: string;
  sanMarUserName: string;
  sanMarUserPassword: string;
}

/**
 * Auth object for PromoStandards API calls.
 * Passed within the request object to PS service methods.
 * Note: PromoStandards uses `id` (sanmar.com username), not customer number.
 */
export interface PromoStandardsAuth {
  wsVersion: string;
  id: string;
  password: string;
}

/**
 * Internal credential representation loaded from environment variables.
 * Used as the source for building both SanMarAuth and PromoStandardsAuth objects.
 */
export interface SanMarCredentials {
  customerNumber: string;
  username: string;
  password: string;
}
