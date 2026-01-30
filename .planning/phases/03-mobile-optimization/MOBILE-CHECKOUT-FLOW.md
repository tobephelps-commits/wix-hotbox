# Mobile Checkout Flow Optimization: Manual Instructions

**Plan:** 03-03
**Date:** 2026-01-30
**Status:** Pending manual execution
**MCP Limitation:** WIX REST API does not expose any endpoints for cart page layout, checkout page layout, or mobile-specific checkout configuration. All checkout flow optimization must be performed through the WIX Editor Mobile view.
**Prerequisite:** Complete MOBILE-NAV-OPTIMIZATION.md and MOBILE-PRODUCT-PAGES.md first (mobile navigation and product pages must be optimized before checkout flow testing is meaningful).

---

## 1. Current State (Audit Results)

**Audit Date:** 2026-01-30
**Method:** Playwright browser automation at 375x812 (iPhone)
**Flow tested:** Product selection > Add to Cart > Side Cart > Cart Page > Checkout Page

### Issues Addressed

| Issue ID | Title | Severity |
|----------|-------|----------|
| CK-5 | Sezzle BNPL loads inconsistently / off-screen on mobile | Low |
| (New) | Cart page order summary values off-screen on mobile | High |
| (New) | Cart icon unreachable at x=946 on mobile | High |
| (New) | Cart quantity buttons below tap target minimum | Medium |

**Note:** This document focuses on mobile layout/usability of the cart and checkout flow. Conversion optimization elements (trust signals, policies, recovery mechanisms) are addressed in Phase 4.

### Add to Cart Flow (375x812)

| Step | Element | Position | Size | Status |
|------|---------|----------|------|--------|
| Cart icon in header | `button "Cart with N items"` | x=946, y=29 | 35x42px | FAIL -- 571px off-screen, below 44px minimum |
| Add to Cart button | `button "Add to Cart"` | x=350, y=1477 | 280x40px | FAIL -- off-screen horizontally AND buried vertically |
| Post-ATC behavior | Side cart dialog opens | x=0, y=0 | 375x812px (full viewport) | PASS -- side cart fills mobile viewport correctly |

**Add to Cart behavior:** After clicking "Add to Cart", a **side cart dialog** appears as a full-viewport overlay. This is a positive mobile experience -- the side cart:
- Fills the entire 375x812 viewport (no overflow)
- Shows product image (75x100px), name, price, selected options (Size, Color)
- Includes quantity controls (decrement/increment + spinbutton)
- Has a "Remove" button (24x27px -- below 44px minimum)
- Shows promo code entry
- Displays estimated total at bottom
- Has a "View Cart" button (335x44px) -- meets WCAG tap target minimum
- Has a "Close cart" button (24x28px -- below 44px minimum)

### Side Cart Measurements (375x812)

| Element | X | Y | Width | Height | Tap Target | Status |
|---------|---|---|-------|--------|------------|--------|
| Side cart dialog | 0 | 0 | 375 | 812 | N/A | PASS -- full viewport |
| Cart heading "Cart (1 item)" | 20 | 20 | ~200 | 28 | N/A | PASS |
| Close cart button (X) | 331 | 20 | 24 | 28 | 24x28px | FAIL -- below 44px |
| Product image | 21 | 90 | 75 | 100 | N/A | PASS |
| Product name link | 110 | 90 | ~200 | 20 | N/A | PASS |
| Price | 110 | 130 | ~50 | 20 | N/A | PASS |
| Remove button (trash) | 331 | 89 | 24 | 27 | 24x27px | FAIL -- below 44px |
| Quantity decrement | ~110 | 220 | ~30 | ~30 | ~30x30px | FAIL -- below 44px |
| Quantity increment | ~170 | 220 | ~30 | ~30 | ~30x30px | FAIL -- below 44px |
| Promo code button | 20 | 645 | 335 | 22 | 335x22px | FAIL -- height below 44px |
| Estimated total | 20 | 708 | 335 | 40 | N/A | PASS |
| "View Cart" button | 20 | 748 | 335 | 44 | 335x44px | PASS -- meets 44px minimum |

**Side Cart Summary:** The side cart is the best mobile component on the site. It fills the viewport and has a usable layout. However, 5 of its interactive elements are below the 44px tap target minimum.

### Cart Page Measurements (375x812)

**URL:** `/cart-page`
**Body scroll width:** 981px (606px overflow)

| Element | X | Y | Width | Height | Visible at 375px? |
|---------|---|---|-------|--------|-------------------|
| "My cart" heading | 0 | 184 | 980 | 28 | Partially (left side) |
| Product image | 1 | 254 | 75 | 100 | YES |
| Product name "Lifting Chakras" | 92 | 253 | 691 | 24 | Partially (truncated) |
| Product price | 92 | 289 | 43 | 20 | YES |
| Product options (Size/Color) | 92 | 313 | 864 | 49 | Partially |
| Quantity decrement | 93 | 383 | 24 | 26 | YES but too small |
| Quantity increment | 147 | 383 | 24 | 26 | YES but too small |
| Item total price | 906 | 389 | 50 | 22 | NO -- 531px off-screen |
| Remove button | 956 | 253 | 24 | 27 | NO -- 581px off-screen |
| "Enter a promo code" | 0 | 452 | 980 | 24 | Partially |
| "Add a note" | 0 | 488 | 980 | 24 | Partially |
| Subtotal label | 0 | ~565 | 930 | -- | YES (label only) |
| Subtotal value "$25.50" | 930 | ~565 | 50 | -- | NO -- 555px off-screen |
| Delivery value "$11.95" | 930 | ~600 | 50 | -- | NO -- 555px off-screen |
| Total value "$37.45" | 918 | ~710 | 62 | 36 | NO -- 543px off-screen |
| "Checkout" button | 0 | 794 | 980 | 42 | Partially (left portion) |
| Apple Pay button | 0 | 848 | 750 | 42 | Partially (icon cut off) |
| PayPal button | 0 | 902 | 750 | 42 | Partially (text cut off) |
| More Payment Options | ~300 | ~975 | -- | -- | Partially |

**Cart Page Critical Issues:**
1. **All dollar amounts are off-screen** -- Subtotal, Delivery, and Total values positioned at x=918-930 (555+ pixels past viewport edge). Customer cannot see what they owe.
2. **Remove button off-screen** at x=956 -- customer cannot remove items without horizontal scrolling
3. **Item total price off-screen** at x=906
4. **Quantity buttons 24x26px** -- well below 44px WCAG minimum
5. **Checkout button 980px wide** -- extends beyond viewport but left portion is clickable
6. **Express checkout buttons 750px wide** -- Apple Pay and PayPal partially visible, text/icons clipped

### Checkout Page (375x812)

**URL:** `/checkout`
**Body scroll width:** 980px
**Requires active cart session** -- cannot be loaded with empty cart

**Positive Finding:** The WIX checkout page uses its **own separate responsive layout** that is distinct from the site's main template. When loaded:
- The checkout header (logo + "CHECKOUT" + "Continue Browsing") fits within the 375px viewport
- Content area is centered and uses responsive width
- Error messaging ("We couldn't load the checkout") renders properly on mobile

**Cannot fully audit checkout form fields** without completing a purchase. Based on the checkout page structure observed:

| Element | Position | Notes |
|---------|----------|-------|
| Checkout heading "CHECKOUT" | x=94, y=28, width=119 | PASS -- within viewport |
| "Continue Browsing" link | x=~250, y=~40 | PASS -- within viewport |
| Checkout form section | Responsive | Uses own layout, separate from site template |
| Order summary region | Responsive | Uses own layout |

**Key Finding:** The WIX checkout page (`/checkout`) appears to handle its own responsive layout independently of the site template. This means the main mobile layout fix (CR-1 resolution) should NOT negatively affect checkout, and checkout may already render acceptably on mobile once items are in the cart.

### Sezzle BNPL Widget (CK-5)

| Metric | Value | Status |
|--------|-------|--------|
| Widget present on product page | YES | Loaded after initial page render |
| Text | "or 4 interest-free payments of $6.38" | Correct |
| Position | x=288, y=1058 | FAIL -- starts 288px from left, extends to x=503 |
| Visible at 375px | Partially (left ~87px of 216px widget visible) | FAIL |
| "Learn More" button | Present | Positioned within widget, partially visible |
| Payment method logo | Present | Shows Sezzle logo image |

**Sezzle Finding:** The Sezzle BNPL widget IS present and loads correctly, but it is positioned within the product info column at x=288. On mobile (375px viewport), only the left ~87px of the 216px widget is visible. The text "or 4 interest-free" is partially visible, but "$6.38" and the logo are cut off. Once mobile layout is fixed (stacked vertical layout), the Sezzle widget should display fully within the viewport.

### Payment Methods Detected on Cart Page

| Method | Element | Position | Width | Status |
|--------|---------|----------|-------|--------|
| Standard Checkout | Button "Checkout" | x=0, y=794 | 980px | Partially visible |
| Apple Pay | Express checkout button | x=0, y=848 | 750px | Partially visible |
| PayPal | Express checkout iframe | x=0, y=902 | 750px | Partially visible |
| Pay Later (PayPal) | Express checkout | x=0, y=579 | 750px | Partially visible |
| Venmo | Express checkout | x=0, y=633 | 750px | Partially visible |
| Google Pay | Express checkout button | x=0, y=687 | 750px | Partially visible |

**Payment Methods Summary:** 6 payment options are available. All are partially visible at 375px but text/icons are clipped on the right side due to the 750-980px width layout. All express checkout buttons are 42px height -- just below the 44px WCAG minimum.

---

## 2. Cart Page Optimization

### WIX Editor Instructions for Mobile Cart Layout

The cart page uses the WIX Stores Cart App widget. Configuration is through the WIX Editor.

#### Step 1: Switch to Mobile Editor View

1. Open WIX Dashboard: `https://manage.wix.com/dashboard/c744cbdb-46f8-4c66-ac76-eb31bd0d52c1`
2. Click **Edit Site** to open the WIX Editor
3. Click the **mobile phone icon** in the top toolbar to switch to Mobile Editor view
4. Navigate to the **Cart Page** (`/cart-page`) in the editor page list

#### Step 2: Configure Cart Layout for Mobile

1. Click on the **Cart widget** to select it
2. Open **Settings** (gear icon)
3. Under **Layout** settings:
   - Ensure the cart uses a **stacked/vertical layout** on mobile
   - The cart item row should stack: image + info on one line, quantity + price below
   - Set the cart widget to **full width** (100% of mobile viewport)
4. Under **Design** settings:
   - Verify text sizes are readable on mobile (minimum 14px body text)
   - Ensure adequate spacing between cart items

#### Step 3: Fix Order Summary Visibility

The order summary (Subtotal, Delivery, Total) currently positions dollar amounts at x=930+ which is off-screen on mobile.

1. In Mobile Editor, click on the **Order Summary** section of the cart
2. Look for layout settings that control the label-value pairs:
   - Labels (Subtotal, Delivery, Total) should be left-aligned
   - Values ($25.50, $11.95, $37.45) should be right-aligned **within the viewport width**
   - Both labels and values must be visible without horizontal scrolling
3. If the cart widget does not expose separate summary layout settings:
   - The fix depends on the overall mobile layout fix (CR-1)
   - Once the site uses responsive layout, the cart widget should reflow within viewport

#### Step 4: Ensure Checkout Button Accessibility

1. The "Checkout" button should be:
   - **Full width** within the mobile viewport (375px minus padding)
   - **44px minimum height** (currently 42px -- increase to 44px+)
   - Clearly visible without horizontal scrolling
   - Positioned after the order summary total
2. Express checkout buttons (Apple Pay, PayPal, Venmo, Google Pay):
   - Should also be **full width** within the mobile viewport
   - Each button should be 44px+ height
   - Payment logos should be centered and fully visible

#### Step 5: Increase Tap Target Sizes

Several cart interactive elements are below the 44px WCAG minimum:

| Element | Current Size | Target Size |
|---------|-------------|-------------|
| Quantity decrement button | 24x26px | 44x44px minimum |
| Quantity increment button | 24x26px | 44x44px minimum |
| Remove item button | 24x27px | 44x44px minimum |
| Promo code button | 980x24px | Full-width x 44px |
| Add a note button | 980x24px | Full-width x 44px |

1. In the Mobile Editor, check if these elements have size settings:
   - Click on the quantity selector area
   - Look for **Button Size**, **Tap Target**, or **Padding** settings
   - Increase button dimensions or padding to meet 44px minimum
2. If the WIX Cart widget does not expose individual element sizing:
   - This is a WIX platform limitation
   - Document as a known issue for the store owner
   - The quantity controls and remove button may need WIX support or custom code

---

## 3. Side Cart Optimization

The side cart (mini-cart drawer) is the best-performing mobile component on the site. It correctly fills the viewport. Minor improvements needed:

### Touch Target Improvements

1. **Close cart button (X):** Currently 24x28px
   - In WIX Editor, check if the side cart close button size is configurable
   - If possible, increase to 44x44px
   - Add transparent padding around the button if direct resizing is not available

2. **Remove item button (trash icon):** Currently 24x27px
   - Same approach as close button
   - Increase to 44x44px if the WIX editor allows

3. **Quantity buttons:** Currently ~30x30px in side cart
   - Increase to 44x44px if configurable
   - Ensure adequate spacing between decrement and increment buttons

4. **Promo code button:** Currently 335x22px (height too small)
   - Increase height to 44px minimum

### Side Cart Content Optimization

The side cart content is well-organized. No structural changes needed, only tap target sizes:
- Product image (75x100px) -- adequate for mobile identification
- Product name is readable
- Price is visible
- Selected options (Size, Color) are displayed
- Estimated total is visible at bottom
- "View Cart" button (335x44px) meets WCAG minimum

---

## 4. Checkout Page Optimization

### Key Finding: WIX Checkout Has Separate Responsive Layout

The WIX checkout page (`/checkout`) uses its own layout system that is separate from the main site template. This means:

1. **The checkout page is NOT affected by the site's fixed 980px layout** -- it has its own responsive behavior
2. **The main mobile layout fix (CR-1) should not break checkout** -- changes are isolated
3. **Checkout may already render acceptably on mobile** once items are in cart (could not verify without completing a purchase)

### Recommended Checkout Audit After Mobile Layout Fix

Once the Phase 3 mobile fixes are applied (responsive layout, mobile menu, product page stacking), perform a complete checkout audit:

1. **Add a product to cart** on mobile
2. **Navigate to checkout** via the cart page "Checkout" button
3. **Verify these elements at 375px viewport:**

| Element | Target | Check |
|---------|--------|-------|
| Customer email field | Full width, 44px+ height | Can type email address |
| Shipping address fields | Full width, 44px+ height | All fields visible |
| Delivery method selector | Full width, readable | Can select shipping option |
| Payment method fields | Full width within viewport | Credit card fields visible |
| Sezzle BNPL option | Full width, logo visible | Shows payment plan info |
| Order summary | Within viewport, all values visible | Subtotal, shipping, total |
| "Place Order" button | Full width, 44px+ height, prominent | Easy to find and tap |
| Policy area | Below place order, readable | (Currently empty per CK-1) |

### Checkout Form Guidelines

If the checkout form needs mobile optimization after the layout fix:

1. **Form field sizing:**
   - All input fields should be **full width** within the content area
   - Minimum **44px height** for all input fields and dropdowns
   - **16px font size minimum** to prevent iOS auto-zoom on focus
   - Adequate spacing between fields (minimum 12px)

2. **Payment section:**
   - Credit card fields should stack vertically on mobile (card number, expiration, CVV)
   - Sezzle BNPL widget should display full-width with readable text
   - Express checkout options (Apple Pay, Google Pay) should be prominently placed

3. **Order summary on checkout:**
   - Should be expandable/collapsible on mobile (save vertical space)
   - Product thumbnail, name, quantity, and price should be visible
   - Total should be prominent and always visible

4. **"Place Order" button:**
   - Full viewport width (minus padding)
   - 44px+ height
   - High-contrast color (currently the site uses dark teal/green)
   - Consider making it **sticky** at the bottom of the viewport

---

## 5. Verification Checklist

After completing cart and checkout optimization, verify the following on a real mobile device or using Chrome DevTools at 375x812:

### Side Cart (Mini-Cart Drawer)

- [ ] Side cart opens after adding item to cart
- [ ] Side cart fills the entire mobile viewport (no overflow)
- [ ] Product image, name, price, and options are visible
- [ ] Close button (X) is at least 44x44px tap target
- [ ] Remove button (trash) is at least 44x44px tap target
- [ ] Quantity buttons are at least 44x44px tap targets
- [ ] "View Cart" button is at least 44px height
- [ ] Estimated total is visible
- [ ] Promo code area is tappable (44px+ height)

### Cart Page

- [ ] Zero horizontal scrolling (body width = viewport width)
- [ ] "My cart" heading is fully visible
- [ ] Product image is visible and recognizable
- [ ] Product name is fully readable (not truncated off-screen)
- [ ] Product price is visible within viewport
- [ ] Selected options (Size, Color) are visible
- [ ] Quantity controls are accessible and 44px+ tap targets
- [ ] Item total price is visible within viewport
- [ ] Remove button is accessible within viewport
- [ ] Subtotal value is visible (not off-screen)
- [ ] Delivery cost is visible
- [ ] Total value is visible and prominent
- [ ] "Checkout" button is full width and 44px+ height
- [ ] Express checkout buttons (Apple Pay, PayPal) are fully visible
- [ ] Promo code and note buttons are tappable

### Checkout Page

- [ ] Checkout page loads correctly from cart
- [ ] All form fields are full-width and 44px+ height
- [ ] Input text is 16px+ (prevents iOS auto-zoom)
- [ ] Shipping address fields are accessible
- [ ] Payment method area is within viewport
- [ ] Sezzle BNPL widget displays correctly (CK-5)
- [ ] Order summary is visible (expandable/collapsible OK)
- [ ] "Place Order" button is full-width and prominent
- [ ] No horizontal scrolling on checkout page

### Complete Flow Test

- [ ] Can browse to a product on mobile
- [ ] Can select variant options (size, color)
- [ ] Can tap "Add to Cart" without horizontal scrolling
- [ ] Side cart appears with correct product details
- [ ] Can navigate to full cart page
- [ ] Can see all order details (items, subtotal, delivery, total)
- [ ] Can proceed to checkout
- [ ] All checkout steps are accessible on mobile
- [ ] Can reach the "Place Order" button

---

## 6. Expected Result

After completing these optimizations, the mobile cart and checkout flow should transform from:

**Before (Current State):**
- Cart icon at x=946 (571px off-screen on mobile)
- Side cart: Works well but 5 elements below 44px tap target
- Cart page: All dollar amounts off-screen (x=918-930)
- Cart page: Remove button off-screen (x=956)
- Cart page: Quantity buttons 24x26px (below 44px minimum)
- Cart page: Checkout button 980px wide
- Cart page: Express checkout buttons 750px wide, clipped
- Checkout page: Uses separate responsive layout (potentially OK)
- Sezzle BNPL: Positioned off-screen at x=288 on mobile

**After (Target State):**
- Cart icon accessible within mobile viewport header
- Side cart: All elements meet 44px tap target minimum
- Cart page: Responsive layout, all content within viewport
- Cart page: Order summary values visible (Subtotal, Delivery, Total)
- Cart page: Remove and quantity controls accessible and 44px+
- Cart page: Checkout and express buttons full-width
- Checkout page: Verified responsive on mobile
- Sezzle BNPL: Full-width display within mobile viewport

### Impact Estimates

| Fix | Effort | Impact |
|-----|--------|--------|
| Cart page responsive layout | Involved (30-60 min) | HIGH -- customers can see what they owe |
| Side cart tap targets | Medium (15-30 min) | MEDIUM -- improves usability of existing good component |
| Checkout verification | Quick (5 min) | LOW -- likely already responsive |
| Sezzle visibility | Auto-fix with layout | MEDIUM -- BNPL visibility supports conversion |

### Dependency Note

Most cart page mobile issues are **secondary symptoms of the root cause identified in CR-1** (fixed 980px desktop layout). Once the mobile responsive layout is activated via WIX Mobile Editor:
1. The cart page widget should reflow within the viewport
2. Order summary values should be visible
3. Express checkout buttons should be full-width
4. Sezzle widget should display within the product info area

The side cart already works well because it uses its own overlay layout independent of the site template.

---

## Reference Documents

- **MOBILE-NAV-OPTIMIZATION.md** (Phase 3, Plan 03-01) -- Mobile menu and header optimization
- **MOBILE-PRODUCT-PAGES.md** (Phase 3, Plan 03-02) -- Product gallery and detail page optimization
- **GALLERY-STANDARDIZATION.md** (Phase 2, Plan 02-05) -- Add to Cart button settings
- **UX-ISSUES.md** (Phase 1, Plan 01-03) -- Original issue identification (CK-5, CR-1)

---

*Generated by Plan 03-03 execution (Task 1). Requires manual completion in WIX Editor.*
*Must be done AFTER completing MOBILE-NAV-OPTIMIZATION.md and MOBILE-PRODUCT-PAGES.md.*
*References: UX-ISSUES.md (CK-5, CR-1), MOBILE-PRODUCT-PAGES.md (product page layout fixes)*
