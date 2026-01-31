# HotBox Pipeline Operations Guide

Complete operational runbook for the SanMar-to-WIX product pipeline. Covers every command, common workflows, troubleshooting, and configuration.

---

## Quick Reference

| Command | What it does |
|---------|-------------|
| `npm run validate` | Health check all systems (read-only, never modifies WIX data) |
| `npm run validate -- PC61` | Health check + test SanMar data fetch for style PC61 |
| `npm run fetch-product -- PC61` | Fetch and display SanMar data for a style |
| `npm run preview` | Start visual preview/curation server (localhost:3456) |
| `npm run preview -- PC61` | Start preview server and auto-load style PC61 |
| `npm run create-product -- PC61` | Quick-create WIX draft (all colors/sizes, standard-tee pricing) |
| `npm run create-product -- PC61 --price 24.99` | Quick-create WIX draft at a specific retail price |
| `npm run monitor` | Show monitor help |
| `npm run monitor:add -- PC61 "Essential Tee"` | Track a style for inventory monitoring |
| `npm run monitor:list` | Show all tracked styles |
| `npm run monitor:poll` | Run one inventory check cycle |
| `npm run monitor:start` | Start continuous monitoring loop (Ctrl+C to stop) |
| `npm run monitor -- alerts` | Show recent stock alerts (last 50) |
| `npm run monitor -- alerts clear` | Clear the alert log |
| `npm run monitor -- config` | Show current monitor configuration |
| `npm run monitor -- config set lowStockThreshold 20` | Update a config value |
| `npm run monitor -- remove PC61` | Stop tracking a style |
| `npm run sync` | Show sync help |
| `npm run sync:scan` | Auto-discover WIX products matching tracked styles |
| `npm run sync:list` | Show product mappings (SanMar style -> WIX product) |
| `npm run sync:run` | Run one sync cycle (poll + WIX update + notify) |
| `npm run sync:start` | Start continuous sync loop (monitor + sync + notify, Ctrl+C to stop) |
| `npm run sync:link -- PC61 abc123 "Essential Tee"` | Manually link a SanMar style to a WIX product ID |
| `npm run sync -- unlink PC61` | Remove a product mapping |
| `npm run sync -- notify-test` | Send a test email to verify SMTP config |
| `npm run sync -- config` | Show current sync and notification config |

---

## Setup

### Prerequisites

- **Node.js 18+** (uses native fetch, ESM modules)
- **npm** (any recent version)

### Install

```bash
npm install
```

### Environment Variables

Create a `.env` file in the project root. Never commit this file (it's gitignored).

| Variable | Required | Where to get it | Description |
|----------|----------|----------------|-------------|
| `SANMAR_CUSTOMER_NUMBER` | Yes | Your SanMar account number | Numeric customer ID from your SanMar account |
| `SANMAR_USERNAME` | Yes | SanMar API provisioning (sanmarintegrations@sanmar.com) | API username provided by SanMar integration team |
| `SANMAR_PASSWORD` | Yes | SanMar API provisioning (sanmarintegrations@sanmar.com) | API password provided by SanMar integration team |
| `WIX_API_KEY` | Yes | WIX Dashboard > Developer Tools > API Keys | WIX REST API key with product read/write permissions |
| `SMTP_HOST` | No | Your email provider | SMTP server hostname (default: smtp.gmail.com) |
| `SMTP_PORT` | No | Your email provider | SMTP server port (default: 587) |
| `SMTP_SECURE` | No | Your email provider | Use TLS for SMTP (default: false, set "true" for port 465) |
| `SMTP_USER` | No | Your email account | SMTP username / email address |
| `SMTP_PASS` | No | Your email account | SMTP password or app password |
| `NOTIFY_TO` | No | Recipient email address | Where stock alerts are sent (defaults to SMTP_USER) |
| `NOTIFY_FROM` | No | Sender email address | Who alerts appear from (defaults to SMTP_USER) |
| `NOTIFY_ENABLED` | No | Set to "true" to enable | Master switch for email notifications (default: false) |

**Example `.env` file:**

```env
# SanMar API (required)
SANMAR_CUSTOMER_NUMBER=12345
SANMAR_USERNAME=your-api-username
SANMAR_PASSWORD=your-api-password

# WIX API (required)
WIX_API_KEY=IST.your-wix-api-key-here

# Email notifications (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password
NOTIFY_TO=owner@hotboxclothing.shop
NOTIFY_FROM=alerts@hotboxclothing.shop
NOTIFY_ENABLED=true
```

### Verify Setup

Run the validation script to check everything is configured:

```bash
npm run validate
```

This checks environment variables, SanMar API connectivity, WIX API connectivity, monitor state, and sync state. It never modifies any data.

To also test SanMar data fetching with a real style:

```bash
npm run validate -- PC61
```

---

## Common Workflows

### Adding a New Product

Step-by-step from SanMar style number to published WIX product:

1. **Validate the style exists and check data quality:**
   ```bash
   npm run validate -- PC61
   ```
   Look for PASS on all checks. WARN items are informational (missing images, out-of-stock colors, etc.) -- they won't block product creation.

2. **Start the curation server:**
   ```bash
   npm run preview
   ```
   This opens http://localhost:3456 in your browser automatically.

3. **Enter the style number** in the preview UI and click "Fetch."

4. **Review the product data:**
   - Color cards with swatch images and front product photos
   - Available sizes listed
   - Wholesale pricing from SanMar

5. **Curate your product:**
   - Select which colors to offer (deselect colors you don't want)
   - Select which sizes to offer
   - Choose a pricing preset (standard-tee, premium-tee, hoodie-fleece, polo-woven, outerwear, headwear, or custom)
   - Adjust markup percentage and rounding if needed

6. **Click "Create WIX Draft"** to create the product.

7. **Review the draft in WIX Dashboard:**
   - Add custom images or descriptions
   - Verify pricing looks correct
   - Publish when ready (products are always created as invisible drafts)

**Quick-create shortcut** (skips the preview UI, selects all colors/sizes with standard-tee pricing):
```bash
npm run create-product -- PC61
```

**Quick-create at a specific price:**
```bash
npm run create-product -- PC61 --price 24.99
```

### Monitoring Inventory

How to track SanMar stock levels and get alerts when stock changes:

1. **Add products to tracking:**
   ```bash
   npm run monitor:add -- PC61 "Port & Company Essential Tee"
   npm run monitor:add -- K420 "Sport-Tek Polo"
   ```
   Style numbers are automatically uppercased. The name is optional (defaults to the style number).

2. **View tracked products:**
   ```bash
   npm run monitor:list
   ```

3. **Run a single poll (test):**
   ```bash
   npm run monitor:poll
   ```
   This fetches current inventory from SanMar for all tracked styles, detects stock level changes, and logs alerts. First poll establishes baseline -- no low-stock alerts are generated on the first poll (only critical/out-of-stock).

4. **Start continuous monitoring:**
   ```bash
   npm run monitor:start
   ```
   Polls at the configured interval (default: 30 minutes). Press Ctrl+C to stop.

5. **Review past alerts:**
   ```bash
   npm run monitor -- alerts
   ```

6. **Clear alert history:**
   ```bash
   npm run monitor -- alerts clear
   ```

7. **Adjust thresholds:**
   ```bash
   npm run monitor -- config set lowStockThreshold 20
   npm run monitor -- config set criticalStockThreshold 5
   npm run monitor -- config set pollIntervalMinutes 15
   ```

8. **Remove a style from tracking:**
   ```bash
   npm run monitor -- remove PC61
   ```

### Syncing Stock to WIX

How to keep WIX product variant visibility in sync with SanMar inventory:

1. **Auto-discover WIX products matching tracked styles:**
   ```bash
   npm run sync:scan
   ```
   This scans all WIX products and matches variant SKUs against tracked SanMar styles. SKUs must follow the format `{style}-{catalogColor}-{size}` (e.g., `PC61-JetBlack-L`).

2. **Verify mappings look correct:**
   ```bash
   npm run sync:list
   ```

3. **Manually link a product** (if auto-scan didn't find it):
   ```bash
   npm run sync:link -- PC61 abc-123-def "Port & Company Essential Tee"
   ```
   The WIX product ID can be found in the WIX Dashboard URL when editing a product.

4. **Run one sync cycle (test):**
   ```bash
   npm run sync:run
   ```
   This polls SanMar inventory, updates WIX variant visibility based on stock, and sends email notification (if configured).

5. **Start continuous sync loop:**
   ```bash
   npm run sync:start
   ```
   Combines inventory monitoring and WIX sync in a single loop. Press Ctrl+C to stop.

6. **Remove a product mapping:**
   ```bash
   npm run sync -- unlink PC61
   ```

### Setting Up Email Notifications

How to enable stock change email alerts. Gmail example:

1. **Enable 2FA on your Gmail account** (required for app passwords).

2. **Generate a Gmail App Password:**
   - Go to https://myaccount.google.com/apppasswords
   - Create an app password for "Mail"
   - Copy the 16-character password

3. **Set environment variables in `.env`:**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your@gmail.com
   SMTP_PASS=your-16-char-app-password
   NOTIFY_TO=owner@hotboxclothing.shop
   NOTIFY_FROM=alerts@hotboxclothing.shop
   NOTIFY_ENABLED=true
   ```

4. **Test the email configuration:**
   ```bash
   npm run sync -- notify-test
   ```
   You should receive a test email. Check spam folder if it doesn't arrive.

5. **Start sync with notifications:**
   ```bash
   npm run sync:start
   ```
   Emails are sent when stock changes are detected. If no changes occur in a cycle, no email is sent.

**Note:** Any SMTP-compatible email provider works (not just Gmail). Adjust SMTP_HOST and SMTP_PORT for your provider.

---

## Troubleshooting

### Common Errors

| Error Message | Cause | Fix |
|--------------|-------|-----|
| `Style 'XX' not found in SanMar catalog` | Typo in style number, or style is discontinued | Verify the style number on sanmar.com. Style codes are case-insensitive. |
| `pricing WARNING: Pricing data unavailable for XX` | SanMar pricing API is temporarily down or doesn't have data for this style | Product will be created with $0 wholesale price. Set price manually in WIX or retry later. |
| `inventory WARNING: Inventory data unavailable for XX` | SanMar inventory API is temporarily down | Colors will show "Stock Unknown" instead of quantities. Retry later. |
| `images WARNING: Image data unavailable for XX` | SanMar media API is down or has no images for this style | Product will be created without images. Add images manually in WIX Editor. |
| `Media upload failed for XX: ...` | SanMar CDN unreachable or WIX media API rejected the images | Product was created successfully but without images. Add images manually in WIX Editor. |
| `Variant update failed for XX: ...` | WIX variant API error | Product exists as draft but variants need manual pricing/SKU configuration in WIX. |
| `WIX API 401 Unauthorized` | WIX API key is invalid, expired, or missing | Regenerate key: WIX Dashboard > Developer Tools > API Keys. Update WIX_API_KEY in .env. |
| `WIX API: 403 Forbidden` | WIX API key lacks required permissions | Check API key permissions in WIX Dashboard. Needs product read/write access. |
| `SanMar credentials missing: ...` | SANMAR_* env vars not set | Add SANMAR_CUSTOMER_NUMBER, SANMAR_USERNAME, SANMAR_PASSWORD to .env file. |
| `WIX API key missing (WIX_API_KEY)` | WIX_API_KEY env var not set | Add WIX_API_KEY to .env file. |
| `WIX product XX not found -- it may have been deleted. Run 'npm run sync:scan' to refresh mappings.` | A synced product was deleted from WIX | Run `npm run sync:scan` to rebuild product mappings. |
| `NOTIFY_ENABLED=true but SMTP_USER is not set. Notifications disabled.` | Email notifications enabled but SMTP credentials incomplete | Set SMTP_USER and SMTP_PASS in .env, or set NOTIFY_ENABLED=false to suppress warning. |
| `Cannot build preview: no products provided` | fetchProductData returned zero products | Style may have been completely discontinued. Try a different style. |
| `Port 3456 in use, trying 3457...` | Another process is using port 3456 | Not an error -- the preview server will try the next port automatically. |

### Diagnostic Commands

**Full pipeline health check:**
```bash
npm run validate
```

**Check with a specific style (tests SanMar API connectivity + data quality):**
```bash
npm run validate -- PC61
```

**View monitor configuration:**
```bash
npm run monitor -- config
```

**View sync configuration:**
```bash
npm run sync -- config
```

**Test email delivery:**
```bash
npm run sync -- notify-test
```

---

## Architecture Overview

The pipeline has 4 modules that work together:

### `scripts/sanmar/` -- SanMar API Client
SOAP-based client for querying SanMar data. Talks to 4 SanMar endpoints:
- **Product Info** (getProductByStyle) -- product details, colors, sizes, descriptions
- **Pricing** (getStylePricing) -- wholesale and retail pricing per style
- **Inventory** (getStyleInventory via PromoStandards) -- per-SKU stock quantities by warehouse
- **Media** (getProductImages via PromoStandards) -- product photos, swatch images, front/back views

### `scripts/pipeline/` -- Product Creation Pipeline
Transforms SanMar data into WIX draft products:
- **fetch-product.ts** -- Fetches all 4 SanMar endpoints in parallel, assembles ProductData
- **mapper.ts** -- Maps SanMar data to WIX V1 product schema
- **create-product.ts** -- Orchestrates WIX product creation (create -> media -> variants -> verify)
- **wix-api.ts** -- WIX REST API client for products, media, and variants
- **preview-server.ts** -- Local web server for visual product curation
- **preview.html** -- Self-contained curation UI (no build tools, no CDN, pure vanilla JS)
- **pricing-rules.ts** -- Pure-function pricing engine with category presets and size upcharges
- **validate-pipeline.ts** -- Read-only health check across all subsystems

### `scripts/monitor/` -- Inventory Monitoring
Polls SanMar inventory at configurable intervals and detects stock changes:
- **poller.ts** -- Poll engine that fetches inventory and compares against previous snapshots
- **alerts.ts** -- Alert generation for stock level transitions (in-stock -> low, low -> out-of-stock, etc.)
- **alert-log.ts** -- Persistent alert history (capped at 1000 entries with FIFO trimming)
- **store.ts** -- File-based storage for config, tracked products, and inventory snapshots
- **manage.ts** -- CLI for all monitor operations

### `scripts/sync/` -- Stock Sync to WIX
Updates WIX product variant visibility based on SanMar inventory:
- **stock-sync.ts** -- Core sync logic: poll inventory, compare to thresholds, update WIX variant visibility
- **sync-poller.ts** -- Continuous sync loop combining monitor polling with WIX updates
- **product-map.ts** -- Manages SanMar style -> WIX product ID mappings
- **notifications.ts** -- SMTP email delivery via Nodemailer for stock change alerts
- **manage.ts** -- CLI for all sync operations

---

## Data Files

Runtime data is stored in the `data/` directory (gitignored -- never committed):

| Path | Purpose |
|------|---------|
| `data/monitor/config.json` | Monitor configuration (poll interval, stock thresholds) |
| `data/monitor/tracked.json` | List of SanMar styles being tracked for inventory |
| `data/monitor/snapshots/` | Latest inventory snapshot per tracked style (one file per style, overwritten each poll) |
| `data/monitor/alerts.json` | Alert history log (capped at 1000 entries, FIFO trimmed) |
| `data/sync/product-map.json` | SanMar style -> WIX product ID mappings |
| `.env` | Credentials and configuration (never commit this file) |

**Note:** The `data/` directory is created automatically on first use. If you delete it, all monitor tracking and sync mappings are lost. The pipeline will recreate the directory structure on next run but you'll need to re-add tracked products and re-scan for mappings.

---

## Pricing Presets

When creating products through the preview UI or CLI, these presets control markup and rounding:

| Preset | Markup | Rounding | Size Upcharges |
|--------|--------|----------|---------------|
| `standard-tee` | 100% | nearest-99 | 2XL: +$2, 3XL: +$3, 4XL: +$4, 5XL: +$5, 6XL: +$6 |
| `premium-tee` | 120% | nearest-99 | 2XL: +$2, 3XL: +$3, 4XL: +$4, 5XL: +$5, 6XL: +$6 |
| `hoodie-fleece` | 80% | nearest-99 | 2XL: +$3, 3XL: +$4, 4XL: +$5, 5XL: +$6, 6XL: +$8 |
| `polo-woven` | 90% | nearest-99 | 2XL: +$2, 3XL: +$3, 4XL: +$4, 5XL: +$5, 6XL: +$6 |
| `outerwear` | 70% | nearest-99 | 2XL: +$4, 3XL: +$5, 4XL: +$6, 5XL: +$8, 6XL: +$10 |
| `headwear` | 100% | nearest-99 | (no size upcharges) |
| `custom` | 100% | nearest-99 | (no size upcharges) |

**How pricing works:** Retail price = Wholesale cost x (1 + markup%) rounded to nearest .99, then size upcharge added as a flat dollar amount on top.

---

## Key Behaviors

These behaviors are worth knowing for day-to-day operation:

- **Products are always created as invisible drafts.** You must publish them manually in the WIX Dashboard after review.
- **Pricing, inventory, and media are optional.** If any of those SanMar APIs fail, the product is still created -- you just get a warning about what's missing.
- **First inventory poll skips low-stock alerts.** Only critical (near zero) and out-of-stock alerts fire on the initial poll. This prevents a flood of alerts when you first start monitoring.
- **Stock sync updates variant visibility, not the entire product.** When a variant goes out of stock, it's hidden (visible: false). When it comes back in stock, it's shown again. Existing price, SKU, and weight are preserved.
- **Email is skipped when nothing changed.** If a sync cycle finds no stock changes, no email is sent.
- **The validation script is completely read-only.** It never creates, modifies, or deletes any WIX data.
- **Style numbers are case-insensitive.** `pc61`, `PC61`, and `Pc61` all work the same way.

---

*Last updated: 2026-01-31*
*Pipeline version: 1.0.0*
