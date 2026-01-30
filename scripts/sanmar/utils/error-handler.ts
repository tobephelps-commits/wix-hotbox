/**
 * SanMar Error Handler
 *
 * Classifies SOAP errors into actionable types with suggestions.
 * Covers all known SanMar failure modes documented in RESEARCH.md:
 * - Invalid credentials, style, color, size
 * - Timeouts from large dataset queries
 * - Connection errors (port 8080 blocked)
 * - SOAP faults
 *
 * Usage:
 *   import { classifyError, isRetryable, formatError } from './utils/error-handler.js';
 *   try { await soapCall(); }
 *   catch (err) {
 *     const sanmarErr = classifyError(err);
 *     console.error(formatError(sanmarErr));
 *     if (isRetryable(sanmarErr)) { // retry... }
 *   }
 */

// =============================================================================
// Error Types
// =============================================================================

/**
 * All known SanMar error categories.
 * Covers documented failure modes from SanMar Web Services Integration Guide v24.2.
 */
export enum SanMarErrorType {
  /** Bad username, password, or customer number */
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  /** Style number not found in SanMar catalog */
  INVALID_STYLE = 'INVALID_STYLE',
  /** Color not found — likely catalogColor vs display color confusion */
  INVALID_COLOR = 'INVALID_COLOR',
  /** Size not found for the given style/color */
  INVALID_SIZE = 'INVALID_SIZE',
  /** Response too large or server timeout (brand/category queries) */
  TIMEOUT = 'TIMEOUT',
  /** ECONNREFUSED, ETIMEDOUT — port 8080 likely blocked */
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  /** Generic SOAP fault from server */
  SOAP_FAULT = 'SOAP_FAULT',
  /** Unclassified error */
  UNKNOWN = 'UNKNOWN',
}

// =============================================================================
// SanMarError Class
// =============================================================================

/**
 * Typed error class for SanMar API errors.
 * Extends Error with type classification, original error reference,
 * raw SOAP fault data, and actionable fix suggestions.
 */
export class SanMarError extends Error {
  public readonly type: SanMarErrorType;
  public readonly originalError?: unknown;
  public readonly soapFault?: string;
  public readonly suggestion?: string;

  constructor(
    message: string,
    type: SanMarErrorType,
    options?: {
      originalError?: unknown;
      soapFault?: string;
      suggestion?: string;
    }
  ) {
    super(message);
    this.name = 'SanMarError';
    this.type = type;
    this.originalError = options?.originalError;
    this.soapFault = options?.soapFault;
    this.suggestion = options?.suggestion;
  }
}

// =============================================================================
// Error Classification
// =============================================================================

/**
 * Classify an unknown error into a typed SanMarError.
 *
 * Checks for:
 * 1. SanMar response with errorOccured === true and message field
 * 2. ECONNREFUSED/ETIMEDOUT connection errors
 * 3. SOAP fault responses
 * 4. Timeout indicators (null response, long wait)
 *
 * @param error - Any error caught from a SOAP call
 * @returns Typed SanMarError with classification and suggestion
 */
export function classifyError(error: unknown): SanMarError {
  // Handle case where error is already a SanMarError
  if (error instanceof SanMarError) {
    return error;
  }

  const errMsg = extractErrorMessage(error);
  const errCode = extractErrorCode(error);

  // Check for SanMar response-level errors (errorOccured === true in response)
  if (isSanMarResponseError(error)) {
    const responseMessage = extractSanMarResponseMessage(error);

    if (containsAny(responseMessage, ['Invalid Style', 'style not found', 'invalid style'])) {
      return new SanMarError(responseMessage, SanMarErrorType.INVALID_STYLE, {
        originalError: error,
        suggestion: 'Verify the style number exists in the SanMar catalog. Use the exact SanMar style code (e.g., "PC61", "K420").',
      });
    }

    if (containsAny(responseMessage, ['Invalid Color', 'color not found', 'invalid color', 'Invalid Style + Color'])) {
      return new SanMarError(responseMessage, SanMarErrorType.INVALID_COLOR, {
        originalError: error,
        suggestion:
          'Use catalogColor (mainframe color) instead of display color name. Example: "Ath. Maroon" not "Athletic Maroon". Query with style only first to discover valid catalogColor values.',
      });
    }

    if (containsAny(responseMessage, ['Invalid Size', 'size not found', 'invalid size', 'Invalid Style + Color + Size'])) {
      return new SanMarError(responseMessage, SanMarErrorType.INVALID_SIZE, {
        originalError: error,
        suggestion:
          'Verify the size code matches SanMar\'s system. Query by style and color first to see available sizes.',
      });
    }

    if (containsAny(responseMessage, ['Authentication', 'Invalid credentials', 'invalid credentials', 'Unauthorized', 'unauthorized'])) {
      return new SanMarError(responseMessage, SanMarErrorType.INVALID_CREDENTIALS, {
        originalError: error,
        suggestion:
          'Check SANMAR_CUSTOMER_NUMBER, SANMAR_USERNAME, and SANMAR_PASSWORD in .env file. Ensure API access has been provisioned by sanmarintegrations@sanmar.com.',
      });
    }

    // Generic SanMar response error
    return new SanMarError(responseMessage, SanMarErrorType.UNKNOWN, {
      originalError: error,
    });
  }

  // Check for connection errors (port 8080 blocked, network issues)
  if (errCode === 'ECONNREFUSED' || errCode === 'ETIMEDOUT' || errCode === 'ENOTFOUND' ||
      containsAny(errMsg, ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'connect ECONNREFUSED'])) {
    return new SanMarError(
      `Connection failed: ${errMsg}`,
      SanMarErrorType.CONNECTION_ERROR,
      {
        originalError: error,
        suggestion:
          'Ensure port 8080 is open for outbound traffic to 63.251.12.134. SanMar web services run on port 8080, not standard 80/443. Test with: curl https://ws.sanmar.com:8080/',
      }
    );
  }

  // Check for timeout indicators
  if (errCode === 'ESOCKETTIMEDOUT' || errCode === 'ETIMEDOUT' ||
      containsAny(errMsg, ['timeout', 'ESOCKETTIMEDOUT', 'socket hang up', 'request timeout'])) {
    return new SanMarError(
      `Request timed out: ${errMsg}`,
      SanMarErrorType.TIMEOUT,
      {
        originalError: error,
        suggestion:
          'Avoid querying by brand or category — these return massive datasets that frequently timeout. Use style-level queries instead (getProductInfoByStyleColorSize).',
      }
    );
  }

  // Check for SOAP faults
  if (isSoapFault(error)) {
    const faultString = extractSoapFault(error);
    return new SanMarError(
      `SOAP fault: ${faultString}`,
      SanMarErrorType.SOAP_FAULT,
      {
        originalError: error,
        soapFault: faultString,
        suggestion: 'Server returned a SOAP fault. This may be transient — retry the request.',
      }
    );
  }

  // Unknown error
  return new SanMarError(
    errMsg || 'Unknown SanMar API error',
    SanMarErrorType.UNKNOWN,
    {
      originalError: error,
    }
  );
}

// =============================================================================
// Retryability
// =============================================================================

/**
 * Determine if a SanMarError is worth retrying.
 *
 * Retryable (transient issues that may resolve):
 * - TIMEOUT — server may recover or respond faster
 * - CONNECTION_ERROR — transient network issue
 * - SOAP_FAULT — server hiccup
 *
 * Not retryable (user errors that won't change):
 * - INVALID_CREDENTIALS — wrong creds won't fix themselves
 * - INVALID_STYLE — style doesn't exist
 * - INVALID_COLOR — wrong color code
 * - INVALID_SIZE — wrong size code
 * - UNKNOWN — don't retry blindly
 */
export function isRetryable(error: SanMarError): boolean {
  switch (error.type) {
    case SanMarErrorType.TIMEOUT:
    case SanMarErrorType.CONNECTION_ERROR:
    case SanMarErrorType.SOAP_FAULT:
      return true;
    case SanMarErrorType.INVALID_CREDENTIALS:
    case SanMarErrorType.INVALID_STYLE:
    case SanMarErrorType.INVALID_COLOR:
    case SanMarErrorType.INVALID_SIZE:
    case SanMarErrorType.UNKNOWN:
      return false;
    default:
      return false;
  }
}

// =============================================================================
// Error Formatting
// =============================================================================

/**
 * Format a SanMarError into a human-readable string.
 * Includes type, message, and suggestion (if available).
 */
export function formatError(error: SanMarError): string {
  const parts: string[] = [
    `[SanMar ${error.type}] ${error.message}`,
  ];

  if (error.suggestion) {
    parts.push(`Suggestion: ${error.suggestion}`);
  }

  if (error.soapFault) {
    parts.push(`SOAP Fault: ${error.soapFault}`);
  }

  return parts.join('\n');
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Extract a string message from an unknown error.
 */
function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

/**
 * Extract an error code (e.g., ECONNREFUSED) from an unknown error.
 */
function extractErrorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    return String((error as { code: unknown }).code);
  }
  return undefined;
}

/**
 * Check if error is a SanMar response-level error.
 * SanMar returns errorOccured (sic) === true in the response body
 * instead of throwing. Note the typo is intentional — matches SanMar's API.
 */
function isSanMarResponseError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    // Direct response object with errorOccured field
    if (obj.errorOccured === true || obj.errorOccured === 'true') {
      return true;
    }
    // Nested in return property
    if (obj.return && typeof obj.return === 'object') {
      const ret = obj.return as Record<string, unknown>;
      if (ret.errorOccured === true || ret.errorOccured === 'true') {
        return true;
      }
    }
  }
  return false;
}

/**
 * Extract the message field from a SanMar response error.
 */
function extractSanMarResponseMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    if (typeof obj.message === 'string') {
      return obj.message;
    }
    if (obj.return && typeof obj.return === 'object') {
      const ret = obj.return as Record<string, unknown>;
      if (typeof ret.message === 'string') {
        return ret.message;
      }
    }
  }
  return 'Unknown SanMar response error';
}

/**
 * Check if error contains a SOAP fault.
 */
function isSoapFault(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    if ('Fault' in obj || 'fault' in obj || 'faultstring' in obj || 'faultcode' in obj) {
      return true;
    }
    // node-soap wraps SOAP faults in root.Fault
    if (obj.root && typeof obj.root === 'object') {
      const root = obj.root as Record<string, unknown>;
      if ('Fault' in root) {
        return true;
      }
    }
  }
  if (error instanceof Error && containsAny(error.message, ['Fault', 'faultstring', 'faultcode'])) {
    return true;
  }
  return false;
}

/**
 * Extract SOAP fault string from error.
 */
function extractSoapFault(error: unknown): string {
  if (error && typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    if (typeof obj.faultstring === 'string') {
      return obj.faultstring;
    }
    if (obj.Fault && typeof obj.Fault === 'object') {
      const fault = obj.Fault as Record<string, unknown>;
      if (typeof fault.faultstring === 'string') {
        return fault.faultstring;
      }
    }
    if (obj.root && typeof obj.root === 'object') {
      const root = obj.root as Record<string, unknown>;
      if (root.Fault && typeof root.Fault === 'object') {
        const fault = root.Fault as Record<string, unknown>;
        if (typeof fault.faultstring === 'string') {
          return fault.faultstring;
        }
      }
    }
  }
  return extractErrorMessage(error);
}

/**
 * Case-insensitive check if text contains any of the search terms.
 */
function containsAny(text: string, terms: string[]): boolean {
  const lower = text.toLowerCase();
  return terms.some((term) => lower.includes(term.toLowerCase()));
}
