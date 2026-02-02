---
phase: 23-visual-logo-placement-ui
plan: 02
subsystem: ui
tags: [preview-ui, alignment-guides, snap-to-center, responsive, keyboard-nav, wysiwyg, html, css, javascript]

# Dependency graph
requires:
  - phase: 23-visual-logo-placement-ui
    plan: 01
    provides: LogoPlacementEngine, drag-and-drop placement, angle card integration, /api/logo-file endpoint
provides:
  - Alignment guide overlays with snap-to-center behavior
  - Visual drag feedback (lift effect, handle hover states, scale limit indicators)
  - Responsive layout with mobile stacking below 700px
  - Keyboard arrow-key nudging for precise placement
  - Coordinate copy button for CLI integration
  - Per-angle logo selection dropdown
  - Verified WYSIWYG accuracy (Sharp render matches visual placement)
affects: [24-logo-upload-management, 25-customer-account-system]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Snap-to-center with 8px threshold and requestAnimationFrame flash animation"
    - "Per-angle logo selection: independent logo dropdown per angle card"
    - "Side view classification via SanMar image filename parsing"

key-files:
  created: []
  modified:
    - scripts/pipeline/preview.html
    - scripts/sanmar/adapter.ts
    - scripts/pipeline/mapper.ts

key-decisions:
  - "requestAnimationFrame for snap guide flash instead of CSS transitions to avoid drag performance interference"
  - "Per-angle logo selection allows different logos on different product views"
  - "Side view image classification fixed via SanMar filename parsing in adapter and mapper"

patterns-established:
  - "Alignment guide overlay with snap-to-center and temporary label feedback"
  - "Per-angle independent logo selection pattern"

# Metrics
duration: ~25min
completed: 2026-02-02
---

# Phase 23 Plan 02: Alignment Guides & WYSIWYG Verification Summary

**Alignment guides with snap-to-center, per-angle logo selection, side view image fix, and human-verified WYSIWYG accuracy confirming Sharp render matches visual placement**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-02-02
- **Completed:** 2026-02-02
- **Tasks:** 2 (1 auto + 1 checkpoint)
- **Files modified:** 3

## Accomplishments
- Added center alignment crosshair guides with snap-to-center behavior (8px threshold, visual flash feedback)
- Visual drag feedback: lift effect on drag start, handle hover states, scale limit flash indicators
- Responsive layout stacks angle cards vertically below 700px with minimum 200px placement area
- Keyboard arrow-key nudging (1px normal, 5px with Shift) for precise placement after rough drag
- Coordinate copy button copies normalized x,y to clipboard for CLI integration
- Fixed side view image classification in SanMar adapter and pipeline mapper
- Added per-angle logo selection allowing different logos on different product views
- Human checkpoint approved: WYSIWYG placement confirmed pixel-accurate with Sharp render output

## Task Commits

Each task was committed atomically:

1. **Task 1: Alignment guides, visual feedback, and responsive polish** - `f28fa6c` + `19f03ac` (feat + fix)
   - 1a. **Fix: Side view image classification** - `ec9f294` (fix)
   - 1b. **Fix: Per-angle logo selection** - `17aefc2` (fix)
2. **Task 2: checkpoint:human-verify** - approved (no commit)

**Plan metadata:** (this commit)

## Files Created/Modified
- `scripts/pipeline/preview.html` - Alignment guide CSS/JS, snap-to-center logic, drag lift effect, handle hover states, scale limit indicators, responsive stacking, keyboard nudging, coordinate copy button, per-angle logo selection dropdown
- `scripts/sanmar/adapter.ts` - Fixed side view image classification from SanMar filename parsing
- `scripts/pipeline/mapper.ts` - Fixed side view image mapping to correct angle slot

## Decisions Made
- Used requestAnimationFrame for snap guide flash animation instead of CSS transitions to avoid interfering with drag performance
- Added per-angle logo selection as independent dropdowns per angle card (discovered during verification that all angles shared one logo selection)
- Fixed side view classification at the adapter/mapper level rather than patching the UI

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Side view image not classified correctly**
- **Found during:** Task 1 verification (logo image rendering in placement UI)
- **Issue:** SanMar side-view product images were not being classified as "side" angle, so the side angle card showed no image
- **Fix:** Updated SanMar adapter (adapter.ts) filename parsing and pipeline mapper (mapper.ts) to correctly identify and route side-view images
- **Files modified:** scripts/sanmar/adapter.ts, scripts/pipeline/mapper.ts
- **Verification:** Side angle card now displays product image correctly
- **Committed in:** ec9f294

**2. [Rule 3 - Blocking] All angle cards shared single logo selection**
- **Found during:** Task 1 verification (preparing for human checkpoint)
- **Issue:** Selecting a logo applied to all 3 angles — no way to use different logos per angle
- **Fix:** Added independent logo selection dropdown to each angle card, allowing different logos on front, back, and side views
- **Files modified:** scripts/pipeline/preview.html
- **Verification:** Each angle card independently selects and displays its own logo
- **Committed in:** 17aefc2

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes were necessary for the human verification checkpoint to pass. Side images needed to render, and per-angle logo selection was needed for full WYSIWYG functionality. No scope creep.

## Issues Encountered
- Logo image initially failed to render in placement UI (fix committed in 19f03ac before side view fix)
- Side view image classification required tracing through adapter and mapper layers to find root cause

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 23 fully complete: drag-and-drop WYSIWYG placement verified end-to-end
- Phase 24 already complete (logo upload/management) - was done while phase 23 was paused
- Phase 25 (Customer Account System) unblocked and ready for planning
- All logo placement coordinates feed directly to Sharp compositing engine with confirmed accuracy

---
*Phase: 23-visual-logo-placement-ui*
*Completed: 2026-02-02*
