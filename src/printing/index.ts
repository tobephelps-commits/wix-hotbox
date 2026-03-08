/**
 * Printing module — LAN printer discovery and IPP print job submission.
 *
 * Re-exports all types, discovery functions, and print job functions.
 */

// Types
export type {
  PrinterInfo,
  PrintJobRequest,
  PrintJobResult,
  PrinterConfig,
  DocumentType,
} from './types.js';

// Discovery
export {
  discoverPrinters,
  getPrinterStatus,
  testPrinter,
  getCachedPrinters,
} from './discovery.js';

// Print jobs
export {
  printDocument,
  getJobStatus,
  cancelJob,
} from './print-job.js';
