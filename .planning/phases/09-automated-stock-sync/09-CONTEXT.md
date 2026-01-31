# Phase 9: Automated Stock Sync - Context

**Gathered:** 2026-01-31
**Status:** Ready for research

<vision>
## How This Should Work

When the inventory monitor detects stock changes at SanMar, the WIX store automatically updates to reflect reality. Out-of-stock variants get marked as "Sold Out" — the product and variant stay visible so customers can see the full catalog, but they can't purchase what's unavailable. When SanMar restocks, the variant automatically becomes purchasable again.

The store owner gets email summaries of what changed — what went out of stock, what came back, and what the system did about it. No need to watch a terminal or manually check inventory. The store just stays accurate on its own.

The core promise: no customer ever gets to checkout with something that can't be fulfilled from SanMar.

</vision>

<essential>
## What Must Be Nailed

- **Store accuracy** — Customers never see a purchasable variant that's actually out of stock at SanMar. This is the non-negotiable trust foundation.
- **Automatic recovery** — When SanMar restocks, variants come back to purchasable status without manual intervention.
- **Visible but unavailable** — Out-of-stock variants show as "Sold Out" rather than disappearing, so customers see the full product range.

</essential>

<specifics>
## Specific Ideas

- Auto-hide + notify approach: system handles stock changes automatically AND emails the owner about what happened
- Email digest format for notifications — summarize stock changes after each poll or on a schedule
- "Sold Out" marking on variants rather than hiding entire products or individual variants
- Two-way sync: mark unavailable when out, restore when restocked

</specifics>

<notes>
## Additional Context

Phase 8 already built the inventory monitoring foundation with polling, change detection, and alert thresholds. This phase connects those alerts to actual WIX product updates and adds email notifications.

The owner wants to stay informed but doesn't want to be the bottleneck — the system should act on its own and report what it did, not ask for permission each time.

</notes>

---

*Phase: 09-automated-stock-sync*
*Context gathered: 2026-01-31*
