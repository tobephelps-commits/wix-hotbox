# Phase 18: Order Management — Invoice & Label Printing - Context

**Gathered:** 2026-02-01
**Status:** Ready for research

<vision>
## How This Should Work

A full order dashboard that serves as the command center for the entire business. When an order comes in — whether from WIX or entered manually (phone, email, in-person) — it appears in the dashboard and flows through a complete lifecycle:

**New → Ordered from vendor → Received → In Production → Packed → Shipped → Delivered**

Each order is always visible with its current status. From the dashboard, you can take action at any stage: print an invoice, update status as the order moves through production, generate a shipping label when it's time to ship.

Invoices print on a regular printer — this is the high-volume print job since every order gets one. Shipping labels go to a thermal label printer for the occasional shipment. Both should be one-click from the dashboard.

The dashboard is the single place to manage all orders regardless of source. WIX orders pull in automatically; manual orders get entered directly. Both follow the same lifecycle and get the same professional treatment.

</vision>

<essential>
## What Must Be Nailed

- **Order dashboard as command center** — One screen to see all orders, their status, and take action. This is where the business runs from.
- **Full lifecycle tracking** — Never lose track of where an order is. From the moment it comes in to delivery, every step is visible.
- **Professional branded invoices** — Clean, professional invoices with HotBox branding (logo, brand colors). Should look like a real business, not a DIY printout.

</essential>

<specifics>
## Specific Ideas

- Full lifecycle statuses: New → Ordered from vendor → Received → In Production → Packed → Shipped → Delivered
- Two order sources: WIX (automatic) and manual entry (phone/email/in-person)
- Thermal label printer for shipping labels (infrequent)
- Regular printer for invoices (every order)
- Invoice should carry HotBox branding — logo, colors, professional layout

</specifics>

<notes>
## Additional Context

Shipping is not the primary fulfillment method — most orders seem to be local/pickup, so label printing is lower volume than invoice printing. The lifecycle tracking through production stages (ordered from vendor, received, in production) suggests a made-to-order workflow where blanks are ordered from SanMar/S&S and then customized before delivery.

This phase connects directly to the vendor pipeline built in Phases 5-17 — orders trigger vendor purchases, and the status tracking bridges the gap between customer order and vendor fulfillment.

</notes>

---

*Phase: 18-order-management-invoice-label-printing*
*Context gathered: 2026-02-01*
