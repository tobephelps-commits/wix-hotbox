/**
 * Pickup Label PDF Generator
 *
 * Generates 4x6 inch pickup/hand-delivery label PDFs using PDFKit. Labels are
 * designed for thermal printers (288x432 points at 72 DPI) and display the
 * customer name and collection/brand category (e.g., "Big Barn", "Board30").
 *
 * Phase 18: Order Management — Invoice & Label Printing (Plan 04)
 */

import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import type { Order } from './types.js';

// =============================================================================
// Constants
// =============================================================================

/** Label dimensions: 4x6 inches at 72 DPI */
const LABEL_WIDTH = 288;
const LABEL_HEIGHT = 432;
const LABEL_MARGIN = 20;

// =============================================================================
// Label Generator
// =============================================================================

/**
 * Generate a 4x6 pickup label PDF for the given order.
 *
 * Layout:
 * - Top: "PICKUP" header
 * - Middle: Customer name (large, prominent)
 * - Below: Collection/brand category (large, bold)
 * - Bottom: Order number and date
 */
export async function generateShippingLabel(order: Order): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Uint8Array[] = [];

    const doc = new PDFDocument({
      size: [LABEL_WIDTH, LABEL_HEIGHT],
      margin: LABEL_MARGIN,
    });

    doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const contentWidth = LABEL_WIDTH - LABEL_MARGIN * 2;
    const centerX = LABEL_WIDTH / 2;

    // ── "PICKUP" header ────────────────────────────────────────────────
    doc
      .fontSize(12)
      .font('Helvetica')
      .fillColor('#888888')
      .text('PICKUP', LABEL_MARGIN, LABEL_MARGIN + 10, {
        width: contentWidth,
        align: 'center',
      });

    // ── Divider ────────────────────────────────────────────────────────
    const divider1Y = LABEL_MARGIN + 32;
    doc
      .strokeColor('#CCCCCC')
      .lineWidth(0.5)
      .moveTo(LABEL_MARGIN, divider1Y)
      .lineTo(LABEL_WIDTH - LABEL_MARGIN, divider1Y)
      .stroke();

    // ── Customer name (large, centered) ────────────────────────────────
    const customerName = `${order.customer.firstName} ${order.customer.lastName}`;
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .fillColor('#000000')
      .text(customerName, LABEL_MARGIN, divider1Y + 40, {
        width: contentWidth,
        align: 'center',
      });

    // ── Collection/brand category ──────────────────────────────────────
    const collection = order.collection || 'General';
    doc
      .fontSize(28)
      .font('Helvetica-Bold')
      .fillColor('#333333')
      .text(collection, LABEL_MARGIN, divider1Y + 120, {
        width: contentWidth,
        align: 'center',
      });

    // ── Item count summary ─────────────────────────────────────────────
    const itemCount = order.lineItems.reduce((sum, li) => sum + li.quantity, 0);
    const itemText = itemCount === 1 ? '1 item' : `${itemCount} items`;
    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#888888')
      .text(itemText, LABEL_MARGIN, divider1Y + 170, {
        width: contentWidth,
        align: 'center',
      });

    // ── Order reference (bottom section) ───────────────────────────────
    const bottomY = LABEL_HEIGHT - LABEL_MARGIN - 40;

    doc
      .strokeColor('#CCCCCC')
      .lineWidth(0.5)
      .moveTo(LABEL_MARGIN, bottomY - 6)
      .lineTo(LABEL_WIDTH - LABEL_MARGIN, bottomY - 6)
      .stroke();

    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#333333')
      .text(`Order #${order.orderNumber}`, LABEL_MARGIN, bottomY + 4, {
        width: contentWidth,
        align: 'center',
      });

    const dateStr = new Date(order.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#666666')
      .text(dateStr, LABEL_MARGIN, bottomY + 18, {
        width: contentWidth,
        align: 'center',
      });

    doc.end();
  });
}

/**
 * Generate a pickup label PDF and save it to disk.
 *
 * @param order - Order to generate label for
 * @param outputPath - File path to save PDF (defaults to data/labels/LABEL-{orderNumber}.pdf)
 * @returns Absolute path to the saved PDF
 */
export async function saveShippingLabel(
  order: Order,
  outputPath?: string
): Promise<string> {
  const labelsDir = path.resolve('data', 'labels');
  if (!fs.existsSync(labelsDir)) {
    fs.mkdirSync(labelsDir, { recursive: true });
  }

  const filePath = outputPath || path.join(labelsDir, `LABEL-${order.orderNumber}.pdf`);
  const absolutePath = path.resolve(filePath);

  const buffer = await generateShippingLabel(order);
  fs.writeFileSync(absolutePath, buffer);

  return absolutePath;
}

// =============================================================================
// CLI Runner
// =============================================================================

const __filename = fileURLToPath(import.meta.url);

async function runDemo(): Promise<void> {
  console.log('Generating demo pickup label...\n');

  const demoOrder: Order = {
    id: 'demo-label-001',
    orderNumber: 10043,
    source: 'manual',
    status: 'packed',
    customer: {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      phone: '555-0199',
    },
    collection: 'Big Barn',
    lineItems: [
      {
        productName: 'Port Authority Polo',
        sku: 'K500-BLK-L',
        quantity: 12,
        unitPrice: 24.99,
        totalPrice: 299.88,
      },
    ],
    subtotal: 299.88,
    shippingCost: 0,
    tax: 24.0,
    discount: 0,
    total: 323.88,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    statusHistory: [
      { status: 'new', timestamp: new Date().toISOString() },
      { status: 'packed', timestamp: new Date().toISOString() },
    ],
  };

  const demoPath = path.resolve('data', 'labels', 'LABEL-DEMO.pdf');
  const savedPath = await saveShippingLabel(demoOrder, demoPath);
  const fileSize = fs.statSync(savedPath).size;

  console.log(`Label saved to: ${savedPath}`);
  console.log(`File size: ${(fileSize / 1024).toFixed(1)} KB`);

  // Open with system viewer
  const platform = process.platform;
  if (platform === 'win32') {
    exec(`start "" "${savedPath}"`);
  } else if (platform === 'darwin') {
    exec(`open "${savedPath}"`);
  } else {
    exec(`xdg-open "${savedPath}"`);
  }
}

// Run if executed directly with --demo
if (process.argv[1] === __filename && process.argv.includes('--demo')) {
  runDemo().catch((err) => {
    console.error('Demo failed:', err);
    process.exit(1);
  });
}
