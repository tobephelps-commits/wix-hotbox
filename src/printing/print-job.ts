/**
 * IPP print job submission, status checking, and cancellation.
 */

import { Printer as IppPrinter } from 'ipp';
import type {
  PrintJobRequest as IppPrintJobRequest,
  PrintJobResponse,
  GetJobAttributesRequest,
  GetJobAttributesResponse,
  CancelReleaseJobRequest,
  SimpleResponse,
} from 'ipp';
import type { PrintJobRequest, PrintJobResult } from './types.js';

/** Map our mediaSize shorthand to IPP media keyword. */
function mapMedia(size: 'letter' | 'a4'): string {
  return size === 'a4' ? 'iso_a4_210x297mm' : 'na_letter_8.5x11in';
}

/** Map orientation string to IPP orientation-requested keyword. */
function mapOrientation(o: 'portrait' | 'landscape'): 'portrait' | 'landscape' {
  return o;
}

/** Map color mode string to IPP print-color-mode keyword. */
function mapColorMode(c: 'color' | 'monochrome'): 'color' | 'monochrome' {
  return c;
}

/**
 * Submit a PDF print job to a network printer via IPP Print-Job.
 *
 * @param request  Print job parameters including PDF buffer.
 * @returns Result indicating success/failure with job ID.
 */
export function printDocument(request: PrintJobRequest): Promise<PrintJobResult> {
  return new Promise((resolve) => {
    const printer = new IppPrinter(request.printerUri);

    const copies = request.copies ?? 1;
    const mediaSize = request.mediaSize ?? 'letter';
    const orientation = request.orientation ?? 'portrait';
    const colorMode = request.colorMode ?? 'color';

    const msg: IppPrintJobRequest = {
      'operation-attributes-tag': {
        'requesting-user-name': 'HotBox',
        'job-name': request.documentName,
        'document-format': 'application/pdf',
      },
      'job-attributes-tag': {
        copies,
        media: mapMedia(mediaSize) as never,
        'orientation-requested': mapOrientation(orientation),
        'print-color-mode': mapColorMode(colorMode),
      },
      data: request.documentBuffer,
    };

    printer.execute(
      'Print-Job',
      msg,
      (err: Error, res: PrintJobResponse) => {
        if (err) {
          return resolve({
            success: false,
            error: err.message,
          });
        }

        const jobAttrs = res['job-attributes-tag'];
        resolve({
          success: true,
          jobId: jobAttrs?.['job-id'],
          jobUri: jobAttrs?.['job-uri'],
          printerState: String(jobAttrs?.['job-state'] ?? ''),
        });
      },
    );
  });
}

/**
 * Check the status of a previously submitted print job.
 *
 * @param printerUri  IPP printer URI.
 * @param jobId       Job ID returned from printDocument.
 * @returns Current job state and reasons.
 */
export function getJobStatus(
  printerUri: string,
  jobId: number,
): Promise<{ state: string; stateReasons: string[] }> {
  return new Promise((resolve, reject) => {
    const printer = new IppPrinter(printerUri);

    const msg: GetJobAttributesRequest = {
      'operation-attributes-tag': {
        'job-id': jobId,
        'requested-attributes': ['job-state', 'job-state-reasons'],
      },
    };

    printer.execute(
      'Get-Job-Attributes',
      msg,
      (err: Error, res: GetJobAttributesResponse) => {
        if (err) return reject(err);

        const attrs = res['job-attributes-tag'] as Record<string, unknown>;
        const state = String(attrs?.['job-state'] ?? 'unknown');
        const reasons = attrs?.['job-state-reasons'];
        const stateReasons: string[] = Array.isArray(reasons)
          ? (reasons as string[])
          : reasons
            ? [String(reasons)]
            : [];

        resolve({ state, stateReasons });
      },
    );
  });
}

/**
 * Cancel a print job.
 *
 * @param printerUri  IPP printer URI.
 * @param jobId       Job ID to cancel.
 * @returns Success indicator with optional error.
 */
export function cancelJob(
  printerUri: string,
  jobId: number,
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const printer = new IppPrinter(printerUri);

    const msg: CancelReleaseJobRequest = {
      'operation-attributes-tag': {
        'requesting-user-name': 'HotBox',
        'job-id': jobId,
      },
    };

    printer.execute(
      'Cancel-Job',
      msg,
      (err: Error, _res: SimpleResponse) => {
        if (err) {
          return resolve({ success: false, error: err.message });
        }
        resolve({ success: true });
      },
    );
  });
}
