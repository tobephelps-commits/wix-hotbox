/**
 * Printing module types — LAN printer discovery and IPP print job submission.
 */

/** Information about a discovered or manually-added network printer. */
export interface PrinterInfo {
  /** Unique identifier derived from URI hash. */
  id: string;
  /** Human-readable printer name. */
  name: string;
  /** IPP URI, e.g. ipp://192.168.1.100:631/ipp/print */
  uri: string;
  /** Physical location (if reported). */
  location?: string;
  /** Printer model (if reported). */
  model?: string;
  /** Current printer state. */
  state: 'idle' | 'processing' | 'stopped' | 'unknown';
  /** Whether the printer supports color output. */
  supportsColor: boolean;
  /** Whether the printer supports duplex (two-sided) printing. */
  supportsDuplex: boolean;
  /** ISO timestamp when the printer was discovered / added. */
  discoveredAt: string;
  /** How the printer was found. */
  source: 'mdns' | 'manual';
}

/** Request payload for submitting a print job. */
export interface PrintJobRequest {
  /** IPP printer URI to send the job to. */
  printerUri: string;
  /** PDF document content. */
  documentBuffer: Buffer;
  /** Filename / job description shown on the printer. */
  documentName: string;
  /** Number of copies (default 1). */
  copies?: number;
  /** Paper size (default 'letter'). */
  mediaSize?: 'letter' | 'a4';
  /** Page orientation (default 'portrait'). */
  orientation?: 'portrait' | 'landscape';
  /** Color mode. */
  colorMode?: 'color' | 'monochrome';
}

/** Result returned after submitting a print job. */
export interface PrintJobResult {
  success: boolean;
  jobId?: number;
  jobUri?: string;
  error?: string;
  printerState?: string;
}

/** Saved printer configuration (persisted to data dir). */
export interface PrinterConfig {
  /** Manually saved printers. */
  savedPrinters: PrinterInfo[];
  /** ID of the default printer. */
  defaultPrinterId?: string;
}

/** Classification of printable document types. */
export type DocumentType = 'invoice' | 'production-sheet' | 'royalty-statement' | 'custom';
