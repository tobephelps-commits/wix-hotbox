# Variant Image Switching Guide

**Phase:** 32 - Variant Image Switching
**Created:** 2026-02-03
**Status:** Documentation complete, pending Editor configuration

---

## Overview

When customers select a different color variant on the storefront, the product gallery should update to show images of that specific color. This guide explains how the system works and how to enable the feature.

---

## Background

The HotBox product pipeline already assigns images to color variants at the API level. However, WIX's Product Gallery widget requires a manual Editor configuration to activate the switching behavior.

### What's Already Done (API Level)

The `buildMediaPayload()` function in `scripts/pipeline/mapper.ts` (lines 306-373) correctly:

1. **Assigns images to color choices** via the WIX `choice` field
2. **Links front, back, and side images** to their respective colors
3. **Uses displayColor** (customer-facing name) for the choice assignment

Example of the API payload structure:
```typescript
{
  url: "https://cdn.sanmar.com/image/front/Black.jpg",
  choice: {
    option: "Color",
    choice: "Black"  // displayColor value
  }
}
```

### What's Missing (Editor Configuration)

The WIX Product Gallery widget needs a setting enabled to respond to variant selection changes. Without this setting, the gallery shows all product images regardless of which color is selected.

---

## How It Works

### Data Flow

```
1. Pipeline creates product
   ├── buildMediaPayload() assigns images to colors
   └── WIX API stores image-to-color linking

2. Customer visits product page
   ├── Gallery shows all images (or first color's images)
   └── Customer selects a different color

3. With Editor setting ENABLED:
   └── Gallery filters to show only that color's images

3. Without Editor setting:
   └── Gallery continues showing all images (no switch)
```

### Technical Details

- **Image Classification**: Front (1007), Back (1008), Side/High (2001)
- **Color Matching**: Uses `catalogColor` for vendor API queries, `displayColor` for WIX-facing data
- **Media Limit**: Maximum 15 images per WIX product
- **Priority Order**: Per-color angle images first, then general product images

---

## WIX Editor Configuration

### One-Time Setup (Site-Wide)

1. **Open WIX Editor**
   - Go to https://manage.wix.com/dashboard/c744cbdb-46f8-4c66-ac76-eb31bd0d52c1
   - Click "Edit Site" to open the Editor

2. **Navigate to a Product Page**
   - In the left panel, click "Pages & Menu"
   - Select any product page (or the Product Page template if using dynamic pages)

3. **Configure the Product Gallery Widget**
   - Click on the Product Gallery widget (the image carousel/grid)
   - Click the "Settings" gear icon

4. **Enable Image Switching**
   - Look for one of these setting names (varies by WIX version):
     - "Link gallery images to product options"
     - "Show variant images"
     - "Update gallery on option change"
     - "Connect images to variants"
   - Enable/toggle this setting ON

5. **Save and Publish**
   - Click "Save" in the Editor
   - Click "Publish" to make changes live

### Setting Location Notes

The exact setting name and location may vary depending on:
- WIX Editor version
- Product Page template vs. custom pages
- Wix Stores app version

If you can't find the setting:
1. Check Widget Settings > Display tab
2. Check Widget Settings > Behavior tab
3. Check Site Settings > eCommerce > Product Page

---

## Verification Steps

After enabling the Editor setting, verify the feature works:

### Desktop Verification

1. Open a product with multiple color options on the live storefront
   - Example: A t-shirt with Black, Navy, and White options
2. Note which images are showing in the gallery
3. Click a different color (e.g., Navy)
4. **Expected**: Gallery images should update to show Navy color images
5. Click another color (e.g., White)
6. **Expected**: Gallery images should update to show White color images

### Mobile Verification

1. Open the same product on a phone or use browser dev tools mobile view (375px width)
2. Select a different color variant
3. **Expected**: Gallery images switch correctly on mobile
4. Verify the image switch doesn't cause layout shift or loading delays

### Products to Test

Prioritize testing on:
- Products with distinct visual differences between colors (e.g., Black vs. White)
- Products with 3+ color options
- Best-selling products with high visibility

---

## Troubleshooting

### Images Don't Switch

| Symptom | Cause | Fix |
|---------|-------|-----|
| Gallery shows all images regardless of color selection | Editor setting not enabled | Enable "Link gallery images to product options" in Editor |
| Setting is enabled but images still don't switch | Page cache | Clear browser cache, try incognito mode |
| Setting doesn't exist in my Editor | Older WIX version | Check for app updates, or contact WIX support |

### Some Colors Have No Images

| Symptom | Cause | Fix |
|---------|-------|-----|
| Selecting a color shows no images or falls back to default | Vendor didn't provide images for that color | Normal behavior -- not all colors have images |
| Color shows wrong images | displayColor mismatch | Check if variant's displayColor matches the image's color assignment |

### Images Show for Wrong Colors

| Symptom | Cause | Fix |
|---------|-------|-----|
| Navy images show when Black is selected | displayColor values don't match | Verify displayColor consistency between variants and media assignments |
| All images show for every color | Images not assigned to choices | Re-run product creation through pipeline |

---

## Products to Prioritize

When testing or auditing variant image switching, focus on:

### High-Value Products

1. **Products with distinct color differences**
   - Black vs. White (maximum contrast)
   - Navy vs. Red (clearly different)
   - Heather colors vs. solid colors

2. **Products with 3+ color options**
   - More colors = more value from switching feature
   - Examples: Essential Tees (often 10+ colors)

3. **Best-selling products**
   - High traffic = high visibility of any issues
   - Check analytics for top-viewed product pages

### Lower Priority

- Products with only 1-2 colors
- Products where colors are very similar (e.g., Athletic Heather vs. Sport Grey)
- Products with only one image per color (switching provides less value)

---

## Reference

- **Original Issue**: CK-3 in `.planning/phases/11-automate-wix-editor-fixes/WIX-EDITOR-FIXES.md`
- **API Implementation**: `scripts/pipeline/mapper.ts` - `buildMediaPayload()` function
- **Media Types**: `scripts/pipeline/types.ts` - `WixMediaItem` interface

---

*Last updated: 2026-02-03*
