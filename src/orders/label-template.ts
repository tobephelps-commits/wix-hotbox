/**
 * Shipping Label PDF Generator (v2.0)
 *
 * Generates 4x6 inch shipping labels with FROM/TO addresses
 * and order reference. Follows the same PDFKit pattern as
 * invoice-generator.ts and production-sheet.ts.
 *
 * Phase 59: v1.x Feature Parity Audit (Plan 02)
 */

import PDFDocument from 'pdfkit';
import type { OrderWithDetails } from './types.js';
import { BRAND_NAME } from './pdf-template.js';

// =============================================================================
// Constants
// =============================================================================

/** Return address for FROM section */
const RETURN_ADDRESS = {
  name: BRAND_NAME,
  addressLine1: '123 Main Street',
  city: 'Los Angeles',
  state: 'CA',
  postalCode: '90001',
  country: 'US',
};

/** 4x6 inches at 72 DPI */
const LABEL_WIDTH = 288;
const LABEL_HEIGHT = 432;
const LABEL_MARGIN = 18;

// =============================================================================
// Public API
// =============================================================================

/**
 * Generate a 4x6 inch shipping label PDF from an OrderWithDetails.
 * Returns a Buffer containing the complete PDF document.
 *
 * @throws Error if order has no shippingAddress
 */
export async function generateLabel(order: OrderWithDetails): Promise<Buffer> {
  if (!order.shippingAddress) {
    throw new Error(
      `Order #${order.orderNumber} has no shipping address. Cannot generate label.`,
    );
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [LABEL_WIDTH, LABEL_HEIGHT],
      margins: {
        top: LABEL_MARGIN,
        bottom: LABEL_MARGIN,
        left: LABEL_MARGIN,
        right: LABEL_MARGIN,
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const contentWidth = LABEL_WIDTH - LABEL_MARGIN * 2;

    // =========================================================================
    // FROM section (top, 10pt font)
    // =========================================================================

    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor('#000000')
      .text('FROM:', LABEL_MARGIN, LABEL_MARGIN);

    doc
      .font('Helvetica')
      .fontSize(10)
      .text(RETURN_ADDRESS.name)
      .text(RETURN_ADDRESS.addressLine1)
      .text(
        `${RETURN_ADDRESS.city}, ${RETURN_ADDRESS.state} ${RETURN_ADDRESS.postalCode}`,
      )
      .text(RETURN_ADDRESS.country);

    // Thin separator line after FROM
    const separatorY = doc.y + 8;
    doc
      .moveTo(LABEL_MARGIN, separatorY)
      .lineTo(LABEL_MARGIN + contentWidth, separatorY)
      .strokeColor('#CCCCCC')
      .lineWidth(0.5)
      .stroke();

    // =========================================================================
    // TO section (center, 14pt bold)
    // =========================================================================

    // shippingAddress is guaranteed non-null (checked before Promise)
    const sa = order.shippingAddress!;
    const toStartY = separatorY + 20;

    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor('#000000')
      .text('TO:', LABEL_MARGIN, toStartY);

    doc.font('Helvetica-Bold').fontSize(14);

    if (sa.company) {
      doc.text(sa.company, LABEL_MARGIN, doc.y + 4, { width: contentWidth });
    }

    doc.text(`${sa.firstName} ${sa.lastName}`, LABEL_MARGIN, doc.y + 2, {
      width: contentWidth,
    });

    doc.font('Helvetica').fontSize(14);

    doc.text(sa.addressLine1, { width: contentWidth });

    if (sa.addressLine2) {
      doc.text(sa.addressLine2, { width: contentWidth });
    }

    doc.text(`${sa.city}, ${sa.state} ${sa.postalCode}`, {
      width: contentWidth,
    });

    doc.text(sa.country, { width: contentWidth });

    // =========================================================================
    // Order reference (bottom, 8pt)
    // =========================================================================

    const orderDate = new Date(order.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const refY = LABEL_HEIGHT - LABEL_MARGIN - 24;

    // Thin separator line above reference
    doc
      .moveTo(LABEL_MARGIN, refY - 6)
      .lineTo(LABEL_MARGIN + contentWidth, refY - 6)
      .strokeColor('#CCCCCC')
      .lineWidth(0.5)
      .stroke();

    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#666666')
      .text(`Order #${order.orderNumber}  |  ${orderDate}`, LABEL_MARGIN, refY, {
        width: contentWidth,
        align: 'center',
      });

    // Finalize the document
    doc.end();
  });
}
