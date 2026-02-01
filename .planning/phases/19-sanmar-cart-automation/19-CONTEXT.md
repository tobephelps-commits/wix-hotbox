# Phase 19: SanMar Cart Automation - Context

**Gathered:** 2026-02-01
**Status:** Ready for research

<vision>
## How This Should Work

When orders come in through WIX (or are entered manually), they accumulate in the order dashboard. When the store owner is ready to fulfill, they hit a single "Fill SanMar Cart" button that automatically grabs all orders in pending/processing status.

The system runs headlessly in the background — navigating SanMar.com, logging in, and adding every item to the shopping cart. It consolidates across orders: if three different customers each ordered a Medium Black tee, that becomes qty 3 in the cart. Once the cart is fully loaded, a browser window opens at the checkout step so the owner can review everything, apply promo codes if needed, and complete the purchase themselves.

It's a batch fulfillment workflow. Orders accumulate, the owner triggers a run, automation does the tedious SKU-by-SKU cart filling, and the owner takes over for the final checkout.

</vision>

<essential>
## What Must Be Nailed

- **Cart accuracy** — Every item, size, color, and quantity must match the orders exactly. Wrong items in a SanMar order is a costly mistake with no easy fix.
- **Smart consolidation** — Multiple orders requesting the same SKU must merge into correct combined quantities. This is the core operational value of batching.
- **Seamless browser handoff** — The transition from headless automation to a visible browser at checkout must be smooth. No manual steps, no copy-pasting SKUs, no re-entering items.

</essential>

<specifics>
## Specific Ideas

- Auto-batch by order status: all orders in "New" or "Processing" get included automatically when triggering a cart fill
- Headless browser automation fills the cart invisibly, then opens a visible browser window at the checkout/review step
- Owner completes checkout manually — stays in control of the final purchase, payment, and any promo code application
- Consolidation logic across orders: same style/color/size from different orders combines into a single cart line with summed quantity

</specifics>

<notes>
## Additional Context

This is the bridge between the order dashboard (Phase 18) and actual fulfillment. The order dashboard tracks what needs to be ordered; this phase automates the act of placing that order with SanMar.

Research flagged as likely needed for Puppeteer/Playwright browser automation of SanMar.com, session management, and cart item mapping from internal order data to SanMar's web interface.

</notes>

---

*Phase: 19-sanmar-cart-automation*
*Context gathered: 2026-02-01*
