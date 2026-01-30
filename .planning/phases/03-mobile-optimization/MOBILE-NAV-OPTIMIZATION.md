# Mobile Navigation Optimization: Manual Instructions

**Plan:** 03-01
**Date:** 2026-01-30
**Status:** Pending manual execution
**MCP Limitation:** WIX REST API does not expose any endpoints for mobile layout, responsive design, navigation menus, header configuration, or viewport behavior. All mobile optimization must be performed through the WIX Editor Mobile view.
**Prerequisite:** Complete Phase 2 NAVIGATION-RESTRUCTURE.md first (the 6-item nav structure must be in place before optimizing for mobile).

---

## 1. Current State (Audit Results)

**Audit Date:** 2026-01-30
**Method:** Playwright browser automation at 375x812 (iPhone), 768x1024 (iPad tablet)

### Issues Addressed

| Issue ID | Title | Severity |
|----------|-------|----------|
| CR-1 | No mobile-responsive layout (981px fixed width) | Critical |
| MC-1 | No hamburger menu / mobile navigation | Critical |
| MC-6 | Tablet experience broken (768px overflows) | Medium |
| AC-4 | Keyboard navigation not functional for product options | Medium |

### Mobile Viewport Measurements (375x812)

| Metric | Value | Expected | Status |
|--------|-------|----------|--------|
| Body scroll width | 981px | 375px | FAIL -- 606px horizontal overflow |
| Nav bar width | 950px | 375px (collapsed) | FAIL -- fixed width, no collapse |
| Nav bar height | 30px | 44px minimum tap target | FAIL -- below WCAG minimum |
| Nav items visible | 4 of 13 | All via hamburger menu | FAIL |
| Nav items off-screen | 9 of 13 | 0 | FAIL |
| Hamburger menu present | No functional hamburger | Yes | FAIL |
| Logo dimensions | 80x35px | Responsive | OK (fits in viewport) |
| Meta viewport tag | Present (`width=device-width, initial-scale=1`) | Present | OK |
| CSS media queries | 7 total (breakpoints: 749px, 750px) | Comprehensive | PARTIAL -- queries exist but nav does not respond |

**Visible nav items at 375px:** Home, Contact, Support, Store Policies
**Off-screen nav items:** Big Barn Crossfit, Fun Shirts, Artistry in Motion, Fall PreOrder, UNMH, Board 30, Gift Card, Shop, More

**Note:** The Phase 2 navigation restructure has NOT yet been applied. The site still shows the original 12-item nav bar. The recommended 6-item structure (Home | Shop All | Fun Shirts | Our Teams | Gift Card | Contact) would reduce overflow but still requires mobile collapse behavior.

### Tablet Viewport Measurements (768x1024)

| Metric | Value | Expected | Status |
|--------|-------|----------|--------|
| Body scroll width | 981px | 768px | FAIL -- 213px horizontal overflow |
| Nav bar width | 950px | 768px (collapsed or wrapped) | FAIL -- 182px wider than viewport |
| Nav items visible | 8 of 13 | All | FAIL |
| Nav items off-screen | 5 of 13 | 0 | FAIL |
| Heading "Hot Box Clothing" | Clipped (extends to x=965) | Fits viewport | FAIL |

**Visible nav items at 768px:** Home, Contact, Support, Store Policies, Big Barn Crossfit, Fun Shirts, Artistry in Motion, Fall PreOrder
**Off-screen nav items:** UNMH, Board 30, Gift Card, Shop, More

### Tap Target Compliance

**WCAG 2.1 Success Criterion 2.5.8** requires minimum 44x44px touch targets.

| Element | Width | Height | Meets 44px | Status |
|---------|-------|--------|------------|--------|
| Nav link "Home" | 60px | 30px | No | FAIL |
| Nav link "Contact" | 71px | 30px | No | FAIL |
| Nav link "Support" | 72px | 30px | No | FAIL |
| Nav link "Store Policies" | 107px | 30px | No | FAIL |
| Nav link "Big Barn Crossfit" | 126px | 30px | No | FAIL |
| Nav link "Fun Shirts" | 84px | 30px | No | FAIL |
| Nav link "Artistry in Motion" | 129px | 30px | No | FAIL |
| Nav link "Fall PreOrder" | 104px | 30px | No | FAIL |
| Nav link "UNMH" | 64px | 30px | No | FAIL |
| Nav link "Board 30" | 78px | 30px | No | FAIL |
| Logo link | 80px | 35px | No | FAIL |
| Cart icon | 35px | 42px | No | FAIL |
| Log In button | 114px | 44px | No (off-screen at x=856) | FAIL (not reachable) |
| **Total passing** | | | **0 of 15** | **0% compliance** |

All 15 interactive header elements fail the 44px minimum height requirement. Width is adequate for most items but height is uniformly 30px for all navigation links.

### Category Page: Big Barn at Mobile (375x812)

| Metric | Value |
|--------|-------|
| Body scroll width | 981px (same overflow) |
| Heading "Welcome to the Big Barn Store" | Clipped -- text extends past viewport |
| Product gallery width | 980px (fixed, not responsive) |
| Total products in gallery | 43 items |
| Products visible in viewport | 1 (partially visible) |
| First product card height | 1,052px |
| Product images | Not rendering (positioned at desktop coordinates) |

The Big Barn category page at mobile viewport shows only a heading fragment ("Welcome to") and a single product card that extends 980px wide -- far beyond the 375px viewport. Product images fail to render because WIX lazy-loading does not fire for elements positioned outside the visible mobile area.

### Header Button Analysis

The header contains only two functional buttons:
1. **"Cart with 0 items"** -- Cart icon button (35x42px, positioned in header row)
2. **"Log In"** -- Login button (114x44px, positioned at x=856, off-screen on mobile)

**No hamburger menu button exists.** The WIX site was built without a mobile menu component. The `button [ref=e37]` initially detected in the accessibility tree is actually the cart icon button that loads asynchronously. There is no hidden or non-functional hamburger icon -- the mobile menu feature was simply never added to this site.

---

## 2. WIX API Capabilities for Mobile/Responsive Settings

**Research Date:** 2026-01-30
**APIs Searched:**
- WIX REST API documentation: "mobile responsive site design layout breakpoint"
- WIX REST API documentation: "site theme settings font size spacing viewport mobile menu navigation header"
- WIX REST API documentation: "page layout widget component configuration mobile hamburger menu"
- WIX REST API documentation: "site design theme CSS styles colors typography"
- WIX README recipes index (full review)

### Findings

| Capability | API Available? | Notes |
|-----------|---------------|-------|
| Mobile layout / responsive mode | NO | Not exposed via any REST API |
| Navigation menu management | NO | Confirmed in Phase 2 (Plan 02-03) |
| Header configuration | NO | No API for header layout, logo placement, or menu icon |
| Viewport / breakpoint settings | NO | No API for responsive breakpoints |
| Site theme / CSS customization | NO | Only Site Properties API exists (business info, not design) |
| Page content / widget layout | NO | Confirmed in Phase 2 (Plan 02-01) |
| Touch target sizes | NO | No API for element sizing |
| Font sizes / spacing | NO | Not exposed via REST API |
| Mobile menu (hamburger) | NO | Must be added via WIX Editor Mobile view |

**Conclusion:** ZERO aspects of mobile layout or responsive design are controllable via the WIX REST API. The WIX REST API is limited to business data management (products, orders, contacts, bookings, etc.) and does not expose any site design, layout, or visual configuration endpoints.

**Consistent with Phase 2 findings:** Plans 02-01, 02-02, and 02-03 all confirmed that WIX page content, navigation menus, and visual design require the WIX Editor. Mobile optimization follows the same pattern -- it is exclusively a WIX Editor operation.

---

## 3. WIX Mobile Editor Instructions

### Prerequisites

Before starting mobile optimization:
1. **Complete NAVIGATION-RESTRUCTURE.md** -- The 6-item nav (Home | Shop All | Fun Shirts | Our Teams | Gift Card | Contact) must be live
2. **Complete SHOP-ALL-PAGE.md** -- The Shop All page must exist (required by the navigation restructure)
3. **Open WIX Editor:** https://manage.wix.com/dashboard/c744cbdb-46f8-4c66-ac76-eb31bd0d52c1 > Edit Site

### Step 1: Switch to Mobile Editor View

1. In the WIX Editor, look at the top toolbar
2. Click the **mobile phone icon** (usually located in the top-center or top-right area of the editor toolbar)
3. Alternatively, use the keyboard shortcut or click **Switch to Mobile** from the toolbar dropdown
4. The editor canvas will switch to a mobile-width preview (typically 320px width)
5. You should now see the **Mobile Editor** with a phone-shaped canvas

**Important:** The WIX Mobile Editor uses a separate layout from the desktop editor. Changes made in Mobile Editor only affect mobile views. Desktop layout remains unchanged.

### Step 2: Enable Mobile Menu (Hamburger Navigation)

This is the most critical step. Currently, the site has NO mobile menu component.

1. In the Mobile Editor, look at the **header area** at the top of the mobile canvas
2. If a hamburger menu icon (three horizontal lines) is NOT visible in the header:
   a. Click on the **header section** to select it
   b. Click **Add Elements** (the "+" icon in the left panel) or look for **Menu** options
   c. Search for or navigate to **Menu** > **Mobile Menu** or **Hamburger Menu**
   d. Add the mobile menu component to the header
3. If a hamburger icon IS visible but not functional:
   a. Click on the hamburger icon to select it
   b. Check the **Settings** panel on the right for menu configuration
   c. Ensure it is linked to the site navigation menu

**WIX typically auto-generates a mobile menu when switching to Mobile Editor for the first time.** If the site was originally built in an older WIX editor version, the mobile menu may need to be manually added or the site may need to be "refreshed" to mobile mode.

### Step 3: Configure Mobile Menu Items

Once the hamburger menu is active:

1. Click on the **hamburger icon** in the mobile header
2. Click **Manage Menu** or **Edit Menu** in the settings panel
3. Verify the menu contains the 6-item navigation structure:

   | Position | Item | Type |
   |----------|------|------|
   | 1 | Home | Page link |
   | 2 | Shop All | Page link |
   | 3 | Fun Shirts | Page link |
   | 4 | Our Teams | Dropdown/folder with sub-items |
   | 5 | Gift Card | Page link |
   | 6 | Contact | Page link |

4. Under "Our Teams", verify sub-items:
   - Big Barn Crossfit
   - Artistry in Motion
   - Board 30
   - UNMH
   - Pre-Order

5. **Remove** Support and Store Policies from the mobile menu if they appear (these should be footer-only)

**Note:** The mobile menu typically inherits from the desktop site menu. If you completed NAVIGATION-RESTRUCTURE.md, the mobile menu should already have the correct 6-item structure. Verify and adjust if needed.

### Step 4: Configure Mobile Header Layout

1. In the Mobile Editor, click on the **header section**
2. Arrange the header elements for mobile:

   **Target mobile header layout:**
   ```
   [ Logo (left) ]  [ Hamburger Icon (right) ]
   ```

3. **Logo:**
   - Click on the logo image
   - Resize to approximately 50-60px width (proportional height)
   - Position in the top-left corner of the header
   - Ensure it links to the homepage

4. **Cart Icon:**
   - Position near the hamburger icon (top-right area)
   - Ensure it is at least 44x44px touch target
   - It should be visible but not overlapping the menu icon

5. **Hamburger Menu Icon:**
   - Position in the top-right corner
   - Ensure the icon is at least 44x44px
   - Standard positioning: far right of the header

6. **Remove or hide** the "Log In" button text from mobile header (the icon-only version is acceptable, or move login to the mobile menu)

7. **Header height:** Set to approximately 60-70px to accommodate 44px touch targets with padding

### Step 5: Set Touch Target Sizes

For ALL interactive elements in the mobile view:

1. **Navigation menu items** (inside the hamburger menu overlay):
   - Each menu item should have at least 44px height
   - Add padding if the default text height is below 44px
   - In the mobile menu panel settings, look for **Item Spacing** or **Padding** options
   - Set item spacing to at least 12px between items

2. **Header icons** (cart, menu, logo):
   - Select each icon
   - In the design/layout settings, ensure minimum 44x44px clickable area
   - Add padding around icons if needed

3. **Product option selectors** (on product pages):
   - Color swatches: Currently 32x32px -- increase to 44x44px if the Mobile Editor allows widget-level customization
   - Size/option dropdowns: Ensure tap target height is at least 44px
   - Note: WIX custom dropdowns (AC-4) may not be fully customizable via the editor; this is a WIX platform limitation for keyboard accessibility

### Step 6: Test Responsive Breakpoints

After configuring the mobile layout, test at multiple sizes:

1. **375px (iPhone SE / standard mobile):**
   - [ ] No horizontal scrolling
   - [ ] Hamburger menu visible and functional
   - [ ] Logo visible and not clipped
   - [ ] All content fits within viewport width

2. **768px (iPad / tablet):**
   - [ ] No horizontal scrolling (currently 213px overflow)
   - [ ] Navigation is accessible (either collapsed hamburger or all items visible)
   - [ ] Heading text not clipped
   - [ ] Product galleries display correctly

3. **1024px (iPad landscape / small laptop):**
   - [ ] Transition point between mobile and desktop layout
   - [ ] Navigation fully visible or has clear mobile fallback
   - [ ] No content clipping

**WIX breakpoint behavior:** WIX Editor typically handles breakpoints automatically -- the Mobile Editor view applies to viewports below ~750px (based on the `(max-width: 749px)` media query detected in the audit). Tablet layout (750px-1024px) may use a combination of mobile and desktop styles.

### Step 7: Verify Product Gallery on Mobile

After enabling mobile responsive mode:

1. Navigate to a category page (e.g., Big Barn) in the Mobile Editor preview
2. Verify that:
   - [ ] Product gallery cards stack vertically (one column)
   - [ ] Product images render correctly (not positioned off-screen)
   - [ ] Product names and prices are fully visible
   - [ ] Product cards are appropriately sized for mobile
3. If product gallery is still fixed-width:
   - Click on the gallery widget in the Mobile Editor
   - Check layout settings for **Responsive** or **Full Width** options
   - Set gallery to use **1 column** layout for mobile

---

## 4. Verification Checklist

After completing all steps, verify the following on a real mobile device or using browser DevTools responsive mode:

### Navigation
- [ ] Hamburger menu icon visible in mobile header
- [ ] Tapping hamburger icon opens a full-screen or slide-out menu
- [ ] Menu contains all 6 navigation items (Home, Shop All, Fun Shirts, Our Teams, Gift Card, Contact)
- [ ] "Our Teams" expands to show 5 sub-items
- [ ] Each menu link navigates to the correct page
- [ ] Menu closes after selecting a link
- [ ] No horizontal scrolling on any page

### Touch Targets
- [ ] All menu items have at least 44px tap height
- [ ] Hamburger icon is at least 44x44px
- [ ] Cart icon is at least 44x44px
- [ ] Logo is tappable and navigates home

### Layout
- [ ] Body scroll width equals viewport width (no overflow)
- [ ] Header fits within viewport (no clipping)
- [ ] Page headings are fully visible
- [ ] Product galleries display in single-column layout
- [ ] Product images load correctly on mobile
- [ ] Footer is accessible by scrolling

### Tablet (768px)
- [ ] No horizontal scrolling
- [ ] Navigation is accessible (hamburger or visible nav bar)
- [ ] Product galleries display appropriately (1-2 column layout)
- [ ] Content headings are not clipped

### Keyboard/Accessibility (AC-4)
- [ ] Tab key moves focus through menu items in logical order
- [ ] Enter/Space opens the hamburger menu
- [ ] Escape closes the hamburger menu
- [ ] Focus is trapped within the menu when open (does not tab to hidden page content)
- [ ] Product option dropdowns are operable with keyboard (WIX platform limitation -- may not be fully fixable)

---

## 5. Expected Result

After completing these optimizations, the mobile experience should transform from:

**Before (Current State):**
- 981px fixed desktop layout forced on all viewports
- 4 of 13 nav items visible on mobile, 9 hidden off-screen
- No hamburger menu, no mobile navigation access
- 30px tap targets (below 44px WCAG minimum)
- Product galleries invisible on mobile (positioned off-screen)
- Horizontal scrolling required on every page

**After (Target State):**
- Responsive layout that adapts to viewport width
- Full navigation access via hamburger menu on mobile
- 6-item nav structure (matching Phase 2 desktop restructure)
- 44px+ touch targets for all interactive elements
- Single-column product gallery layout on mobile
- Zero horizontal scrolling at any viewport size
- Tablet layout with no overflow or clipping

### Impact Estimate
- **CR-1 (No responsive layout):** RESOLVED -- Mobile layout adapts to viewport
- **MC-1 (No hamburger menu):** RESOLVED -- Full mobile menu access
- **MC-6 (Tablet broken):** RESOLVED -- No overflow at 768px
- **AC-4 (Keyboard nav):** PARTIALLY RESOLVED -- Menu keyboard access improved; WIX custom dropdown keyboard support remains a platform limitation

---

## MCP Limitation Details

**Investigated:** 2026-01-30
**APIs searched:**
- WIX REST API: "mobile responsive site design layout breakpoint" -- No relevant results
- WIX REST API: "site theme settings font size viewport mobile menu navigation header" -- No relevant results
- WIX REST API: "page layout widget component configuration mobile hamburger menu" -- No relevant results
- WIX REST API: "site design theme CSS styles colors typography" -- No relevant results
- WIX README recipes index: Full review of all 30+ recipes -- Zero recipes for mobile/responsive/layout

**Conclusion:** WIX does not expose site design, layout, responsive behavior, or mobile configuration through any REST API endpoint. Mobile optimization is exclusively a WIX Editor operation. This is consistent with all previous findings across Phases 1-2.

---

*Generated by Plan 03-01 execution (Tasks 1-2). Requires manual completion in WIX Editor.*
*Must be done AFTER completing Phase 2 NAVIGATION-RESTRUCTURE.md and SHOP-ALL-PAGE.md.*
*References: UX-ISSUES.md (CR-1, MC-1, MC-6, AC-4), NAVIGATION-RESTRUCTURE.md (target nav structure)*
