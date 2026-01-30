# Checkout Policies Configuration Log

**Date:** 2026-01-30
**Plan:** 04-01 (Checkout & Conversion Optimization)
**API Endpoint:** `PATCH https://www.wixapis.com/ecom/v1/checkout-settings`
**Site ID:** `c744cbdb-46f8-4c66-ac76-eb31bd0d52c1`

## Baseline (Before)

All 6 checkout policy slots were empty and hidden:
- termsAndConditions: `visible: false`, content: `""`
- privacyPolicy: `visible: false`, content: `""`
- returnPolicy: `visible: false`, content: `""`
- digitalItemPolicy: `visible: false`, content: `""`
- contactUs: `visible: false`, content: `""`
- customPolicy: `visible: false`, content: `""`, title: `""`

## Changes Applied

### 1. Terms and Conditions (visible: true)
By placing an order with HotBox Clothing, you agree to these terms. All products are custom-decorated apparel made to order. Orders are processed within 5-10 business days. Prices are subject to change without notice. We reserve the right to cancel orders if items become unavailable from our supplier. All sales are subject to product availability.

### 2. Privacy Policy (visible: true)
HotBox Clothing respects your privacy. We collect only the information necessary to process your order: name, email, shipping address, and payment details. We do not sell or share your personal information with third parties except as needed to fulfill your order (shipping carriers, payment processors). Contact us at any time to request your data be updated or deleted.

### 3. Return Policy (visible: true)
Custom-decorated apparel is made to order and is non-refundable unless the item is defective or we made an error. If you receive a defective or incorrect item, contact us within 14 days of delivery with photos of the issue. We will replace the item or issue a full refund at our discretion. Sizing exchanges may be available -- contact us to discuss options.

### 4. Digital Item Policy (visible: false)
Not applicable -- HotBox sells physical apparel only. Kept hidden.

### 5. Contact Us (visible: true)
Have questions about your order, sizing, or our products? Reach out to us! Email: Visit our Contact page for the latest contact information. We typically respond within 1-2 business days.

### 6. Custom Policy - "Shipping Policy" (visible: true)
Orders are shipped via USPS or UPS. Standard shipping typically takes 7-14 business days (5-10 days production + 2-4 days shipping). Shipping costs are calculated at checkout based on your location and order weight. Local pickup may be available for select orders -- contact us for details.

## Verification

- GET checkout settings confirmed all 5 active policies have `visible: true` and non-empty content
- digitalItemPolicy confirmed `visible: false`
- `updatedDate: 2026-01-30T17:37:33.349Z`

## Impact

- Resolves CK-1 (zero checkout policies) from Phase 1 audit
- 5 of 6 checkout policy slots populated with content appropriate for a custom apparel business
- Policies appear as clickable links in checkout page footer
