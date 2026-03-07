/**
 * PDF Template Constants & Shared Layout Helpers (v2.0)
 *
 * Brand constants and reusable layout functions for generating branded
 * HotBox Clothing PDF documents (invoices, production sheets).
 *
 * Ported from v1.x scripts/orders/invoice-template.ts with v2.0 type
 * adaptations (OrderWithDetails uses flat customer fields and `items`).
 *
 * Phase 50: Order Management Advanced
 */

import path from 'node:path';
import type PDFDocument from 'pdfkit';
import type { OrderWithDetails } from './types.js';

// =============================================================================
// Brand Constants
// =============================================================================

export const BRAND_NAME = 'HotBox Clothing';
export const BRAND_COLOR = '#E31837';
export const BRAND_SECONDARY = '#333333';
export const BRAND_LIGHT = '#F5F5F5';

export const PAGE_MARGIN = 50;
export const FONT_SIZE_TITLE = 24;
export const FONT_SIZE_HEADING = 14;
export const FONT_SIZE_BODY = 10;
export const FONT_SIZE_SMALL = 8;

// =============================================================================
// Logo Path Resolution
// =============================================================================

/** Module-level data directory; set via setDataDir() at route registration. */
let dataDir = './data';

/**
 * Set the data directory for logo path resolution.
 * Called once during route registration with fastify.config.dataDir.
 */
export function setDataDir(dir: string): void {
  dataDir = dir;
}

/**
 * Resolve the logo path relative to dataDir.
 * Falls back to media/logos/BB.png relative to project root if
 * the dataDir-based path doesn't exist.
 */
export function getLogoPath(): string {
  return path.resolve(dataDir, '..', 'media', 'logos', 'BB.png');
}

// =============================================================================
// Layout Helper: Header
// =============================================================================

/**
 * Draw the document header — logo top-left, title top-right,
 * order number and date below title, horizontal rule below.
 */
export function drawHeader(
  doc: InstanceType<typeof PDFDocument>,
  order: OrderWithDetails,
  title: string,
  numberPrefix: string,
): void {
  const pageWidth = doc.page.width - PAGE_MARGIN * 2;
  const startY = PAGE_MARGIN;

  // Logo top-left (120px wide, maintain aspect ratio)
  try {
    doc.image(getLogoPath(), PAGE_MARGIN, startY, { width: 120 });
  } catch {
    // Logo file not available — skip silently
  }

  // Title top-right (e.g., "INVOICE" or "PRODUCTION SHEET")
  doc
    .font('Helvetica-Bold')
    .fontSize(FONT_SIZE_TITLE)
    .fillColor(BRAND_COLOR)
    .text(title, PAGE_MARGIN, startY, {
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
    .text(`${numberPrefix}${order.orderNumber}`, PAGE_MARGIN, startY + 30, {
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
// Layout Helper: Footer
// =============================================================================

/**
 * Draw footer at bottom of page — thank you message and company name.
 */
export function drawFooter(
  doc: InstanceType<typeof PDFDocument>,
  includeThankYou = true,
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

  if (includeThankYou) {
    // Thank you message
    doc
      .font('Helvetica')
      .fontSize(FONT_SIZE_SMALL)
      .fillColor(BRAND_SECONDARY)
      .text('Thank you for your business!', PAGE_MARGIN, footerY + 10, {
        width: pageWidth,
        align: 'center',
      });
  }

  // Company name
  doc
    .font('Helvetica-Bold')
    .fontSize(FONT_SIZE_SMALL)
    .fillColor(BRAND_COLOR)
    .text(BRAND_NAME, PAGE_MARGIN, footerY + (includeThankYou ? 22 : 10), {
      width: pageWidth,
      align: 'center',
    });
}
