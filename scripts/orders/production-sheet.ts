/**
 * Production Sheet PDF Generator
 *
 * Generates a visual production document for order fulfillment.
 * Contains garment specs, logo placement visuals, and size/color quantities
 * in a clean, scannable layout optimized for production staff.
 *
 * Phase 38: Production Sheet Generator
 */

import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';
import {
  PAGE_MARGIN,
  BRAND_NAME,
  BRAND_COLOR,
  BRAND_SECONDARY,
  BRAND_LIGHT,
  LOGO_PATH,
  FONT_SIZE_TITLE,
  FONT_SIZE_HEADING,
  FONT_SIZE_BODY,
  FONT_SIZE_SMALL,
} from './invoice-template.js';
import type { Order, OrderLineItem } from './types.js';
import { loadLogoRegistry } from '../pipeline/overlay.js';

// =============================================================================
// Production Sheet Generation
// =============================================================================

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const PRODUCTION_SHEETS_DIR = path.join(PROJECT_ROOT, 'data', 'production-sheets');

/** Grouped product with quantities by color/size */
interface ProductGroup {
  vendorStyle: string;
  productName: string;
  vendor?: 'sanmar' | 'ss';
  imageUrl?: string;
  quantities: Array<{
    color: string;
    size: string;
    qty: number;
  }>;
  totalQty: number;
}

/**
 * Group line items by vendorStyle for consolidated product sections.
 */
function groupLineItemsByStyle(lineItems: OrderLineItem[]): ProductGroup[] {
  const groups = new Map<string, ProductGroup>();

  for (const item of lineItems) {
    const key = item.vendorStyle ?? item.productName;

    if (!groups.has(key)) {
      groups.set(key, {
        vendorStyle: item.vendorStyle ?? '',
        productName: item.productName,
        vendor: item.vendor,
        imageUrl: item.imageUrl,
        quantities: [],
        totalQty: 0,
      });
    }

    const group = groups.get(key)!;
    group.quantities.push({
      color: item.color ?? 'N/A',
      size: item.size ?? 'N/A',
      qty: item.quantity,
    });
    group.totalQty += item.quantity;

    // Use first available image URL
    if (!group.imageUrl && item.imageUrl) {
      group.imageUrl = item.imageUrl;
    }
  }

  return Array.from(groups.values());
}

/**
 * Draw the production sheet header.
 * Logo top-left, "PRODUCTION SHEET" title top-right, order number and date.
 */
function drawHeader(doc: InstanceType<typeof PDFDocument>, order: Order): void {
  const pageWidth = doc.page.width - PAGE_MARGIN * 2;
  const startY = PAGE_MARGIN;

  // Logo top-left (120px wide)
  doc.image(LOGO_PATH, PAGE_MARGIN, startY, { width: 120 });

  // "PRODUCTION SHEET" title top-right
  doc
    .font('Helvetica-Bold')
    .fontSize(FONT_SIZE_TITLE)
    .fillColor(BRAND_COLOR)
    .text('PRODUCTION SHEET', PAGE_MARGIN, startY, {
      width: pageWidth,
      align: 'right',
    });

  // Order number and date
  const orderDate = new Date(order.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  doc
    .font('Helvetica')
    .fontSize(FONT_SIZE_BODY)
    .fillColor(BRAND_SECONDARY)
    .text(`Order #: ${order.orderNumber}`, PAGE_MARGIN, startY + 30, {
      width: pageWidth,
      align: 'right',
    })
    .text(`Date: ${orderDate}`, {
      width: pageWidth,
      align: 'right',
    });

  // Horizontal rule
  const ruleY = startY + 70;
  doc
    .moveTo(PAGE_MARGIN, ruleY)
    .lineTo(PAGE_MARGIN + pageWidth, ruleY)
    .strokeColor(BRAND_COLOR)
    .lineWidth(1)
    .stroke();

  doc.y = ruleY + 15;
}

/**
 * Draw the order summary section.
 * Customer name, collection/brand, total item count.
 */
function drawOrderSummary(doc: InstanceType<typeof PDFDocument>, order: Order, totalItems: number): void {
  const startY = doc.y;
  const pageWidth = doc.page.width - PAGE_MARGIN * 2;

  // Customer name
  const customerName = `${order.customer.firstName} ${order.customer.lastName}`;

  doc
    .font('Helvetica-Bold')
    .fontSize(FONT_SIZE_HEADING)
    .fillColor(BRAND_SECONDARY)
    .text('Customer:', PAGE_MARGIN, startY);

  doc
    .font('Helvetica')
    .fontSize(FONT_SIZE_BODY)
    .text(customerName, PAGE_MARGIN + 70, startY);

  // Collection/brand if present
  if (order.collection) {
    doc
      .font('Helvetica-Bold')
      .fontSize(FONT_SIZE_HEADING)
      .text('Collection:', PAGE_MARGIN, startY + 18);

    doc
      .font('Helvetica')
      .fontSize(FONT_SIZE_BODY)
      .text(order.collection, PAGE_MARGIN + 70, startY + 18);
  }

  // Total item count on the right
  doc
    .font('Helvetica-Bold')
    .fontSize(FONT_SIZE_HEADING)
    .text(`Total Items: ${totalItems}`, PAGE_MARGIN, startY, {
      width: pageWidth,
      align: 'right',
    });

  // Space after summary
  doc.y = startY + (order.collection ? 45 : 30);

  // Divider line
  doc
    .moveTo(PAGE_MARGIN, doc.y)
    .lineTo(PAGE_MARGIN + pageWidth, doc.y)
    .strokeColor(BRAND_LIGHT)
    .lineWidth(0.5)
    .stroke();

  doc.y += 15;
}

/**
 * Draw a product section with quantities table.
 */
function drawProductSection(
  doc: InstanceType<typeof PDFDocument>,
  group: ProductGroup,
  registry: { positionPresets: Record<string, { x: number; y: number }> } | null,
): void {
  const pageWidth = doc.page.width - PAGE_MARGIN * 2;
  const startY = doc.y;

  // Check if we need a new page (need at least 200px for a product section)
  if (startY > doc.page.height - PAGE_MARGIN - 200) {
    doc.addPage();
    doc.y = PAGE_MARGIN;
  }

  const sectionStartY = doc.y;

  // Product name and style
  const displayName = group.vendorStyle
    ? `${group.productName} (${group.vendorStyle})`
    : group.productName;

  doc
    .font('Helvetica-Bold')
    .fontSize(FONT_SIZE_HEADING)
    .fillColor(BRAND_COLOR)
    .text(displayName, PAGE_MARGIN, sectionStartY);

  // Vendor badge if present
  if (group.vendor) {
    const vendorLabel = group.vendor === 'sanmar' ? 'SanMar' : 'S&S';
    doc
      .font('Helvetica')
      .fontSize(FONT_SIZE_SMALL)
      .fillColor(BRAND_SECONDARY)
      .text(`[${vendorLabel}]`, PAGE_MARGIN, sectionStartY + 18);
  }

  // Total quantity for this product
  doc
    .font('Helvetica-Bold')
    .fontSize(FONT_SIZE_BODY)
    .fillColor(BRAND_SECONDARY)
    .text(`Qty: ${group.totalQty}`, PAGE_MARGIN, sectionStartY, {
      width: pageWidth,
      align: 'right',
    });

  // Start quantities table below product info
  const tableStartY = sectionStartY + 35;

  // Table column definitions
  const colWidths = {
    color: pageWidth * 0.45,
    size: pageWidth * 0.25,
    qty: pageWidth * 0.30,
  };

  const rowHeight = 18;
  const headerPadding = 4;

  // Table header row
  doc
    .rect(PAGE_MARGIN, tableStartY, pageWidth, rowHeight + headerPadding * 2)
    .fill(BRAND_LIGHT);

  doc
    .font('Helvetica-Bold')
    .fontSize(FONT_SIZE_BODY)
    .fillColor(BRAND_SECONDARY);

  const headerY = tableStartY + headerPadding + 2;
  doc.text('Color', PAGE_MARGIN + 5, headerY);
  doc.text('Size', PAGE_MARGIN + colWidths.color, headerY);
  doc.text('Qty', PAGE_MARGIN + colWidths.color + colWidths.size, headerY, {
    width: colWidths.qty - 5,
    align: 'right',
  });

  // Table rows
  let currentY = tableStartY + rowHeight + headerPadding * 2;

  // Sort quantities: by color, then by size
  const sortedQuantities = [...group.quantities].sort((a, b) => {
    const colorCompare = a.color.localeCompare(b.color);
    if (colorCompare !== 0) return colorCompare;
    return a.size.localeCompare(b.size);
  });

  for (let i = 0; i < sortedQuantities.length; i++) {
    const q = sortedQuantities[i];

    // Check if we need a new page
    if (currentY > doc.page.height - PAGE_MARGIN - rowHeight) {
      doc.addPage();
      currentY = PAGE_MARGIN;
    }

    // Alternating row shading
    if (i % 2 === 0) {
      doc
        .rect(PAGE_MARGIN, currentY, pageWidth, rowHeight)
        .fill('#FAFAFA');
    }

    doc
      .font('Helvetica')
      .fontSize(FONT_SIZE_BODY)
      .fillColor(BRAND_SECONDARY);

    doc.text(q.color, PAGE_MARGIN + 5, currentY + 4, {
      width: colWidths.color - 10,
      lineBreak: false,
    });
    doc.text(q.size, PAGE_MARGIN + colWidths.color, currentY + 4);
    doc.text(String(q.qty), PAGE_MARGIN + colWidths.color + colWidths.size, currentY + 4, {
      width: colWidths.qty - 5,
      align: 'right',
    });

    currentY += rowHeight;
  }

  // Table bottom border
  doc
    .moveTo(PAGE_MARGIN, currentY)
    .lineTo(PAGE_MARGIN + pageWidth, currentY)
    .strokeColor(BRAND_LIGHT)
    .lineWidth(0.5)
    .stroke();

  // Space after product section
  doc.y = currentY + 20;
}

/**
 * Draw footer at the bottom of the page.
 */
function drawFooter(doc: InstanceType<typeof PDFDocument>): void {
  const pageWidth = doc.page.width - PAGE_MARGIN * 2;
  const footerY = doc.page.height - PAGE_MARGIN - 30;

  // Thin horizontal rule
  doc
    .moveTo(PAGE_MARGIN, footerY)
    .lineTo(PAGE_MARGIN + pageWidth, footerY)
    .strokeColor(BRAND_LIGHT)
    .lineWidth(0.5)
    .stroke();

  // Company name
  doc
    .font('Helvetica-Bold')
    .fontSize(FONT_SIZE_SMALL)
    .fillColor(BRAND_COLOR)
    .text(BRAND_NAME, PAGE_MARGIN, footerY + 10, {
      width: pageWidth,
      align: 'center',
    });
}

/**
 * Generate a production sheet PDF from an Order.
 * Returns a Buffer containing the complete PDF document.
 */
export async function generateProductionSheet(order: Order): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'letter',
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

    // Load logo registry for position presets (optional)
    let registry: { positionPresets: Record<string, { x: number; y: number }> } | null = null;
    try {
      registry = loadLogoRegistry();
    } catch {
      // Registry not available, continue without it
    }

    // Group line items by product
    const productGroups = groupLineItemsByStyle(order.lineItems);

    // Calculate total item count
    const totalItems = order.lineItems.reduce((sum, item) => sum + item.quantity, 0);

    // Draw layout sections
    drawHeader(doc, order);
    drawOrderSummary(doc, order, totalItems);

    // Draw each product section
    for (const group of productGroups) {
      drawProductSection(doc, group, registry);
    }

    // Draw footer
    drawFooter(doc);

    // Finalize the document
    doc.end();
  });
}

/**
 * Generate a production sheet PDF and save it to disk.
 *
 * @param order - The order to generate a production sheet for
 * @param outputPath - Optional output path; defaults to data/production-sheets/PS-{orderNumber}.pdf
 * @returns The absolute path to the saved PDF
 */
export async function saveProductionSheet(order: Order, outputPath?: string): Promise<string> {
  // Ensure production sheets directory exists
  fs.mkdirSync(PRODUCTION_SHEETS_DIR, { recursive: true });

  const filePath = outputPath ?? path.join(PRODUCTION_SHEETS_DIR, `PS-${order.orderNumber}.pdf`);
  const absolutePath = path.resolve(filePath);

  // Ensure the target directory exists
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });

  const buffer = await generateProductionSheet(order);
  fs.writeFileSync(absolutePath, buffer);

  return absolutePath;
}

// =============================================================================
// Demo Sample Order
// =============================================================================

function createDemoOrder(): Order {
  const now = new Date().toISOString();
  return {
    id: 'demo-ps-001',
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
      city: 'Denver',
      state: 'CO',
      postalCode: '80202',
      country: 'US',
    },
    lineItems: [
      {
        productName: 'Port & Company PC61 Essential Tee',
        sku: 'PC61-JB-L',
        quantity: 12,
        unitPrice: 14.99,
        totalPrice: 179.88,
        vendorStyle: 'PC61',
        vendor: 'sanmar',
        color: 'Jet Black',
        size: 'L',
      },
      {
        productName: 'Port & Company PC61 Essential Tee',
        sku: 'PC61-JB-XL',
        quantity: 8,
        unitPrice: 14.99,
        totalPrice: 119.92,
        vendorStyle: 'PC61',
        vendor: 'sanmar',
        color: 'Jet Black',
        size: 'XL',
      },
      {
        productName: 'Port & Company PC61 Essential Tee',
        sku: 'PC61-WH-M',
        quantity: 6,
        unitPrice: 14.99,
        totalPrice: 89.94,
        vendorStyle: 'PC61',
        vendor: 'sanmar',
        color: 'White',
        size: 'M',
      },
      {
        productName: 'Gildan G180 Heavy Blend Crewneck',
        sku: 'G180-NV-L',
        quantity: 10,
        unitPrice: 22.50,
        totalPrice: 225.00,
        vendorStyle: 'G180',
        vendor: 'sanmar',
        color: 'Navy',
        size: 'L',
      },
      {
        productName: 'Gildan G180 Heavy Blend Crewneck',
        sku: 'G180-NV-XL',
        quantity: 10,
        unitPrice: 22.50,
        totalPrice: 225.00,
        vendorStyle: 'G180',
        vendor: 'sanmar',
        color: 'Navy',
        size: 'XL',
      },
    ],
    collection: 'Smith Athletics Team',
    subtotal: 839.74,
    shippingCost: 15.00,
    tax: 62.98,
    discount: 0,
    total: 917.72,
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
    console.log('Usage: npx tsx scripts/orders/production-sheet.ts --demo');
    console.log('');
    console.log('Flags:');
    console.log('  --demo    Generate a demo production sheet with sample data');
    process.exit(0);
  }

  console.log('Generating demo production sheet...');

  const demoOrder = createDemoOrder();

  const demoPath = path.join(PRODUCTION_SHEETS_DIR, 'PS-DEMO.pdf');
  const savedPath = await saveProductionSheet(demoOrder, demoPath);

  const stats = fs.statSync(savedPath);
  console.log(`Production sheet saved to: ${savedPath}`);
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
    process.argv[1].includes('production-sheet')
  );

if (isMain) {
  main().catch((err) => {
    console.error('Error generating production sheet:', err);
    process.exit(1);
  });
}
