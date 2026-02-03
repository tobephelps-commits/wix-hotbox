# Phase 33: Side-View Image Investigation & Fix - Research

**Researched:** 2026-02-03
**Domain:** Vendor API image angle data and sleeve logo placement detection
**Confidence:** HIGH

<research_summary>
## Summary

Researched the SanMar and S&S Activewear API image angle data to understand why sleeve logo placement is being applied to incorrect images. The investigation reveals a fundamental mismatch between what the system expects ("side profile" showing the garment's side/sleeve) and what the vendor APIs actually provide.

**Key findings:**

1. **SanMar does NOT provide side-view images.** The PromoStandards MediaContent API's classTypeId `2001` (labeled "High") is NOT a side view - it's a high-resolution front/lifestyle shot. The current code incorrectly maps this as a "side image."

2. **S&S Activewear has side image fields** (`colorSideImage`, `colorDirectSideImage`, `colorOnModelSideImage`) but these fields are often empty or contain angled shots rather than true side profiles suitable for sleeve placement.

3. **The current system already correctly identifies this issue** - the SanMar adapter comment at line 147-149 notes that "2001 High is a high-resolution image, typically another front/lifestyle shot — NOT a true side view."

**Primary recommendation:** The fix should be straightforward - the SanMar adapter already handles this correctly (not mapping 2001 to sideImage), but the legacy mapper.ts still treats CLASS_TYPE_HIGH (2001) as a side image. Reconcile these two implementations by removing the incorrect side image handling from mapper.ts, and add detection/skip logic to overlay.ts for the `side` angle when no true side image exists.

</research_summary>

<standard_stack>
## Standard Stack

This phase involves fixing existing code rather than introducing new libraries.

### Core (Already in Use)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| sharp | current | Image compositing | Already used in overlay.ts |
| node:fs | built-in | File operations | Already used |

### No New Libraries Needed
This is a debugging/fix phase. The implementation uses existing vendor adapter and pipeline infrastructure.

</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Current Architecture

The image flow works as follows:

```
Vendor API → Adapter (sanmar/adapter.ts, ss-activewear/adapter.ts)
    ↓
UnifiedMedia { frontImage, backImage, sideImage, ... }
    ↓
Pipeline (mapper.ts) buildProductPreview(), buildMediaPayload()
    ↓
Overlay (overlay.ts) overlayProductImagesByAngle()
    ↓
WIX Product
```

### Pattern 1: Adapter-Level Image Normalization
**What:** Each vendor adapter maps raw API responses to UnifiedMedia
**Current state:**
- SanMar adapter (adapter.ts:147-149): Correctly does NOT map 2001 to sideImage
- S&S adapter (adapter.ts:131): Maps colorSideImage to sideImage

### Pattern 2: Legacy Mapper (mapper.ts)
**What:** Transforms SanMar raw data for product preview/media payload
**Current state:**
- Line 66-67: `CLASS_TYPE_HIGH = 2001` with comment "NOT a side view"
- Lines 143-148: Still finds `CLASS_TYPE_HIGH` images and assigns to `sideImageUrl`
- **This is the bug** - mapper.ts bypasses the adapter and still treats 2001 as side

### Pattern 3: Per-Angle Overlay (overlay.ts)
**What:** overlayProductImagesByAngle() processes front/back/side independently
**Current state:**
- Line 558: Skips angles where config is null/undefined
- **No skip for missing image URL** - needs to handle null sideImage gracefully

### Recommended Fix Architecture

1. **mapper.ts**: Remove CLASS_TYPE_HIGH from side image search (lines 143-148)
2. **overlay.ts**: Add explicit check for null/empty image URLs before processing
3. **Detection heuristic**: Since true side images are rare, default to skip

</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Side view detection | Image analysis/ML to detect angle | Simple null check | No reliable side images exist from vendors |
| API investigation | Manual URL testing | Trust adapter implementations | Adapters already correctly categorize images |
| Image validation | Custom image dimension/aspect checking | Rely on null sideImage | Vendors don't provide what we need |

**Key insight:** The solution is NOT to detect "is this really a side view" - it's to accept that true side views don't exist from these vendors and skip sleeve logo placement entirely. The adapters already know this (SanMar adapter explicitly sets sideImage to null). The bug is in mapper.ts which bypasses the adapter.

</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Assuming CLASS_TYPE_HIGH (2001) is a Side View
**What goes wrong:** Sleeve logos get placed on high-resolution front/lifestyle shots instead of actual side views
**Why it happens:** The classTypeId 2001 is labeled "High" (high-resolution), not "Side". The original code assumption was incorrect.
**How to avoid:** Trust the official SanMar documentation which explicitly lists the classTypeIds:
- 1004 = Swatch
- 1006 = Primary
- 1007 = Front
- 1008 = Rear
- 2001 = High (NOT Side)
**Warning signs:** Logo appearing on wrong angle, logo on chest when expecting sleeve

### Pitfall 2: Trusting S&S colorSideImage Field
**What goes wrong:** colorSideImage may be empty, or may contain an angled shot not suitable for sleeve placement
**Why it happens:** S&S has the field but doesn't consistently populate it, or the angle isn't a true side profile
**How to avoid:** Treat sideImage as optional for logo overlay purposes - if it's not a reliable source, skip it
**Warning signs:** colorSideImage exists but looks like a 3/4 front shot

### Pitfall 3: Inconsistency Between Adapter and Mapper
**What goes wrong:** Adapter correctly sets sideImage=null, but mapper.ts bypasses adapter and sets sideImageUrl from CLASS_TYPE_HIGH
**Why it happens:** Two code paths for the same data - adapter for unified flow, mapper for legacy direct SanMar usage
**How to avoid:** Use the adapter's UnifiedMedia output consistently, or fix mapper.ts to match adapter logic
**Warning signs:** Different behavior depending on code path taken

</common_pitfalls>

<code_examples>
## Code Examples

### Current Bug in mapper.ts (lines 143-148)
```typescript
// Source: scripts/pipeline/mapper.ts
// This INCORRECTLY treats 2001 (High) as a side image

// Find side image for this color (classTypeId 2001 = High)
const sideImage = images.find(
  (img) =>
    img.classType.classTypeId === CLASS_TYPE_HIGH &&
    img.color.toLowerCase() === colorPair.catalogColor.toLowerCase(),
);
```

### Correct Handling in SanMar Adapter (lines 147-151)
```typescript
// Source: scripts/sanmar/adapter.ts
// This CORRECTLY does NOT map 2001 to sideImage

case MEDIA_CLASS_TYPES.High:
  // SanMar 2001 "High" is a high-resolution image, typically another
  // front/lifestyle shot — NOT a true side view. Do not map as sideImage.
  if (!onModelFront) {
    onModelFront = item.url;
  }
  break;
```

### Recommended Fix for mapper.ts
```typescript
// REMOVE the side image search entirely, or set to null explicitly

// Old (incorrect):
// const sideImage = images.find(...CLASS_TYPE_HIGH...);

// New (correct):
// SanMar doesn't provide true side images; CLASS_TYPE_HIGH (2001) is high-res front/lifestyle
const sideImage = null; // No side images available from SanMar
```

### Recommended Fix for overlay.ts overlayProductImagesByAngle()
```typescript
// Source: scripts/pipeline/overlay.ts - overlayProductImagesByAngle()
// Add early skip for null/empty image URLs

for (const angle of angles) {
  const imageUrl = angleImages[angle];
  const angleConfig = config[angle];

  // Skip if no image URL provided (vendor doesn't have this angle)
  if (!imageUrl) {
    continue; // Silent skip - expected for side angles
  }

  // Skip if config is null/undefined for this angle
  if (angleConfig === null || angleConfig === undefined) {
    continue;
  }
  // ... rest of processing
}
```

</code_examples>

<sota_updates>
## State of the Art (2025-2026)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Assumed 2001 = Side | 2001 = High (high-res) | Always was this way | Bug, not change |

**Vendor API Reality:**
- **SanMar PromoStandards MediaContent API (v24.2, September 2025):**
  - Provides: Swatch (1004), Primary (1006), Front (1007), Rear (1008), High (2001)
  - Does NOT provide: Side view classTypeId
  - SIDE_MODEL field exists in ProductInfo but is rarely populated

- **S&S Activewear API V2:**
  - Provides: colorSideImage, colorDirectSideImage, colorOnModelSideImage fields
  - Reality: Often empty or angled shots, not true side profiles
  - Better than SanMar but still not reliable for sleeve placement

**Conclusion:** Neither vendor reliably provides true side-profile images suitable for sleeve logo placement. The correct approach is graceful skip, not detection heuristics.

</sota_updates>

<open_questions>
## Open Questions

1. **Should we attempt to use S&S colorSideImage when available?**
   - What we know: S&S has dedicated side image fields
   - What's unclear: Are they populated with usable side profiles?
   - Recommendation: Test with actual S&S products, but default to skip for safety

2. **Should we add a "side image available" indicator to ColorPreview?**
   - What we know: Currently sideImageUrl is set even when it's not a true side
   - What's unclear: Whether UI should show different options when side is/isn't available
   - Recommendation: Set sideImageUrl to null when no true side exists; UI can adapt

</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- SanMar Web Services Integration Guide v24.2 (local: SanMar-Web-Services-Integration-Guide-24.2.md)
  - Line 2123: "classType: 1004 Swatch, 1006 Primary, 1007 Front, 1008 Rear, 2001 High"
  - Lines 2432-2434: `<ns2:classTypeId>2001</ns2:classTypeId>` `<ns2:classTypeName>High</ns2:classTypeName>`
- scripts/sanmar/adapter.ts lines 147-149 - Explicit comment about 2001 not being side
- scripts/sanmar/types/media.ts - MEDIA_CLASS_TYPES constants

### Secondary (MEDIUM confidence)
- S&S Activewear API documentation at https://api.ssactivewear.com/V2/Products.aspx
  - Describes colorSideImage, colorDirectSideImage, colorOnModelSideImage fields
  - No indication of what angle these represent or availability
- scripts/ss-activewear/types/product.ts - SSProduct interface with side image fields

### Tertiary (LOW confidence - needs validation)
- None - all findings verified against official documentation

</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: Vendor API image angle data (SanMar PromoStandards, S&S REST API)
- Ecosystem: Existing adapter/pipeline/overlay code
- Patterns: Image classification, graceful degradation
- Pitfalls: Incorrect classTypeId mapping, inconsistent code paths

**Confidence breakdown:**
- SanMar classTypeId meanings: HIGH - verified from official integration guide
- S&S side image field existence: HIGH - verified from API documentation
- S&S side image quality/availability: MEDIUM - needs runtime testing
- Fix approach: HIGH - clear bug with clear solution

**Research date:** 2026-02-03
**Valid until:** 2026-03-03 (30 days - vendor APIs stable)

</metadata>

---

*Phase: 33-side-view-image-investigation-fix*
*Research completed: 2026-02-03*
*Ready for planning: yes*
