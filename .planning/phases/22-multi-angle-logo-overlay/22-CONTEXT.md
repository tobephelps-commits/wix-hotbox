# Phase 22: Multi-Angle Logo Overlay - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<vision>
## How This Should Work

When creating a product, each angle (front, back, side) is treated as its own canvas for logo placement. The user picks which angles get a logo and which stay clean — not every view needs branding. Each angle that gets a logo has fully independent positioning and sizing, so back placement is completely separate from front placement.

The workflow is per-product: when you're building out a product, you decide right there which angles get logos. Toggle them on or off easily, set placement per angle, and preview the result on each view before committing.

</vision>

<essential>
## What Must Be Nailed

- **Angle-specific placement** — Each angle gets its own independent logo position and size. No assumptions, no defaults inherited from other angles. Full freedom to position the logo differently on front vs back vs side.
- **Quick toggle on/off** — Dead simple to enable or disable the logo per angle during product creation. Should feel effortless, not like configuring a form.
- **Preview before commit** — See what the logo looks like on each angle before finalizing. No blind compositing.

</essential>

<specifics>
## Specific Ideas

- Per-product control over which angles get logos (not global defaults)
- Each angle is its own independent canvas — no mirroring or copying from front
- No default assumptions about where logos go on back or side views
- Flexible free positioning on every angle

</specifics>

<notes>
## Additional Context

This extends the existing logo overlay engine from Phase 14 and builds on the multi-angle image support from Phase 21. The user wants maximum flexibility per angle rather than convenience defaults — they'll figure out placement when they see it working.

</notes>

---

*Phase: 22-multi-angle-logo-overlay*
*Context gathered: 2026-02-02*
