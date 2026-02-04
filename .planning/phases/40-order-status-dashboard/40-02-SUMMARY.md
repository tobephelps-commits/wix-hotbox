# Plan 40-02 Summary: Pipeline Visualization Dashboard UI

**Status:** COMPLETE
**Date:** 2026-02-04

## Objective

Build pipeline status dashboard UI with visual stages, attention badges, and aging indicators. Transform the Orders tab into an actionable command center showing what needs attention at a glance.

## Completed Tasks

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1-3 | Add pipeline visualization CSS, HTML, and JavaScript | 27409ba | scripts/pipeline/preview.html |
| bugfix | Fix newCount undefined error in loadOrders | 635a29d | scripts/pipeline/preview.html |

## Implementation Details

### CSS Styles Added

**Pipeline Container Styles:**
- `.order-pipeline-container` - Main wrapper with margin and overflow handling
- `.order-pipeline` - Horizontal flex container with gap and dark background
- `.pipeline-stage` - Stage card with flex layout, border-left indicator
- `.pipeline-stage:hover` - Hover effect with transform and shadow
- `.pipeline-stage.active` - Active state with ring highlight

**Stage Header & Count:**
- `.pipeline-stage-header` - Flex row with justify-content: space-between
- `.stage-count` - Badge pill with stage-specific background colors

**Stage Metrics:**
- `.pipeline-stage-metrics` - Grid layout for items/value/oldest display
- Formatted with currency and time-ago displays

**Attention Indicators:**
- `.attention-badge` - Positioned overlay badge for urgent items
- `.attention-badge.pulse` - Pulsing animation for critical items
- `.aging-indicator` - Color-coded bar (green/yellow/red) based on threshold

**Attention Bar:**
- `.attention-bar` - Horizontal bar above pipeline
- `.attention-chip` - Clickable chips for actionable items
- Colors: blue (cart fill), orange (stuck), yellow (awaiting), red (errors)

**Stage Colors:**
- new: #4a90d9 (blue)
- ordered: #9b59b6 (purple)
- received: #8e44ad (purple)
- in-production: #6c63ff (purple)
- packed: #27ae60 (green)
- shipped: #2ecc71 (light green)

### HTML Structure Added

```html
<!-- Pipeline Visualization (Phase 40) -->
<div id="orderPipelineView" class="order-pipeline-container">
  <div id="attentionBar" class="attention-bar"></div>
  <div id="pipelineStages" class="order-pipeline"></div>
</div>
```

### JavaScript Functions Added

**Data Loading:**
- `loadOrderPipelineData()` - Fetches `/api/orders/summary/extended` and stores in `_pipelineData`

**Rendering:**
- `renderPipeline(data)` - Builds stage cards with counts, metrics, aging indicators
- `renderAttentionBar(data)` - Builds actionable chips for attention items

**Utilities:**
- `formatHoursAgo(hours)` - Converts hours to "2h", "1d 4h", "3d" format
- `formatCurrency(amount)` - Formats as "$1,234.56"

**Constants:**
```javascript
var AGING_THRESHOLDS = {
  'new': 48,           // 2 days
  'ordered': 72,       // 3 days
  'received': 48,      // 2 days
  'in-production': 72, // 3 days
  'packed': 24,        // 1 day
  'shipped': 120       // 5 days
};

var PIPELINE_COLORS = {
  'new': '#4a90d9',
  'ordered': '#9b59b6',
  'received': '#8e44ad',
  'in-production': '#6c63ff',
  'packed': '#27ae60',
  'shipped': '#2ecc71'
};
```

**Interactions:**
- Stage card click sets `_orderStatusFilter` and filters order list
- Attention chip click filters to relevant orders

### Bug Fix (635a29d)

Fixed `newCount` undefined error in `loadOrders()` by defining the variable before use:
```javascript
var newCount = counts.new || 0;
```

## Files Modified

- `scripts/pipeline/preview.html` - Added CSS styles, HTML structure, and JavaScript functions for pipeline visualization

## Verification Status

- [x] Pipeline visualization renders correctly in Orders tab
- [x] Stage cards show accurate metrics (count, items, value)
- [x] Attention bar highlights actionable items
- [x] Click interactions filter order list
- [x] No JavaScript errors in console
- [x] Human verification checkpoint approved

## Visual Overview

The pipeline dashboard displays:

1. **Attention Bar** - Top row with clickable chips:
   - "X ready to order" (blue) - new orders awaiting cart fill
   - "X stuck in production" (orange) - in-production > 72h
   - "X awaiting shipment" (yellow) - packed > 24h
   - "X with errors" (red) - orders with processing errors

2. **Pipeline Stages** - Horizontal card row:
   - One card per active status (new through shipped)
   - Shows order count, total items, total value
   - Aging indicator bar (green/yellow/red based on threshold)
   - Click to filter order list to that status
