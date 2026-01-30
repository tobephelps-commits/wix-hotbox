---
phase: 04-checkout-conversion
plan: 01
subsystem: checkout
tags: [wix-ecom-api, checkout-settings, checkout-policies, trust-signals, conversion-optimization]

# Dependency graph
requires:
  - phase: 01-site-audit-discovery
    provides: CK-1 identification (zero checkout policies as top-5 conversion killer)
  - phase: 03-mobile-optimization
    provides: Checkout flow audit confirming policy absence
provides:
  - "5 checkout policies configured via WIX eCommerce API (terms, privacy, return, contact, shipping)"
  - "CK-1 (zero checkout policies) resolved"
  - "Trust signals added to checkout footer"
affects: [04-checkout-conversion, conversion-optimization]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "WIX Checkout Settings API (PATCH/GET) for policy management"

key-files:
  created:
    - ".planning/phases/04-checkout-conversion/CHECKOUT-POLICIES-LOG.md"
  modified: []

key-decisions:
  - "Used customPolicy slot with title 'Shipping Policy' since WIX has no dedicated shipping policy field"
  - "Digital Item Policy kept hidden (visible: false) since HotBox sells physical apparel only"
  - "Policy content written for custom-decorated apparel business with made-to-order model"

patterns-established:
  - "WIX eCommerce API pattern: GET baseline -> PATCH changes -> GET verification -> Playwright visual verification"

# Metrics
duration: 12min
completed: 2026-01-30
---

# Phase 4 Plan 01: Checkout Policy Configuration Summary

**All 5 checkout policies configured via WIX eCommerce API and verified visible on checkout page as clickable footer links with popup content**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-01-30T17:35:00Z
- **Completed:** 2026-01-30T17:47:00Z
- **Tasks:** 2/2
- **Files modified:** 1

## Accomplishments
- Configured 5 of 6 checkout policy slots via WIX Checkout Settings API (Terms & Conditions, Privacy Policy, Return Policy, Contact Us, Shipping Policy)
- Digital Item Policy correctly kept hidden (not applicable for physical apparel)
- All policies verified via API GET confirming persistence
- Playwright browser automation verified all 5 policy links appear in checkout page footer
- Return Policy popup dialog confirmed displaying exact configured content
- CK-1 (zero checkout policies) from Phase 1 audit fully resolved

## Task Commits

Each task was committed atomically:

1. **Task 1: Retrieve current checkout settings and configure all policies** - `bbf5b07` (feat)
2. **Task 2: Verify checkout policies via Playwright browser automation** - `610fec2` (feat)

## Files Created/Modified
- `.planning/phases/04-checkout-conversion/CHECKOUT-POLICIES-LOG.md` - Complete API change log documenting baseline, changes, and verification results

## Decisions Made
- **Custom Policy as Shipping Policy:** WIX does not have a dedicated shipping policy slot. Used the `customPolicy` field with title "Shipping Policy" to surface shipping information at checkout.
- **Digital Item Policy hidden:** HotBox sells only physical custom-decorated apparel. The digitalItemPolicy slot was explicitly kept hidden (visible: false) to avoid confusing customers.
- **Policy content tailored to business model:** All policy text reflects HotBox's made-to-order custom apparel model (5-10 day production, non-refundable unless defective, 14-day defect reporting window).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Checkout policies are live and visible to customers immediately
- CK-1 resolved; ready for 04-02 (trust signals, urgency elements, and recovery mechanisms)
- No blockers for next plan

---
*Phase: 04-checkout-conversion*
*Completed: 2026-01-30*
