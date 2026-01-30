# Accessibility & Content Fixes: Manual Instructions

**Plan:** 02-02 (Task 2)
**Date:** 2026-01-30
**Status:** Pending manual execution
**MCP Limitation:** WIX REST API does not expose page content editing (headings, images, alt text, footer). These require the WIX Editor.

---

## Summary of Findings

### 1. Breadcrumb Collection Assignments (QW-6)

**Investigation Result:** Collection assignment order is already correct in the API.

Products in the Big Barn collection that are also in Clothing have Big Barn as the first collection ID. Products in PreOrder are only in PreOrder + All Products. Products in LovelaceUNM are only in LovelaceUNM + All Products.

**API Evidence:**
- Big Barn multi-collection products: First collectionId = `1cfcc768-7f1f-6185-38e7-1298a2f1a204` (Big Barn Crossfit) -- correct
- PreOrder products: Only in PreOrder (`bea296e5`) + All Products -- no conflict
- LovelaceUNM products: Only in LovelaceUNM (`06629fe4`) + All Products -- no conflict

**Conclusion:** The breadcrumb issue may be a WIX display behavior that uses the page context (which page the product is viewed from) rather than the collection order in the API. No API-level fix needed. If breadcrumbs still appear incorrect on the live site, this is a WIX platform behavior that cannot be changed via API.

**Manual verification needed:** Check product breadcrumbs on the live site by navigating to a Big Barn product from the Big Barn page vs. from the homepage carousel. If breadcrumbs differ based on navigation path, this is a WIX platform behavior.

---

### 2. Homepage Image Alt Text (AC-1)

**Current State (verified 2026-01-30 via Playwright):**
- Logo: `alt="Hotbox_edited.jpg"` -- uses filename instead of descriptive text
- "Elliptical Machine" image: `alt="Elliptical Machine"` -- stock photo alt, not relevant to clothing store
- Product carousel images: No alt text visible in accessibility tree
- All other images: Empty or missing alt text

**Required Changes (WIX Editor):**

| Image | Current Alt | Recommended Alt |
|-------|------------|-----------------|
| Site logo (header) | `Hotbox_edited.jpg` | `Hot Box Clothing Logo` |
| Site logo (hero section) | `Hotbox_edited.jpg` | `Hot Box Clothing - Box Friendly Clothing` |
| Elliptical Machine stock photo | `Elliptical Machine` | `Custom Team Shirts - Starting at $30` |
| Product carousel images | (empty) | Use product name (e.g., "Big Barn Team Hat", "BB Open Team Shirt") |

**Manual Instructions:**
1. Open WIX Editor for the site
2. Click on each image on the homepage
3. In the image settings panel, update the "Alt Text" field
4. For product gallery/carousel images, the alt text may be auto-populated from the product name in WIX Stores settings
5. Save and publish

**Note:** Product images in WIX Stores galleries typically inherit alt text from the product name. If the carousel is a WIX Stores widget, the alt text fix may require editing the product media settings rather than the page element.

---

### 3. Homepage H1 Heading (AC-2)

**Current State (verified 2026-01-30 via Playwright):**
- "Hot Box Clothing" is `heading level=2` (H2)
- "$30 - $50" is `heading level=2` (H2)
- "CONTACT US" is `heading level=2` (H2)
- "Subscribe Form" is `heading level=5` (H5)
- **No H1 exists on the homepage**

**Required Change:**
- Change "Hot Box Clothing" heading from H2 to H1
- This is the primary page heading and should be H1 for proper heading hierarchy and SEO

**Manual Instructions:**
1. Open WIX Editor for the site
2. Click on the "Hot Box Clothing" text element in the hero section
3. In the text editor toolbar, change the heading level from H2 to H1
4. Verify the visual appearance is acceptable (may need font size adjustment)
5. Save and publish

**Impact:** Proper heading hierarchy improves:
- SEO (search engines use H1 as primary page heading signal)
- Accessibility (screen readers use heading levels for page navigation)
- WCAG 2.1 compliance (1.3.1 Info and Relationships)

---

### 4. Footer Navigation (AC-3)

**Current State (verified 2026-01-30 via Playwright):**
```
admin@hotboxclothing.shop (mailto link)
(c)2022 by Hot Box Clothing. Proudly created with Wix.com
```

No navigation links, no social media, no policy links.

**Recommended Footer Structure:**

```
=== Footer ===

Navigation: Home | Shop All | Contact | Support | Store Policies

Social: [Add if business has social accounts]

Email: admin@hotboxclothing.shop
(c)2026 by Hot Box Clothing
```

**Required Changes:**
1. **Add footer navigation links:**
   - Home (/)
   - Contact (/blank-2 -> will be /contact after slug change)
   - Support (/blank-3 -> will be /support after slug change)
   - Store Policies (/blank-4 -> will be /store-policies after slug change)
   - Gift Card (/gift-card)

2. **Update copyright year:** Change "(c)2022" to "(c)2026"

3. **Remove "Proudly created with Wix.com"** -- optional but more professional

4. **Add social media links** if the business has social profiles (none found on site)

**Manual Instructions:**
1. Open WIX Editor for the site
2. Click on the footer section
3. Add a horizontal menu or text links for navigation
4. Update the copyright text from "2022" to "2026"
5. Optionally remove the "Proudly created with Wix.com" text
6. Save and publish

**Note:** "Shop All" link should be added after Plan 02-03 creates the Shop All page.

---

## MCP Limitation Details

**Investigated:** 2026-01-30

**What WIX REST API CAN do:**
- Query products and collections (used to verify breadcrumb collection order)
- Manage product data (name, description, variants, pricing)
- Add/remove products from collections

**What WIX REST API CANNOT do:**
- Edit page content (text, headings, images)
- Change heading levels (H1/H2/H3)
- Edit image alt text on page elements
- Modify footer content or layout
- Change page URL slugs
- Edit navigation menu structure

**Conclusion:** All four categories of fixes in Task 2 require the WIX Editor. The API investigation confirmed:
- Breadcrumb collection order is already correct at the API level
- Page content editing has no REST API endpoint
- Footer content has no REST API endpoint
- SEO metadata (heading levels) has no REST API endpoint

---

## Verification Checklist

After manual fixes are applied:

- [ ] Homepage has H1 heading ("Hot Box Clothing")
- [ ] Logo images have descriptive alt text ("Hot Box Clothing Logo")
- [ ] Product carousel images have alt text (product names)
- [ ] "Elliptical Machine" image has relevant alt text
- [ ] Footer has navigation links (Home, Contact, Support, Store Policies, Gift Card)
- [ ] Footer copyright year updated to 2026
- [ ] Breadcrumbs verified on multi-collection product pages

---
*Generated by Plan 02-02 execution. Requires manual completion in WIX Editor.*
