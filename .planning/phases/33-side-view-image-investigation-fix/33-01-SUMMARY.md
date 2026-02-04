# Plan 33-01 Summary: Side View Image Fix

**Phase:** 33-side-view-image-investigation-fix
**Plan:** 01
**Status:** COMPLETE
**Date:** 2026-02-03

## Objective

Fix incorrect side image assignment in mapper.ts that causes sleeve logo placement on wrong angle images.

## Tasks Completed

| # | Task | Status | Commit |
|---|------|--------|--------|
| 1 | Fix buildProductPreview() sideImage assignment | COMPLETE | a83e9ca |
| 2 | Fix buildMediaPayload() side image handling | COMPLETE | e3c40ab |
| 3 | Verify fix with test product fetch | COMPLETE | (verification) |

## Changes Made

### Task 1: buildProductPreview() sideImage fix

**File:** `scripts/pipeline/mapper.ts`

- Updated CLASS_TYPE_HIGH constant comment to reference adapter.ts and 33-RESEARCH.md
- Replaced incorrect image search logic (looking for CLASS_TYPE_HIGH as side image) with explicit `const sideImage = null`
- Updated both return paths in buildProductPreview() to set `sideImageUrl: null` directly

**Before:**
```typescript
const sideImage = images.find(
  (img) =>
    img.classType.classTypeId === CLASS_TYPE_HIGH &&
    img.color.toLowerCase() === colorPair.catalogColor.toLowerCase(),
);
```

**After:**
```typescript
// SanMar does NOT provide true side-view images. CLASS_TYPE_HIGH (2001) is a
// high-resolution front/lifestyle shot, not a side profile suitable for sleeve
// logo placement. Set sideImage to null explicitly to prevent incorrect overlay.
const sideImage = null;
```

### Task 2: buildMediaPayload() side image handling

**File:** `scripts/pipeline/mapper.ts`

- Updated function JSDoc to remove "Side image (classTypeId 2001)" from priority list
- Added note explaining SanMar doesn't provide true side-view images
- Removed the side image block that assigned CLASS_TYPE_HIGH images to Color choices
- HIGH images are now only added as general product images in Step 2 (without choice assignment)

**Before (removed):**
```typescript
// Side image (classTypeId 2001)
const sideImage = colorImages.find(
  (img) => img.classType.classTypeId === CLASS_TYPE_HIGH,
);
if (sideImage && !addedUrls.has(sideImage.url) && mediaItems.length < WIX_MEDIA_LIMIT) {
  mediaItems.push({ url: sideImage.url, choice: choiceAssignment });
  addedUrls.add(sideImage.url);
}
```

**After:**
```typescript
// Note: SanMar does NOT provide true side-view images. CLASS_TYPE_HIGH (2001)
// images are added as general product images in Step 2 below (without choice
// assignment) rather than as color-specific "side" images here.
// See: 33-RESEARCH.md for investigation details.
```

### Task 3: Verification

Verified the fix works correctly:

1. **fetch-product test:** All 62 colors for PC61 have `sideImageUrl === null`
2. **create-product test:** Completes without errors in preview mode
3. **overlay.ts check:** Already handles null sideImage gracefully at line 559

## Verification Results

```
Testing sideImageUrl for PC61...
Results:
  Total colors: 62
  sideImageUrl === null: 62
  sideImageUrl !== null: 0

SUCCESS: All sideImageUrl values are null
```

The create-product pipeline completed successfully with 558 variants and 15 media items.

## Technical Notes

- The SanMar adapter (`scripts/sanmar/adapter.ts` lines 146-152) was already correct - it does NOT map CLASS_TYPE_HIGH (2001) to sideImage
- The bug was in mapper.ts which bypasses the adapter and directly queries SanMar data
- Now both code paths are consistent: sideImage is null for SanMar products
- The overlay system (`scripts/pipeline/overlay.ts` line 559) already skips angles where imageUrl is falsy

## Commits

- `a83e9ca`: fix(mapper): set sideImage to null for SanMar products
- `e3c40ab`: fix(mapper): remove side image choice assignment from buildMediaPayload
