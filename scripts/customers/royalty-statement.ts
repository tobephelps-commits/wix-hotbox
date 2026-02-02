/**
 * Royalty Statement PDF Generator
 *
 * Generates branded PDF royalty statements using PDFKit. Each statement
 * includes the customer's logo, a full line-item ledger table, and clear
 * totals. Professional, minimal layout suitable for handing to a customer.
 *
 * Functions:
 * 1. generateRoyaltyStatement - returns PDF Buffer
 * 2. saveRoyaltyStatement     - saves PDF to disk, returns file path
 *
 * Phase 26: Royalty Calculation & PDF Reporting
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';
import type { RoyaltyReport, RoyaltyLineItem } from './royalty.js';
import type { CustomerAccount } from './types.js';

// =============================================================================
// Constants
// =============================================================================

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const STATEMENTS_DIR = path.join(PROJECT_ROOT, 'data', 'royalty-statements');
const LOGO_REGISTRY_PATH = path.join(PROJECT_ROOT, 'data', 'logos.json');

const BRAND_COLOR = '#E31837';
const BRAND_SECONDARY = '#333333';
const BRAND_LIGHT = '#F5F5F5';
const ROW_SHADING = '#FAFAFA';
const DISCOUNT_TEXT_COLOR = '#999999';

const PAGE_MARGIN = 50;
const FONT_SIZE_TITLE = 20;
const FONT_SIZE_HEADING = 12;
const FONT_SIZE_BODY = 9;
const FONT_SIZE_SMALL = 8;
const FONT_SIZE_TINY = 7;

const ROW_HEIGHT = 18;

// =============================================================================
// Logo Registry Helper
// =============================================================================

interface LogoRegistryEntry {
  displayName: string;
  filePath: string;
  defaultScale: number;
  defaultBlendMode: string;
  defaultOpacity: number;
}

interface LogoRegistry {
  logos: Record<string, LogoRegistryEntry>;
}

/**
 * Resolve the first available logo file path for a customer.
 * Returns null if customer has no logos or logo file not found.
 */
function resolveCustomerLogoPath(customer: CustomerAccount): string | null {
  if (!customer.logoKeys || customer.logoKeys.length === 0) return null;

  try {
    const raw = fs.readFileSync(LOGO_REGISTRY_PATH, 'utf-8');
    const registry: LogoRegistry = JSON.parse(raw);

    for (const key of customer.logoKeys) {
      const entry = registry.logos[key];
      if (entry) {
        const absolutePath = path.resolve(PROJECT_ROOT, entry.filePath);
        if (fs.existsSync(absolutePath)) {
          return absolutePath;
        }
      }
    }
  } catch {
    // Registry not found or parse error -- skip logo
  }

  return null;
}

// =============================================================================
// Formatting Helpers
// =============================================================================

/** Format a number as $X,XXX.XX with comma separators. */
function formatMoney(value: number): string {
  return '$' + value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Format an ISO date string as "Month Day, Year" (e.g., "January 1, 2026"). */
function formatLongDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Format an ISO date string as MM/DD/YY for table rows. */
function formatShortDate(isoString: string): string {
  const d = new Date(isoString);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}/${dd}/${yy}`;
}

/** Slugify a string: lowercase, spaces to hyphens, strip non-alphanum. */
function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// =============================================================================
// Layout Drawing Functions
// =============================================================================

/**
 * Draw the statement header -- customer logo top-left, "ROYALTY STATEMENT"
 * title top-right, customer name, period, generated date, horizontal rule.
 */
function drawHeader(
  doc: InstanceType<typeof PDFDocument>,
  report: RoyaltyReport,
  customer: CustomerAccount,
  logoPath: string | null,
): void {
  const pageWidth = doc.page.width - PAGE_MARGIN * 2;
  const startY = PAGE_MARGIN;

  // Customer logo top-left (120px wide, maintain aspect ratio)
  if (logoPath) {
    try {
      doc.image(logoPath, PAGE_MARGIN, startY, { width: 120 });
    } catch {
      // Logo file unreadable -- skip silently
    }
  }

  // "ROYALTY STATEMENT" title top-right
  doc
    .font('Helvetica-Bold')
    .fontSize(FONT_SIZE_TITLE)
    .fillColor(BRAND_COLOR)
    .text('ROYALTY STATEMENT', PAGE_MARGIN, startY, {
      width: pageWidth,
      align: 'right',
    });

  // Customer name, period, generated date below title (right-aligned)
  doc
    .font('Helvetica')
    .fontSize(FONT_SIZE_BODY)
    .fillColor(BRAND_SECONDARY);

  const periodStr = `${formatLongDate(report.periodStart)} \u2014 ${formatLongDate(report.periodEnd)}`;
  const generatedStr = `Generated: ${formatLongDate(report.generatedAt)}`;

  doc.text(customer.name, PAGE_MARGIN, startY + 28, {
    width: pageWidth,
    align: 'right',
  });
  doc.text(periodStr, PAGE_MARGIN, startY + 42, {
    width: pageWidth,
    align: 'right',
  });
  doc.text(generatedStr, PAGE_MARGIN, startY + 56, {
    width: pageWidth,
    align: 'right',
  });

  // Horizontal rule below header
  const ruleY = startY + 75;
  doc
    .moveTo(PAGE_MARGIN, ruleY)
    .lineTo(PAGE_MARGIN + pageWidth, ruleY)
    .strokeColor(BRAND_COLOR)
    .lineWidth(1)
    .stroke();

  doc.y = ruleY + 15;
}

/**
 * Draw customer info section -- name/contact on left, royalty rate/period on right.
 */
function drawCustomerInfo(
  doc: InstanceType<typeof PDFDocument>,
  report: RoyaltyReport,
  customer: CustomerAccount,
): void {
  const pageWidth = doc.page.width - PAGE_MARGIN * 2;
  const colWidth = pageWidth / 2 - 10;
  const startY = doc.y;

  // Left column: Customer name (bold), contact name, email
  doc
    .font('Helvetica-Bold')
    .fontSize(FONT_SIZE_HEADING)
    .fillColor(BRAND_SECONDARY)
    .text(customer.name, PAGE_MARGIN, startY);

  doc
    .font('Helvetica')
    .fontSize(FONT_SIZE_BODY)
    .fillColor(BRAND_SECONDARY);

  if (customer.contactName) {
    doc.text(customer.contactName, PAGE_MARGIN, startY + 18);
  }
  if (customer.email) {
    doc.text(customer.email, PAGE_MARGIN, startY + 30);
  }

  const leftEndY = startY + 44;

  // Right column: Royalty rate and period
  doc
    .font('Helvetica')
    .fontSize(FONT_SIZE_BODY)
    .fillColor(BRAND_SECONDARY)
    .text(`Royalty Rate: ${report.royaltyRate}%`, PAGE_MARGIN + colWidth + 20, startY, {
      width: colWidth,
    })
    .text(
      `Report Period: ${formatLongDate(report.periodStart)} \u2014 ${formatLongDate(report.periodEnd)}`,
      PAGE_MARGIN + colWidth + 20,
      startY + 14,
      { width: colWidth },
    );

  const rightEndY = startY + 30;

  doc.y = Math.max(leftEndY, rightEndY) + 15;
}

/**
 * Draw column headers for the line items table.
 * Returns column definition object for reuse.
 */
function getColumnDefs(pageWidth: number) {
  return {
    date:       { x: PAGE_MARGIN,                           width: pageWidth * 0.10 },
    order:      { x: PAGE_MARGIN + pageWidth * 0.10,        width: pageWidth * 0.07 },
    product:    { x: PAGE_MARGIN + pageWidth * 0.17,        width: pageWidth * 0.31 },
    qty:        { x: PAGE_MARGIN + pageWidth * 0.48,        width: pageWidth * 0.06 },
    unitPrice:  { x: PAGE_MARGIN + pageWidth * 0.54,        width: pageWidth * 0.13 },
    royaltyPer: { x: PAGE_MARGIN + pageWidth * 0.67,        width: pageWidth * 0.16 },
    total:      { x: PAGE_MARGIN + pageWidth * 0.83,        width: pageWidth * 0.17 },
  };
}

/**
 * Draw the table column header row.
 */
function drawTableHeader(doc: InstanceType<typeof PDFDocument>, y: number): number {
  const pageWidth = doc.page.width - PAGE_MARGIN * 2;
  const cols = getColumnDefs(pageWidth);
  const headerPadding = 4;

  // Header row background
  doc
    .rect(PAGE_MARGIN, y, pageWidth, ROW_HEIGHT + headerPadding * 2)
    .fill(BRAND_LIGHT);

  // Header text
  doc
    .font('Helvetica-Bold')
    .fontSize(FONT_SIZE_SMALL)
    .fillColor(BRAND_SECONDARY);

  const headerY = y + headerPadding + 3;
  doc.text('Date', cols.date.x + 3, headerY, { width: cols.date.width - 3 });
  doc.text('Order #', cols.order.x, headerY, { width: cols.order.width });
  doc.text('Product', cols.product.x, headerY, { width: cols.product.width });
  doc.text('Qty', cols.qty.x, headerY, { width: cols.qty.width, align: 'right' });
  doc.text('Unit Price', cols.unitPrice.x, headerY, { width: cols.unitPrice.width, align: 'right' });
  doc.text('Royalty/Unit', cols.royaltyPer.x, headerY, { width: cols.royaltyPer.width, align: 'right' });
  doc.text('Total', cols.total.x, headerY, { width: cols.total.width, align: 'right' });

  return y + ROW_HEIGHT + headerPadding * 2;
}

/**
 * Draw the line items table with page overflow handling.
 */
function drawLineItemsTable(
  doc: InstanceType<typeof PDFDocument>,
  report: RoyaltyReport,
): void {
  const pageWidth = doc.page.width - PAGE_MARGIN * 2;
  const cols = getColumnDefs(pageWidth);

  let currentY = drawTableHeader(doc, doc.y);

  for (let i = 0; i < report.lineItems.length; i++) {
    const item = report.lineItems[i];

    // Page overflow check: if Y exceeds (page height - 150px), add new page
    if (currentY > doc.page.height - 150) {
      doc.addPage();
      currentY = PAGE_MARGIN;
      currentY = drawTableHeader(doc, currentY);
    }

    // Alternating row shading (even rows)
    if (i % 2 === 0) {
      doc
        .rect(PAGE_MARGIN, currentY, pageWidth, ROW_HEIGHT)
        .fill(ROW_SHADING);
    }

    const isDiscounted = item.discounted;
    const textColor = isDiscounted ? DISCOUNT_TEXT_COLOR : BRAND_SECONDARY;

    doc
      .font('Helvetica')
      .fontSize(FONT_SIZE_TINY)
      .fillColor(textColor);

    const rowTextY = currentY + 4;

    // Date (MM/DD/YY)
    doc.text(formatShortDate(item.orderDate), cols.date.x + 3, rowTextY, {
      width: cols.date.width - 3,
      lineBreak: false,
    });

    // Order #
    doc.text(String(item.orderNumber), cols.order.x, rowTextY, {
      width: cols.order.width,
      lineBreak: false,
    });

    // Product name with color/size
    let productText = item.productName;
    const details: string[] = [];
    if (item.color) details.push(item.color);
    if (item.size) details.push(item.size);
    if (details.length > 0) {
      productText += ` (${details.join(', ')})`;
    }
    // Truncate if too long (approx 40 chars for this column width)
    if (productText.length > 45) {
      productText = productText.substring(0, 42) + '...';
    }
    doc.text(productText, cols.product.x, rowTextY, {
      width: cols.product.width - 3,
      lineBreak: false,
    });

    // Qty (right-aligned)
    doc.text(String(item.quantity), cols.qty.x, rowTextY, {
      width: cols.qty.width,
      align: 'right',
    });

    // Unit Price (right-aligned)
    doc.text(`$${item.unitPrice.toFixed(2)}`, cols.unitPrice.x, rowTextY, {
      width: cols.unitPrice.width,
      align: 'right',
    });

    // Royalty/Unit (right-aligned, show (disc.) for discounted)
    const royaltyPerText = isDiscounted
      ? '$0.00 (disc.)'
      : `$${item.royaltyPerUnit.toFixed(2)}`;
    doc.text(royaltyPerText, cols.royaltyPer.x, rowTextY, {
      width: cols.royaltyPer.width,
      align: 'right',
    });

    // Total (right-aligned)
    const totalText = isDiscounted
      ? '$0.00'
      : `$${item.royaltyTotal.toFixed(2)}`;
    doc.text(totalText, cols.total.x, rowTextY, {
      width: cols.total.width,
      align: 'right',
    });

    currentY += ROW_HEIGHT;
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
 * Draw right-aligned totals section -- orders, units, revenue, royalty.
 */
function drawTotals(
  doc: InstanceType<typeof PDFDocument>,
  report: RoyaltyReport,
): void {
  const pageWidth = doc.page.width - PAGE_MARGIN * 2;
  const labelX = PAGE_MARGIN + pageWidth * 0.55;
  const valueX = PAGE_MARGIN + pageWidth * 0.80;
  const valueWidth = pageWidth * 0.20;
  const lineHeight = 16;
  let currentY = doc.y + 5;

  // Check if we need a new page for totals
  if (currentY > doc.page.height - 130) {
    doc.addPage();
    currentY = PAGE_MARGIN;
  }

  const drawTotalLine = (label: string, value: string, bold = false, color?: string): void => {
    doc
      .font(bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(bold ? FONT_SIZE_HEADING : FONT_SIZE_BODY)
      .fillColor(color ?? (bold ? BRAND_COLOR : BRAND_SECONDARY));

    doc.text(label, labelX, currentY, { width: valueWidth + 30, align: 'left' });
    doc.text(value, valueX, currentY, { width: valueWidth, align: 'right' });
    currentY += lineHeight;
  };

  // Summary lines
  drawTotalLine('Total Orders:', String(report.orderCount));
  drawTotalLine('Total Units:', String(report.totalUnits));
  drawTotalLine('Total Revenue:', formatMoney(report.totalRevenue));

  // Thin horizontal rule
  doc
    .moveTo(labelX, currentY)
    .lineTo(PAGE_MARGIN + pageWidth, currentY)
    .strokeColor(BRAND_COLOR)
    .lineWidth(0.5)
    .stroke();
  currentY += 6;

  // Bold total royalty in brand color
  drawTotalLine('Total Royalty:', formatMoney(report.totalRoyalty), true);

  // Discount note if applicable
  if (report.discountedLineItems > 0) {
    doc
      .font('Helvetica')
      .fontSize(FONT_SIZE_TINY)
      .fillColor(DISCOUNT_TEXT_COLOR)
      .text(
        `${report.discountedLineItems} line item${report.discountedLineItems > 1 ? 's' : ''} had royalty waived (discount applied)`,
        labelX,
        currentY,
        { width: pageWidth * 0.45 },
      );
    currentY += 14;
  }

  doc.y = currentY + 10;
}

/**
 * Draw footer at bottom of last page -- thin rule, generated-by line.
 */
function drawFooter(
  doc: InstanceType<typeof PDFDocument>,
  report: RoyaltyReport,
): void {
  const pageWidth = doc.page.width - PAGE_MARGIN * 2;
  const footerY = doc.page.height - PAGE_MARGIN - 40;

  // Thin horizontal rule
  doc
    .moveTo(PAGE_MARGIN, footerY)
    .lineTo(PAGE_MARGIN + pageWidth, footerY)
    .strokeColor(BRAND_LIGHT)
    .lineWidth(0.5)
    .stroke();

  // Generated-by line
  doc
    .font('Helvetica')
    .fontSize(FONT_SIZE_SMALL)
    .fillColor(BRAND_SECONDARY)
    .text(
      `This statement was generated on ${formatLongDate(report.generatedAt)} by HotBox Clothing`,
      PAGE_MARGIN,
      footerY + 10,
      { width: pageWidth, align: 'center' },
    );

  // Questions line
  doc
    .font('Helvetica')
    .fontSize(FONT_SIZE_SMALL)
    .fillColor(BRAND_SECONDARY)
    .text(
      'Questions? Contact HotBox Clothing',
      PAGE_MARGIN,
      footerY + 22,
      { width: pageWidth, align: 'center' },
    );
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Generate a branded royalty statement PDF from a RoyaltyReport.
 * Returns a Buffer containing the complete PDF document.
 */
export async function generateRoyaltyStatement(
  report: RoyaltyReport,
  customer: CustomerAccount,
): Promise<Buffer> {
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

    // Resolve customer logo
    const logoPath = resolveCustomerLogoPath(customer);

    // Compose layout sections in order
    drawHeader(doc, report, customer, logoPath);
    drawCustomerInfo(doc, report, customer);
    drawLineItemsTable(doc, report);
    drawTotals(doc, report);
    drawFooter(doc, report);

    // Finalize the document
    doc.end();
  });
}

/**
 * Generate a royalty statement PDF and save it to disk.
 *
 * @param report - The royalty report data
 * @param customer - The customer account
 * @param outputPath - Optional output path; defaults to data/royalty-statements/ROYALTY-{name}-{start}-to-{end}.pdf
 * @returns The absolute path to the saved PDF
 */
export async function saveRoyaltyStatement(
  report: RoyaltyReport,
  customer: CustomerAccount,
  outputPath?: string,
): Promise<string> {
  // Ensure statements directory exists
  fs.mkdirSync(STATEMENTS_DIR, { recursive: true });

  const safeName = slugify(customer.name);
  const startDate = report.periodStart.split('T')[0];
  const endDate = report.periodEnd.split('T')[0];
  const defaultFilename = `ROYALTY-${safeName}-${startDate}-to-${endDate}.pdf`;

  const filePath = outputPath ?? path.join(STATEMENTS_DIR, defaultFilename);
  const absolutePath = path.resolve(filePath);

  // Ensure the target directory exists
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });

  const buffer = await generateRoyaltyStatement(report, customer);
  fs.writeFileSync(absolutePath, buffer);

  return absolutePath;
}
