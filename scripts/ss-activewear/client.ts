/**
 * S&S Activewear REST Client
 *
 * Core HTTP client for S&S API V2 with rate limiting, error classification,
 * and retry logic. Uses native fetch() — no additional dependencies.
 *
 * IMPORTANT: Do not export these functions directly. They are internal to the
 * ss-activewear module. Consumer-facing functions are in services/*.ts and
 * exported via index.ts.
 *
 * Usage (internal only):
 *   import { ssGet, ssGetWithRetry } from './client.js';
 *   const products = await ssGetWithRetry<SSProduct[]>('/products/?style=2000');
 */

import { SS_API_BASE_URL } from './constants.js';
import { buildAuthHeader } from './auth.js';
import { ssRateLimiter } from './utils/rate-limiter.js';
import {
  classifySSError,
  classifySSConnectionError,
  isSSRetryable,
  SSError,
  SSErrorType,
} from './utils/error-handler.js';

// =============================================================================
// Core GET Function
// =============================================================================

/**
 * Make an authenticated GET request to the S&S Activewear API.
 *
 * 1. Acquires a rate limit slot (blocks if at 60/min limit)
 * 2. Builds URL from base + path + optional query params
 * 3. Sets Authorization (Basic) and Accept headers
 * 4. Logs warning when X-Rate-Limit-Remaining drops below 10
 * 5. On 404: returns empty array (not found is not exceptional for queries)
 * 6. On other errors: classifies and throws SSError
 *
 * @param path - API path relative to base URL (e.g., "/products/?style=2000")
 * @param params - Optional query parameters to append
 * @returns Parsed JSON response as type T
 */
export async function ssGet<T>(
  path: string,
  params?: Record<string, string>
): Promise<T> {
  // Wait for rate limit slot
  await ssRateLimiter.acquire();

  // Build URL
  const url = new URL(path, SS_API_BASE_URL + '/');
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: {
        'Authorization': buildAuthHeader(),
        'Accept': 'application/json',
      },
    });
  } catch (error: unknown) {
    // Network/connection error — no HTTP response received
    throw classifySSConnectionError(error);
  }

  // Check rate limit header and warn if running low
  const rateLimitRemaining = response.headers.get('X-Rate-Limit-Remaining');
  if (rateLimitRemaining !== null) {
    const remaining = parseInt(rateLimitRemaining, 10);
    if (!isNaN(remaining) && remaining < 10) {
      console.warn(`[S&S] Rate limit low: ${remaining} requests remaining`);
    }
  }

  // Handle non-OK responses
  if (!response.ok) {
    // 404 is not exceptional for queries — return empty array
    if (response.status === 404) {
      return [] as unknown as T;
    }

    const body = await response.text();
    throw classifySSError(response.status, body);
  }

  return response.json() as Promise<T>;
}

// =============================================================================
// Retry Wrapper
// =============================================================================

/**
 * Make an authenticated GET request with exponential backoff retry.
 * Only retries on retryable errors (rate limited, timeout, connection, server).
 * Non-retryable errors (invalid credentials, not found) throw immediately.
 *
 * Retry schedule: 1s, 2s, 4s (exponential backoff).
 * Adapted from scripts/sanmar/utils/retry.ts pattern.
 *
 * @param path - API path relative to base URL
 * @param params - Optional query parameters
 * @param maxRetries - Maximum retry attempts (default: 3)
 * @returns Parsed JSON response as type T
 * @throws SSError if all retries exhausted or error is not retryable
 */
export async function ssGetWithRetry<T>(
  path: string,
  params?: Record<string, string>,
  maxRetries: number = 3
): Promise<T> {
  const baseDelay = 1000; // 1 second
  let lastError: SSError | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await ssGet<T>(path, params);
    } catch (error: unknown) {
      // Ensure it's an SSError
      const ssError = error instanceof SSError
        ? error
        : classifySSConnectionError(error);

      lastError = ssError;

      // Don't retry non-retryable errors
      if (!isSSRetryable(ssError)) {
        throw ssError;
      }

      // Don't retry if we've exhausted attempts
      if (attempt >= maxRetries) {
        throw ssError;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt);
      console.warn(
        `[S&S] Retry ${attempt + 1}/${maxRetries} after ${delay}ms: ${ssError.message}`
      );
      await new Promise<void>((resolve) => setTimeout(resolve, delay));
    }
  }

  // TypeScript safety — should never reach here
  throw lastError ?? new Error('S&S retry failed with no error captured');
}
