---
phase: 21-multi-angle-image-support
plan: 01
subsystem: pipeline
tags: [wix-media, multi-angle, product-images, preview-ui]

# Dependency graph
requires:
  - phase: 06-product-creation-pipeline
    provides: buildMediaPayload, buildProductPreview, ColorPreview types
  - phase: 17-ss-activewear
    provides: UnifiedMedia with backImage/sideImage fields, vendor adapter bridge
provides:
  - Multi-angle image URLs in ColorPreview (backImageUrl, sideImageUrl)
  - Back and side images in WIX product media payload per color
  - Angle-tabbed image display in curation preview UI
affects: [22-multi-angle-logo-overlay, 23-visual-logo-placement-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Multi-angle image lookup pattern: CLASS_TYPE constants for front (1007), rear (1008), side (2001)"
    - "Angle-tabbed UI pattern: data attributes + inline JS tab switching on color cards"

key-files:
  created: []
  modified:
    - scripts/pipeline/types.ts
    - scripts/pipeline/mapper.ts
    - scripts/pipeline/preview.html

key-decisions:
  - "Reuse CLASS_TYPE_HIGH (2001) for side images -- same classTypeId used by both SanMar and S&S adapters for side/high-res images"
  - "Track addedUrls from start of buildMediaPayload to prevent duplicates across front, back, side, and general fill steps"

patterns-established:
  - "Multi-angle per-color image lookup: find image by classTypeId + color match in flat MediaContent array"

# Metrics
duration: 8min
completed: 2026-02-02
---

# Phase 21 Plan 01: Multi-Angle Image Support Summary

**Extended pipeline to pass back and side images through to WIX product media and added angle-tabbed preview UI for curation**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-02
- **Completed:** 2026-02-02
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- ColorPreview interface extended with backImageUrl and sideImageUrl for curation UI
- buildMediaPayload() now includes up to 3 images per color (front, back, side) all assigned to WIX Color choice
- Preview server color cards display Front/Back/Side angle tabs with image switching
- CLASS_TYPE_REAR (1008) constant defined for back-view image lookups

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend ColorPreview and update buildProductPreview** - `965e545` (feat)
2. **Task 2: Extend buildMediaPayload to include back and side images** - `9ffb294` (feat)
3. **Task 3: Update preview server to display multi-angle images** - `09ec747` (feat)

## Files Created/Modified
- `scripts/pipeline/types.ts` - Added backImageUrl and sideImageUrl to ColorPreview interface
- `scripts/pipeline/mapper.ts` - Added CLASS_TYPE_REAR constant, updated buildProductPreview() and buildMediaPayload() for multi-angle images
- `scripts/pipeline/preview.html` - Added angle tab CSS and JS for front/back/side image switching on color cards

## Decisions Made
- Reused CLASS_TYPE_HIGH (2001) for side images since both vendor adapters already map sideImage to classTypeId 2001
- Moved addedUrls Set initialization before the per-color loop to prevent duplicates across all media steps
- Used data attributes (data-front-url, data-back-url, data-side-url) for storing URLs per card, with inline JS tab handlers

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Multi-angle image data flows through pipeline to WIX products
- Preview UI displays all available angles per color
- Ready for Phase 22 (Multi-Angle Logo Overlay) to composite logos on all 3 angles

---
*Phase: 21-multi-angle-image-support*
*Completed: 2026-02-02*
