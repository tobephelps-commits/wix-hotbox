/**
 * SanMar Retry Utility
 *
 * Wraps async operations with exponential backoff retry logic.
 * Only retries errors classified as retryable by the error handler
 * (timeouts, connection errors, SOAP faults). User errors like
 * invalid credentials or style codes are never retried.
 *
 * Usage:
 *   import { withRetry } from './utils/retry.js';
 *   const result = await withRetry(() => soapClient.getProductInfoAsync(args), {
 *     maxRetries: 3,
 *     onRetry: (attempt, err) => console.warn(`Retry ${attempt}: ${err.message}`),
 *   });
 */

import { classifyError, isRetryable, type SanMarError } from './error-handler.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Configuration for retry behavior.
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries: number;
  /** Base delay in milliseconds before first retry (default: 1000) */
  baseDelay: number;
  /** Maximum delay in milliseconds between retries (default: 10000) */
  maxDelay: number;
  /** Optional callback invoked before each retry attempt */
  onRetry?: (attempt: number, error: SanMarError) => void;
}

/**
 * Default retry configuration.
 * 3 retries with 1s base delay, exponential backoff capped at 10s.
 * Retry schedule: ~1s, ~2s, ~4s (then give up).
 */
export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
};

// =============================================================================
// Retry Logic
// =============================================================================

/**
 * Execute an async function with retry and exponential backoff.
 *
 * On error:
 * 1. Classify the error using classifyError()
 * 2. Check if retryable using isRetryable()
 * 3. If retryable and attempts remaining: wait (exponential backoff), retry
 * 4. If not retryable or max retries exceeded: throw the SanMarError
 *
 * Backoff formula: min(baseDelay * 2^attempt, maxDelay)
 * Example with defaults: 1000ms, 2000ms, 4000ms
 *
 * @param fn - Async function to execute (and potentially retry)
 * @param options - Retry configuration (uses defaults for omitted fields)
 * @returns The result of fn() on success
 * @throws SanMarError if all retries exhausted or error is not retryable
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: Partial<RetryOptions>
): Promise<T> {
  const config: RetryOptions = {
    ...DEFAULT_RETRY_OPTIONS,
    ...options,
  };

  let lastError: SanMarError | undefined;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      const sanmarError = classifyError(error);
      lastError = sanmarError;

      // If not retryable, throw immediately -- no point retrying user errors
      if (!isRetryable(sanmarError)) {
        throw sanmarError;
      }

      // If we've exhausted all retries, throw
      if (attempt >= config.maxRetries) {
        throw sanmarError;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.baseDelay * Math.pow(2, attempt),
        config.maxDelay
      );

      // Invoke onRetry callback if provided
      if (config.onRetry) {
        config.onRetry(attempt + 1, sanmarError);
      }

      // Wait before retrying
      await sleep(delay);
    }
  }

  // TypeScript safety -- should never reach here
  throw lastError ?? new Error('Retry failed with no error captured');
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Promise-based sleep. Uses setTimeout (not busy-wait).
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
