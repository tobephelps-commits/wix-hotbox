# Navigation Restructure: Manual Instructions

**Plan:** 02-03 (Task 2)
**Date:** 2026-01-30
**Status:** Pending manual execution
**MCP Limitation:** WIX REST API does not expose site navigation menu management. Navigation structure must be modified through the WIX Editor.
**Prerequisite:** Complete SHOP-ALL-PAGE.md first (the "Shop All" page must exist before it can be added to navigation).

---

## Why This Restructure Is Needed

The current navigation is **client-centric** (lists business names like "Big Barn Crossfit", "Artistry in Motion", "UNMH", "Board 30") which means nothing to a new visitor. Utility pages (Contact, Support, Store Policies) occupy prime navigation real estate before any shopping links. There is no way to browse the full catalog. This is UX issue NV-1 (navigation is internal directory, not shopping experience) and NV-4 (utility pages prioritized over shopping).

## Current Navigation (Verified 2026-01-30)

```
Home | Contact | Support | Store Policies | Big Barn Crossfit | Fun Shirts | Artistry in Motion | Fall PreOrder | UNMH | Board 30 | More v
                                                                                                                                    |-- Gift Card
                                                                                                                                    |-- Shop (/shop-5, empty)
```

**Problems:**
- Contact, Support, Store Policies take positions 2-4 (should be in footer)
- No "Shop All" entry point for product browsing
- 5 client names in the main bar mean nothing to new visitors
- Gift Card buried in "More" dropdown (should be in main nav)
- "Shop" link points to empty page (LMNT products hidden)

## Target Navigation Structure

```
Home | Shop All | Fun Shirts | Our Teams v           | Gift Card | Contact
                               |-- Big Barn Crossfit
                               |-- Artistry in Motion
                               |-- Board 30
                               |-- UNMH
                               |-- Pre-Order
```

**Key changes:**
1. **Shop All** promoted to position 2 (primary browsing entry point)
2. **Fun Shirts** kept at position 3 (already category-based, useful)
3. **Client pages grouped** under "Our Teams" dropdown (5 items -> 1 dropdown)
4. **Gift Card** promoted from "More" to main nav
5. **Contact** kept in main nav but moved to last position
6. **Support** moved to footer only (or under Contact as sub-page)
7. **Store Policies** removed from main nav (footer only)
8. **"Shop" link removed** from More dropdown (was pointing to empty /shop-5, now repurposed as Shop All)
9. **"More" dropdown eliminated** (all items redistributed)

## Step-by-Step Instructions (WIX Editor)

### Prerequisites
- Complete SHOP-ALL-PAGE.md instructions first (Shop All page must exist)
- Open WIX Editor: https://manage.wix.com/dashboard/c744cbdb-46f8-4c66-ac76-eb31bd0d52c1 > Edit Site

### Phase 1: Open the Site Menu Editor

1. In the WIX Editor, click **Pages & Menu** in the left panel (or click the menu icon)
2. Click **Site Menu** at the top to see the navigation structure
3. You should see the current menu items listed vertically

### Phase 2: Create the "Our Teams" Dropdown Folder

4. Click **+ Add** or **Add Menu Item** at the bottom of the menu list
5. Select **Folder** or **Dropdown** (this creates a menu item with sub-items)
6. Name it **"Our Teams"** (alternatives: "Custom Teams", "Client Pages", "Team Stores")
7. This creates an empty dropdown container

### Phase 3: Move Client Pages into the Dropdown

8. **Drag** "Big Barn Crossfit" into the "Our Teams" folder (it becomes a sub-item, indented under "Our Teams")
9. **Drag** "Artistry in Motion" into the "Our Teams" folder
10. **Drag** "Board 30" into the "Our Teams" folder
11. **Drag** "UNMH" into the "Our Teams" folder
12. **Drag** "Fall PreOrder" into the "Our Teams" folder (rename to "Pre-Order" if desired)

**Result:** 5 individual nav items become 1 dropdown with 5 sub-items.

### Phase 4: Reorder Main Navigation Items

Drag items to achieve this order (top = leftmost in nav bar):

| Position | Item | Type |
|----------|------|------|
| 1 | Home | Page link |
| 2 | Shop All | Page link (the new page from SHOP-ALL-PAGE.md) |
| 3 | Fun Shirts | Page link |
| 4 | Our Teams | Dropdown folder (with 5 client pages inside) |
| 5 | Gift Card | Page link (move from More dropdown) |
| 6 | Contact | Page link (move from position 2) |

### Phase 5: Remove Items from Main Nav

13. **Support** -- Right-click > **Remove from menu** (or drag to "Not In Menu" section)
    - The page itself is NOT deleted -- it's just hidden from the nav bar
    - Keep it accessible via footer links (see ACCESSIBILITY-FIXES.md) and via direct URL
14. **Store Policies** -- Right-click > **Remove from menu**
    - Same -- page stays, just not in the nav bar
    - Should be in footer only (utility page, not a shopping destination)
15. **"Shop" link** (under More, pointing to /shop-5) -- Remove from menu
    - The /shop-5 page is being repurposed as "Shop All" (already added above)
    - The old "Shop" link in More is now redundant

### Phase 6: Verify the "More" Dropdown

16. After moving Gift Card to main nav and removing "Shop", the "More" dropdown should be **empty**
17. If "More" is empty, WIX should automatically remove it from the nav bar
18. If it persists with no items, right-click it and remove it manually

### Phase 7: Save and Publish

19. Click **Save** in the WIX Editor
20. Click **Publish** to make navigation changes live
21. Preview the site to verify navigation before publishing if preferred

## Important Notes

- **No pages are deleted** -- items removed from nav are just hidden from the menu
- **Page URLs don't change** -- navigation changes only affect menu visibility, not page slugs
- **All pages remain accessible** via direct URL (e.g., `/blank-3` for Support)
- **If using renamed slugs** from URL-SLUG-CHANGES.md, the navigation links will auto-update since WIX links pages by internal ID, not by slug

## Verification Checklist

After completing the restructure:

### Navigation Structure
- [ ] "Shop All" appears in main nav bar (position 2, after Home)
- [ ] "Fun Shirts" appears in main nav bar (position 3)
- [ ] "Our Teams" appears as a dropdown in main nav bar
- [ ] "Our Teams" dropdown contains: Big Barn Crossfit, Artistry in Motion, Board 30, UNMH, Pre-Order
- [ ] "Gift Card" appears in main nav bar
- [ ] "Contact" appears in main nav bar (last position)
- [ ] "Support" is NOT in main nav bar
- [ ] "Store Policies" is NOT in main nav bar
- [ ] "More" dropdown is gone (or empty)
- [ ] No "Shop" link pointing to /shop-5 in any dropdown

### Navigation Links
- [ ] Click "Shop All" -- navigates to the Shop All page with product grid
- [ ] Click "Fun Shirts" -- navigates to Fun Shirts page
- [ ] Hover "Our Teams" -- dropdown appears with 5 client pages
- [ ] Click each client page in dropdown -- navigates to correct page
- [ ] Click "Gift Card" -- navigates to gift card purchase page
- [ ] Click "Contact" -- navigates to contact form page

### Pages Still Accessible
- [ ] Support page loads at direct URL (e.g., `/blank-3` or `/support` if slug changed)
- [ ] Store Policies page loads at direct URL (e.g., `/blank-4` or `/store-policies` if slug changed)
- [ ] All client pages load correctly from dropdown links

### Mobile
- [ ] Navigation works on mobile viewport (hamburger menu or equivalent)
- [ ] Dropdown "Our Teams" is accessible on mobile
- [ ] All links work on mobile

## Dropdown Label Options

The plan suggests these label options for the client pages dropdown. Choose whichever feels most natural for the brand:

| Label | Pros | Cons |
|-------|------|------|
| **Our Teams** | Friendly, brand-aligned (team sports focus) | May be unclear for non-gym clients |
| **Custom Teams** | Describes what they are | Implies you can't just buy, only custom |
| **Team Stores** | Clear e-commerce intent | Slightly generic |
| **Client Pages** | Accurate | Too internal/business-facing |
| **Affiliates** | CrossFit-appropriate term | Niche, may confuse non-CrossFit visitors |

**Recommendation:** "Our Teams" -- it's friendly, short, and fits the CrossFit/fitness brand identity.

## MCP Limitation Details

**Investigated:** 2026-01-30
**APIs searched:**
- WIX REST API documentation -- no endpoint for site navigation menu management
- Searched "navigation menu site menu manage menu items" -- returned only restaurant menu APIs, not site navigation
- WIX Site Properties API -- covers business info, not navigation structure
- WIX MCP tools -- `ManageWixSite` and `CallWixSiteAPI` can manage products, collections, and apps but not navigation menus

**Conclusion:** WIX does not expose site navigation menu management through any REST API endpoint. Navigation structure (menu items, ordering, dropdowns, folder creation) is exclusively a WIX Editor operation. This is consistent with findings from Plans 02-01 and 02-02.

---
*Generated by Plan 02-03 execution. Requires manual completion in WIX Editor.*
*Must be done AFTER creating the Shop All page (see SHOP-ALL-PAGE.md).*
