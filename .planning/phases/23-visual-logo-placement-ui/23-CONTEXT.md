# Phase 23: Visual Logo Placement UI - Context

**Gathered:** 2026-02-02
**Status:** Ready for research

<vision>
## How This Should Work

A browser-based WYSIWYG editor where you see all 3 product angles (front, back, side) displayed simultaneously. You drag your logo onto any angle, position it exactly where you want it, resize it with familiar Canva-style handles, and what you see in the preview is exactly what comes out in the final composite.

The workflow is visual and direct — no typing coordinates, no guessing at percentages. You place the logo on the product image and the engine uses those exact coordinates for the real overlay.

</vision>

<essential>
## What Must Be Nailed

- **Pixel-accurate placement** — Where you position the logo in the preview is exactly where it ends up in the final composite. Zero discrepancy between what you see and what you get.
- **All 3 angles visible at once** — Front, back, and side views displayed side-by-side so you can see the full picture and maintain consistent placement across views.

</essential>

<specifics>
## Specific Ideas

- Canva-style editing experience: drag handles for resize, familiar interaction patterns people already know
- Snap guides or alignment helpers to keep logos positioned cleanly
- Direct manipulation — drag-and-drop the logo onto the product image, grab handles to resize
- Preview should accurately represent the final output at the correct scale and with proper transparency

</specifics>

<notes>
## Additional Context

This builds directly on Phase 22's per-angle overlay engine. The current workflow uses CLI coordinate arguments — this phase replaces that with a visual interface that feeds the same engine. The key shift is from "type numbers" to "drag and see."

User prioritizes accuracy over speed — better to take an extra second placing the logo than to have the final output differ from the preview.

</notes>

---

*Phase: 23-visual-logo-placement-ui*
*Context gathered: 2026-02-02*
