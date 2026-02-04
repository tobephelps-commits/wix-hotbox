# Phase 38: Production Sheet Generator - Context

**Gathered:** 2026-02-04
**Status:** Ready for planning

<vision>
## How This Should Work

When fulfilling an order, you generate a production sheet PDF that contains everything needed to produce that order. One sheet per order — the person doing the printing/embroidery gets a single document with all the info they need.

The sheet shows each garment visually: product image, logo placement preview, and a clear size/color quantity breakdown. It's a visual reference document, not just a spec sheet with text.

Generation happens from the dashboard — either a button on an individual order's detail page, or bulk generation by selecting multiple orders at once.

</vision>

<essential>
## What Must Be Nailed

- **Logo placement accuracy** — The visual preview must show exactly where the logo goes so the print comes out correctly
- **Quantity clarity** — Zero confusion about how many of each size/color to produce
- **At-a-glance garment ID** — Instantly know which product this is (style, color, vendor)

All three are equally critical. A production sheet that's wrong on any of these causes real problems.

</essential>

<specifics>
## Specific Ideas

- Clean, minimal PDF layout — just the essentials, lots of white space, easy to scan
- One sheet per order (not per garment, not batched across orders)
- Both single-order and bulk generation supported
- Visual approach: product image + logo overlay + quantities table

</specifics>

<notes>
## Additional Context

No additional notes

</notes>

---

*Phase: 38-production-sheets*
*Context gathered: 2026-02-04*
