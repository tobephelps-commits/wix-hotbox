---
phase: 23-visual-logo-placement-ui
plan: 01
subsystem: ui
tags: [preview-ui, drag-and-drop, logo-placement, pointer-events, wysiwyg, html, css, javascript]

# Dependency graph
requires:
  - phase: 22-multi-angle-logo-overlay
    provides: angleDom registry, angleOverlayState, per-angle overlay cards, /api/overlay endpoint
  - phase: 14-logo-overlay
    provides: /api/overlay compositing endpoint, logo registry, position presets
provides:
  - LogoPlacementEngine object with drag-and-drop logo positioning
  - Visual WYSIWYG placement replacing manual coordinate entry
  - Quick-position preset buttons for common placements
  - Bidirectional scale slider sync with drag handles
  - /api/logo-file/:name endpoint for serving logo images to browser
affects: [23-visual-logo-placement-ui, 24-logo-upload-management]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "LogoPlacementEngine IIFE pattern: self-contained drag engine with pointer events"
    - "Normalized coordinate system: all positions as 0-1 fractions of displayed image"
    - "ResizeObserver for tracking container dimension changes"
    - "Bidirectional sync pattern: slider <-> drag handles with _syncing guard"

key-files:
  created: []
  modified:
    - scripts/pipeline/preview.html
    - scripts/pipeline/preview-server.ts

key-decisions:
  - "Pointer Events API over Mouse Events for cross-device drag support (touch + mouse)"
  - "Normalized 0-1 coordinates relative to displayed image for pixel-accurate mapping"
  - "Quick-position pill buttons instead of dropdown for faster access to common positions"
  - "Render Final button name to distinguish from live drag preview"
  - "New /api/logo-file/:name endpoint to serve logo PNGs for browser-side placement preview"

patterns-established:
  - "LogoPlacementEngine: init/loadProductImage/loadLogo/setFromCoords/remove lifecycle"
  - "Visual placement container with coordinate overlay display"
  - "Corner handle resize with aspect ratio lock"

# Metrics
duration: 12min
completed: 2026-02-02
---

# Phase 23 Plan 01: Visual Logo Placement Engine Summary

**Drag-and-drop WYSIWYG logo positioning engine replacing manual coordinate entry, with Pointer Events drag/resize, corner handles, quick-position presets, and live coordinate display**

## Performance

- **Duration:** 12 min
- **Started:** 2026-02-02
- **Completed:** 2026-02-02
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Built self-contained LogoPlacementEngine with drag positioning and corner-handle resizing using Pointer Events API
- Replaced position dropdown and custom X/Y inputs with visual drag-and-drop placement container in all 3 angle cards
- Quick-position preset pill buttons provide one-click access to common placements (center-chest, left-chest, center-back, etc.)
- Bidirectional sync between scale slider and drag handles with circular-update guard
- Live coordinate display overlay shows x/y/scale in real-time during drag
- New /api/logo-file/:name server endpoint serves logo PNG files for browser-side placement preview
- All coordinates stored as normalized 0-1 fractions for pixel-accurate Sharp compositing match

## Task Commits

Each task was committed atomically:

1. **Task 1: Build drag-and-drop logo placement engine** - `6cef450` (feat)
2. **Task 2: Integrate placement engine into angle cards** - `249ffa8` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified
- `scripts/pipeline/preview.html` - Added LogoPlacementEngine IIFE, CSS for placement container/draggable/handles/coords, replaced angle card HTML with visual placement layout, updated angleDom registry, rewired all event handlers
- `scripts/pipeline/preview-server.ts` - Added /api/logo-file/:name route and handler to serve logo PNG files

## Decisions Made
- Used Pointer Events API (not Mouse Events) for unified touch + mouse drag support with setPointerCapture
- All coordinates normalized to 0-1 range relative to displayed image dimensions (not container) for accurate mapping to Sharp compositing
- Replaced position preset dropdown with quick-position pill buttons for faster workflow
- Renamed "Preview" button to "Render Final" to distinguish from the live visual placement preview
- Added /api/logo-file/:name server endpoint rather than embedding logo data URLs for cleaner separation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added /api/logo-file/:name endpoint to preview server**
- **Found during:** Task 2 (Integration into angle cards)
- **Issue:** Logo images need to be served to the browser for the placement preview. No existing endpoint served raw logo files.
- **Fix:** Added route matching and handler in preview-server.ts that reads the logo file path from the registry and serves it with correct Content-Type
- **Files modified:** scripts/pipeline/preview-server.ts
- **Verification:** Route matches /api/logo-file/:name, serves PNG with image/png content type
- **Committed in:** 249ffa8 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential for the placement engine to display logos in the browser. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 01 complete: drag-and-drop engine + angle card integration
- Ready for Plan 02 (23-02) to extend placement capabilities
- LogoPlacementEngine ready for any additional visual features (snap guides, alignment helpers)
- angleOverlayState coordinates are updated live and feed buildLogoAnglesConfig() unchanged

---
*Phase: 23-visual-logo-placement-ui*
*Completed: 2026-02-02*
