# Phase 17: S&S Activewear API Integration - Context

**Gathered:** 2026-02-01
**Status:** Ready for research

<vision>
## How This Should Work

S&S Activewear is a completely separate sourcing pipeline — not a fallback for SanMar, but an independent vendor channel. Sometimes products come from SanMar, sometimes from S&S, depending on what's needed for a particular order or collection.

The key is that it uses the exact same CLI workflow. You'd specify S&S as the vendor source and everything else — product creation, pricing, collections, logo overlays, inventory — works identically. The vendor is just a parameter, not a different experience. Same commands, same preview server, same templates. SanMar or S&S shouldn't matter to how you operate day-to-day.

</vision>

<essential>
## What Must Be Nailed

- **Seamless experience** — Using S&S must feel identical to using SanMar. No separate workflow to learn, no different commands. Vendor is just a flag.
- **Vendor-aware pricing** — S&S has its own cost structure, so cost tracking and margin calculations need to know which vendor a product came from. Different costs, potentially different margins, but the same pricing pipeline.

</essential>

<specifics>
## Specific Ideas

- Same `create-product` CLI commands with a vendor flag (e.g., `--vendor ss` or `--vendor sanmar`)
- S&S products flow through the same pipeline steps: search, create, price, assign collections, overlay logos
- Cost tracking distinguishes vendor source so margin reports reflect actual costs per vendor
- Inventory monitoring works for S&S products the same way it does for SanMar

</specifics>

<notes>
## Additional Context

S&S Activewear is positioned as a peer to SanMar, not a secondary or fallback. The user sources from whichever vendor has the product they need. This means the existing SanMar-specific code paths need to be abstracted into a vendor-agnostic pipeline that both SanMar and S&S plug into.

The pricing difference is the main area where vendors aren't interchangeable — different wholesale costs mean different margins even for similar products.

</notes>

---

*Phase: 17-ss-activewear-api-integration*
*Context gathered: 2026-02-01*
