---
phase: 18-order-management-invoice-label-printing
plan: 04
subsystem: orders
tags: [pdfkit, shipping-labels, print-service, thermal-printer, cross-platform]

# Dependency graph
requires:
  - phase: 18-01
    provides: Order types and data model
  - phase: 18-02
    provides: Invoice PDF generator (generateInvoice, saveInvoice)
provides:
  - Shipping label PDF generator (4x6 thermal printer size)
  - Cross-platform print service (Windows/macOS/Linux)
  - Convenience functions for printing invoices and labels
affects: [18-05, 18-06]

# Tech tracking
tech-stack:
  added: []
  patterns: [platform-detected CLI commands via child_process, non-throwing result pattern for print operations]

key-files:
  created:
    - scripts/orders/label-generator.ts
    - scripts/orders/print-service.ts
  modified:
    - package.json

key-decisions:
  - "Platform-detected print via child_process (no npm deps) — PowerShell on Windows, lp on macOS/Linux"
  - "Separate INVOICE_PRINTER and LABEL_PRINTER env vars for different physical printers"
  - "Non-throwing printPdf returns PrintResult with success boolean for graceful UI handling"

patterns-established:
  - "PrintResult pattern: { success, message, printerUsed, filePath } for all print operations"
  - "Label size constant: 288x432pt (4x6 inches at 72 DPI) for thermal printers"

# Metrics
duration: 8min
completed: 2026-02-01
---

# Phase 18 Plan 04: Shipping Label PDF & Print Service Summary

**4x6 thermal-printer-sized shipping label generator with cross-platform print service supporting separate invoice and label printers**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-01T17:50:00Z
- **Completed:** 2026-02-01T17:58:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Shipping label PDF generator producing 4x6 inch thermal-printer labels with return address, ship-to address, and order reference
- Cross-platform print service detecting Windows/macOS/Linux and using platform-specific print commands
- Printer listing via `npm run print:list` enumerates all system printers
- Separate env var configuration for invoice printer (INVOICE_PRINTER) vs label printer (LABEL_PRINTER)
- Convenience functions `printInvoice()` and `printShippingLabel()` generate PDF and send to printer in one call

## Task Commits

Each task was committed atomically:

1. **Task 1: Build shipping label PDF generator** - `fc3f8ce` (feat)
2. **Task 2: Build cross-platform print service** - `13912aa` (feat)

## Files Created/Modified
- `scripts/orders/label-generator.ts` - 4x6 label PDF generator with generateShippingLabel, saveShippingLabel, and CLI demo
- `scripts/orders/print-service.ts` - Print service with printPdf, listPrinters, printInvoice, printShippingLabel, and CLI
- `package.json` - Added print:list npm script

## Decisions Made
- Platform-detected print via child_process with no additional npm dependencies (PowerShell Start-Process on Windows, lp on macOS/Linux)
- Separate INVOICE_PRINTER and LABEL_PRINTER env vars allow routing to different physical printers (regular paper vs thermal)
- Non-throwing PrintResult pattern returns { success, message, printerUsed, filePath } so print failures are informational, not exceptional

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Label generator and print service ready for integration into order dashboard (Plans 05-06)
- `printInvoice()` and `printShippingLabel()` provide the single-function-call interface the dashboard needs
- Env vars INVOICE_PRINTER and LABEL_PRINTER can be set when physical printers are configured

---
*Phase: 18-order-management-invoice-label-printing*
*Completed: 2026-02-01*
