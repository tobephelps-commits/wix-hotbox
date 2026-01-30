/**
 * SanMar SOAP Client Factory
 *
 * Creates and caches SOAP clients from SanMar WSDLs.
 * WSDL parsing is expensive (network fetch + XML parse), so clients are
 * cached in a module-level Map and reused across all calls.
 *
 * Usage:
 *   import { getProductInfoClient, describeClient } from './client.js';
 *   const client = await getProductInfoClient();
 *   console.log(describeClient(client)); // discover available methods
 *
 * IMPORTANT: Creating a SOAP client per request is the #1 anti-pattern.
 * Always use the cached client factory functions.
 */

import * as soap from 'soap';
import { WSDL_URLS, TEST_WSDL_URLS } from './constants.js';

// =============================================================================
// Client Cache
// =============================================================================

/**
 * Module-level client cache. Maps WSDL URL → cached SOAP client.
 * Singleton pattern ensures each WSDL is parsed only once.
 */
const clientCache: Map<string, soap.Client> = new Map();

// =============================================================================
// Core Client Factory
// =============================================================================

/**
 * Get or create a SOAP client for the given WSDL URL.
 * Returns cached client if available; otherwise creates, caches, and returns.
 *
 * @param wsdlUrl - Full WSDL URL (production or test)
 * @returns Initialized SOAP client ready for API calls
 */
export async function getClient(wsdlUrl: string): Promise<soap.Client> {
  const cached = clientCache.get(wsdlUrl);
  if (cached) {
    return cached;
  }

  const client = await soap.createClientAsync(wsdlUrl);
  clientCache.set(wsdlUrl, client);
  return client;
}

// =============================================================================
// Convenience Functions — SanMar Standard Services
// =============================================================================

/**
 * Get SOAP client for SanMar Standard Product Info service.
 * Methods: getProductInfoByStyleColorSize, getProductInfoByBrand, etc.
 */
export async function getProductInfoClient(
  useTest: boolean = false
): Promise<soap.Client> {
  const url = useTest ? TEST_WSDL_URLS.productInfo : WSDL_URLS.productInfo;
  return getClient(url);
}

/**
 * Get SOAP client for SanMar Standard Inventory service.
 * Methods: getInventoryQtyForStyleColorSize, etc.
 */
export async function getInventoryClient(
  useTest: boolean = false
): Promise<soap.Client> {
  const url = useTest ? TEST_WSDL_URLS.inventory : WSDL_URLS.inventory;
  return getClient(url);
}

/**
 * Get SOAP client for SanMar Standard Pricing service.
 * Methods: getPricing, etc.
 */
export async function getPricingClient(
  useTest: boolean = false
): Promise<soap.Client> {
  const url = useTest ? TEST_WSDL_URLS.pricing : WSDL_URLS.pricing;
  return getClient(url);
}

// =============================================================================
// Convenience Functions — PromoStandards Services
// =============================================================================

/**
 * Get SOAP client for PromoStandards Product Data v2.0.0.
 * Methods: GetProduct, GetProductSellable, etc.
 */
export async function getPSProductClient(
  useTest: boolean = false
): Promise<soap.Client> {
  const url = useTest
    ? TEST_WSDL_URLS.psProductData
    : WSDL_URLS.psProductData;
  return getClient(url);
}

/**
 * Get SOAP client for PromoStandards Inventory v2.0.0.
 * Methods: GetInventoryLevels (supports partIdArray batch, up to 200).
 */
export async function getPSInventoryClient(
  useTest: boolean = false
): Promise<soap.Client> {
  const url = useTest
    ? TEST_WSDL_URLS.psInventory
    : WSDL_URLS.psInventory;
  return getClient(url);
}

/**
 * Get SOAP client for PromoStandards Media Content v1.1.0.
 * Methods: GetMediaContent (returns image URLs with classType metadata).
 */
export async function getPSMediaClient(
  useTest: boolean = false
): Promise<soap.Client> {
  const url = useTest
    ? TEST_WSDL_URLS.psMediaContent
    : WSDL_URLS.psMediaContent;
  return getClient(url);
}

/**
 * Get SOAP client for PromoStandards Pricing and Configuration.
 * Methods: GetConfigurationAndPricing, etc.
 */
export async function getPSPricingClient(
  useTest: boolean = false
): Promise<soap.Client> {
  const url = useTest
    ? TEST_WSDL_URLS.psPricing
    : WSDL_URLS.psPricing;
  return getClient(url);
}

// =============================================================================
// Debug Helpers
// =============================================================================

/**
 * Describe a SOAP client's available services, ports, and methods.
 * Critical for validating WSDL parsing since exact arg mapping
 * needs runtime validation with `client.describe()`.
 *
 * @param client - An initialized SOAP client
 * @returns Object describing all services, ports, and methods
 */
export function describeClient(client: soap.Client): object {
  return client.describe();
}

/**
 * Get the raw XML of the last SOAP request sent by this client.
 * Useful for debugging request structure and verifying arg mapping.
 */
export function getLastRequest(client: soap.Client): string | undefined {
  return client.lastRequest;
}

/**
 * Get the raw XML of the last SOAP response received by this client.
 * Useful for debugging response parsing issues.
 */
export function getLastResponse(client: soap.Client): string | undefined {
  return client.lastResponse;
}

// =============================================================================
// Cache Management
// =============================================================================

/**
 * Clear all cached SOAP clients.
 * Use for testing and recovery from connection errors (e.g., after
 * network change or ECONNREFUSED). Next call to getClient() will
 * re-create and re-cache the client.
 */
export function clearClientCache(): void {
  clientCache.clear();
}

// =============================================================================
// Re-export soap namespace for type usage in service modules
// =============================================================================

export { soap };
