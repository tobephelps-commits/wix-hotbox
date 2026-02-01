/**
 * S&S Activewear Error Handler
 *
 * Classifies HTTP/REST errors into actionable types with suggestions.
 * Covers all known S&S API failure modes:
 * - Invalid credentials (401)
 * - Not found (404)
 * - Rate limited (429)
 * - Server errors (500+)
 * - Timeouts and connection errors
 *
 * Usage:
 *   import { classifySSError, isSSRetryable, SSError } from './utils/error-handler.js';
 *   try { await ssGet('/v2/products/'); }
 *   catch (err) {
 *     if (err instanceof SSError && isSSRetryable(err)) { // retry... }
 *   }
 */

// =============================================================================
// Error Types
// =============================================================================

/**
 * All known S&S Activewear error categories.
 * Mapped from HTTP status codes and connection error types.
 */
export enum SSErrorType {
  /** 401 Unauthorized — bad account number or API key */
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  /** 404 Not Found — style/SKU does not exist */
  NOT_FOUND = 'NOT_FOUND',
  /** 429 Too Many Requests — rate limit exceeded (60/min) */
  RATE_LIMITED = 'RATE_LIMITED',
  /** 500+ Server Error — S&S API internal issue */
  SERVER_ERROR = 'SERVER_ERROR',
  /** Request timed out */
  TIMEOUT = 'TIMEOUT',
  /** Network connectivity failure (ECONNREFUSED, ENOTFOUND, etc.) */
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  /** Unclassified error */
  UNKNOWN = 'UNKNOWN',
}

// =============================================================================
// SSError Class
// =============================================================================

/**
 * Typed error class for S&S Activewear API errors.
 * Extends Error with type classification, HTTP status code,
 * and actionable fix suggestions.
 */
export class SSError extends Error {
  public readonly type: SSErrorType;
  public readonly statusCode?: number;
  public readonly suggestion?: string;

  constructor(
    message: string,
    type: SSErrorType,
    options?: {
      statusCode?: number;
      suggestion?: string;
    }
  ) {
    super(message);
    this.name = 'SSError';
    this.type = type;
    this.statusCode = options?.statusCode;
    this.suggestion = options?.suggestion;
  }
}

// =============================================================================
// Error Classification
// =============================================================================

/**
 * Classify an HTTP status code and response body into a typed SSError.
 *
 * @param status - HTTP status code from the response
 * @param body - Response body text (may contain error details)
 * @returns Typed SSError with classification and suggestion
 */
export function classifySSError(status: number, body: string): SSError {
  switch (true) {
    case status === 401:
      return new SSError(
        `Authentication failed: ${body || 'Invalid credentials'}`,
        SSErrorType.INVALID_CREDENTIALS,
        {
          statusCode: status,
          suggestion:
            'Check SS_ACCOUNT_NUMBER and SS_API_KEY in .env file. ' +
            'Get credentials from S&S Activewear → My Account.',
        }
      );

    case status === 404:
      return new SSError(
        `Not found: ${body || 'Resource does not exist'}`,
        SSErrorType.NOT_FOUND,
        {
          statusCode: status,
          suggestion:
            'Verify the style number or SKU exists in the S&S Activewear catalog.',
        }
      );

    case status === 429:
      return new SSError(
        `Rate limit exceeded: ${body || 'Too many requests'}`,
        SSErrorType.RATE_LIMITED,
        {
          statusCode: status,
          suggestion:
            'S&S enforces 60 requests/minute. Wait for the rate limit window to reset. ' +
            'Check X-Rate-Limit-Remaining header to monitor usage.',
        }
      );

    case status >= 500:
      return new SSError(
        `S&S server error (${status}): ${body || 'Internal server error'}`,
        SSErrorType.SERVER_ERROR,
        {
          statusCode: status,
          suggestion:
            'S&S API returned a server error. This is usually transient — retry after a delay.',
        }
      );

    default:
      return new SSError(
        `S&S API error (${status}): ${body || 'Unknown error'}`,
        SSErrorType.UNKNOWN,
        {
          statusCode: status,
        }
      );
  }
}

/**
 * Classify a network/connection error into a typed SSError.
 * Call this when fetch() itself throws (no HTTP response received).
 *
 * @param error - The caught error from fetch()
 * @returns Typed SSError with classification and suggestion
 */
export function classifySSConnectionError(error: unknown): SSError {
  const message = error instanceof Error ? error.message : String(error);
  const code = error instanceof Error && 'code' in error
    ? String((error as NodeJS.ErrnoException).code)
    : '';

  // Timeout errors
  if (
    code === 'ETIMEDOUT' ||
    code === 'ESOCKETTIMEDOUT' ||
    code === 'UND_ERR_CONNECT_TIMEOUT' ||
    message.includes('timeout') ||
    message.includes('socket hang up')
  ) {
    return new SSError(
      `Request timed out: ${message}`,
      SSErrorType.TIMEOUT,
      {
        suggestion:
          'S&S API request timed out. This may be transient — retry after a delay.',
      }
    );
  }

  // Connection errors
  if (
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    code === 'ECONNRESET' ||
    message.includes('ECONNREFUSED') ||
    message.includes('ENOTFOUND')
  ) {
    return new SSError(
      `Connection failed: ${message}`,
      SSErrorType.CONNECTION_ERROR,
      {
        suggestion:
          'Cannot reach S&S Activewear API at api.ssactivewear.com. ' +
          'Check network connectivity and DNS resolution.',
      }
    );
  }

  // Unknown network error
  return new SSError(
    message || 'Unknown S&S API error',
    SSErrorType.UNKNOWN,
  );
}

// =============================================================================
// Retryability
// =============================================================================

/**
 * Determine if an SSError is worth retrying.
 *
 * Retryable (transient issues that may resolve):
 * - RATE_LIMITED — wait for window reset
 * - TIMEOUT — server may respond faster on retry
 * - CONNECTION_ERROR — transient network issue
 * - SERVER_ERROR — server hiccup
 *
 * Not retryable (client errors that won't change):
 * - INVALID_CREDENTIALS — wrong credentials won't fix themselves
 * - NOT_FOUND — resource doesn't exist
 * - UNKNOWN — don't retry blindly
 */
export function isSSRetryable(error: SSError): boolean {
  switch (error.type) {
    case SSErrorType.RATE_LIMITED:
    case SSErrorType.TIMEOUT:
    case SSErrorType.CONNECTION_ERROR:
    case SSErrorType.SERVER_ERROR:
      return true;
    case SSErrorType.INVALID_CREDENTIALS:
    case SSErrorType.NOT_FOUND:
    case SSErrorType.UNKNOWN:
      return false;
    default:
      return false;
  }
}

// =============================================================================
// Error Formatting
// =============================================================================

/**
 * Format an SSError into a human-readable string.
 * Includes type, message, and suggestion (if available).
 */
export function formatSSError(error: SSError): string {
  const parts: string[] = [
    `[S&S ${error.type}] ${error.message}`,
  ];

  if (error.statusCode) {
    parts.push(`HTTP Status: ${error.statusCode}`);
  }

  if (error.suggestion) {
    parts.push(`Suggestion: ${error.suggestion}`);
  }

  return parts.join('\n');
}
