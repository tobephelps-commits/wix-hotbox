/**
 * S&S Activewear Rate Limiter
 *
 * Sliding window rate limiter to enforce the S&S API's 60 requests/minute limit.
 * Shared singleton ensures all S&S API calls (pipeline, monitoring, sync) respect
 * the same global limit.
 *
 * Usage:
 *   import { ssRateLimiter } from './utils/rate-limiter.js';
 *   await ssRateLimiter.acquire(); // Blocks if at limit
 *   const response = await fetch(...);
 */

import { SS_RATE_LIMIT, SS_RATE_WINDOW } from '../constants.js';

// =============================================================================
// Rate Limiter Class
// =============================================================================

/**
 * Sliding window rate limiter.
 * Tracks request timestamps and blocks when the limit is reached,
 * waiting until the oldest request expires from the window.
 */
export class RateLimiter {
  private requestTimes: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  /**
   * Create a new rate limiter.
   *
   * @param maxRequests - Maximum requests allowed within the window
   * @param windowMs - Window duration in milliseconds
   */
  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Acquire a request slot. Blocks (awaits) if the rate limit has been reached,
   * waiting until the oldest request falls outside the sliding window.
   * Records the request timestamp after acquiring.
   */
  async acquire(): Promise<void> {
    this.pruneExpired();

    if (this.requestTimes.length >= this.maxRequests) {
      // Wait until the oldest request expires from the window
      const oldestRequest = this.requestTimes[0];
      const waitUntil = oldestRequest + this.windowMs;
      const waitMs = waitUntil - Date.now();

      if (waitMs > 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
        // Prune again after waiting — expired entries should be gone
        this.pruneExpired();
      }
    }

    // Record this request
    this.requestTimes.push(Date.now());
  }

  /**
   * Get the number of remaining requests available in the current window.
   */
  remaining(): number {
    this.pruneExpired();
    return Math.max(0, this.maxRequests - this.requestTimes.length);
  }

  /**
   * Remove request timestamps that have fallen outside the sliding window.
   */
  private pruneExpired(): void {
    const cutoff = Date.now() - this.windowMs;
    this.requestTimes = this.requestTimes.filter((t) => t > cutoff);
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

/**
 * Shared rate limiter for all S&S Activewear API calls.
 * Enforces the 60 requests/minute global limit.
 *
 * IMPORTANT: All S&S API usage (pipeline, monitoring, sync) MUST use
 * this singleton to prevent exceeding the rate limit.
 */
export const ssRateLimiter = new RateLimiter(SS_RATE_LIMIT, SS_RATE_WINDOW);
