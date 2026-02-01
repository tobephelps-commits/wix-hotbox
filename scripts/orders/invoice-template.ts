/**
 * Invoice Template Layout Module
 *
 * Defines brand constants and layout helper functions for generating
 * branded HotBox Clothing invoices using PDFKit.
 *
 * Phase 18: Order Management — Invoice & Label Printing
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type PDFDocument from 'pdfkit';
import type { Order } from './types.js';

// =============================================================================
// Brand Constants
// =============================================================================

export const BRAND_NAME = 'HotBox Clothing';
export const BRAND_COLOR = '#E31837';
export const BRAND_SECONDARY = '#333333';
export const BRAND_LIGHT = '#F5F5F5';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const LOGO_PATH = path.resolve(__dirname, '../../media/logos/BB.png');

export const PAGE_MARGIN = 50;
export const FONT_SIZE_TITLE = 24;
export const FONT_SIZE_HEADING = 14;
export const FONT_SIZE_BODY = 10;
export const FONT_SIZE_SMALL = 8;

// =============================================================================
// Layout Helper: Header
// =============================================================================

/**
 * Draw the invoice header — logo top-left, "INVOICE" title top-right,
 * order number and date below title, horizontal rule below.
 */
export function drawHeader(doc: InstanceType<typeof PDFDocument>, order: Order): void {
  const pageWidth = doc.page.width - PAGE_MARGIN * 2;
  const startY = PAGE_MARGIN;

  // Logo top-left (120px wide, maintain aspect ratio)
  doc.image(LOGO_PATH, PAGE_MARGIN, startY, { width: 120 });

  // "INVOICE" title top-right
  doc
    .font('Helvetica-Bold')
    .fontSize(FONT_SIZE_TITLE)
    .fillColor(BRAND_COLOR)
    .text('INVOICE', PAGE_MARGIN, startY, {
      width: pageWidth,
      align: 'right',
    });

  // Order number and date below title
  const orderDate = new Date(order.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  doc
    .font('Helvetica')
    .fontSize(FONT_SIZE_BODY)
    .fillColor(BRAND_SECONDARY)
    .text(`Invoice #: INV-${order.orderNumber}`, PAGE_MARGIN, startY + 30, {
      width: pageWidth,
      align: 'right',
    })
    .text(`Date: ${orderDate}`, {
      width: pageWidth,
      align: 'right',
    });

  // Horizontal rule below header
  const ruleY = startY + 70;
  doc
    .moveTo(PAGE_MARGIN, ruleY)
    .lineTo(PAGE_MARGIN + pageWidth, ruleY)
    .strokeColor(BRAND_COLOR)
    .lineWidth(1)
    .stroke();

  // Move cursor below header
  doc.y = ruleY + 15;
}

// =============================================================================
// Layout Helper: Customer Info
// =============================================================================

/**
 * Draw customer info — "Bill To" on left, "Ship To" on right.
 * If no shipping address, shows "Same as billing" or "Local Pickup".
 */
export function drawCustomerInfo(doc: InstanceType<typeof PDFDocument>, order: Order): void {
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

  const customerName = `${order.customer.firstName} ${order.customer.lastName}`;
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
  if (order.customer.email) {
    doc.text(order.customer.email);
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

// =============================================================================
// Layout Helper: Line Items Table
// =============================================================================

/**
 * Draw a table of line items with header row, alternating row shading,
 * and right-aligned price columns.
 */
export function drawLineItemsTable(doc: InstanceType<typeof PDFDocument>, order: Order): void {
  const pageWidth = doc.page.width - PAGE_MARGIN * 2;
  const startY = doc.y;

  // Column definitions (x position, width, alignment)
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

  // Line item rows
  let currentY = startY + rowHeight + headerPadding * 2;

  for (let i = 0; i < order.lineItems.length; i++) {
    const item = order.lineItems[i];

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

// =============================================================================
// Layout Helper: Totals
// =============================================================================

/**
 * Draw right-aligned totals summary — subtotal, shipping, tax, discount, total.
 * Only shows lines with non-zero values (except subtotal and total always shown).
 */
export function drawTotals(doc: InstanceType<typeof PDFDocument>, order: Order): void {
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
// Layout Helper: Footer
// =============================================================================

/**
 * Draw footer at bottom of page — thank you message and company name.
 */
export function drawFooter(doc: InstanceType<typeof PDFDocument>): void {
  const pageWidth = doc.page.width - PAGE_MARGIN * 2;
  const footerY = doc.page.height - PAGE_MARGIN - 40;

  // Thin horizontal rule
  doc
    .moveTo(PAGE_MARGIN, footerY)
    .lineTo(PAGE_MARGIN + pageWidth, footerY)
    .strokeColor(BRAND_LIGHT)
    .lineWidth(0.5)
    .stroke();

  // Thank you message
  doc
    .font('Helvetica')
    .fontSize(FONT_SIZE_SMALL)
    .fillColor(BRAND_SECONDARY)
    .text('Thank you for your business!', PAGE_MARGIN, footerY + 10, {
      width: pageWidth,
      align: 'center',
    });

  // Company name
  doc
    .font('Helvetica-Bold')
    .fontSize(FONT_SIZE_SMALL)
    .fillColor(BRAND_COLOR)
    .text(BRAND_NAME, PAGE_MARGIN, footerY + 22, {
      width: pageWidth,
      align: 'center',
    });
}
