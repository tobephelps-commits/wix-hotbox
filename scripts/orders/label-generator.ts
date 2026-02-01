/**
 * Shipping Label PDF Generator
 *
 * Generates 4x6 inch shipping label PDFs using PDFKit. Labels are designed
 * for thermal printers (288x432 points at 72 DPI) and include return address,
 * ship-to address, and order reference.
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
const LABEL_MARGIN = 15;

/** Store return address (from env or defaults) */
function getStoreAddress(): {
  name: string;
  line1: string;
  city: string;
  state: string;
  zip: string;
} {
  return {
    name: 'HotBox Clothing',
    line1: process.env.STORE_ADDRESS_LINE1 || '123 Main Street',
    city: process.env.STORE_CITY || 'Anytown',
    state: process.env.STORE_STATE || 'ST',
    zip: process.env.STORE_ZIP || '00000',
  };
}

/** Font sizes for label sections */
const FONT_SIZE = {
  FROM_LABEL: 7,
  FROM_ADDRESS: 8,
  SHIP_TO_LABEL: 8,
  SHIP_TO_NAME: 14,
  SHIP_TO_ADDRESS: 11,
  ORDER_REF: 8,
} as const;

// =============================================================================
// Label Generator
// =============================================================================

/**
 * Generate a 4x6 shipping label PDF for the given order.
 *
 * Layout:
 * - Top: Return address (small, "From:" + HotBox address)
 * - Divider: Thin horizontal rule
 * - Middle: Ship-to address (large, prominent)
 * - Bottom: Order number and date
 *
 * @throws Error if order has no shipping address
 */
export async function generateShippingLabel(order: Order): Promise<Buffer> {
  if (!order.shippingAddress) {
    throw new Error(
      `Order #${order.orderNumber} has no shipping address — cannot generate label`
    );
  }

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
    let y = LABEL_MARGIN;

    // ── Return address section ──────────────────────────────────────────
    const store = getStoreAddress();

    doc
      .fontSize(FONT_SIZE.FROM_LABEL)
      .font('Helvetica')
      .fillColor('#666666')
      .text('From:', LABEL_MARGIN, y);
    y += 10;

    doc
      .fontSize(FONT_SIZE.FROM_ADDRESS)
      .font('Helvetica-Bold')
      .fillColor('#333333')
      .text(store.name, LABEL_MARGIN, y);
    y += 11;

    doc
      .fontSize(FONT_SIZE.FROM_ADDRESS)
      .font('Helvetica')
      .fillColor('#333333')
      .text(store.line1, LABEL_MARGIN, y);
    y += 11;

    doc.text(
      `${store.city}, ${store.state} ${store.zip}`,
      LABEL_MARGIN,
      y
    );
    y += 16;

    // ── Divider ─────────────────────────────────────────────────────────
    doc
      .strokeColor('#999999')
      .lineWidth(0.5)
      .moveTo(LABEL_MARGIN, y)
      .lineTo(LABEL_WIDTH - LABEL_MARGIN, y)
      .stroke();
    y += 12;

    // ── Ship-to section ─────────────────────────────────────────────────
    // Already guarded at top of function — assert for TypeScript narrowing
    const addr = order.shippingAddress!;

    doc
      .fontSize(FONT_SIZE.SHIP_TO_LABEL)
      .font('Helvetica')
      .fillColor('#666666')
      .text('Ship To:', LABEL_MARGIN, y);
    y += 14;

    // Recipient name (large, bold)
    const recipientName = `${addr.firstName} ${addr.lastName}`;
    doc
      .fontSize(FONT_SIZE.SHIP_TO_NAME)
      .font('Helvetica-Bold')
      .fillColor('#000000')
      .text(recipientName, LABEL_MARGIN, y, { width: contentWidth });
    y += 20;

    // Company (if present)
    if (addr.company) {
      doc
        .fontSize(FONT_SIZE.SHIP_TO_ADDRESS)
        .font('Helvetica')
        .fillColor('#000000')
        .text(addr.company, LABEL_MARGIN, y, { width: contentWidth });
      y += 16;
    }

    // Address line 1
    doc
      .fontSize(FONT_SIZE.SHIP_TO_ADDRESS)
      .font('Helvetica')
      .fillColor('#000000')
      .text(addr.addressLine1, LABEL_MARGIN, y, { width: contentWidth });
    y += 16;

    // Address line 2 (if present)
    if (addr.addressLine2) {
      doc.text(addr.addressLine2, LABEL_MARGIN, y, { width: contentWidth });
      y += 16;
    }

    // City, State ZIP
    doc
      .fontSize(FONT_SIZE.SHIP_TO_ADDRESS)
      .font('Helvetica-Bold')
      .text(
        `${addr.city}, ${addr.state} ${addr.postalCode}`,
        LABEL_MARGIN,
        y,
        { width: contentWidth }
      );
    y += 16;

    // Country (if not US)
    if (addr.country && addr.country !== 'US') {
      doc
        .fontSize(FONT_SIZE.SHIP_TO_ADDRESS)
        .font('Helvetica')
        .text(addr.country, LABEL_MARGIN, y, { width: contentWidth });
      y += 16;
    }

    // Phone (if present)
    if (addr.phone) {
      y += 4;
      doc
        .fontSize(FONT_SIZE.FROM_ADDRESS)
        .font('Helvetica')
        .fillColor('#444444')
        .text(`Phone: ${addr.phone}`, LABEL_MARGIN, y);
      y += 14;
    }

    // ── Order reference (bottom section) ────────────────────────────────
    const bottomY = LABEL_HEIGHT - LABEL_MARGIN - 30;

    doc
      .strokeColor('#CCCCCC')
      .lineWidth(0.5)
      .moveTo(LABEL_MARGIN, bottomY - 6)
      .lineTo(LABEL_WIDTH - LABEL_MARGIN, bottomY - 6)
      .stroke();

    doc
      .fontSize(FONT_SIZE.ORDER_REF)
      .font('Helvetica-Bold')
      .fillColor('#333333')
      .text(`Order #${order.orderNumber}`, LABEL_MARGIN, bottomY);

    const dateStr = new Date(order.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    doc
      .fontSize(FONT_SIZE.ORDER_REF)
      .font('Helvetica')
      .fillColor('#666666')
      .text(dateStr, LABEL_MARGIN, bottomY + 12);

    doc.end();
  });
}

/**
 * Generate a shipping label PDF and save it to disk.
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
  console.log('Generating demo shipping label...\n');

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
    shippingAddress: {
      firstName: 'Jane',
      lastName: 'Smith',
      company: 'Smith Enterprises',
      addressLine1: '456 Oak Avenue',
      addressLine2: 'Suite 200',
      city: 'Portland',
      state: 'OR',
      postalCode: '97201',
      country: 'US',
      phone: '555-0199',
    },
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
    shippingCost: 15.0,
    tax: 24.0,
    discount: 0,
    total: 338.88,
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
