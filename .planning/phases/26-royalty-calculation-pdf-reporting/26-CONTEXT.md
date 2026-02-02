# Phase 26: Royalty Calculation & PDF Reporting - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<vision>
## How This Should Work

On-demand royalty reporting — pick a customer, pick a date range, and generate a royalty report right from the dashboard. No fixed monthly cycle; pull it whenever you need it.

The report shows a full ledger view: every order line item with royalty amounts calculated, all detail upfront. No hiding behind summaries — transparent and complete, like an accounting ledger.

The PDF statements should be clean and minimal — customer's logo at the top, structured line items in a table, clear totals at the bottom. Professional but not cluttered. Something you'd confidently hand to a customer.

</vision>

<essential>
## What Must Be Nailed

- **Accurate royalty calculations** — correct percentages applied to the right prices, no rounding surprises, numbers you can trust
- **Professional PDF output** — polished, branded statements that look like they came from a real business, not a spreadsheet export
- **Discount code awareness** — orders placed with discount codes that strip the markup (e.g., Board30 staff purchases at cost) must zero out the royalty for those line items. No royalty awarded when no markup was charged.

</essential>

<specifics>
## Specific Ideas

- Customer logo displayed at top of PDF statement
- Full line-item detail for every order in the date range
- Clean, well-spaced layout — like a minimal invoice
- Discount code orders clearly shown as $0 royalty (transparent, not hidden)
- On-demand date range picker in the dashboard UI

</specifics>

<notes>
## Additional Context

Board30 is an example customer with a staff discount code that removes markup entirely. This pattern likely applies to other customers too — any discount code that eliminates the markup means no royalty is owed. The royalty calculation engine needs to check whether the actual sale price reflects the markup before awarding royalty.

Royalty is calculated on retail price (decision from Phase 25). PDFKit is already in the codebase from Phase 18 invoice generation.

</notes>

---

*Phase: 26-royalty-calculation-pdf-reporting*
*Context gathered: 2026-02-02*
