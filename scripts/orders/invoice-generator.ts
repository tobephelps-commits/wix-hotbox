/**
 * Invoice PDF Generator
 *
 * Composes the invoice template layout functions into a complete branded
 * PDF invoice. Provides generateInvoice() for buffer output, saveInvoice()
 * for file output, and a CLI runner for demo generation.
 *
 * Phase 18: Order Management — Invoice & Label Printing
 */

import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';
import {
  PAGE_MARGIN,
  drawHeader,
  drawCustomerInfo,
  drawLineItemsTable,
  drawTotals,
  drawFooter,
} from './invoice-template.js';
import type { Order } from './types.js';

// =============================================================================
// Invoice Generation
// =============================================================================

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const INVOICES_DIR = path.join(PROJECT_ROOT, 'data', 'invoices');

/**
 * Generate a branded invoice PDF from an Order.
 * Returns a Buffer containing the complete PDF document.
 */
export async function generateInvoice(order: Order): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'letter', // 8.5 x 11 inches
      margins: {
        top: PAGE_MARGIN,
        bottom: PAGE_MARGIN,
        left: PAGE_MARGIN,
        right: PAGE_MARGIN,
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Compose layout sections in order
    drawHeader(doc, order);
    drawCustomerInfo(doc, order);
    drawLineItemsTable(doc, order);
    drawTotals(doc, order);
    drawFooter(doc);

    // Finalize the document
    doc.end();
  });
}

/**
 * Generate an invoice PDF and save it to disk.
 *
 * @param order - The order to generate an invoice for
 * @param outputPath - Optional output path; defaults to data/invoices/INV-{orderNumber}.pdf
 * @returns The absolute path to the saved PDF
 */
export async function saveInvoice(order: Order, outputPath?: string): Promise<string> {
  // Ensure invoices directory exists
  fs.mkdirSync(INVOICES_DIR, { recursive: true });

  const filePath = outputPath ?? path.join(INVOICES_DIR, `INV-${order.orderNumber}.pdf`);
  const absolutePath = path.resolve(filePath);

  // Ensure the target directory exists
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });

  const buffer = await generateInvoice(order);
  fs.writeFileSync(absolutePath, buffer);

  return absolutePath;
}

// =============================================================================
// Demo Sample Order
// =============================================================================

function createDemoOrder(): Order {
  const now = new Date().toISOString();
  return {
    id: 'demo-001',
    orderNumber: 99999,
    source: 'manual',
    status: 'new',
    customer: {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      phone: '(555) 123-4567',
    },
    billingAddress: {
      firstName: 'Jane',
      lastName: 'Smith',
      company: 'Smith Athletics',
      addressLine1: '123 Main Street',
      addressLine2: 'Suite 200',
      city: 'Denver',
      state: 'CO',
      postalCode: '80202',
      country: 'US',
      phone: '(555) 123-4567',
    },
    shippingAddress: {
      firstName: 'Jane',
      lastName: 'Smith',
      addressLine1: '456 Warehouse Blvd',
      city: 'Aurora',
      state: 'CO',
      postalCode: '80010',
      country: 'US',
    },
    lineItems: [
      {
        productName: 'Port & Company PC61 Essential Tee',
        sku: 'PC61-JN-L',
        quantity: 24,
        unitPrice: 14.99,
        totalPrice: 359.76,
        vendorStyle: 'PC61',
        vendor: 'sanmar',
        color: 'Jet Black',
        size: 'L',
      },
      {
        productName: 'Gildan G180 Heavy Blend Crewneck',
        sku: 'G180-WH-XL',
        quantity: 12,
        unitPrice: 22.50,
        totalPrice: 270.00,
        vendorStyle: 'G180',
        vendor: 'sanmar',
        color: 'White',
        size: 'XL',
      },
      {
        productName: 'Next Level 6210 CVC Crew',
        sku: 'NL6210-HGR-M',
        quantity: 6,
        unitPrice: 18.00,
        totalPrice: 108.00,
        vendorStyle: '6210',
        vendor: 'ss',
        color: 'Heather Gray',
        size: 'M',
      },
    ],
    subtotal: 737.76,
    shippingCost: 15.00,
    tax: 55.33,
    discount: 25.00,
    total: 783.09,
    notes: 'Rush order — need by Friday',
    createdAt: now,
    updatedAt: now,
    statusHistory: [
      { status: 'new', timestamp: now, note: 'Demo order created' },
    ],
  };
}

// =============================================================================
// CLI Runner
// =============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (!args.includes('--demo')) {
    console.log('Usage: npx tsx scripts/orders/invoice-generator.ts --demo');
    console.log('');
    console.log('Flags:');
    console.log('  --demo    Generate a demo invoice with sample data');
    process.exit(0);
  }

  console.log('Generating demo invoice...');

  const demoOrder = createDemoOrder();

  // Override order number for demo
  demoOrder.orderNumber = 0;
  const demoPath = path.join(INVOICES_DIR, 'INV-DEMO.pdf');
  const savedPath = await saveInvoice(demoOrder, demoPath);

  const stats = fs.statSync(savedPath);
  console.log(`Invoice saved to: ${savedPath}`);
  console.log(`File size: ${(stats.size / 1024).toFixed(1)} KB`);

  // Open with default system viewer
  const platform = process.platform;
  const openCmd =
    platform === 'win32' ? 'start ""'
    : platform === 'darwin' ? 'open'
    : 'xdg-open';

  exec(`${openCmd} "${savedPath}"`, (err) => {
    if (err) {
      console.log('(Could not auto-open PDF — open it manually)');
    }
  });
}

// Run if executed directly
const isMain = process.argv[1] &&
  (
    path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url)) ||
    process.argv[1].includes('invoice-generator')
  );

if (isMain) {
  main().catch((err) => {
    console.error('Error generating invoice:', err);
    process.exit(1);
  });
}
