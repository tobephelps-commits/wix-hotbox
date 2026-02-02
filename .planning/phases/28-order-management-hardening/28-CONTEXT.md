# Phase 28: Order Management Hardening - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<vision>
## How This Should Work

Order management should feel bulletproof. Right now the bones are there from Phases 18-19, but this phase is about making it rock-solid — no orders falling through cracks, the system handling its own hiccups, and a dashboard that gives immediate confidence that everything is on track.

Two levels of visibility: a dashboard overview showing all orders grouped by status so you can scan what needs attention at a glance, and a per-order timeline showing the full journey — placed, PO sent to vendor, shipped, delivered — with timestamps at each step.

When something goes wrong (failed PO submission, vendor API timeout, sync issue), the system should try to recover on its own first. Auto-retry transient failures. Only surface alerts when something genuinely needs human intervention. No digging through logs to figure out what happened.

The fulfillment workflow itself should be smoother and more predictable — a clear path from order received to order fulfilled with no ambiguity about what step comes next.

</vision>

<essential>
## What Must Be Nailed

- **No orders lost** — Every order tracked end-to-end with no gaps. Nothing falls through the cracks between WIX order, vendor PO, and fulfillment.
- **Self-healing pipeline** — Auto-retry for transient failures. System handles its own problems and only escalates real issues that need human attention.
- **At-a-glance confidence** — Dashboard view where you can immediately see everything is on track, or spot exactly what isn't. Status timeline per order plus overview grouping by status.

</essential>

<specifics>
## Specific Ideas

- Status timeline per order showing journey with timestamps (placed -> PO sent -> shipped -> delivered)
- Dashboard overview grouping orders by status for quick scanning
- Auto-retry mechanism for failed POs and vendor API issues
- Alerts only for issues that genuinely need human intervention
- Clear fulfillment workflow progression with no ambiguous states

</specifics>

<notes>
## Additional Context

This phase hardens the order management system built in Phases 18 (Invoice & Label Printing) and 19 (SanMar Cart Automation). The focus is reliability and visibility — making what exists work predictably rather than adding new capabilities. Both SanMar and S&S Activewear vendor PO flows need to be covered.

</notes>

---

*Phase: 28-order-management-hardening*
*Context gathered: 2026-02-02*
