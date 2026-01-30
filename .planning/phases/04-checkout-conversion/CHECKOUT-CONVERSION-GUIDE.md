# Checkout & Conversion Optimization Guide

**Phase:** 04 - Checkout & Conversion Optimization
**Date:** 2026-01-30
**Status:** Ready for execution
**Audience:** Store owner -- follow this guide to complete all remaining checkout and conversion optimizations
**Estimated Total Effort:** 1-2 hours in WIX Dashboard + WIX Editor

---

## Executive Summary

Phase 4 addressed checkout and conversion optimization across three automated plans. Two major conversion issues were resolved via the WIX REST API:

- **CK-1 (Zero Checkout Policies):** All 5 checkout policies configured and live (Plan 04-01)
- **CK-2 (No Size Guide):** Brand-specific size guides added to all 105 products (Plan 04-02)

This guide covers all **remaining** checkout and conversion optimizations that cannot be automated via API and require manual configuration in the WIX Dashboard or WIX Editor. These are organized by priority and implementation method.

### What Was Already Automated (Phase 4)

| Item | Plan | Status | Method |
|------|------|--------|--------|
| Terms & Conditions policy | 04-01 | DONE | API |
| Privacy Policy | 04-01 | DONE | API |
| Return Policy | 04-01 | DONE | API |
| Contact Us policy | 04-01 | DONE | API |
| Shipping Policy (custom slot) | 04-01 | DONE | API |
| Bella+Canvas size guide (15 products) | 04-02 | DONE | API |
| Next Level size guide (12 products) | 04-02 | DONE | API |
| Gildan size guide (15 products) | 04-02 | DONE | API |
| Sport-Tek size guide (5 products) | 04-02 | DONE | API |
| District size guide (6 products) | 04-02 | DONE | API |
| 10 additional brand size guides | 04-02 | DONE | API |
| "How to Measure" instructions | 04-02 | DONE | API |

### What Remains (This Guide)

| Priority | Item | Method | Effort |
|----------|------|--------|--------|
| HIGH | Abandoned Cart Recovery Emails | WIX Dashboard | 15-20 min |
| HIGH | CK-3: Variant Image Switching | WIX Editor | 30-60 min |
| MEDIUM | Order Confirmation Emails | WIX Dashboard | 10-15 min |
| MEDIUM | Shipping Settings & Display | WIX Dashboard | 10-15 min |
| MEDIUM | Trust Signals on Product Pages | WIX Editor | 15-30 min |
| LOW | Cart Page Upsell/Cross-Sell | WIX Editor | 15-30 min |
| LOW | Free Shipping Threshold | WIX Dashboard | 5-10 min |
| **Total** | | | **1.5-3 hours** |

---

## Current State: Audit Results (Plan 04-03)

### Audit Method
- **Viewport:** 1440x900 (desktop)
- **Tool:** Playwright browser automation
- **Date:** 2026-01-30
- **Flow tested:** Product Page > Add to Cart > Cart Page > Checkout Page

### Product Page Audit

**Product tested:** BELLA+CANVAS Unisex Jersey Long Sleeve Hoodie ($29.00)
**URL:** `/product-page/bella-canvas-unisex-jersey-long-sleeve-hoodie`

| Element | Present | Status | Notes |
|---------|---------|--------|-------|
| Product image gallery | YES | OK | 2 images with dot navigation |
| Product name (H1) | YES | OK | Correct heading level |
| Price | YES | OK | $29.00 clearly displayed |
| Sezzle BNPL widget | YES | OK | "or 4 interest-free payments of $7.25" with Learn More button |
| Product description | YES | OK | With "Read more" expand button |
| Color options | YES | OK | Black, Deep Heather radio buttons |
| Size dropdown | YES | OK | XS through 2XL options |
| Quantity selector | YES | OK | Decrement/Increment with spinbutton |
| Add to Cart button | YES | OK | Full width, prominent |
| SKU display | YES | OK | "SKU: BC3512" |
| Size guide info section | YES | OK | Bella+Canvas-specific chart with measurements (from 04-02) |
| How to Measure section | YES | OK | Measurement instructions (from 04-02) |
| Social sharing links | YES | OK | Facebook, Pinterest, WhatsApp, X |
| Breadcrumb navigation | YES | OK | Home / Board 30 / Product Name |
| Prev/Next navigation | YES | OK | Links to adjacent products |
| **Variant image switching** | **NO** | **CK-3** | Selecting "Deep Heather" changed label but gallery images stayed the same |
| **Trust badges** | **NO** | **Missing** | No secure checkout badge, no payment icons, no guarantee badge |
| **Customer reviews** | **NO** | **Missing** | Zero review elements on page |
| **Shipping info** | **NO** | **Missing** | No shipping estimate or free shipping info |
| **Wishlist/Save** | **NO** | **Missing** | No save-for-later functionality |

### Cart Page Audit

**URL:** `/cart-page`

| Element | Present | Status | Notes |
|---------|---------|--------|-------|
| "My cart" heading (H1) | YES | OK | |
| Product images | YES | OK | Thumbnail for each item |
| Product names (linked) | YES | OK | Links back to product pages |
| Item prices | YES | OK | Individual item prices displayed |
| Selected options (Color/Size) | YES | OK | Listed under each item |
| Quantity controls | YES | OK | Decrement/Increment per item |
| Item total price | YES | OK | Per-item line total |
| Remove button | YES | OK | "remove [product] from cart" button |
| Promo code entry | YES | OK | "Enter a promo code" expandable |
| Add a note | YES | OK | "Add a note" expandable |
| **Order Summary** | YES | OK | Separate complementary section |
| Subtotal | YES | OK | $54.00 |
| Delivery cost | YES | OK | $11.95 (Priority Mail) |
| Delivery destination | YES | OK | "New Mexico, United States" with change button |
| Shipping method selector | YES | OK | Combobox: "Priority Mail - $11.95" |
| Total | YES | OK | $65.95 with live status region |
| Checkout button | YES | OK | "Secure Checkout" with lock styling |
| Apple Pay | YES | OK | Express checkout button |
| PayPal | YES | OK | Express checkout iframe |
| More Payment Options | YES | OK | Expandable for additional methods |
| "Secure Checkout" badge | YES | OK | Lock icon + text at bottom |
| **Upsell/Cross-sell** | **NO** | **Missing** | No "You might also like" suggestions |
| **Free shipping message** | **NO** | **Missing** | No threshold messaging (e.g., "Spend $X more for free shipping") |

### Checkout Page Audit

**URL:** `/checkout?checkoutId=...`

| Element | Present | Status | Notes |
|---------|---------|--------|-------|
| Store logo | YES | OK | Links to homepage |
| "CHECKOUT" heading (H1) | YES | OK | |
| "Continue Browsing" link | YES | OK | Links to homepage |
| **Express Checkout** | YES | OK | Apple Pay, PayPal, Pay Later, Venmo, Google Pay |
| "Have an account? Log in" | YES | OK | Login prompt for returning customers |
| **Customer Details Form** | | | |
| Email field | YES | OK | Required |
| First name | YES | OK | Required |
| Last name | YES | OK | Required |
| Phone | YES | OK | Required |
| **Delivery Details** | | | |
| Country/Region | YES | OK | Combobox, default: United States |
| Address | YES | OK | Autocomplete combobox |
| City | YES | OK | Required |
| State | YES | OK | Combobox, default: New Mexico |
| Zip/Postal code | YES | OK | Pre-filled: 87112 |
| Continue button | YES | OK | Advances to delivery method |
| **Delivery Method** | YES | OK | Section with heading + separator |
| **Payment** | YES | OK | Section heading visible |
| **Order Summary (sidebar)** | | | |
| Item count | YES | OK | "(2 items)" |
| Edit Cart link | YES | OK | Returns to cart page |
| Item thumbnails | YES | OK | Product images with quantity badge |
| Item names | YES | OK | Product names |
| Item prices | YES | OK | Individual prices |
| Item options (Qty/Color/Size) | YES | OK | With "Show More" expand |
| Promo code entry | YES | OK | "Enter a promo code" |
| Gift card redemption | YES | OK | "Redeem a gift card" |
| Subtotal | YES | OK | $54.00 |
| Delivery | YES | OK | $11.95 |
| Tax | YES | OK | $4.19 |
| Total | YES | OK | $70.14 |
| **Policy Links (04-01)** | YES | OK | All 5 visible in footer |
| Terms & Conditions | YES | OK | Clickable |
| Privacy Policy | YES | OK | Clickable |
| Return Policy | YES | OK | Clickable |
| Contact Us | YES | OK | Clickable |
| Shipping Policy | YES | OK | Clickable |
| "Secure Checkout" badge | YES | OK | Lock icon + text |

### Payment Methods Detected

| # | Method | Location | Status |
|---|--------|----------|--------|
| 1 | Credit/Debit Card | Checkout form (Payment section) | Available |
| 2 | Apple Pay | Express checkout | Available |
| 3 | PayPal | Express checkout (iframe) | Available |
| 4 | PayPal Pay Later | Express checkout (iframe) | Available |
| 5 | Venmo | Express checkout (iframe) | Available |
| 6 | Google Pay | Express checkout | Available |
| 7 | Sezzle BNPL | Product page widget | Available (4 payments) |

**7 payment methods available** -- good variety for conversion optimization.

### WIX API Audit Results

| Setting | API Endpoint | Current Value | Notes |
|---------|-------------|---------------|-------|
| Inventory update trigger | Orders Settings | ON_ORDER_PLACED | Default -- inventory updates when order placed |
| Create invoice | Orders Settings | true | Invoices generated automatically |
| Orders settings created | Orders Settings | 2024-01-15 | Original setup date |
| Checkout policies | Checkout Settings | All 5 visible | Configured in 04-01 |
| Policy agreement checkbox | Checkout Settings | Visible, checked by default | |
| Gift card redemption | Checkout Settings | Enabled | |
| Abandoned checkouts recorded | Abandoned Checkout API | 0 results | No abandoned checkout data found |

---

## Priority 1: HIGH -- WIX Dashboard Configuration

### 1.1: Abandoned Cart Recovery Emails

**Issue:** Zero abandoned checkouts recorded. Abandoned cart recovery is either not enabled or has no historical data.
**Impact:** HIGH -- Abandoned cart emails recover 5-15% of abandoned carts industry-wide. This is the single highest-ROI conversion optimization available.
**Effort:** 15-20 minutes
**Method:** WIX Dashboard (no Editor needed)

**Steps:**

1. Open WIX Dashboard: `https://manage.wix.com/dashboard/c744cbdb-46f8-4c66-ac76-eb31bd0d52c1`
2. Navigate to **eCommerce** > **Abandoned Checkouts** (or **Automations** in the left sidebar)
3. Look for **"Send abandoned cart emails"** automation
4. If the automation does not exist:
   a. Click **Create New Automation** (or **+ New Automation**)
   b. Select trigger: **"Abandoned Checkout Created"** or **"Cart Abandoned"**
   c. Set timing: **1 hour** after abandonment (first email)
   d. Configure email content:
      - Subject: "You left something behind at HotBox Clothing!"
      - Include the product image and name from the abandoned cart
      - Include a direct link back to the checkout
      - Use the brand voice (friendly, casual, creative)
      - Consider including a **5-10% discount code** for first recovery attempt
   e. **Optional second email:** Set a 24-hour follow-up if the first email is not recovered
5. If the automation already exists, verify it is **turned ON**
6. Test by:
   a. Add an item to cart
   b. Start checkout (enter email)
   c. Abandon the checkout (close tab)
   d. Wait for recovery email to arrive (check within 1-2 hours)

**Alternative Location:** WIX Dashboard > **Automations** > Search for "abandoned" or "cart recovery"

**Why this matters:** The WIX Abandoned Checkout API tracks when customers start checkout but don't complete it. Currently showing 0 abandoned checkouts, which means either the feature is not activated or has been recently reset. Enabling this creates a direct revenue recovery channel.

---

### 1.2: CK-3 -- Variant Image Switching

**Issue:** Selecting a different color variant does NOT change the product gallery image. When testing the BELLA+CANVAS Long Sleeve Hoodie, selecting "Deep Heather" updated the color label but the gallery continued showing the same images.
**Impact:** HIGH -- Customers cannot preview their color choice before purchasing. This increases return rates and reduces purchase confidence.
**Effort:** 30-60 minutes
**Method:** WIX Editor + Product Media Management

**This fix requires TWO parts:**

**Part A: Ensure each variant has its own images (WIX Dashboard)**

1. Open WIX Dashboard: `https://manage.wix.com/dashboard/c744cbdb-46f8-4c66-ac76-eb31bd0d52c1`
2. Navigate to **Store Products** > Select a product (e.g., BELLA+CANVAS Unisex Jersey Long Sleeve Hoodie)
3. In the product editor, go to the **Media** section
4. For each color variant, you need a product image showing that specific color:
   - If you have mockup images for each color: Upload them
   - If using the same mockup for all colors: You need color-specific mockup images from your decorator or mockup tool
5. After uploading images, **link each image to its corresponding variant:**
   - Look for an "Assign to option" or "Link to variant" option in the media manager
   - Assign the black mockup to the Black variant
   - Assign the heather mockup to the Deep Heather variant
   - Repeat for all color options on each product

**Part B: Enable gallery-to-variant linking (WIX Editor)**

1. Open WIX Editor (click **Edit Site** from Dashboard)
2. Navigate to a **Product Page** in the editor
3. Click on the **Product Gallery** widget
4. Open **Settings** (gear icon)
5. Look for one of these settings:
   - "Link gallery images to product options"
   - "Show variant images"
   - "Update gallery on option change"
6. **Enable** the gallery-variant link
7. Save and publish

**Note:** Both parts are required. The gallery setting tells WIX to swap images when a variant is selected, but it only works if each variant has linked images. If products only have one set of mockup images (the same image regardless of color), the gallery switch will have no effect even if enabled.

**Products to prioritize:** Focus on products with multiple color options and distinct visual differences between colors. Products with 2+ color variants benefit most.

---

## Priority 2: MEDIUM -- WIX Dashboard Configuration

### 2.1: Order Confirmation & Shipping Notification Emails

**Issue:** The Orders Settings API shows default settings (created 2024-01-15, never updated). Email notifications may be using generic WIX defaults without HotBox branding.
**Impact:** MEDIUM -- Professional post-purchase emails build trust, reduce "where's my order?" inquiries, and encourage repeat purchases.
**Effort:** 10-15 minutes
**Method:** WIX Dashboard

**Steps:**

1. Open WIX Dashboard
2. Navigate to **eCommerce** > **Settings** > **Email Notifications** (or **Dashboard** > **Email** > **Automated Emails**)
3. Review and customize these email templates:

**a. Order Confirmation Email:**
   - Verify it is **enabled**
   - Customize with HotBox Clothing branding (logo, colors)
   - Include: Order number, items purchased with images, total paid, shipping address
   - Add note: "Your custom apparel is being prepared! Expect 5-10 business days for production."
   - Include link to Return Policy

**b. Shipping Confirmation Email:**
   - Verify it is **enabled**
   - Include: Tracking number and carrier link
   - Add note: "Your HotBox order is on its way!"
   - Include estimated delivery window

**c. Order Shipped/Delivered Emails:**
   - Verify these are enabled if available
   - Customize with branding

4. Send a **test email** to yourself to verify formatting and content

---

### 2.2: Shipping Settings & Display

**Issue:** Shipping shows as "Priority Mail - $11.95" for a $54 order (22% of order value). No free shipping threshold is configured. No shipping estimate on product pages.
**Impact:** MEDIUM -- Unexpected shipping costs are the #1 reason for cart abandonment (48% of shoppers abandon due to extra costs like shipping, per Baymard Institute).
**Effort:** 10-15 minutes
**Method:** WIX Dashboard

**Steps:**

1. Open WIX Dashboard
2. Navigate to **eCommerce** > **Settings** > **Shipping & Fulfillment**
3. Review current shipping rates and regions:
   - What shipping methods are configured?
   - What regions are covered (domestic only? international?)
   - Are rates flat or weight-based?

4. **Consider adding a free shipping threshold:**
   - Common strategy: Free shipping on orders over $75 or $100
   - HotBox average product price is $19-$45, so $75 threshold encourages multi-item purchases
   - Location: Shipping rules > Add condition > "Free shipping when order subtotal exceeds $[amount]"

5. **Consider adding a flat-rate economy option:**
   - Not all customers need Priority Mail ($11.95)
   - A $5.95 USPS First Class option for smaller orders improves conversion
   - Location: Shipping methods > Add shipping method

6. **Verify tax settings:**
   - Current checkout shows Tax: $4.19 on a $54 order (7.76%, consistent with NM tax)
   - Navigate to **eCommerce** > **Settings** > **Tax**
   - Verify tax rates are correctly configured for your shipping regions

---

### 2.3: Trust Signals on Product Pages

**Issue:** Zero trust badges, customer reviews, or security indicators on product pages. The only trust signal is the "Secure Checkout" badge on the cart and checkout pages.
**Impact:** MEDIUM -- Trust signals increase conversion by 10-15% on product pages where the purchase decision is made.
**Effort:** 15-30 minutes
**Method:** WIX Editor

**Steps:**

1. Open WIX Editor
2. Navigate to the **Product Page template**
3. Below the "Add to Cart" button, add a trust section:

**Option A: Text-based trust signals (Quick)**
   - Add a text element below Add to Cart with:
     ```
     Secure Checkout | Free Returns on Defective Items | Custom Made to Order
     ```
   - Style in a muted/gray color, smaller font (12-13px)

**Option B: Visual trust badges (Better)**
   - Add a strip/container below Add to Cart
   - Include icons or images for:
     - Lock icon + "Secure Checkout"
     - Payment method logos (Visa, Mastercard, PayPal, Apple Pay, Google Pay)
     - Shield icon + "Made to Order Quality"
   - Look in WIX App Market for "Trust Badge" or "Trust Seal" apps

**Option C: Review system (Best long-term)**
   - Install a WIX product reviews app from the App Market
   - Options: Wix Reviews, Judge.me, Yotpo
   - Enable star ratings on product pages
   - Send post-purchase review request emails
   - Note: This requires actual customer reviews to populate -- plan for 30+ days of collection

4. Save changes to the product page template (applies to all products)

---

## Priority 3: LOW -- Nice-to-Have Improvements

### 3.1: Cart Page Upsell / Cross-Sell

**Issue:** The cart page shows only cart items and order summary. No product suggestions, no "You might also like" or "Complete the look" recommendations.
**Impact:** LOW -- Cart page upsells can increase average order value by 10-30%, but require proper implementation.
**Effort:** 15-30 minutes
**Method:** WIX Editor

**Steps:**

1. Open WIX Editor
2. Navigate to the **Cart Page**
3. Check WIX App Market for cart upsell apps:
   - Search for "cart upsell" or "cross sell"
   - Look for apps that display recommendations on the cart page
4. **Alternative:** Below the cart items, add a **Related Products** or **Best Sellers** widget:
   - WIX has a built-in Related Products widget (used in Phase 2, Plan 02-05)
   - The "From Similar Categories" algorithm was recommended
   - Add this widget below the cart list, above the order summary
5. If no suitable cart-page widget exists, consider a "Customers also bought" section on the product page (already planned in Phase 2 RELATED-PRODUCTS.md guide)

**Note:** This builds on the Related Products work documented in `.planning/phases/02-navigation-product-discovery/RELATED-PRODUCTS.md` (Phase 2, Plan 02-05). Complete that guide first if not already done.

---

### 3.2: Free Shipping Threshold Messaging

**Issue:** No messaging anywhere about free shipping potential. Cart page shows $11.95 shipping without any incentive to increase order value.
**Impact:** LOW -- Free shipping messaging increases average order value and reduces cart abandonment.
**Effort:** 5-10 minutes (if free shipping threshold is configured in 2.2)
**Method:** WIX Dashboard/Editor

**Steps:**

1. **First:** Complete section 2.2 (Shipping Settings) and set up a free shipping threshold
2. WIX may automatically display "Free shipping on orders over $X" messaging -- check after configuring
3. If not automatic, add text to:
   - Product pages: Below the price ("Free shipping on orders over $75!")
   - Cart page: Above the order summary ("Add $X more for free shipping!")
   - Site-wide banner: Consider a top-of-page announcement bar ("Free shipping on orders over $75")

---

## Verification Checklist

After completing all manual fixes, verify the following:

### Product Page Verification
- [ ] **CK-3:** Select a different color variant -- product gallery image should update
- [ ] Trust signals visible below Add to Cart (badges, text, or review stars)
- [ ] Sezzle BNPL widget visible with correct payment amount
- [ ] Size guide info section visible (confirm 04-02 is still live)
- [ ] Shipping info or free shipping threshold visible (if configured)

### Cart Page Verification
- [ ] Products display with images, names, prices, options
- [ ] Order summary shows Subtotal, Delivery, Tax (if applicable), Total
- [ ] Shipping method selector works
- [ ] "Secure Checkout" button is prominent
- [ ] Express checkout options (Apple Pay, PayPal, etc.) are visible
- [ ] Upsell/cross-sell suggestions present (if configured in 3.1)
- [ ] Free shipping messaging present (if configured in 3.2)

### Checkout Page Verification
- [ ] All 5 policy links visible in footer (Terms, Privacy, Return, Contact, Shipping)
- [ ] Express checkout section: Apple Pay, PayPal, Pay Later, Venmo, Google Pay
- [ ] Customer details form: Email, First/Last Name, Phone
- [ ] Delivery details form: Country, Address, City, State, Zip
- [ ] Delivery method selection works
- [ ] Payment section loads correctly
- [ ] Order summary sidebar shows all items with correct totals
- [ ] "Secure Checkout" badge visible
- [ ] Promo code and gift card redemption available

### Post-Purchase Verification
- [ ] Place a test order (or use WIX test mode)
- [ ] Order confirmation email received with HotBox branding
- [ ] Shipping notification email works (when order is fulfilled)
- [ ] Abandoned cart email works (start checkout, abandon, wait 1 hour)

### Complete Flow Test
- [ ] Browse to a product from collection page
- [ ] Select color and size options
- [ ] Add to Cart
- [ ] View cart page -- all details correct
- [ ] Proceed to checkout
- [ ] All form fields accessible
- [ ] Policy links work (click each one)
- [ ] Express checkout buttons functional
- [ ] Can reach Place Order button (do NOT complete a real purchase unless testing)

---

## Conversion Opportunities Summary

### Categorized by Implementation Method

**Already Automated via API (Complete):**
| # | Item | Issue | Plan |
|---|------|-------|------|
| 1 | Terms & Conditions | CK-1 | 04-01 |
| 2 | Privacy Policy | CK-1 | 04-01 |
| 3 | Return Policy | CK-1 | 04-01 |
| 4 | Contact Us | CK-1 | 04-01 |
| 5 | Shipping Policy | CK-1 | 04-01 |
| 6 | Size guides (15 brands) | CK-2 | 04-02 |
| 7 | How to Measure instructions | CK-2 | 04-02 |

**Requires WIX Dashboard (No Editor):**
| # | Item | Priority | Section |
|---|------|----------|---------|
| 1 | Abandoned cart recovery emails | HIGH | 1.1 |
| 2 | Order confirmation email customization | MEDIUM | 2.1 |
| 3 | Shipping notification email customization | MEDIUM | 2.1 |
| 4 | Shipping rates review / free shipping threshold | MEDIUM | 2.2 |
| 5 | Tax settings verification | MEDIUM | 2.2 |
| 6 | Free shipping threshold messaging | LOW | 3.2 |

**Requires WIX Editor:**
| # | Item | Priority | Section |
|---|------|----------|---------|
| 1 | CK-3: Variant image switching | HIGH | 1.2 |
| 2 | Trust signals on product pages | MEDIUM | 2.3 |
| 3 | Cart page upsell/cross-sell | LOW | 3.1 |

**Requires Product Media Upload (WIX Dashboard):**
| # | Item | Priority | Section |
|---|------|----------|---------|
| 1 | Color-specific mockup images per variant | HIGH | 1.2 (Part A) |

**Not Possible / Platform Limitations:**
| # | Item | Reason |
|---|------|--------|
| 1 | Checkout page layout customization | WIX uses its own responsive checkout template |
| 2 | Cart icon position in header | Fixed by WIX template (already positioned by platform) |
| 3 | Express checkout button order | Controlled by WIX payment provider integration |

---

## Execution Order

For maximum conversion impact, complete these fixes in this order:

```
WIX Dashboard (Priority 1-2):
  1. Abandoned Cart Recovery Emails (1.1)      -- HIGH: Direct revenue recovery
  2. Order Confirmation Emails (2.1)            -- MEDIUM: Post-purchase trust
  3. Shipping Settings Review (2.2)             -- MEDIUM: Reduce abandonment

WIX Editor (Priority 1-2):
  4. CK-3: Variant Image Switching (1.2)        -- HIGH: Purchase confidence
  5. Trust Signals on Product Pages (2.3)        -- MEDIUM: Conversion uplift

WIX Dashboard/Editor (Priority 3):
  6. Free Shipping Messaging (3.2)              -- LOW: AOV increase
  7. Cart Page Upsell/Cross-Sell (3.1)          -- LOW: AOV increase
```

**Tip:** Complete Dashboard items (1-3) first since they require no visual editing. Then switch to WIX Editor for items 4-7.

---

## Cross-Reference: Related Phase Documents

| Document | Phase | Relevance |
|----------|-------|-----------|
| CHECKOUT-POLICIES-LOG.md | 04-01 | Full API log of policy configuration |
| 04-01-SUMMARY.md | 04-01 | Policy configuration results |
| 04-02-SUMMARY.md | 04-02 | Size guide assignment results |
| UX-ISSUES.md | 01-03 | Original CK-3, CK-5 issue identification |
| MOBILE-CHECKOUT-FLOW.md | 03-03 | Mobile cart and checkout audit |
| MOBILE-OPTIMIZATION-MASTER.md | 03-03 | Complete mobile optimization guide |
| RELATED-PRODUCTS.md | 02-05 | Related products / cross-selling setup |

---

*Generated by Plan 04-03 execution (Task 2). Covers all remaining checkout and conversion optimizations.*
*Priority 1 items should be completed first for maximum conversion impact.*
*For mobile-specific checkout fixes, see MOBILE-CHECKOUT-FLOW.md and MOBILE-OPTIMIZATION-MASTER.md.*
