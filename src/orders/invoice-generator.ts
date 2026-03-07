/**
 * Invoice PDF Generator (v2.0)
 *
 * Generates branded PDF invoices for orders. Composes shared layout
 * helpers from pdf-template.ts into a complete invoice document.
 *
 * Ported from v1.x scripts/orders/invoice-generator.ts and
 * scripts/orders/invoice-template.ts with v2.0 type adaptations
 * (OrderWithDetails uses flat customer fields and `items` array).
 *
 * Phase 50: Order Management Advanced
 */

import PDFDocument from 'pdfkit';
import type { OrderWithDetails } from './types.js';
import {
  PAGE_MARGIN,
  BRAND_COLOR,
  BRAND_SECONDARY,
  BRAND_LIGHT,
  FONT_SIZE_HEADING,
  FONT_SIZE_BODY,
  drawHeader,
  drawFooter,
} from './pdf-template.js';

// =============================================================================
// Layout Sections
// =============================================================================

/**
 * Draw customer info — "Bill To" on left, "Ship To" on right.
 * Adapted from v1.x to use v2.0 flat customer fields.
 */
function drawCustomerInfo(
  doc: InstanceType<typeof PDFDocument>,
  order: OrderWithDetails,
): void {
  const pageWidth = doc.page.width - PAGE_MARGIN * 2;
  const colWidth = pageWidth / 2 - 10;
  const startY = doc.y;

  // "Bill To" heading
  doc
    .font('Helvetica-Bold')
    .fontSize(FONT_SIZE_HEADING)
    .fillColor(BRAND_SECONDARY)
    .text('Bill To', PAGE_MARGIN, startY);

  // Billing details
  doc
    .font('Helvetica')
    .fontSize(FONT_SIZE_BODY)
    .fillColor(BRAND_SECONDARY);

  const firstName = order.customerFirstName ?? '';
  const lastName = order.customerLastName ?? '';
  const customerName = `${firstName} ${lastName}`.trim() || 'Unknown';
  doc.text(customerName, PAGE_MARGIN, startY + 20);

  if (order.billingAddress) {
    const ba = order.billingAddress;
    if (ba.company) {
      doc.text(ba.company);
    }
    doc.text(ba.addressLine1);
    if (ba.addressLine2) {
      doc.text(ba.addressLine2);
    }
    doc.text(`${ba.city}, ${ba.state} ${ba.postalCode}`);
    if (ba.phone) {
      doc.text(ba.phone);
    }
  }
  if (order.customerEmail) {
    doc.text(order.customerEmail);
  }

  const billingEndY = doc.y;

  // "Ship To" heading — right column
  doc
    .font('Helvetica-Bold')
    .fontSize(FONT_SIZE_HEADING)
    .fillColor(BRAND_SECONDARY)
    .text('Ship To', PAGE_MARGIN + colWidth + 20, startY);

  doc
    .font('Helvetica')
    .fontSize(FONT_SIZE_BODY)
    .fillColor(BRAND_SECONDARY);

  if (order.shippingAddress) {
    const sa = order.shippingAddress;
    doc.text(
      `${sa.firstName} ${sa.lastName}`,
      PAGE_MARGIN + colWidth + 20,
      startY + 20,
    );
    if (sa.company) {
      doc.text(sa.company);
    }
    doc.text(sa.addressLine1);
    if (sa.addressLine2) {
      doc.text(sa.addressLine2);
    }
    doc.text(`${sa.city}, ${sa.state} ${sa.postalCode}`);
    if (sa.phone) {
      doc.text(sa.phone);
    }
  } else {
    doc.text(
      order.shippingCost > 0 ? 'Same as billing' : 'Local Pickup',
      PAGE_MARGIN + colWidth + 20,
      startY + 20,
    );
  }

  const shippingEndY = doc.y;

  // Move cursor below whichever column is taller
  doc.y = Math.max(billingEndY, shippingEndY) + 20;
}

/**
 * Draw a table of line items with header row, alternating row shading,
 * and right-aligned price columns.
 * Adapted from v1.x to use v2.0 `items` array.
 */
function drawLineItemsTable(
  doc: InstanceType<typeof PDFDocument>,
  order: OrderWithDetails,
): void {
  const pageWidth = doc.page.width - PAGE_MARGIN * 2;
  const startY = doc.y;

  // Column definitions (x position, width)
  const cols = {
    item: { x: PAGE_MARGIN, width: pageWidth * 0.50 },
    qty: { x: PAGE_MARGIN + pageWidth * 0.50, width: pageWidth * 0.12 },
    unitPrice: { x: PAGE_MARGIN + pageWidth * 0.62, width: pageWidth * 0.18 },
    total: { x: PAGE_MARGIN + pageWidth * 0.80, width: pageWidth * 0.20 },
  };

  const rowHeight = 20;
  const headerPadding = 5;

  // Header row background
  doc
    .rect(PAGE_MARGIN, startY, pageWidth, rowHeight + headerPadding * 2)
    .fill(BRAND_LIGHT);

  // Header text
  doc
    .font('Helvetica-Bold')
    .fontSize(FONT_SIZE_BODY)
    .fillColor(BRAND_SECONDARY);

  const headerY = startY + headerPadding + 2;
  doc.text('Item', cols.item.x + 5, headerY, { width: cols.item.width - 5 });
  doc.text('Qty', cols.qty.x, headerY, { width: cols.qty.width, align: 'right' });
  doc.text('Unit Price', cols.unitPrice.x, headerY, { width: cols.unitPrice.width, align: 'right' });
  doc.text('Total', cols.total.x, headerY, { width: cols.total.width, align: 'right' });

  // Line item rows (v2.0 uses `items`)
  let currentY = startY + rowHeight + headerPadding * 2;

  for (let i = 0; i < order.items.length; i++) {
    const item = order.items[i];

    // Alternating row shading (even rows get light background)
    if (i % 2 === 0) {
      doc
        .rect(PAGE_MARGIN, currentY, pageWidth, rowHeight)
        .fill('#FAFAFA');
    }

    // Build item description
    let itemName = item.productName;
    const details: string[] = [];
    if (item.color) details.push(item.color);
    if (item.size) details.push(item.size);
    if (details.length > 0) {
      itemName += ` (${details.join(', ')})`;
    }

    doc
      .font('Helvetica')
      .fontSize(FONT_SIZE_BODY)
      .fillColor(BRAND_SECONDARY);

    doc.text(itemName, cols.item.x + 5, currentY + 5, {
      width: cols.item.width - 10,
      lineBreak: false,
    });
    doc.text(String(item.quantity), cols.qty.x, currentY + 5, {
      width: cols.qty.width,
      align: 'right',
    });
    doc.text(`$${item.unitPrice.toFixed(2)}`, cols.unitPrice.x, currentY + 5, {
      width: cols.unitPrice.width,
      align: 'right',
    });
    doc.text(`$${item.totalPrice.toFixed(2)}`, cols.total.x, currentY + 5, {
      width: cols.total.width,
      align: 'right',
    });

    currentY += rowHeight;
  }

  // Bottom border for table
  doc
    .moveTo(PAGE_MARGIN, currentY)
    .lineTo(PAGE_MARGIN + pageWidth, currentY)
    .strokeColor(BRAND_LIGHT)
    .lineWidth(0.5)
    .stroke();

  doc.y = currentY + 10;
}

/**
 * Draw right-aligned totals summary — subtotal, shipping, tax, discount, total.
 * Only shows lines with non-zero values (except subtotal and total always shown).
 */
function drawTotals(
  doc: InstanceType<typeof PDFDocument>,
  order: OrderWithDetails,
): void {
  const pageWidth = doc.page.width - PAGE_MARGIN * 2;
  const labelX = PAGE_MARGIN + pageWidth * 0.60;
  const valueX = PAGE_MARGIN + pageWidth * 0.80;
  const valueWidth = pageWidth * 0.20;
  const lineHeight = 18;
  let currentY = doc.y + 5;

  const drawTotalLine = (label: string, value: string, bold = false): void => {
    doc
      .font(bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(bold ? FONT_SIZE_HEADING : FONT_SIZE_BODY)
      .fillColor(bold ? BRAND_COLOR : BRAND_SECONDARY);

    doc.text(label, labelX, currentY, { width: valueWidth, align: 'left' });
    doc.text(value, valueX, currentY, { width: valueWidth, align: 'right' });
    currentY += lineHeight;
  };

  // Subtotal
  drawTotalLine('Subtotal', `$${order.subtotal.toFixed(2)}`);

  // Shipping (if > 0)
  if (order.shippingCost > 0) {
    drawTotalLine('Shipping', `$${order.shippingCost.toFixed(2)}`);
  }

  // Tax (if > 0)
  if (order.tax > 0) {
    drawTotalLine('Tax', `$${order.tax.toFixed(2)}`);
  }

  // Discount (if > 0)
  if (order.discount > 0) {
    drawTotalLine('Discount', `-$${order.discount.toFixed(2)}`);
  }

  // Thin line before total
  doc
    .moveTo(labelX, currentY)
    .lineTo(PAGE_MARGIN + pageWidth, currentY)
    .strokeColor(BRAND_COLOR)
    .lineWidth(0.5)
    .stroke();
  currentY += 5;

  // Bold total with brand color accent
  drawTotalLine('Total', `$${order.total.toFixed(2)}`, true);

  doc.y = currentY + 10;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Generate a branded invoice PDF from an OrderWithDetails.
 * Returns a Buffer containing the complete PDF document.
 */
export async function generateInvoice(order: OrderWithDetails): Promise<Buffer> {
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

    // Compose layout sections in order
    drawHeader(doc, order, 'INVOICE', 'Invoice #: INV-');
    drawCustomerInfo(doc, order);
    drawLineItemsTable(doc, order);
    drawTotals(doc, order);
    drawFooter(doc, true);

    // Finalize the document
    doc.end();
  });
}
