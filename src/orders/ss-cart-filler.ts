/**
 * S&S Activewear Cart Filler -- Browser Automation Engine (v2.0)
 *
 * Uses Playwright to automate ssactivewear.com cart filling. Logs in, navigates
 * to product pages, selects color/size/quantity, and adds items to the cart.
 * Returns a CartFillResult for the API layer to relay to the operator.
 *
 * Ported from v1.x scripts/orders/ss-cart-filler.ts with v2.0 adaptations:
 * - Database parameter instead of file-based order store
 * - Credentials passed as parameter (from Config)
 * - Uses order-service.ts updateOrderStatus for status transitions
 * - No headed browser handoff (API mode returns result with checkoutUrl)
 *
 * Phase 52: Cart Automation (Plan 02)
 */

import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import type Database from 'better-sqlite3';
import type {
  CartFillRequest,
  CartFillResult,
  CartItem,
  CartItemResult,
  CartFillOptions,
} from './cart-types.js';
import { updateOrderStatus } from './order-service.js';

// =============================================================================
// Constants
// =============================================================================

/** S&S Activewear base URL */
const SS_BASE = 'https://www.ssactivewear.com';

/** S&S Activewear sign-in page */
const SS_SIGNIN = `${SS_BASE}/myaccount/login`;

/** S&S Activewear cart page (used as checkoutUrl in results) */
const SS_CART = `${SS_BASE}/cart`;

/** Default per-item timeout in milliseconds */
const DEFAULT_ITEM_TIMEOUT = 60_000;

/** Delay between rapid actions to avoid bot detection (ms) */
const ACTION_DELAY = 500;

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Small delay between actions to appear more human-like and avoid bot detection.
 */
async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================================
// Login Flow
// =============================================================================

/**
 * Log in to S&S Activewear website.
 *
 * Navigates to the sign-in page, fills credentials, submits the form,
 * and waits for successful redirect to an authenticated page.
 *
 * @param page - Playwright page instance
 * @param username - S&S Activewear web login (email)
 * @param password - S&S Activewear web password
 * @throws Error if login fails (wrong credentials, CAPTCHA, timeout)
 */
async function loginToSS(
  page: Page,
  username: string,
  password: string,
): Promise<void> {
  console.log('[ss-cart] Navigating to S&S Activewear sign-in page...');
  await page.goto(SS_SIGNIN, { waitUntil: 'domcontentloaded', timeout: 30_000 });

  // Wait for the login form to be visible
  const emailInput = page.locator(
    'input[type="email"], input[name="email"], input[name="username"], ' +
    'input#email, input#username, input[id*="email" i], input[autocomplete="email"]',
  );
  const passwordInput = page.locator(
    'input[type="password"], input[name="password"], ' +
    'input#password, input[id*="password" i]',
  );

  await emailInput.first().waitFor({ state: 'visible', timeout: 15_000 });
  await passwordInput.first().waitFor({ state: 'visible', timeout: 15_000 });

  console.log('[ss-cart] Filling login credentials...');
  await emailInput.first().fill(username);
  await delay(ACTION_DELAY);
  await passwordInput.first().fill(password);
  await delay(ACTION_DELAY);

  // Submit the form
  const submitButton = page.locator(
    'button[type="submit"], button:has-text("Login"), button:has-text("Log In"), ' +
    'button:has-text("Sign In"), button:has-text("LOGIN"), input[type="submit"], button.btn-primary',
  );
  await submitButton.first().click();

  // Wait for redirect away from login page
  try {
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 });
    console.log('[ss-cart] Login successful.');
  } catch {
    // Check if there's a visible error message
    const errorMsg = page.locator(
      '.error-message, .alert-danger, .alert-error, [role="alert"], ' +
      '.login-error, .form-error, .validation-error, .text-danger',
    );
    const hasError = await errorMsg.first().isVisible().catch(() => false);

    if (hasError) {
      const errorText = await errorMsg.first().textContent().catch(() => 'Unknown login error');
      throw new Error(`S&S Activewear login failed: ${errorText?.trim()}`);
    }

    throw new Error(
      'S&S Activewear login failed: timed out waiting for redirect. ' +
      'Possible causes: wrong credentials, CAPTCHA challenge, or site change.',
    );
  }
}

// =============================================================================
// Selector Helpers
// =============================================================================

/**
 * Select a color on the S&S Activewear product page.
 *
 * Multi-strategy selector:
 * 1. Color swatch: title/aria-label/data-color matching color name
 * 2. Dropdown: select element with option text matching color
 * 3. Button/link: text-based matching
 *
 * @returns true if color was selected, false otherwise
 */
async function selectSSColor(page: Page, colorName: string): Promise<boolean> {
  const lowerColor = colorName.toLowerCase();

  // Strategy 1: Color swatch
  const swatch = page.locator(
    `[title="${colorName}" i], [aria-label="${colorName}" i], ` +
    `[data-color="${colorName}" i], [data-color-name="${colorName}" i], ` +
    `[data-value="${colorName}" i], img[alt="${colorName}" i], ` +
    `[class*="swatch"][title*="${colorName}" i]`,
  );
  try {
    const swatchVisible = await swatch.first().isVisible().catch(() => false);
    if (swatchVisible) {
      await swatch.first().click({ timeout: 5_000 });
      return true;
    }
  } catch { /* try next strategy */ }

  // Strategy 2: Dropdown select element
  const colorSelect = page.locator(
    'select[name*="color" i], select[id*="color" i], select[aria-label*="color" i], ' +
    'select[class*="color" i]',
  );
  try {
    const selectVisible = await colorSelect.first().isVisible().catch(() => false);
    if (selectVisible) {
      const options = colorSelect.first().locator('option');
      const count = await options.count();
      for (let i = 0; i < count; i++) {
        const text = await options.nth(i).textContent();
        if (text && text.toLowerCase().includes(lowerColor)) {
          const value = await options.nth(i).getAttribute('value');
          if (value !== null) {
            await colorSelect.first().selectOption(value);
            return true;
          }
        }
      }
    }
  } catch { /* try next strategy */ }

  // Strategy 3: Button or link with color text
  const colorButton = page.locator(
    `button:has-text("${colorName}"), a:has-text("${colorName}"), ` +
    `[role="option"]:has-text("${colorName}"), label:has-text("${colorName}"), ` +
    `[role="radio"]:has-text("${colorName}"), [role="button"]:has-text("${colorName}")`,
  );
  try {
    const buttonVisible = await colorButton.first().isVisible().catch(() => false);
    if (buttonVisible) {
      await colorButton.first().click({ timeout: 5_000 });
      return true;
    }
  } catch { /* exhausted strategies */ }

  console.warn(`[ss-cart]   Could not find color selector for "${colorName}"`);
  return false;
}

/**
 * Select a size on the S&S Activewear product page.
 *
 * Multi-strategy selector:
 * 1. Button/chip: data-size or text matching size
 * 2. Dropdown: select element with option matching size
 * 3. Label/radio: text-based matching
 *
 * @returns true if size was selected, false otherwise
 */
async function selectSSSize(page: Page, sizeName: string): Promise<boolean> {
  const lowerSize = sizeName.toLowerCase();

  // Strategy 1: Size button/chip
  const sizeButton = page.locator(
    `[data-size="${sizeName}" i], [data-size-name="${sizeName}" i], ` +
    `[data-value="${sizeName}" i], button:has-text("${sizeName}"), ` +
    `[role="option"]:has-text("${sizeName}"), [role="radio"]:has-text("${sizeName}")`,
  );
  try {
    const buttons = await sizeButton.all();
    for (const btn of buttons) {
      const isVisible = await btn.isVisible().catch(() => false);
      if (!isVisible) continue;

      const text = await btn.textContent();
      if (text && text.trim().toLowerCase() === lowerSize) {
        await btn.click({ timeout: 5_000 });
        return true;
      }
    }
  } catch { /* try next strategy */ }

  // Strategy 2: Dropdown select element
  const sizeSelect = page.locator(
    'select[name*="size" i], select[id*="size" i], select[aria-label*="size" i], ' +
    'select[class*="size" i]',
  );
  try {
    const selectVisible = await sizeSelect.first().isVisible().catch(() => false);
    if (selectVisible) {
      const options = sizeSelect.first().locator('option');
      const count = await options.count();
      for (let i = 0; i < count; i++) {
        const text = await options.nth(i).textContent();
        if (text && text.trim().toLowerCase() === lowerSize) {
          const value = await options.nth(i).getAttribute('value');
          if (value !== null) {
            await sizeSelect.first().selectOption(value);
            return true;
          }
        }
      }
    }
  } catch { /* try next strategy */ }

  // Strategy 3: Label or radio input
  const sizeLabel = page.locator(
    `label:has-text("${sizeName}"), input[value="${sizeName}" i], ` +
    `[role="button"]:has-text("${sizeName}")`,
  );
  try {
    const labels = await sizeLabel.all();
    for (const label of labels) {
      const isVisible = await label.isVisible().catch(() => false);
      if (!isVisible) continue;

      const text = await label.textContent();
      if (text && text.trim().toLowerCase() === lowerSize) {
        await label.click({ timeout: 5_000 });
        return true;
      }
    }
  } catch { /* exhausted strategies */ }

  console.warn(`[ss-cart]   Could not find size selector for "${sizeName}"`);
  return false;
}

/**
 * Set the quantity input field on the S&S Activewear product page.
 */
async function setSSQuantity(page: Page, quantity: number): Promise<void> {
  const qtyInput = page.locator(
    'input[name*="quantity" i], input[name*="qty" i], input[id*="quantity" i], ' +
    'input[id*="qty" i], input[aria-label*="quantity" i], ' +
    'input[type="number"][min="1"], input.quantity-input, input.qty-input',
  );

  try {
    await qtyInput.first().waitFor({ state: 'visible', timeout: 10_000 });
    await qtyInput.first().clear();
    await qtyInput.first().fill(String(quantity));
  } catch {
    // Fallback: try any numeric input
    console.warn('[ss-cart]   Could not find standard quantity input, trying fallback...');
    const fallbackQty = page.locator('input[type="number"]');
    const fallbacks = await fallbackQty.all();
    if (fallbacks.length > 0) {
      for (const input of fallbacks.reverse()) {
        const isVisible = await input.isVisible().catch(() => false);
        if (isVisible) {
          await input.clear();
          await input.fill(String(quantity));
          return;
        }
      }
    }
    console.warn('[ss-cart]   Could not set quantity -- will rely on default (1)');
  }
}

// =============================================================================
// Cart Item Addition
// =============================================================================

/**
 * Add a single item to the S&S Activewear cart.
 *
 * Navigates to the product page, selects color and size, sets quantity,
 * and clicks "Add to Cart". Per-item error isolation via try/catch.
 *
 * @param page - Playwright page instance
 * @param item - The cart item to add
 * @param timeout - Maximum time to wait for operations (ms)
 * @returns CartItemResult indicating success or failure
 */
async function addSSItemToCart(
  page: Page,
  item: CartItem,
  timeout: number,
): Promise<CartItemResult> {
  const itemLabel = `${item.vendorStyle} / ${item.color} / ${item.size} x${item.quantity}`;
  console.log(`[ss-cart] Adding item: ${itemLabel}`);

  try {
    // 1. Navigate to product page
    const productUrl = `${SS_BASE}/p/${item.vendorStyle}`;
    console.log(`[ss-cart]   Navigating to ${productUrl}`);
    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout });

    // Check for product not found
    const notFound = page.locator(
      'text="Product not found", text="Page not found", text="item is no longer available", ' +
      'text="no longer available", text="cannot be found"',
    );
    const isNotFound = await notFound.first().isVisible().catch(() => false);
    if (isNotFound) {
      return {
        item,
        success: false,
        error: `Product ${item.vendorStyle} not found on S&S Activewear`,
      };
    }

    // Wait for product page to load
    await page.waitForSelector(
      '.product-detail, .product-page, [data-product], #product-detail, ' +
      '.pdp-container, .product-info, .product-main, [class*="product"]',
      { timeout: timeout / 2 },
    ).catch(() => {
      return page.waitForSelector('main, #main, [role="main"], .main-content', { timeout: timeout / 2 });
    });

    await delay(ACTION_DELAY);

    // 2. Select color
    console.log(`[ss-cart]   Selecting color: ${item.color}`);
    const colorSelected = await selectSSColor(page, item.color);
    if (!colorSelected) {
      return {
        item,
        success: false,
        error: `Could not select color "${item.color}" for ${item.vendorStyle}`,
      };
    }
    await delay(ACTION_DELAY);

    // 3. Select size
    console.log(`[ss-cart]   Selecting size: ${item.size}`);
    const sizeSelected = await selectSSSize(page, item.size);
    if (!sizeSelected) {
      return {
        item,
        success: false,
        error: `Could not select size "${item.size}" for ${item.vendorStyle}`,
      };
    }
    await delay(ACTION_DELAY);

    // 4. Set quantity
    console.log(`[ss-cart]   Setting quantity: ${item.quantity}`);
    await setSSQuantity(page, item.quantity);
    await delay(ACTION_DELAY);

    // 5. Click "Add to Cart" (includes S&S-specific btn-add-cart selector)
    console.log('[ss-cart]   Clicking Add to Cart...');
    const addToCartButton = page.locator(
      'button:has-text("Add to Cart"), button:has-text("ADD TO CART"), ' +
      'button:has-text("Add to Bag"), [data-action="add-to-cart"], ' +
      'button.add-to-cart, button.btn-add-cart, input[value="Add to Cart"], ' +
      'button[id*="addtocart" i], button[class*="add-to-cart" i]',
    );

    await addToCartButton.first().waitFor({ state: 'visible', timeout: 10_000 });
    await addToCartButton.first().click();

    // 6. Wait for cart confirmation
    const confirmation = page.locator(
      '.cart-confirmation, .cart-modal, .add-to-cart-success, ' +
      '[data-cart-confirmation], .toast-success, .cart-added, ' +
      'text="Added to cart", text="added to your cart", text="Item added", ' +
      'text="Added to Cart", text="Successfully added"',
    );

    const stockError = page.locator(
      'text="out of stock", text="unavailable", text="not available", ' +
      'text="insufficient quantity", .stock-error, .availability-error, ' +
      'text="cannot be added", text="sold out"',
    );

    // Race: confirmation vs error
    const result = await Promise.race([
      confirmation.first().waitFor({ state: 'visible', timeout: 15_000 })
        .then(() => 'confirmed' as const),
      stockError.first().waitFor({ state: 'visible', timeout: 15_000 })
        .then(() => 'stock-error' as const),
    ]).catch(() => 'timeout' as const);

    if (result === 'stock-error') {
      const errorText = await stockError.first().textContent().catch(() => 'Item unavailable');
      return {
        item,
        success: false,
        error: `Item unavailable: ${errorText?.trim()}`,
      };
    }

    if (result === 'timeout') {
      console.log('[ss-cart]   No explicit confirmation detected, proceeding...');
    }

    // Close any confirmation modal/popup if present
    const closeButton = page.locator(
      '.modal-close, .close-button, [aria-label="Close"], button:has-text("Continue Shopping"), ' +
      'button:has-text("Continue"), .close, [data-dismiss="modal"], button.btn-close',
    );
    const hasClose = await closeButton.first().isVisible().catch(() => false);
    if (hasClose) {
      await closeButton.first().click().catch(() => {});
      await delay(300);
    }

    console.log(`[ss-cart]   Successfully added: ${itemLabel}`);
    return { item, success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[ss-cart]   Failed to add ${itemLabel}: ${message}`);
    return {
      item,
      success: false,
      error: message,
    };
  }
}

// =============================================================================
// Core Cart Fill Function
// =============================================================================

/**
 * Fill the S&S Activewear shopping cart with consolidated items.
 *
 * Launches a headless browser, logs in to S&S Activewear, adds each item to
 * the cart, then returns a CartFillResult with per-item results and status.
 *
 * v2.0: No headed browser handoff (API mode). Returns checkoutUrl for the
 * operator to open manually if needed.
 *
 * @param db - SQLite database (for status updates via markSSOrdersAsOrdered)
 * @param request - CartFillRequest with consolidated items to add
 * @param credentials - S&S Activewear web login credentials
 * @param options - Browser and timeout configuration
 * @returns CartFillResult with per-item results and overall status
 */
export async function fillSSCart(
  db: Database.Database,
  request: CartFillRequest,
  credentials: { username: string; password: string },
  options?: CartFillOptions,
): Promise<CartFillResult> {
  const headless = options?.headless ?? true;
  const slowMo = options?.slowMo ?? 0;
  const itemTimeout = options?.timeout ?? DEFAULT_ITEM_TIMEOUT;

  const itemResults: CartItemResult[] = [];
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;

  console.log(
    `[ss-cart] Starting cart fill: ${request.items.length} items from ${request.orderNumbers.length} orders`,
  );

  try {
    // 1. Launch browser
    console.log(`[ss-cart] Launching browser (headless: ${headless})...`);
    browser = await chromium.launch({ headless, slowMo });
    context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    // 2. Login to S&S Activewear
    await loginToSS(page, credentials.username, credentials.password);

    // 3. Add each item to cart (per-item error isolation)
    for (const item of request.items) {
      const result = await addSSItemToCart(page, item, itemTimeout);
      itemResults.push(result);
      await delay(ACTION_DELAY);
    }

    // 4. Determine overall status
    const successCount = itemResults.filter((r) => r.success).length;
    const totalCount = itemResults.length;

    let status: CartFillResult['status'];
    if (successCount === totalCount) {
      status = 'success';
    } else if (successCount > 0) {
      status = 'partial';
    } else {
      status = 'failed';
    }

    console.log(
      `[ss-cart] Cart fill complete: ${successCount}/${totalCount} items added (${status})`,
    );

    // 5. Close browser and return result
    const checkoutUrl = successCount > 0 ? SS_CART : undefined;

    await context.close().catch(() => {});
    await browser.close().catch(() => {});
    browser = null;
    context = null;

    return {
      request,
      status,
      itemResults,
      checkoutUrl,
      completedAt: new Date().toISOString(),
    };
  } catch (err) {
    // Fatal error (login failure, browser crash, etc.)
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[ss-cart] Fatal error: ${message}`);

    // Close browser on fatal error
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});

    return {
      request,
      status: 'failed',
      itemResults,
      completedAt: new Date().toISOString(),
    };
  }
}

// =============================================================================
// Order Status Updates
// =============================================================================

/**
 * Update order statuses based on S&S cart fill result.
 *
 * For successful/partial results, transitions source orders from 'new' to 'ordered'.
 * Uses v2.0 order-service updateOrderStatus for state machine validation.
 *
 * @param db - SQLite database instance
 * @param result - The cart fill result to process
 */
export async function markSSOrdersAsOrdered(
  db: Database.Database,
  result: CartFillResult,
): Promise<void> {
  if (result.status === 'failed') {
    console.log('[ss-cart] Cart fill failed -- not updating order statuses.');
    return;
  }

  const failedCount = result.itemResults.filter((r) => !r.success).length;
  const totalCount = result.itemResults.length;

  const note =
    result.status === 'success'
      ? `S&S cart filled -- ${totalCount} items added`
      : `S&S cart filled -- ${totalCount - failedCount} of ${totalCount} items added`;

  for (const orderNumber of result.request.orderNumbers) {
    // Look up order by number to get its id and current status
    const row = db
      .prepare('SELECT id, status FROM orders WHERE order_number = ?')
      .get(orderNumber) as { id: string; status: string } | undefined;

    if (!row) {
      console.warn(
        `[ss-cart] Order #${orderNumber} not found in database -- skipping status update.`,
      );
      continue;
    }

    // Only update if order is currently in 'new' status
    if (row.status !== 'new') {
      console.log(
        `[ss-cart] Order #${orderNumber} status is '${row.status}' -- skipping (not 'new').`,
      );
      continue;
    }

    try {
      updateOrderStatus(db, row.id, 'ordered', note);
      console.log(`[ss-cart] Order #${orderNumber} status updated to 'ordered'.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[ss-cart] Failed to update order #${orderNumber}: ${message}`);
    }
  }
}
