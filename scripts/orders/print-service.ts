/**
 * Cross-Platform Print Service
 *
 * Abstracts sending PDFs to printers across Windows, macOS, and Linux.
 * Uses child_process.exec to invoke platform-specific print commands.
 * No additional npm dependencies required.
 *
 * Provides convenience functions for printing invoices (regular printer)
 * and shipping labels (thermal printer), with separate env var configuration
 * for each printer type.
 *
 * Phase 18: Order Management — Invoice & Label Printing (Plan 04)
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import type { Order } from './types.js';
import { saveInvoice } from './invoice-generator.js';
import { saveShippingLabel } from './label-generator.js';

const execAsync = promisify(exec);

// =============================================================================
// Types
// =============================================================================

/** Result of a print operation. */
export interface PrintResult {
  /** Whether the print command succeeded */
  success: boolean;
  /** Human-readable message about the result */
  message: string;
  /** Name of the printer used (or 'default' if system default) */
  printerUsed: string;
  /** Path to the PDF file that was printed */
  filePath: string;
}

// =============================================================================
// Core Print Functions
// =============================================================================

/**
 * Send a PDF file to a printer.
 *
 * Uses platform-specific commands:
 * - Windows: PowerShell Start-Process -Verb Print (default) or Out-Printer
 * - macOS/Linux: lp command
 *
 * @param pdfPath - Absolute path to the PDF file
 * @param printerName - Optional printer name; uses system default if omitted
 * @returns PrintResult with success status and details
 */
export async function printPdf(
  pdfPath: string,
  printerName?: string
): Promise<PrintResult> {
  const absolutePath = path.resolve(pdfPath);

  // Verify file exists
  if (!fs.existsSync(absolutePath)) {
    return {
      success: false,
      message: `File not found: ${absolutePath}`,
      printerUsed: printerName || 'default',
      filePath: absolutePath,
    };
  }

  const platform = process.platform;

  try {
    let command: string;
    const usedPrinter = printerName || 'default';

    if (platform === 'win32') {
      if (printerName) {
        // Print to specific printer using PowerShell
        command = `powershell -Command "Get-Content '${absolutePath}' | Out-Printer -Name '${printerName}'"`;
      } else {
        // Print to default printer using Start-Process
        command = `powershell -Command "Start-Process -FilePath '${absolutePath}' -Verb Print -WindowStyle Hidden"`;
      }
    } else {
      // macOS and Linux use lp command
      if (printerName) {
        command = `lp -d "${printerName}" "${absolutePath}"`;
      } else {
        command = `lp "${absolutePath}"`;
      }
    }

    await execAsync(command, { timeout: 30000 });

    return {
      success: true,
      message: `Sent to printer: ${usedPrinter}`,
      printerUsed: usedPrinter,
      filePath: absolutePath,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Print failed: ${errMsg}`,
      printerUsed: printerName || 'default',
      filePath: absolutePath,
    };
  }
}

/**
 * List available printers on the system.
 *
 * Uses platform-specific commands:
 * - Windows: PowerShell Get-Printer
 * - macOS/Linux: lpstat -a
 *
 * @returns Array of printer names (empty if none found or command fails)
 */
export async function listPrinters(): Promise<string[]> {
  const platform = process.platform;

  try {
    if (platform === 'win32') {
      const { stdout } = await execAsync(
        'powershell -Command "Get-Printer | Select-Object -ExpandProperty Name"',
        { timeout: 15000 }
      );
      return stdout
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    } else {
      // macOS and Linux
      const { stdout } = await execAsync('lpstat -a', { timeout: 15000 });
      return stdout
        .split('\n')
        .map((line) => {
          // lpstat -a output: "PrinterName accepting requests since ..."
          const match = line.match(/^(\S+)\s+accepting/);
          return match ? match[1] : '';
        })
        .filter((name) => name.length > 0);
    }
  } catch {
    // No printers available or command not found
    return [];
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Generate and print an invoice for the given order.
 *
 * Uses the INVOICE_PRINTER env var for printer selection (falls back to default).
 *
 * @param order - Order to generate and print invoice for
 * @returns PrintResult with success status and file path
 */
export async function printInvoice(order: Order): Promise<PrintResult> {
  try {
    const savedPath = await saveInvoice(order);
    const printerName = process.env.INVOICE_PRINTER || undefined;
    return await printPdf(savedPath, printerName);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Invoice generation failed: ${errMsg}`,
      printerUsed: process.env.INVOICE_PRINTER || 'default',
      filePath: '',
    };
  }
}

/**
 * Generate and print a shipping label for the given order.
 *
 * Uses the LABEL_PRINTER env var for printer selection (falls back to default).
 * The label printer is typically a thermal printer for 4x6 labels.
 *
 * @param order - Order to generate and print label for
 * @returns PrintResult with success status and file path
 */
export async function printShippingLabel(order: Order): Promise<PrintResult> {
  try {
    const savedPath = await saveShippingLabel(order);
    const printerName = process.env.LABEL_PRINTER || undefined;
    return await printPdf(savedPath, printerName);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Label generation failed: ${errMsg}`,
      printerUsed: process.env.LABEL_PRINTER || 'default',
      filePath: '',
    };
  }
}

// =============================================================================
// CLI Runner
// =============================================================================

const __filename = fileURLToPath(import.meta.url);

async function runCli(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes('--list-printers')) {
    console.log('Detecting system printers...\n');
    const printers = await listPrinters();

    if (printers.length === 0) {
      console.log('No printers found.');
      console.log('');
      console.log('Possible reasons:');
      console.log('  - No printers are installed on this system');
      console.log('  - Print service is not running');
      if (process.platform === 'win32') {
        console.log('  - Windows: Check Settings > Bluetooth & devices > Printers & scanners');
      } else {
        console.log('  - macOS/Linux: Check CUPS is running (lpstat -r)');
      }
    } else {
      console.log(`Found ${printers.length} printer(s):\n`);
      printers.forEach((name, i) => {
        console.log(`  ${i + 1}. ${name}`);
      });
    }

    console.log('');
    console.log('Printer env vars:');
    console.log(`  INVOICE_PRINTER = ${process.env.INVOICE_PRINTER || '(not set — uses default)'}`);
    console.log(`  LABEL_PRINTER   = ${process.env.LABEL_PRINTER || '(not set — uses default)'}`);
    return;
  }

  if (args.includes('--test-print')) {
    console.log('Generating demo invoice for test print...\n');

    // Create a simple test order
    const now = new Date().toISOString();
    const testOrder: Order = {
      id: 'test-print-001',
      orderNumber: 99998,
      source: 'manual',
      status: 'new',
      customer: { firstName: 'Test', lastName: 'Print' },
      billingAddress: {
        firstName: 'Test',
        lastName: 'Print',
        addressLine1: '100 Test Lane',
        city: 'Testville',
        state: 'TX',
        postalCode: '75001',
        country: 'US',
      },
      lineItems: [
        {
          productName: 'Test Item - Port Authority Polo',
          sku: 'TEST-001',
          quantity: 1,
          unitPrice: 29.99,
          totalPrice: 29.99,
        },
      ],
      subtotal: 29.99,
      shippingCost: 0,
      tax: 2.47,
      discount: 0,
      total: 32.46,
      createdAt: now,
      updatedAt: now,
      statusHistory: [{ status: 'new', timestamp: now }],
    };

    const result = await printInvoice(testOrder);

    if (result.success) {
      console.log(`Print sent successfully!`);
      console.log(`  Printer: ${result.printerUsed}`);
      console.log(`  File: ${result.filePath}`);
    } else {
      console.log(`Print failed: ${result.message}`);
      if (result.filePath) {
        console.log(`  PDF was saved to: ${result.filePath}`);
        console.log('  You can open and print it manually.');
      }
    }
    return;
  }

  // Default: show usage
  console.log('Print Service — HotBox Clothing');
  console.log('');
  console.log('Usage:');
  console.log('  npx tsx scripts/orders/print-service.ts --list-printers');
  console.log('  npx tsx scripts/orders/print-service.ts --test-print');
  console.log('');
  console.log('Options:');
  console.log('  --list-printers   List all available system printers');
  console.log('  --test-print      Generate a demo invoice and send to default printer');
  console.log('');
  console.log('Environment variables:');
  console.log('  INVOICE_PRINTER   Printer name for invoices (default: system default)');
  console.log('  LABEL_PRINTER     Printer name for shipping labels (default: system default)');
}

// Run if executed directly
if (process.argv[1] === __filename || process.argv[1]?.includes('print-service')) {
  runCli().catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
}
