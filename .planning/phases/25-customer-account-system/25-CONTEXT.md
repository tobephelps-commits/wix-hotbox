# Phase 25: Customer Account System - Context

**Gathered:** 2026-02-02
**Status:** Ready for research

<vision>
## How This Should Work

Each customer is a brand/company — like a B2B wholesale relationship. When I set up a new customer, I create their account with their brand logos, assign a single markup percentage that applies to all their products, and set their royalty rate. That's it — logo, markup, royalty.

When I create products for a customer, their logos get pulled from their account and the pricing math flows from their markup percentage on top of my cost. The system knows "Customer A gets 40% markup" and handles the rest.

Managing accounts should feel like the logo management UI — visual cards showing each customer with their logo, name, and key numbers at a glance. Not enterprise software, not a spreadsheet — a clean dashboard where I can see all my brand customers and drill into any one quickly.

</vision>

<essential>
## What Must Be Nailed

- **Accurate pricing math** — Markup and royalty calculations must be dead accurate. This is money — no rounding surprises, no calculation bugs.
- **Easy account management** — Setting up and managing customers should be fast and painless. Card-based UI consistent with existing dashboard patterns.
- **Logo-to-customer linking** — Each customer's logos are tied to their account so products get the right branding automatically. This is the bridge between the logo system (phases 21-24) and the business/pricing layer.

</essential>

<specifics>
## Specific Ideas

- Dashboard cards for each customer — show their logo, name, markup %, and quick stats
- Consistent with the logo management UI style already built in phase 24
- Single markup percentage per customer (not per-category or tiered)
- Each account has: brand logos, markup %, royalty rate
- Keep it focused — no contact info, shipping preferences, or payment terms in this phase

</specifics>

<notes>
## Additional Context

This phase introduces a new data domain — customer accounts — that bridges the visual branding work (phases 21-24) with the financial reporting coming next (phase 26: royalty calculation & PDF reporting). The account model needs to be solid because royalty calculations depend on it.

The roadmap flags this phase as likely needing research for the customer account data model design and multi-tier markup calculation patterns.

</notes>

---

*Phase: 25-customer-account-system*
*Context gathered: 2026-02-02*
