# HotBox Pipeline Operations Guide

Complete operational runbook for the HotBox Clothing product pipeline. Covers every command, common workflows, troubleshooting, and configuration. Supports SanMar and S&S Activewear vendors, multi-collection routing, template presets, logo overlays with visual drag-and-drop placement, logo upload and management, customer accounts with royalty tracking, batch product creation, order management with error handling, inventory reliability tools, invoicing/labels, and SanMar cart automation.

---

## Quick Reference

### Product Pipeline

| Command | What it does |
|---------|-------------|
| `npm run validate` | Health check all systems (read-only, never modifies WIX data) |
| `npm run validate -- PC61` | Health check + test SanMar data fetch for style PC61 |
| `npm run fetch-product -- PC61` | Fetch and display SanMar data for a style |
| `npm run fetch-product -- PC61 --vendor ss` | Fetch product data from S&S Activewear |
| `npm run preview` | Start visual preview/curation server (localhost:3456) |
| `npm run preview -- PC61` | Start preview server and auto-load style PC61 |
| `npm run create-product -- PC61` | Quick-create WIX draft (all colors/sizes, standard-tee pricing) |
| `npm run create-product -- PC61 --price 24.99` | Quick-create WIX draft at a specific retail price |
| `npm run create-product -- PC61 --vendor ss` | Create WIX draft from S&S Activewear product |
| `npm run create-product -- PC61 --template "BigBarn Tee"` | Create using a saved template |
| `npm run create-product -- PC61 --collection "Big Barn Crossfit"` | Route product to a specific collection |
| `npm run create-product -- PC61 --logo bb --logo-position left-chest` | Apply logo overlay to product images |
| `npm run overlay-test` | Run logo overlay compositing test |
| `npm run smoke-test` | Run end-to-end smoke test across all subsystems |
| `npm run demo` | Run SanMar API demo/debug script |

### Pricing & Promotions

| Command | What it does |
|---------|-------------|
| `npm run margin-report` | Show profit margins for all products |
| `npm run sale` | Show sale pricing help |
| `npm run sale -- create PC61 --discount 20% --name "Spring Sale"` | Create a sale on a product |
| `npm run coupons` | Show coupon management help |

### Inventory Monitoring

| Command | What it does |
|---------|-------------|
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
| `npm run monitor -- threshold PC61 low 15 critical 5` | Set per-product stock thresholds |

### Stock Sync to WIX

| Command | What it does |
|---------|-------------|
| `npm run sync` | Show sync help |
| `npm run sync:scan` | Auto-discover WIX products matching tracked styles |
| `npm run sync:list` | Show product mappings (SanMar style -> WIX product) |
| `npm run sync:run` | Run one sync cycle (poll + WIX update + notify) |
| `npm run sync:start` | Start continuous sync loop (monitor + sync + notify, Ctrl+C to stop) |
| `npm run sync:smart-start` | Start smart sync loop with priority-based polling |
| `npm run sync:link -- PC61 abc123 "Essential Tee"` | Manually link a SanMar style to a WIX product ID |
| `npm run sync -- unlink PC61` | Remove a product mapping |
| `npm run sync -- notify-test` | Send a test email to verify SMTP config |
| `npm run sync -- config` | Show current sync and notification config |
| `npx tsx scripts/pipeline/enable-inventory.ts <STYLE>` | Enable inventory tracking for legacy products |

### Order Management

| Command | What it does |
|---------|-------------|
| `npm run orders` | Show order management help |
| `npm run orders:list` | List all orders |
| `npm run orders:add` | Create a manual order |
| `npm run orders:sync` | Sync orders from WIX |
| `npm run invoice:demo` | Generate demo invoice PDF |
| `npm run label:demo` | Generate demo shipping label PDF |
| `npm run print:list` | List system printers |

### SanMar Cart Automation

| Command | What it does |
|---------|-------------|
| `npm run cart` | Preview SanMar cart items (no action taken) |
| `npm run cart:preview` | Preview SanMar cart items (alias) |
| `npm run cart:fill` | Execute SanMar cart fill automation |

### Utilities

| Command | What it does |
|---------|-------------|
| `npm run build` | Compile TypeScript |
| `npm run typecheck` | Type-check without emitting |
| `npm run verify:site-fixes` | Run WIX site fix verification script |
| `npm run smoke-test` | Run end-to-end smoke test across all subsystems |

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
| `SS_API_KEY` | For S&S vendor | S&S Activewear account | S&S Activewear API key |
| `SS_ACCOUNT_NUMBER` | For S&S vendor | S&S Activewear account | S&S Activewear account number |
| `SMTP_HOST` | No | Your email provider | SMTP server hostname (default: smtp.gmail.com) |
| `SMTP_PORT` | No | Your email provider | SMTP server port (default: 587) |
| `SMTP_SECURE` | No | Your email provider | Use TLS for SMTP (default: false, set "true" for port 465) |
| `SMTP_USER` | No | Your email account | SMTP username / email address |
| `SMTP_PASS` | No | Your email account | SMTP password or app password |
| `NOTIFY_TO` | No | Recipient email address | Where stock alerts are sent (defaults to SMTP_USER) |
| `NOTIFY_FROM` | No | Sender email address | Who alerts appear from (defaults to SMTP_USER) |
| `NOTIFY_ENABLED` | No | Set to "true" to enable | Master switch for email notifications (default: false) |
| `INVOICE_PRINTER` | No | `npm run print:list` | Printer name for invoices (default: system default) |
| `LABEL_PRINTER` | No | `npm run print:list` | Printer name for thermal labels (default: system default) |

**Example `.env` file:**

```env
# SanMar API (required)
SANMAR_CUSTOMER_NUMBER=12345
SANMAR_USERNAME=your-api-username
SANMAR_PASSWORD=your-api-password

# WIX API (required)
WIX_API_KEY=IST.your-wix-api-key-here

# S&S Activewear API (optional — needed for --vendor ss)
SS_API_KEY=your-ss-api-key
SS_ACCOUNT_NUMBER=your-ss-account-number

# Email notifications (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password
NOTIFY_TO=owner@hotboxclothing.shop
NOTIFY_FROM=alerts@hotboxclothing.shop
NOTIFY_ENABLED=true

# Printer configuration (optional)
INVOICE_PRINTER=HP LaserJet Pro
LABEL_PRINTER=DYMO LabelWriter 450
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

### Stock Visibility Behavior (Phase 31)

**Previous behavior:** Out-of-stock variants were hidden (visible: false). Customers couldn't see that certain color/size combinations existed.

**Current behavior:** All variants remain visible. WIX Inventory API tracks stock quantities:
- In-stock variants: Show normally with "Add to Cart"
- Out-of-stock variants: Show "Out of Stock" message when selected (or "item is no longer available" when attempting to add to cart)

This improves UX by showing customers the full range of available options while clearly indicating which are unavailable.

**Technical change:**
- Stock sync uses `updateInventory()` instead of `updateProductVariants()` for stock changes
- Product creation enables `trackQuantity: true` and sets initial quantities
- Variant `visible` field remains `true` for all variants

### Syncing Stock to WIX

How to keep WIX product inventory quantities in sync with vendor inventory:

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
   This polls SanMar inventory, updates WIX inventory quantities based on stock, and sends email notification (if configured).

5. **Start continuous sync loop:**
   ```bash
   npm run sync:start
   ```
   Combines inventory monitoring and WIX sync in a single loop. Press Ctrl+C to stop.

6. **Remove a product mapping:**
   ```bash
   npm run sync -- unlink PC61
   ```

### Enabling Inventory for Legacy Products

Products created before Phase 31 (or outside the pipeline) don't have WIX Inventory tracking enabled. Use the `enable-inventory.ts` utility to retroactively enable it:

1. **Enable inventory for a specific product:**
   ```bash
   npx tsx scripts/pipeline/enable-inventory.ts SXU005
   ```

2. **Specify vendor if needed:**
   ```bash
   npx tsx scripts/pipeline/enable-inventory.ts PC61 --vendor sanmar
   npx tsx scripts/pipeline/enable-inventory.ts 2000 --vendor ss
   ```

3. **Use product ID directly (if name search doesn't find it):**
   ```bash
   npx tsx scripts/pipeline/enable-inventory.ts --product-id <WIX_PRODUCT_ID> SXU005
   ```

The utility:
- Finds the WIX product by style number (searches by name)
- Fetches vendor inventory for that style
- Enables `trackQuantity=true` on the WIX product
- Sets correct per-variant inventory quantities
- Uses both SKU-based and choice-based matching strategies

**When to use:** Run this for any product that shows "Add to Cart" for out-of-stock variants instead of "Out of Stock" or "item is no longer available."

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

### Multi-Vendor Product Creation

How to create products from S&S Activewear (secondary vendor):

1. **Fetch the product from S&S:**
   ```bash
   npm run fetch-product -- 1000 --vendor ss
   ```
   The `--vendor ss` flag routes the request to S&S Activewear's REST API instead of SanMar's SOAP API.

2. **Preview with vendor selection:**
   ```bash
   npm run preview
   ```
   In the preview server UI, use the vendor selector dropdown to switch between SanMar and S&S Activewear. Enter the style number and click Fetch.

3. **Create product with vendor-specific pricing:**
   ```bash
   npm run create-product -- 1000 --vendor ss --price 19.99
   ```
   S&S products use REST/JSON (no SOAP). Media handling differs -- S&S provides direct image URLs with size suffixes (_fl for full, _fs for small, _fm for medium).

4. **Key differences from SanMar workflow:**
   - S&S uses REST API with API key auth (not SOAP with username/password)
   - Rate limited to 60 requests/minute (shared across all S&S usage)
   - Inventory data comes from the products endpoint (not a separate inventory endpoint)
   - Image URLs use suffix-based sizing (_fl, _fs, _fm)

**Default vendor is SanMar.** Omitting `--vendor` uses SanMar.

### Using Templates

How to save and reuse product creation configurations:

1. **Create a template via the preview server:**
   Start the preview server (`npm run preview`), configure a product, then save as template from the UI. Or create via CLI.

2. **List available templates:**
   ```bash
   npm run create-product -- --list-templates
   ```

3. **Create a product using a template:**
   ```bash
   npm run create-product -- PC61 --template "BigBarn Tee"
   ```
   Templates can include pricing preset, markup, collections, logo overlay, and color/size preferences.

4. **Template precedence:** CLI flags override template values, which override defaults:
   ```
   CLI flags > template > defaults
   ```
   For example, `--price 24.99 --template "BigBarn Tee"` uses $24.99 regardless of what the template specifies.

5. **Collections are additive:** If you specify `--collection "New Arrivals"` with a template that includes "Big Barn Crossfit", the product goes to both collections.

6. **Template names are case-insensitive.** "BigBarn Tee" and "bigbarn tee" match the same template.

### Logo Overlays

How to apply brand logos to product images:

1. **Add a logo file to the project:**
   Place your logo PNG in `media/logos/` (e.g., `media/logos/BB.png`).

2. **Register the logo in the registry:**
   Edit `data/logos.json` to add the logo entry with position presets. The registry maps short keys (like `bb`) to file paths and default positions.

3. **Apply a logo during product creation:**
   ```bash
   npm run create-product -- PC61 --logo bb --logo-position left-chest
   ```
   The overlay engine uses Sharp for image compositing with multiply blend mode (screen-print effect).

4. **Preview overlays in the preview server:**
   Start the preview server and use the overlay tab to preview how logos look on product images. The preview is visual verification only -- the CLI handles actual overlay compositing.

5. **Logo positioning uses proportional coordinates (0.0-1.0).**
   This works across all image sizes without pixel recalculation. Preset positions include left-chest, right-chest, center, back, left-sleeve, and right-sleeve.

6. **Templates can include logo overlay settings.** A template with `logoOverlay` configured automatically applies the logo to all products created with that template.

### Multi-Angle Product Images

Products automatically fetch front, back, and left-side images from vendor APIs when available:

1. **Automatic multi-angle fetch:** When a product is fetched from SanMar or S&S Activewear, the pipeline requests front, back, and left-side images. Not all vendors provide all angles for every style -- front is always available, back and left may not be.

2. **Preview all angles:** In the preview server (`npm run preview`), angle cards display all available images. Each angle card shows the product from that perspective with the angle label (Front, Back, Left).

3. **Logo overlay per angle:** Each angle supports independent logo overlay placement. Select a different logo or position for each angle as needed.

4. **WIX draft includes all angles:** When creating a WIX product draft, all available angle images are uploaded to the product media gallery.

### Logo Overlay Placement

Visual drag-and-drop interface for positioning logos on product images:

1. **Start the preview server:**
   ```bash
   npm run preview
   ```

2. **Fetch a product** -- angle cards appear showing front, back, and left images.

3. **Select a logo** from the logo picker dropdown for each angle card.

4. **Drag and drop** the logo to position it on the product image.

5. **Use alignment guides** for centering -- crosshair guides snap to the horizontal and vertical center of the image.

6. **Use keyboard arrow keys** for fine-tuning (1px nudge per keypress).

7. **Click "Apply Overlays"** to composite logos onto product images using Sharp with multiply blend mode (screen-print effect).

8. **Logo placement coordinates** are saved with the product creation, stored per-angle per-product.

### Logo Upload & Management

Manage the logo library for brand overlays:

1. **Open the preview server** and navigate to the Logos section.

2. **Drag and drop a PNG file** onto the upload zone (or click to browse).

3. **Image is validated and processed** -- Sharp handles resize and format checks.

4. **Logo appears in the library grid** with a thumbnail preview.

5. **Click to edit metadata** (name, default position).

6. **CLI alternative:** Add a logo file to `media/logos/` and register it in `data/logos.json`:
   ```bash
   # Place the file
   cp my-logo.png media/logos/my-logo.png
   # Then edit data/logos.json to add the entry
   ```

### Customer Accounts & Royalties

Multi-customer branded accounts with configurable markup and royalty tracking:

1. **Open the preview server** and navigate to the Customers section.

2. **Click "Add Customer"** to create a new account.

3. **Set customer details:** name, markup percentage, and royalty rate.

4. **Assign logo(s)** from the logo library using the chip picker interface.

5. **Customer pricing auto-calculates:**
   - Wholesale + markup% = retail price
   - Retail price x royalty% = royalty per unit

6. **View royalty reports:** Select a customer and date range to see order-based royalty calculations.

7. **Download royalty statement PDF** -- branded, per-customer statement generated with PDFKit.

8. **CLI:** Customer data is stored in `data/customers/customers.json`.

### Batch Product Creation

Create multiple products at once with live progress tracking:

1. **Open the preview server** and navigate to the Batch Create section.

2. **Enter multiple style numbers** (comma or newline separated, up to 50).

3. **Select vendor, pricing preset, and other settings** -- pre-filled from saved preferences.

4. **Click "Start Batch"** to begin creation.

5. **Live progress queue** shows each product's status: queued -> fetching -> creating -> done/error.

6. **Products are processed sequentially** -- respects vendor API rate limits (SanMar SOAP, S&S REST 60 req/min).

7. **Summary bar** shows success/fail counts when the batch is complete.

8. **Note:** Logo overlays are skipped in batch mode. Logo placement requires per-product visual positioning that is incompatible with automated batch processing.

### Order Error Handling

Order management improvements for tracking and resolving fulfillment errors:

1. **Status summary cards** on the orders dashboard show order counts per status. Click a card to filter.

2. **Sync health indicator** shows last WIX sync time with color-coded freshness (green = recent, amber = stale).

3. **Error alert banner** appears when orders have unresolved errors.

4. **Click "View errors"** to see affected orders with operation type, error message, and retry count.

5. **Click "Mark Resolved"** to clear resolved errors from the list.

6. **Automatic retry with exponential backoff** (2s, 4s, 8s) for transient WIX API failures during sync.

7. **On-hold status** supports pausing and resuming fulfillment. Orders can transition: new <-> on-hold and ordered <-> on-hold.

### Inventory Reliability Tools

Enhanced inventory monitoring with health metrics and audit controls:

1. **Dashboard health cards** show sync timing (Avg Tick, Max Tick), notification delivery status, and uptime. Cards are hidden when the sync daemon is not running.

2. **Alert feed supports filtering** by alert type (out-of-stock, critical, low-stock, back-in-stock) and by product.

3. **Per-product threshold overrides:** Products can have custom stock thresholds (shown as "Custom" badge with hover tooltip showing override values).
   ```bash
   npm run monitor -- threshold PC61 low 15 critical 5
   ```

4. **Stale inventory detection:** Snapshots older than `snapshotMaxAgeMinutes` (default: 180 min) trigger an amber warning with age display.

5. **"Run Audit" button** validates all product mappings against the WIX API (rate-limited to 200ms between calls).

6. **Audit results** show orphaned mappings (WIX product was deleted but mapping still exists) with one-click removal.

7. **Alert log retention:** Alerts are pruned by age (30-day default) and count cap (1000 entries), with server-side filtering via query parameters for accurate results.

### Order Management

Complete order workflow from WIX sync to fulfillment:

1. **Sync orders from WIX:**
   ```bash
   npm run orders:sync
   ```
   Pulls new orders from the WIX eCommerce V1 API. Upserts into local store -- existing orders with advanced statuses are not regressed.

2. **List all orders:**
   ```bash
   npm run orders:list
   ```
   Shows order number, customer, status, item count, and total.

3. **Create a manual order (not from WIX):**
   ```bash
   npm run orders:add
   ```
   Useful for phone orders, custom jobs, or direct sales.

4. **Order lifecycle statuses:**
   ```
   new → ordered → received → in-production → packed → shipped → delivered
   ```
   Status transitions are managed through the CLI or the preview server order dashboard. The "cancelled" and "on-hold" statuses are also available. On-hold can be entered from "new" or "ordered" and returned to the same status.

5. **Generate and print invoices:**
   ```bash
   npm run invoice:demo       # Generate a demo invoice PDF
   ```
   Invoices are branded PDFs generated with PDFKit. They are saved to `data/invoices/`.

6. **Generate and print shipping labels:**
   ```bash
   npm run label:demo         # Generate a demo shipping label PDF
   ```
   Labels are saved to `data/labels/`.

7. **Print documents:**
   ```bash
   npm run print:list         # See available printers
   ```
   Printing uses platform-native commands (PowerShell on Windows, lp on macOS/Linux). Configure preferred printers with `INVOICE_PRINTER` and `LABEL_PRINTER` env vars.

8. **Use the order dashboard:**
   Start the preview server (`npm run preview`) and navigate to the Orders tab. The dashboard provides status summary cards, filter pills, status updates, sync button, error alert banner, and invoice/label generation.

### SanMar Cart Fill

How to automate adding order items to the SanMar web shopping cart:

1. **Preview cart items (no browser opened):**
   ```bash
   npm run cart
   ```
   Shows what items would be added to the SanMar cart, grouped by vendor style/color/size with consolidated quantities. Only SanMar items from orders with "new" status are included.

2. **Execute cart fill automation:**
   ```bash
   npm run cart:fill
   ```
   Opens a Playwright-controlled Chromium browser, navigates to SanMar.com, and adds items to the cart. Uses headless-to-headed browser handoff via Playwright storageState for visible checkout.

3. **Fill from the dashboard UI:**
   In the preview server Orders tab, use the "Fill SanMar Cart" button. The button is disabled when no orders with "new" status exist.

4. **Review cart fill results:**
   Cart fill results are logged to `data/cart-fills/`. Each fill records items attempted, successes, and failures with per-item error isolation.

5. **Key behaviors:**
   - Preview is the default command; `--fill` must be explicit to prevent accidental automation
   - Only orders with "new" status are eligible for cart fill
   - S&S Activewear items are excluded (SanMar only)
   - Items without vendor style, color, or size are skipped with console warnings
   - After successful cart fill, eligible orders transition from "new" to "ordered"

### Cost Tracking & Sales

How to manage profitability, sales, and coupons:

1. **View profit margins:**
   ```bash
   npm run margin-report
   ```
   Shows per-product wholesale cost, retail price, margin percentage, and decoration cost (if configured).

2. **Create a sale:**
   ```bash
   npm run sale -- create PC61 --discount 20% --name "Spring Sale"
   ```
   Discount formats: `20%` (percentage), `$5` (fixed amount), `@19.99` (price override). Sale data is saved in `data/active-sales.json` with the original price snapshotted for reliable revert.

3. **Manage coupons:**
   ```bash
   npm run coupons
   ```
   Integrates with the WIX Coupons V2 API for creating and listing coupon codes.

4. **Use the preview server dashboard:**
   The Margin and Sales sections in the preview server provide visual margin tracking and sale controls.

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
| `S&S API 401 Unauthorized` | S&S credentials missing or invalid | Check SS_API_KEY and SS_ACCOUNT_NUMBER in .env |
| `Rate limit exceeded for S&S Activewear` | More than 60 requests/minute to S&S | Wait 60 seconds and retry; the rate limiter handles this automatically |
| `No orders with status 'new' found` | Cart fill has no orders to process | Only orders with "new" status are eligible for cart fill |
| `Playwright browser not found` | Playwright browsers not installed | Run `npx playwright install chromium` |
| `Template 'X' not found` | Template name doesn't match | Check names with `--list-templates`; names are case-insensitive |
| `Logo 'X' not found in registry` | Logo key not in data/logos.json | Register the logo in data/logos.json first |
| `No back/left images available` | Vendor doesn't provide all angles for this style | Normal -- only front image is guaranteed; overlay those angles manually |
| `Logo file too large` | Upload exceeds size limit | Resize image before upload; Sharp handles most formats |
| `Customer not found` | Customer ID doesn't match any account | Check customer list in dashboard or `data/customers/customers.json` |
| `Batch limit exceeded (max 50)` | Too many style numbers entered | Split into batches of 50 or fewer |
| `Stale inventory snapshot` | Snapshot older than `snapshotMaxAgeMinutes` | Sync daemon may be stopped; run `npm run sync:start` |
| `Orphaned product mapping` | WIX product was deleted but mapping still exists | Run "Audit" in dashboard and click "Remove Orphans" |

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

**Run end-to-end smoke test:**
```bash
npm run smoke-test
```

---

## Architecture Overview

The pipeline has 8 modules that work together:

### `scripts/sanmar/` -- SanMar API Client
SOAP-based client for querying SanMar data. Talks to 4 SanMar endpoints:
- **Product Info** (getProductByStyle) -- product details, colors, sizes, descriptions
- **Pricing** (getStylePricing) -- wholesale and retail pricing per style
- **Inventory** (getStyleInventory via PromoStandards) -- per-SKU stock quantities by warehouse
- **Media** (getProductImages via PromoStandards) -- product photos, swatch images, front/back/left views

### `scripts/ss-activewear/` -- S&S Activewear API Client
REST-based client for querying S&S Activewear catalog. Rate-limited to 60 req/min (sliding window, shared singleton).
- **Product search and details** -- styles, colors, sizes via REST/JSON
- **Inventory by style** -- per-SKU stock quantities from products endpoint
- **Style/color/size resolution** -- maps S&S data structures to unified types
- **Image URL resolver** -- replaces _fm suffix with size param (_fl for full, _fs for small)

### `scripts/vendor/` -- Multi-Vendor Registry
Unified vendor adapter interface for SanMar and S&S Activewear:
- **VendorAdapter interface** -- product, inventory, media, pricing abstractions
- **Vendor registry** with factory pattern for runtime vendor selection
- **SanMar adapter** -- wraps existing SOAP client into VendorAdapter interface
- **S&S adapter** -- wraps REST client into VendorAdapter interface
- **Shared types** -- UnifiedProduct, UnifiedInventory, UnifiedMedia, UnifiedWarehouse
- **Bridge mapping** -- unifiedToProductData constructs SanMar-shaped objects from unified types

### `scripts/pipeline/` -- Product Creation Pipeline
Transforms vendor data into WIX draft products:
- **fetch-product.ts** -- Fetches vendor endpoints in parallel, assembles ProductData
- **mapper.ts** -- Maps vendor data to WIX V1 product schema
- **create-product.ts** -- Orchestrates WIX product creation (create -> media -> variants -> verify)
- **wix-api.ts** -- WIX REST API client for products, media, and variants
- **preview-server.ts** -- Local web server for visual product curation, logo management, customer accounts, batch creation, order dashboard, and inventory reliability dashboard
- **preview.html** -- Self-contained curation UI (no build tools, no CDN, pure vanilla JS)
- **pricing-rules.ts** -- Pure-function pricing engine with category presets and size upcharges
- **validate-pipeline.ts** -- Read-only health check across all subsystems
- **overlay.ts** -- Sharp-based logo overlay compositing engine with multi-angle support
- **margin-report.ts** -- Cost tracking and margin calculation CLI
- **sale-pricing.ts** -- Sale/promo pricing engine with WIX price updates
- **wix-coupons.ts** -- WIX Coupons V2 API integration for coupon management
- **template system** -- Save/load product creation presets (pricing, collections, overlays)
- **collection routing** -- Multi-collection product assignment during creation

### `scripts/customers/` -- Customer Account System
Customer accounts with B2B pricing and royalty tracking:
- **types.ts** -- CustomerAccount type with markup, royalty rates, logo assignments
- **store.ts** -- JSON-backed CRUD store (`data/customers/customers.json`)
- **royalty.ts** -- Pure-function royalty calculation engine
- **royalty-statement.ts** -- PDFKit branded royalty statement generator
- **pricing.ts** -- Customer-aware pricing (wholesale + markup + royalty)

### `scripts/monitor/` -- Inventory Monitoring
Polls vendor inventory at configurable intervals and detects stock changes:
- **poller.ts** -- Poll engine with priority-based tiers (hot/normal/slow), batch queries, and daemon resilience
- **alerts.ts** -- Alert generation for stock level transitions with warehouse-aware detail
- **alert-log.ts** -- Persistent alert history (capped at 1000 entries with FIFO trimming, 30-day age retention)
- **store.ts** -- File-based storage for config, tracked products, and inventory snapshots with per-warehouse breakdown and per-product threshold overrides
- **manage.ts** -- CLI for all monitor operations including warehouse inventory, priority management, and per-product thresholds

### `scripts/sync/` -- Stock Sync to WIX
Updates WIX product variant visibility based on vendor inventory:
- **stock-sync.ts** -- Core sync logic: poll inventory, compare to thresholds, update WIX variant visibility with case-insensitive SKU matching
- **sync-poller.ts** -- Continuous sync loop combining monitor polling with WIX updates, with health timing (avg/max tick) and snapshot staleness detection
- **product-map.ts** -- Manages style:vendor composite -> WIX product ID mappings with audit and orphan detection
- **notifications.ts** -- SMTP email delivery via Nodemailer with warehouse-enriched stock change alerts and delivery tracking
- **manage.ts** -- CLI for all sync operations

### `scripts/orders/` -- Order Management
Complete order lifecycle from WIX sync to fulfillment:
- **wix-orders.ts** -- WIX eCommerce V1 Orders API client with automatic retry and exponential backoff
- **order-store.ts** -- Local order store with JSON persistence (order numbers start at 1001), error tracking per order
- **invoice-generator.ts** -- Branded invoice PDF generation with PDFKit
- **invoice-template.ts** -- Reusable layout helpers for invoice design
- **label-generator.ts** -- Shipping label PDF generation
- **print-service.ts** -- Cross-platform print service (PowerShell on Windows, lp on macOS/Linux)
- **cart-consolidation.ts** -- Consolidation engine that groups order items by vendor style/color/size
- **cart-automation.ts** -- SanMar.com Playwright browser automation for cart filling
- **cart-cli.ts** -- CLI for cart preview and fill operations
- **manage.ts** -- CLI for order listing, manual creation, WIX sync, and status updates (including on-hold)
- **index.ts** -- Barrel export as single import surface for preview server

---

## Data Files

Runtime data is stored in the `data/` directory (gitignored -- never committed, unless noted otherwise):

| Path | Purpose |
|------|---------|
| `data/monitor/config.json` | Monitor configuration (poll interval, stock thresholds) |
| `data/monitor/tracked.json` | List of styles being tracked for inventory (keyed by style:vendor), with optional per-product threshold overrides |
| `data/monitor/snapshots/` | Latest inventory snapshot per tracked style (one file per style, with per-warehouse breakdown) |
| `data/monitor/alerts.json` | Alert history log (capped at 1000 entries, 30-day age retention, FIFO trimmed) |
| `data/sync/product-map.json` | Style:vendor composite -> WIX product ID mappings |
| `data/collections.json` | WIX collection name-to-ID cache (regenerated via `--list-collections`) |
| `data/templates.json` | Saved product creation templates (pricing, collections, overlay settings) |
| `data/logos.json` | Logo registry with position presets (**committed, not gitignored** -- project configuration) |
| `data/cost-history.json` | Per-product cost snapshots for margin tracking |
| `data/active-sales.json` | Active/scheduled sale pricing configurations with original price snapshots |
| `data/orders/` | Order JSON files (one per order, keyed by order ID) |
| `data/invoices/` | Generated invoice PDF files |
| `data/labels/` | Generated shipping label PDF files |
| `data/cart-fills/` | Cart automation result logs |
| `data/customers/customers.json` | Customer accounts with markup/royalty config and logo assignments |
| `data/pipeline-preferences.json` | Pipeline UI preferences (localStorage server backup) |
| `.env` | Credentials and configuration (never commit this file) |

**Note:** The `data/` directory is created automatically on first use. If you delete it, all monitor tracking, sync mappings, orders, customers, and templates are lost. The pipeline will recreate the directory structure on next run but you'll need to re-add tracked products, re-scan for mappings, re-create templates, re-add customers, and re-sync orders.

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
- **Pricing, inventory, and media are optional.** If any vendor APIs fail, the product is still created -- you just get a warning about what's missing.
- **First inventory poll skips low-stock alerts.** Only critical (near zero) and out-of-stock alerts fire on the initial poll. This prevents a flood of alerts when you first start monitoring.
- **Stock sync updates inventory quantities, not variant visibility.** When a variant goes out of stock, WIX shows "Out of Stock" on the storefront (the variant remains visible). When it comes back in stock, the quantity is updated. Existing price, SKU, and weight are preserved.
- **Email is skipped when nothing changed.** If a sync cycle finds no stock changes, no email is sent.
- **The validation script is completely read-only.** It never creates, modifies, or deletes any WIX data.
- **Style numbers are case-insensitive.** `pc61`, `PC61`, and `Pc61` all work the same way.
- **Multi-vendor support.** Use `--vendor ss` to fetch from S&S Activewear. Default is SanMar. The vendor adapter system handles the differences transparently.
- **Templates save time.** Save pricing, collections, and overlay settings as reusable templates. Template names are case-insensitive.
- **Orders sync from WIX.** Run `npm run orders:sync` to pull new orders. Manual orders can be created directly. Sync preserves locally-advanced statuses.
- **Cart fill is preview-first.** `npm run cart` shows what would be added to the SanMar cart without acting. `npm run cart:fill` actually opens a browser and requires the `--fill` flag.
- **Invoices and labels are PDFs.** Generated locally in `data/invoices/` and `data/labels/`. Print via configured printers or download from the dashboard.
- **Logo overlays use multiply blend mode.** Creates a screen-print effect where the logo appears as if printed on the garment fabric.
- **Warehouse inventory is tracked per-location.** Multi-warehouse breakdown is available in snapshots, alerts, and email notifications.
- **Multi-angle images.** Products automatically fetch front, back, and left-side images from vendors when available.
- **Visual logo placement.** Drag-and-drop interface with alignment guides. Coordinates are per-angle, per-product.
- **Customer markup.** Each customer has a single markup %. Royalty calculated on retail price, not wholesale.
- **Batch creation is sequential.** Respects vendor API rate limits. Up to 50 items per batch.
- **Preferences persist.** Form settings (vendor, preset, markup) save to localStorage and server backup.
- **Order errors are tracked.** Unresolved errors show in dashboard. Mark resolved when fixed.
- **Per-product thresholds.** Override global stock thresholds for specific products via CLI or API.

---

*Last updated: 2026-02-03*
*Pipeline version: 3.0.1*
