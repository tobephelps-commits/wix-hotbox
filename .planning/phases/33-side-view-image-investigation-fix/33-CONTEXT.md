# Phase 33: Side-View Image Investigation & Fix - Context

**Gathered:** 2026-02-03
**Status:** Ready for research

<vision>
## How This Should Work

The system should reliably detect when a true side-view image is not available from vendor APIs and gracefully skip sleeve logo placement rather than applying it to the wrong angle.

The core discovery: neither SanMar nor S&S provides actual side-profile images suitable for sleeve logo placement:
- **SanMar**: What they call "side view" is actually a model shot from the front angle
- **S&S**: Either no side view exists, or returns unreliable/missing data

Since the source data doesn't have what's needed for proper sleeve placement, the system should detect this and skip gracefully.

</vision>

<essential>
## What Must Be Nailed

- **Never wrong placement** — Better to have no sleeve logo than one applied to the wrong angle image. This is the non-negotiable.

</essential>

<specifics>
## Specific Ideas

- Need true side profile (garment visible from the side showing the sleeve) for sleeve logo placement
- Investigate what angle data actually comes back from each vendor API
- Determine reliable detection criteria for "not a true side view"

</specifics>

<notes>
## Additional Context

This phase is investigative — need to understand the vendor API angle data before implementing the detection/skip logic. The research phase should examine actual API responses and current angle selection implementation.

</notes>

---

*Phase: 33-side-view-image-investigation-fix*
*Context gathered: 2026-02-03*
