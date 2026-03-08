/**
 * Printing API Routes
 *
 * Fastify plugin providing REST endpoints for printer management and print jobs:
 * - POST   /api/printing/discover           -- Discover printers on LAN via mDNS
 * - GET    /api/printing/printers/:uri/status -- Get real-time printer status
 * - POST   /api/printing/printers/test      -- Test printer connectivity
 * - GET    /api/printing/saved              -- List saved printers
 * - POST   /api/printing/saved              -- Save a printer
 * - DELETE /api/printing/saved/:id          -- Remove saved printer
 * - PUT    /api/printing/default/:id        -- Set default printer
 * - POST   /api/printing/print             -- Print a document (base64 PDF)
 * - GET    /api/printing/jobs/:printerUri/:jobId/status -- Get job status
 * - POST   /api/printing/jobs/:printerUri/:jobId/cancel -- Cancel a print job
 *
 * Phase 54: Network Printing
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { PrinterInfo, PrinterConfig } from '../printing/index.js';
import {
  discoverPrinters,
  getPrinterStatus,
  testPrinter,
  printDocument,
  getJobStatus,
  cancelJob,
} from '../printing/index.js';

// ---------------------------------------------------------------------------
// Config persistence helpers (module-level)
// ---------------------------------------------------------------------------

/** In-memory map of saved printers keyed by printer id. */
const savedPrinters = new Map<string, PrinterInfo>();

/** ID of the current default printer. */
let defaultPrinterId: string | undefined;

/** Load saved printers from printers.json in dataDir. */
function loadPrinterConfig(dataDir: string): void {
  try {
    const raw = readFileSync(join(dataDir, 'printers.json'), 'utf-8');
    const config: PrinterConfig = JSON.parse(raw);
    savedPrinters.clear();
    for (const p of config.savedPrinters) {
      savedPrinters.set(p.id, p);
    }
    defaultPrinterId = config.defaultPrinterId;
  } catch {
    // File not found or invalid — start with empty config
    savedPrinters.clear();
    defaultPrinterId = undefined;
  }
}

/** Persist saved printers and default printer to printers.json. */
function savePrinterConfig(dataDir: string): void {
  const config: PrinterConfig = {
    savedPrinters: Array.from(savedPrinters.values()),
    defaultPrinterId,
  };
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(join(dataDir, 'printers.json'), JSON.stringify(config, null, 2), 'utf-8');
}

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

export default async function printingRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions,
) {
  // Load saved printer config on registration
  loadPrinterConfig(fastify.config.dataDir);

  // ===========================================================================
  // POST /discover -- Trigger mDNS printer discovery on LAN
  // ===========================================================================

  fastify.post<{
    Body: { timeout?: number };
  }>('/discover', async (request) => {
    const timeout = request.body?.timeout ?? 5000;
    const printers = await discoverPrinters(timeout);
    return { printers, count: printers.length };
  });

  // ===========================================================================
  // POST /printers/test -- Test printer connectivity
  // ===========================================================================
  // Registered BEFORE /printers/:uri to avoid path collision

  fastify.post<{
    Body: { uri: string };
  }>('/printers/test', async (request, reply) => {
    const { uri } = request.body ?? {};
    if (!uri) {
      return reply.status(400).send({ error: 'Missing required field: uri' });
    }
    const result = await testPrinter(uri);
    return result;
  });

  // ===========================================================================
  // GET /printers/:uri/status -- Get real-time printer status
  // ===========================================================================

  fastify.get<{
    Params: { uri: string };
  }>('/printers/:uri/status', async (request, reply) => {
    let decodedUri: string;
    try {
      decodedUri = Buffer.from(request.params.uri, 'base64').toString('utf-8');
    } catch {
      return reply.status(400).send({ error: 'Invalid base64-encoded printer URI' });
    }

    try {
      const info = await getPrinterStatus(decodedUri);
      return info;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get printer status';
      return reply.status(502).send({ error: message });
    }
  });

  // ===========================================================================
  // GET /saved -- List saved printers
  // ===========================================================================

  fastify.get('/saved', async () => {
    return {
      printers: Array.from(savedPrinters.values()),
      defaultPrinterId,
    };
  });

  // ===========================================================================
  // POST /saved -- Save a printer
  // ===========================================================================

  fastify.post<{
    Body: PrinterInfo;
  }>('/saved', async (request, reply) => {
    const printer = request.body;
    if (!printer?.id || !printer?.uri) {
      return reply.status(400).send({ error: 'Missing required fields: id, uri' });
    }
    savedPrinters.set(printer.id, printer);
    savePrinterConfig(fastify.config.dataDir);
    return reply.status(201).send(printer);
  });

  // ===========================================================================
  // DELETE /saved/:id -- Remove saved printer
  // ===========================================================================

  fastify.delete<{
    Params: { id: string };
  }>('/saved/:id', async (request, reply) => {
    const { id } = request.params;
    if (!savedPrinters.has(id)) {
      return reply.status(404).send({ error: `Printer not found: ${id}` });
    }
    savedPrinters.delete(id);
    if (defaultPrinterId === id) {
      defaultPrinterId = undefined;
    }
    savePrinterConfig(fastify.config.dataDir);
    return reply.status(204).send();
  });

  // ===========================================================================
  // PUT /default/:id -- Set default printer
  // ===========================================================================

  fastify.put<{
    Params: { id: string };
  }>('/default/:id', async (request, reply) => {
    const { id } = request.params;
    if (!savedPrinters.has(id)) {
      return reply.status(404).send({ error: `Printer not found: ${id}` });
    }
    defaultPrinterId = id;
    savePrinterConfig(fastify.config.dataDir);
    return { defaultPrinterId };
  });

  // ===========================================================================
  // POST /print -- Print a document (base64-encoded PDF)
  // ===========================================================================

  fastify.post<{
    Body: {
      printerUri: string;
      documentBuffer: string;
      documentName: string;
      copies?: number;
      mediaSize?: 'letter' | 'a4';
      orientation?: 'portrait' | 'landscape';
      colorMode?: 'color' | 'monochrome';
    };
  }>('/print', async (request, reply) => {
    const { printerUri, documentBuffer, documentName, copies, mediaSize, orientation, colorMode } =
      request.body ?? {};

    if (!printerUri) {
      return reply.status(400).send({ error: 'Missing required field: printerUri' });
    }
    if (!documentBuffer) {
      return reply.status(400).send({ error: 'Missing required field: documentBuffer' });
    }

    const pdfBuffer = Buffer.from(documentBuffer, 'base64');

    const result = await printDocument({
      printerUri,
      documentBuffer: pdfBuffer,
      documentName: documentName || 'document.pdf',
      copies,
      mediaSize,
      orientation,
      colorMode,
    });

    return result;
  });

  // ===========================================================================
  // GET /jobs/:printerUri/:jobId/status -- Get job status
  // ===========================================================================

  fastify.get<{
    Params: { printerUri: string; jobId: string };
  }>('/jobs/:printerUri/:jobId/status', async (request, reply) => {
    let decodedUri: string;
    try {
      decodedUri = Buffer.from(request.params.printerUri, 'base64').toString('utf-8');
    } catch {
      return reply.status(400).send({ error: 'Invalid base64-encoded printer URI' });
    }

    const jobId = parseInt(request.params.jobId, 10);
    if (isNaN(jobId)) {
      return reply.status(400).send({ error: 'Invalid jobId: must be a number' });
    }

    try {
      const status = await getJobStatus(decodedUri, jobId);
      return status;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get job status';
      return reply.status(502).send({ error: message });
    }
  });

  // ===========================================================================
  // POST /jobs/:printerUri/:jobId/cancel -- Cancel a print job
  // ===========================================================================

  fastify.post<{
    Params: { printerUri: string; jobId: string };
  }>('/jobs/:printerUri/:jobId/cancel', async (request, reply) => {
    let decodedUri: string;
    try {
      decodedUri = Buffer.from(request.params.printerUri, 'base64').toString('utf-8');
    } catch {
      return reply.status(400).send({ error: 'Invalid base64-encoded printer URI' });
    }

    const jobId = parseInt(request.params.jobId, 10);
    if (isNaN(jobId)) {
      return reply.status(400).send({ error: 'Invalid jobId: must be a number' });
    }

    const result = await cancelJob(decodedUri, jobId);
    return result;
  });
}
