/**
 * LAN printer discovery via mDNS (Bonjour) and IPP printer status queries.
 */

import { createHash } from 'node:crypto';
import { Bonjour } from 'bonjour-service';
import ipp from 'ipp';
import type {
  GetPrinterAttributesRequest,
  GetPrinterAttributesResponse,
} from 'ipp';

const IppPrinter = ipp.Printer;
import type { PrinterInfo } from './types.js';

/** Cache of recently discovered printers keyed by printer id. */
const discoveredPrinters = new Map<string, PrinterInfo>();

/** Derive a stable printer ID from its URI. */
function printerIdFromUri(uri: string): string {
  return createHash('sha256').update(uri).digest('hex').slice(0, 12);
}

/** Map an IPP printer-state integer to our state union. */
function mapPrinterState(state: number | undefined): PrinterInfo['state'] {
  switch (state) {
    case 3: return 'idle';
    case 4: return 'processing';
    case 5: return 'stopped';
    default: return 'unknown';
  }
}

/**
 * Discover printers on the local network via mDNS (Bonjour).
 * Browses for `_ipp._tcp` and `_ipps._tcp` services.
 *
 * @param timeout  How long to listen for responses (ms, default 5000).
 * @returns Array of discovered PrinterInfo objects.
 */
export function discoverPrinters(timeout = 5000): Promise<PrinterInfo[]> {
  return new Promise((resolve) => {
    const printers = new Map<string, PrinterInfo>();
    const bonjour = new Bonjour();

    const handleService = (protocol: 'ipp' | 'ipps') =>
      (service: { name: string; host: string; port: number; txt?: Record<string, string>; addresses?: string[] }) => {
        const txt = service.txt ?? {};
        const rp = txt['rp'] || 'ipp/print';
        const host = service.addresses?.[0] || service.host;
        const uri = `${protocol}://${host}:${service.port}/${rp}`;
        const id = printerIdFromUri(uri);

        const info: PrinterInfo = {
          id,
          name: service.name || txt['ty'] || 'Unknown Printer',
          uri,
          location: txt['note'] || undefined,
          model: txt['ty'] || undefined,
          state: 'unknown',
          supportsColor: txt['Color'] === 'T',
          supportsDuplex: txt['Duplex'] === 'T',
          discoveredAt: new Date().toISOString(),
          source: 'mdns',
        };

        printers.set(id, info);
        discoveredPrinters.set(id, info);
      };

    const ippBrowser = bonjour.find({ type: 'ipp' }, handleService('ipp'));
    const ippsBrowser = bonjour.find({ type: 'ipps' }, handleService('ipps'));

    setTimeout(() => {
      ippBrowser.stop();
      ippsBrowser.stop();
      bonjour.destroy();
      resolve(Array.from(printers.values()));
    }, timeout);
  });
}

/**
 * Query a printer for its current status and capabilities via IPP Get-Printer-Attributes.
 *
 * @param uri  IPP printer URI.
 * @returns Updated PrinterInfo reflecting live printer state.
 */
export function getPrinterStatus(uri: string): Promise<PrinterInfo> {
  return new Promise((resolve, reject) => {
    const printer = new IppPrinter(uri);
    const id = printerIdFromUri(uri);

    // Note: @types/ipp restricts requested-attributes to keyof PrinterDescription,
    // but printer-state/printer-state-reasons live in PrinterStatus. Cast needed.
    const requestedAttrs = [
      'printer-name',
      'printer-state',
      'printer-state-reasons',
      'printer-location',
      'printer-make-and-model',
      'color-supported',
      'sides-supported',
    ] as GetPrinterAttributesRequest['operation-attributes-tag']['requested-attributes'];

    const msg: GetPrinterAttributesRequest = {
      'operation-attributes-tag': {
        'requesting-user-name': 'HotBox',
        'requested-attributes': requestedAttrs,
      },
    };

    printer.execute(
      'Get-Printer-Attributes',
      msg,
      (err: Error, res: GetPrinterAttributesResponse) => {
        if (err) return reject(err);

        const attrs = res['printer-attributes-tag'] as Record<string, unknown> | undefined;
        if (!attrs) {
          return reject(new Error('No printer attributes returned'));
        }

        const info: PrinterInfo = {
          id,
          name: (attrs['printer-name'] as string) || 'Unknown',
          uri,
          location: (attrs['printer-location'] as string) || undefined,
          model: (attrs['printer-make-and-model'] as string) || undefined,
          state: mapPrinterState(attrs['printer-state'] as number | undefined),
          supportsColor: (attrs['color-supported'] as boolean) ?? false,
          supportsDuplex: Array.isArray(attrs['sides-supported'])
            ? (attrs['sides-supported'] as string[]).some((s) => s.includes('two-sided'))
            : false,
          discoveredAt: discoveredPrinters.get(id)?.discoveredAt || new Date().toISOString(),
          source: discoveredPrinters.get(id)?.source || 'manual',
        };

        discoveredPrinters.set(id, info);
        resolve(info);
      },
    );
  });
}

/**
 * Test whether a printer is reachable and accepting IPP requests.
 *
 * @param uri  IPP printer URI to test.
 * @returns Reachability result with optional printer name or error.
 */
export function testPrinter(uri: string): Promise<{ reachable: boolean; name?: string; error?: string }> {
  return new Promise((resolve) => {
    const printer = new IppPrinter(uri);

    const msg: GetPrinterAttributesRequest = {
      'operation-attributes-tag': {
        'requesting-user-name': 'HotBox',
        'requested-attributes': ['printer-name'],
      },
    };

    printer.execute(
      'Get-Printer-Attributes',
      msg,
      (err: Error, res: GetPrinterAttributesResponse) => {
        if (err) {
          return resolve({ reachable: false, error: err.message });
        }

        const attrs = res['printer-attributes-tag'] as Record<string, unknown> | undefined;
        const name = (attrs?.['printer-name'] as string) || undefined;
        resolve({ reachable: true, name });
      },
    );
  });
}

/** Return the current cached map of discovered printers. */
export function getCachedPrinters(): PrinterInfo[] {
  return Array.from(discoveredPrinters.values());
}
