# Phase 6: Product Creation Pipeline - Context

**Gathered:** 2026-01-30
**Status:** Ready for research

<vision>
## How This Should Work

A step-by-step flow with a visual preview before anything gets created. You enter a SanMar style number, the system pulls all the product data (info, pricing, inventory, images), and presents it on a local web preview page.

The preview shows each available color as a product card — with the color swatch, product image, name, and a checkbox. Sizes are selectable too. You browse the cards, check the colors and sizes you want to offer, and hit create. It builds the WIX product draft with the right prices, correct variants, and proper images — ready for a quick review before publishing.

The key feeling is control without tedium. You're curating from SanMar's full catalog (sometimes 40+ colors), not manually entering data. See everything, pick what you want, get a clean draft.

</vision>

<essential>
## What Must Be Nailed

- **Accurate product data** — The draft must have correct prices, proper variant structure, and good descriptions. Minimal manual cleanup after creation.
- **Image handling** — Mockup images come through correctly and look right on the WIX product page. No broken images or missing media.
- **Color/size curation** — The preview makes it easy to pick exactly which colors and sizes to offer. Visual, scannable, quick to select from a large catalog.

All three are equally critical — the pipeline is only useful if the output is accurate, the images work, and the selection process is easy.

</essential>

<specifics>
## Specific Ideas

- Local web preview page (not terminal output) for the selection step
- Product card layout for each color — swatch/image, color name, checkbox
- Size grid selection alongside color cards
- Price information visible during selection
- Single action to create the WIX draft after curation

</specifics>

<notes>
## Additional Context

This is a curated store — the owner deliberately selects which colors and sizes to offer from SanMar's full catalog. The preview step isn't optional overhead, it's the core of the workflow. The owner needs to see what's available visually before making curation decisions.

Phase 5's SanMar API client is complete and can query product data, pricing, inventory, and media. Phase 7 will handle variable pricing rules and more advanced variant curation, so Phase 6 should focus on getting the basic pipeline working end-to-end with straightforward pricing.

</notes>

---

*Phase: 06-product-creation-pipeline*
*Context gathered: 2026-01-30*
