# Phase 31: Stock Visibility - Context

**Gathered:** 2026-02-03
**Status:** Ready for planning

<vision>
## How This Should Work

When a customer lands on a product page, they can immediately see which color and size combinations are available. Unavailable options appear greyed out with a strikethrough line — the classic e-commerce pattern that's universally understood.

The swatches themselves communicate availability. No need to click through options hoping something's in stock. Customers can scan visually and know instantly what's available to purchase.

When hovering or clicking a greyed-out option, a tooltip appears showing "Out of Stock" — giving context without cluttering the default view.

</vision>

<essential>
## What Must Be Nailed

- **Visual clarity at a glance** — Instantly scan which options are in stock without trial and error
- **Prevent wasted clicks** — Customer never gets to checkout only to find out something's unavailable
- **Accurate real-time data** — The availability shown must reflect actual inventory, not stale data

All three work together. Visual feedback is useless if the data is wrong. Accurate data is useless if customers can't see it clearly.

</essential>

<specifics>
## Specific Ideas

- Greyed appearance + diagonal strikethrough line on unavailable swatches
- "Out of Stock" tooltip on hover/click for greyed options
- Should work for both color swatches and size selectors

</specifics>

<notes>
## Additional Context

This phase builds on the existing inventory sync infrastructure (phases 8-9, 16, 29). The data pipeline is solid — this is about surfacing that data in the storefront UI so customers benefit from it.

</notes>

---

*Phase: 31-stock-visibility*
*Context gathered: 2026-02-03*
