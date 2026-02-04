# Phase 36: Product Migration Tooling - Context

**Gathered:** 2026-02-04
**Status:** Ready for planning

<vision>
## How This Should Work

Browse existing WIX products in a point-and-click interface. Select the ones that need migration, then each selected product opens in the Pipeline Wizard (Phase 35) where you can configure pricing, logo placement, and review before creating.

The migration tool is essentially a "product picker" that feeds into the existing wizard — reusing the step-by-step creation flow rather than building parallel infrastructure.

</vision>

<essential>
## What Must Be Nailed

- **Easy product discovery** — Finding which products need migration must be fast and intuitive, not a manual catalog scroll

</essential>

<specifics>
## Specific Ideas

- **Show untracked products** — Filter view to products not yet in the inventory sync system
- **Search by style/SKU** — Type a style number to find matching WIX products
- **Group by vendor** — Organize products by SanMar vs S&S for vendor-specific migration

</specifics>

<notes>
## Additional Context

This is the final phase of v1.1. The migration flow leverages the Pipeline Wizard built in Phase 35 rather than creating a separate batch process. Each product goes through the full wizard for proper configuration before creation.

</notes>

---

*Phase: 36-product-migration-tooling*
*Context gathered: 2026-02-04*
