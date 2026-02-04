# Plan 39-03 Summary: S&S Cart CLI and Dashboard UI

**Status:** CHECKPOINT (awaiting human verification)
**Date:** 2026-02-04

## Objective

Add CLI command and dashboard UI for S&S cart automation, matching the SanMar pattern. Provides operator interface for S&S cart filling via both command line and browser dashboard.

## Completed Tasks

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Create S&S cart fill CLI | 065f2be | scripts/orders/ss-cart-cli.ts |
| 2 | Add package.json scripts for S&S cart | 9baea27 | package.json |
| 3 | Add S&S cart preview/fill/history API endpoints | f06e516 | scripts/pipeline/preview-server.ts |
| 4 | Add S&S cart UI to dashboard | a81dacc | scripts/pipeline/preview.html |
| 5 | CHECKPOINT: Human verification | - | (awaiting) |

## Implementation Details

### Task 1: S&S Cart Fill CLI (ss-cart-cli.ts)

Created CLI mirroring the SanMar cart-cli.ts pattern:

**Commands:**
- `preview` (default): Show consolidated S&S cart items without executing
- `--fill`: Execute S&S cart automation
- `help`: Show usage information

**Options:**
- `--status <statuses>`: Filter orders by status (default: new)
- `--no-headless`: Run browser in visible mode from the start

### Task 2: Package.json Scripts

Added npm scripts for S&S cart operations:
```json
"ss-cart": "npx tsx scripts/orders/ss-cart-cli.ts",
"ss-cart:preview": "npx tsx scripts/orders/ss-cart-cli.ts preview",
"ss-cart:fill": "npx tsx scripts/orders/ss-cart-cli.ts --fill"
```

### Task 3: API Endpoints (preview-server.ts)

Added three API endpoints:
- `GET /api/ss-cart/preview`: Preview consolidated S&S cart items
- `POST /api/ss-cart/fill`: Execute S&S cart fill automation
- `GET /api/ss-cart/history`: List past S&S fill results from data/cart-fills/ss/

### Task 4: Dashboard UI (preview.html)

**CSS:**
- `.btn-ss-cart-fill` styles with teal color (#00897b)

**HTML:**
- "Fill S&S Cart" button in Orders section header
- S&S cart modal with preview table and fill functionality

**JavaScript:**
- Modal open/close handlers
- Preview fetch and display
- Fill execution with toast notifications
- Cart history display
- Button enable/disable based on orders with S&S items

## Checkpoint: Human Verification Required

Before completing plan 39-03, user must verify:

1. Run: `npm run dev`
2. Visit: http://localhost:3456
3. Navigate to Orders tab
4. Verify: Both "Fill SanMar Cart" (orange) and "Fill S&S Cart" (teal) buttons visible
5. Click "Fill S&S Cart" button
6. Verify: Modal opens with "Fill S&S Activewear Cart" header
7. Modal should show "No S&S items to order" if no S&S orders exist
8. Close modal with Cancel or click outside
9. Verify: No console errors

**Resume signal:** Type "approved" if both cart buttons work, or describe issues.

## Files Modified

- `scripts/orders/ss-cart-cli.ts` (new)
- `package.json`
- `scripts/pipeline/preview-server.ts`
- `scripts/pipeline/preview.html`

## Verification Status

- [x] `npm run ss-cart help` shows usage
- [x] Preview server starts without errors
- [ ] Dashboard shows both SanMar and S&S cart buttons (awaiting human verification)
- [ ] S&S modal opens and displays preview/fill functionality (awaiting human verification)
