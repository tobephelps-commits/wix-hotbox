/**
 * Production Sheet PDF Generator (v2.0)
 *
 * Generates a visual production document for order fulfillment.
 * Contains garment specs and size/color quantities in a clean,
 * scannable layout optimized for production staff.
 *
 * Ported from v1.x scripts/orders/production-sheet.ts with v2.0 type
 * adaptations (OrderWithDetails, flat customer fields, `items` array).
 *
 * Phase 50: Order Management Advanced
 */

import PDFDocument from 'pdfkit';
import type { OrderWithDetails, OrderLineItem } from './types.js';
import {
  PAGE_MARGIN,
  BRAND_COLOR,
  BRAND_SECONDARY,
  BRAND_LIGHT,
  FONT_SIZE_TITLE,
  FONT_SIZE_HEADING,
  FONT_SIZE_BODY,
  FONT_SIZE_SMALL,
  drawHeader,
  drawFooter,
} from './pdf-template.js';

// =============================================================================
// Types
// =============================================================================

/** Grouped product with quantities by color/size */
interface ProductGroup {
  vendorStyle: string;
  productName: string;
  vendor?: string;
  imageUrl?: string;
  notes: string[];
  quantities: Array<{
    color: string;
    size: string;
    qty: number;
  }>;
  totalQty: number;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Group line items by vendorStyle for consolidated product sections.
 */
function groupLineItemsByStyle(items: OrderLineItem[]): ProductGroup[] {
  const groups = new Map<string, ProductGroup>();

  for (const item of items) {
    const key = item.vendorStyle ?? item.productName;

    if (!groups.has(key)) {
      groups.set(key, {
        vendorStyle: item.vendorStyle ?? '',
        productName: item.productName,
        vendor: item.vendor,
        imageUrl: item.imageUrl,
        notes: [],
        quantities: [],
        totalQty: 0,
      });
    }

    const group = groups.get(key)!;

    // Collect unique notes
    if (item.notes && !group.notes.includes(item.notes)) {
      group.notes.push(item.notes);
    }

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

// =============================================================================
// Layout Sections
// =============================================================================

/**
 * Draw the order summary section.
 * Customer name, collection/brand, total item count.
 */
function drawOrderSummary(
  doc: InstanceType<typeof PDFDocument>,
  order: OrderWithDetails,
  totalItems: number,
): void {
  const startY = doc.y;
  const pageWidth = doc.page.width - PAGE_MARGIN * 2;

  // Customer name (v2.0 uses flat fields)
  const firstName = order.customerFirstName ?? '';
  const lastName = order.customerLastName ?? '';
  const customerName = `${firstName} ${lastName}`.trim() || 'Unknown';

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
): void {
  const pageWidth = doc.page.width - PAGE_MARGIN * 2;

  // Check if we need a new page (need enough space for product section + notes)
  const notesHeight = group.notes.length * 14;
  if (doc.y > doc.page.height - PAGE_MARGIN - 200 - notesHeight) {
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

  // Draw production notes if present
  let notesOffsetY = 0;
  if (group.notes.length > 0) {
    const notesStartY = sectionStartY + (group.vendor ? 32 : 18);
    doc
      .font('Helvetica-Oblique')
      .fontSize(FONT_SIZE_SMALL)
      .fillColor('#444444');
    for (let n = 0; n < group.notes.length; n++) {
      doc.text(`Notes: ${group.notes[n]}`, PAGE_MARGIN + 5, notesStartY + n * 14);
    }
    notesOffsetY = group.notes.length * 14;
  }

  // Start quantities table below product info (+ notes offset)
  const tableStartY = sectionStartY + 35 + notesOffsetY;

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

  // Table rows — sort by color then size
  let currentY = tableStartY + rowHeight + headerPadding * 2;

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

// =============================================================================
// Public API
// =============================================================================

/**
 * Generate a production sheet PDF from an OrderWithDetails.
 * Returns a Buffer containing the complete PDF document.
 */
export async function generateProductionSheet(order: OrderWithDetails): Promise<Buffer> {
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

    // Group line items by product (v2.0 uses `items` not `lineItems`)
    const productGroups = groupLineItemsByStyle(order.items);

    // Calculate total item count
    const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);

    // Draw layout sections
    drawHeader(doc, order, 'PRODUCTION SHEET', 'Order #: ');
    drawOrderSummary(doc, order, totalItems);

    // Draw each product section
    for (const group of productGroups) {
      drawProductSection(doc, group);
    }

    // Draw footer (no "thank you" on production sheets)
    drawFooter(doc, false);

    // Finalize the document
    doc.end();
  });
}
