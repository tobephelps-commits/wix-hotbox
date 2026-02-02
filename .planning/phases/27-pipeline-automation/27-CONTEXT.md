# Phase 27: Pipeline Automation - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<vision>
## How This Should Work

The product creation pipeline should feel effortless. Right now, every product requires re-specifying the same choices — collections, markup, logos, settings. The system should remember what you picked last time and pre-fill those as defaults, so creating a new product is just entering a style number and tweaking what's different.

Beyond smarter defaults, the pipeline should support batch processing. Enter multiple style numbers at once and watch them all flow through the pipeline in a live progress queue. You can see each product being fetched, processed, and created in real-time — like watching items move through an assembly line. No need to babysit, but you can watch if you want.

The overall goal is: fewer clicks per product, less mental overhead from remembering settings, and the ability to queue up multiple products at once instead of one-at-a-time.

</vision>

<essential>
## What Must Be Nailed

- **Recent-choice memory** — The form remembers your last selections (collection, markup, logos, customer, etc.) and pre-fills them next time. You just change what's different.
- **Batch product creation** — Enter multiple style numbers and have them all processed through the pipeline, not one at a time.
- **Live progress queue** — Real-time visibility into batch processing. See each product's status as it moves through fetch, process, create stages.

</essential>

<specifics>
## Specific Ideas

- Form fields should pre-fill with whatever was selected during the last product creation session
- Batch mode: enter a list of style numbers (comma-separated, pasted list, etc.) and kick off processing
- Progress queue should show real-time status per product — which stage it's at, success/failure indicators
- The queue should feel like watching a pipeline in action, not a loading spinner

</specifics>

<notes>
## Additional Context

The pipeline already handles SanMar and S&S Activewear vendors, template presets, logo overlays, multi-angle images, and customer-aware pricing. This phase is about reducing the friction around all of those existing capabilities — not adding new product features, but making the existing flow faster and more hands-off.

</notes>

---

*Phase: 27-pipeline-automation*
*Context gathered: 2026-02-02*
