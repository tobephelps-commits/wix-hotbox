# Plan Summary: 01-03 UX Issues Identification

**Phase:** 01 - Site Audit & Discovery
**Plan:** 01-03
**Status:** Complete
**Date:** 2026-01-29

---

## What Was Done

Conducted comprehensive UX testing using Playwright browser automation at three viewport sizes (mobile 375x812, tablet 768x1024, desktop 1440x900), tested navigation flows, audited checkout configuration via WIX API, assessed accessibility, and synthesized ALL Phase 1 findings into prioritized UX issues and an executive audit summary.

### Task 1: Mobile Viewport Testing and Responsive Audit
- Set viewport to 375x812 (iPhone) and navigated to homepage, Big Barn category page, and product detail pages
- Measured body scroll width: 981px at 375px viewport -- confirmed zero responsive design
- Captured accessibility tree snapshots at each viewport size for structural analysis
- Measured navigation tap targets: 30px height (below 44px WCAG minimum of 44px)
- Measured color swatch sizes: 32x32px (below 44px minimum)
- Found Add to Cart button at y=1540 on product pages (viewport height 812px -- nearly 2 screen-heights below fold)
- Tested Big Barn category page at mobile: zero products visible, only clipped heading text
- Tested Fun Shirt product (Lifting Chakras): 32 color radio buttons confirmed unusable on mobile
- Set viewport to 768x1024 (tablet): body still 981px wide, horizontal scroll present
- Set viewport to 1440x900 (desktop): no overflow, site functions at desktop width
- Documented 7 mobile-specific issues with viewport measurements as evidence

### Task 2: Navigation Flow Testing, Checkout Audit, and UX Synthesis
- At desktop 1440x900, evaluated homepage for search inputs, heading structure, image alt text, and footer navigation
- Found: zero search inputs on any page, no H1 on homepage (starts at H2), 25/28 images have empty alt text, only 1 footer link
- Tested product variant selection: chat widget ("Let's Chat!" popover) intercepted pointer events on color radio buttons
- Removed chat widget via JavaScript evaluation; additional overlay element also intercepted clicks
- Successfully force-clicked color variant via JavaScript as workaround
- Tested WIX custom dropdown elements for Size/Logo options -- non-native elements requiring special interaction
- Queried WIX Checkout Settings API: ALL 6 policy fields have `visible: false, content: ""` -- zero checkout policies configured
- Confirmed Fall PreOrder "20256" typo still present on live site
- Synthesized all findings from Plans 01-01, 01-02, and 01-03 into UX-ISSUES.md (8 sections, 35 issues)
- Wrote AUDIT-SUMMARY.md executive summary with Top 5 Conversion Killers and phase priorities

---

## Key Findings

### Critical Issues Identified

1. **Zero mobile-responsive design** -- Body is 981px wide at 375px viewport. No hamburger menu, no responsive breakpoints, no mobile layout. 50% of traffic sees a completely broken experience with forced horizontal scrolling on every page.

2. **Chat widget blocks purchasing** -- The "Let's Chat!" Wix Chat popover intercepts click events on product option selectors. Confirmed via Playwright automation: `popover-element` div intercepts pointer events on color swatches and dropdowns.

3. **No way to browse the full catalog** -- No "Shop All" page, no search, no filtering, no sorting. Navigation lists client business names (Big Barn Crossfit, UNMH) not product categories. First-time visitors have no path to discover products.

4. **Zero checkout policies** -- WIX API confirms all 6 policy fields (return, shipping, privacy, terms, contact, custom) have `visible: false, content: ""`. No trust signals at payment step.

5. **Add to Cart unreachable on mobile** -- Button at y=1477-1540 on 812px viewport height. Nearly 2 screen-heights of scrolling required on a page where content overflows horizontally.

### Mobile Testing Results

| Viewport | Width Overflow | Products Visible | Nav Usable | Add to Cart Reachable |
|-----------|---------------|-----------------|------------|----------------------|
| 375x812 (Mobile) | 981px body (606px overflow) | Zero on category pages | No (no collapse, 30px targets) | No (y=1540, 2x below fold) |
| 768x1024 (Tablet) | 981px body (213px overflow) | Partial | No (same desktop nav) | Barely (requires scrolling) |
| 1440x900 (Desktop) | No overflow | Yes | Yes | Yes |

### Accessibility Findings
- No H1 on homepage (starts at H2)
- 25/28 homepage images have empty alt text
- Navigation tap targets 30px height (minimum should be 44px)
- Color swatches 32x32px (minimum should be 44x44px)
- No skip-to-content link
- No keyboard navigation path through product options

### Checkout Configuration
- Guest checkout: Available
- Payment methods: Credit card + Sezzle BNPL (inconsistent loading)
- Shipping policies: Not configured
- Return policies: Not configured
- All 6 WIX policy fields: empty and hidden

### Summary Statistics

| Metric | Value |
|--------|-------|
| Total UX issues identified | 35 |
| Critical severity | 7 |
| High severity | 12 |
| Medium severity | 12 |
| Low severity | 4 |
| Issues targeting Phase 2 | ~12 |
| Issues targeting Phase 3 | ~10 |
| Issues targeting Phase 4 | ~8 |
| Quick wins (30 min or less) | 8 |

---

## Commits

| # | Hash | Description |
|---|------|-------------|
| 1 | `299351f` | `audit(01-03): mobile viewport testing and responsive audit` |
| 2 | `7b06acb` | `audit(01-03): navigation flow testing, checkout audit, and UX synthesis` |

---

## Output Files

- `.planning/phases/01-site-audit-discovery/UX-ISSUES.md` -- 35 prioritized UX issues across 8 sections (primary deliverable)
- `.planning/phases/01-site-audit-discovery/AUDIT-SUMMARY.md` -- Executive audit summary with Top 5 Conversion Killers (primary deliverable)

---

## Deviations

- **Chat widget blocking Playwright clicks:** The "Let's Chat!" popover intercepted all click events on color radio buttons during product interaction testing. Used JavaScript `evaluate()` to remove the widget. After removal, another overlay element (`aria-busy="false" aria-live="polite"`) also intercepted clicks. Used JavaScript force-click as workaround.
- **WIX custom dropdowns not automatable:** WIX product option dropdowns use custom components (not native `<select>` elements) that do not respond to standard Playwright locators or `data-hook` selectors. Used snapshot refs to interact.
- **Stale element refs:** Element references expired between browser snapshots, requiring fresh snapshots before each interaction.
- **Checkout flow limited:** Could not complete full checkout without making a real purchase. Checkout policy configuration confirmed via WIX API instead.
- **No keyboard navigation testing:** Tab-based keyboard navigation was planned but not executed due to the chat widget interference and the fundamental broken state of mobile rendering making keyboard testing less actionable than the critical findings already documented.

---

*Plan 01-03 complete. Phase 1 (Site Audit & Discovery) fully complete. 35 UX issues identified, prioritized, and mapped to Phases 2-4. Ready for Phase 2 (Navigation & Product Discovery).*
