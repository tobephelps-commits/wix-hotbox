# Plan 32-01 Summary

**Phase:** 32 - Variant Image Switching
**Plan:** 01 - Enable Variant Image Switching
**Status:** PAUSED AT CHECKPOINT
**Date:** 2026-02-03

---

## Tasks Completed

| Task | Description | Status | Commit |
|------|-------------|--------|--------|
| 1 | Verify API-level image-to-variant assignment | COMPLETE | ab015a3 |
| 2 | Create variant image switching documentation | COMPLETE | ab015a3 |
| 3 | Update OPERATIONS.md with variant image info | COMPLETE | 37fa849 |
| 4 | Human verification of image switching | BLOCKED | (checkpoint) |

---

## Task 1: API Verification

**Finding:** The API-level image assignment is ALREADY CORRECTLY IMPLEMENTED.

Verified in `scripts/pipeline/mapper.ts` - `buildMediaPayload()` function (lines 306-373):

1. **Choice assignment structure** (lines 318-321):
   ```typescript
   const choiceAssignment = {
     option: 'Color',
     choice: color.displayColor, // ALWAYS use displayColor for WIX
   };
   ```

2. **Images assigned to choices**:
   - Front image (classTypeId 1007) - assigned to Color choice
   - Back image (classTypeId 1008) - assigned to Color choice
   - Side image (classTypeId 2001) - assigned to Color choice

3. **Properly structured WixMediaItem[]** sent to WIX API with choice field populated.

**Conclusion:** No code changes needed. The pipeline correctly assigns images to color variants at the API level.

---

## Task 2: Documentation Created

Created comprehensive guide: `.planning/phases/32-variant-image-switching/VARIANT-IMAGE-SWITCHING.md`

Contents:
- Background on API-level image assignment (already implemented)
- Data flow explanation (pipeline -> WIX API -> storefront)
- WIX Editor configuration steps (one-time setup)
- Verification steps for desktop and mobile
- Troubleshooting guide for common issues
- Products to prioritize for testing
- Reference to CK-3 in WIX-EDITOR-FIXES.md

---

## Task 3: OPERATIONS.md Updated

Added "Variant Image Switching (Phase 32)" section after "Stock Visibility Behavior (Phase 31)".

Contents:
- Link to full documentation guide
- Summary of WIX Editor configuration steps
- Brief explanation of how pipeline, API, and Editor work together

---

## Task 4: Checkpoint

**Status:** AWAITING HUMAN VERIFICATION

**What's Built:**
- Verified API image-to-variant assignment is correct
- Created comprehensive documentation for enabling the feature
- Updated OPERATIONS.md with quick reference

**What's Needed:**
Human must enable the WIX Editor setting and verify images switch on the live storefront.

**Steps to Verify:**
1. Open WIX Editor: https://manage.wix.com/dashboard/c744cbdb-46f8-4c66-ac76-eb31bd0d52c1 > Edit Site
2. Navigate to a Product Page
3. Click on the Product Gallery widget > Settings
4. Enable "Link gallery images to product options" (or similar)
5. Save and Publish
6. Visit a product with multiple colors on live storefront
7. Select a different color variant
8. Verify gallery images update to show that color
9. Test on mobile as well

**Resume Signal:** Type "approved" if images switch correctly, or describe what's not working.

---

## Commits

| Hash | Message |
|------|---------|
| ab015a3 | docs(32): verify API image assignment and create variant switching guide |
| 37fa849 | docs(32): add variant image switching section to OPERATIONS.md |

---

## Files Modified

| File | Change |
|------|--------|
| `.planning/phases/32-variant-image-switching/VARIANT-IMAGE-SWITCHING.md` | Created (206 lines) |
| `scripts/OPERATIONS.md` | Added 17-line section |
| `.planning/STATE.md` | Updated position and decisions |

---

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Verification-only for API layer (no code changes) | buildMediaPayload() already correctly assigns images to color choices |
| Editor configuration is required (not API-automatable) | WIX Product Gallery widget setting cannot be changed via REST API |

---

## Next Steps

After human verification:
- If APPROVED: Plan 32-01 complete, phase 32 complete
- If NOT WORKING: Troubleshoot per guide, may need additional investigation
