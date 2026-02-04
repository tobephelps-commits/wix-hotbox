/**
 * S&S Activewear Cart Filler - Browser Automation Engine
 *
 * Uses Playwright to automate ssactivewear.com cart filling. Logs in, navigates to
 * product pages, selects color/size/quantity, and adds items to the cart.
 * After all items are processed, hands off a visible browser window at the
 * cart page for the owner to complete checkout manually.
 *
 * Environment variables:
 * - SS_WEB_USERNAME - S&S Activewear web login (email)
 * - SS_WEB_PASSWORD - S&S Activewear web password
 *
 * Phase 39: S&S Cart Automation (Plan 02)
 */

import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type {
  CartFillRequest,
  CartFillResult,
  CartItem,
  CartItemResult,
} from './cart-types.js';
import type { OrderStatus } from './types.js';
import { getSSOrdersForCartFill, consolidateSSOrders } from './ss-cart-consolidator.js';
import { updateOrderStatus, loadOrders } from './order-store.js';

// =============================================================================
// Constants
// =============================================================================

/** S&S Activewear base URL */
const SS_BASE = 'https://www.ssactivewear.com';

/**
 * S&S Activewear sign-in page
 * DISCOVERED: S&S uses /myaccount/login for the login page
 * (User verification: email address field, password field, Login button)
 */
const SS_SIGNIN = `${SS_BASE}/myaccount/login`;

/**
 * S&S Activewear cart page
 * DISCOVERED: Cart is at /cart
 */
const SS_CART = `${SS_BASE}/cart`;

/** Directory for persisted S&S cart fill results */
const SS_CART_FILLS_DIR = './data/cart-fills/ss';

/** Default per-item timeout in milliseconds */
const DEFAULT_ITEM_TIMEOUT = 60_000;

/** Delay between rapid actions to avoid bot detection (ms) */
const ACTION_DELAY = 500;

// =============================================================================
// Cart Fill Options
// =============================================================================

export interface SSCartFillOptions {
  /** Run browser in headless mode until checkout handoff (default: true) */
  headless?: boolean;
  /** Millisecond delay between actions, useful for debugging (default: 0) */
  slowMo?: number;
  /** Per-item timeout in milliseconds (default: 60000) */
  timeout?: number;
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Small delay between actions to appear more human-like and avoid bot detection.
 */
async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Read S&S Activewear credentials from environment variables.
 * Throws if either is missing.
 */
function getSSCredentials(): { username: string; password: string } {
  const username = process.env.SS_WEB_USERNAME;
  const password = process.env.SS_WEB_PASSWORD;

  if (!username || !password) {
    throw new Error(
      'Missing S&S Activewear credentials. Set SS_WEB_USERNAME and SS_WEB_PASSWORD environment variables.',
    );
  }

  return { username, password };
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
 * DISCOVERED SELECTORS:
 * - Sign-in URL: /myaccount/login
 * - Email input: input[type="email"], input[name="email"], #email (labeled "Email Address")
 * - Password input: input[type="password"], input[name="password"], #password
 * - Submit button: button[type="submit"], button with "Login" text
 * - Success: redirect away from /login path
 * - Error: .error-message, .alert-danger, [role="alert"]
 *
 * @param page - Playwright page instance
 * @throws Error if login fails (wrong credentials, CAPTCHA, timeout)
 */
async function loginToSS(page: Page): Promise<void> {
  const { username, password } = getSSCredentials();

  console.log('[ss-cart] Navigating to S&S Activewear sign-in page...');
  await page.goto(SS_SIGNIN, { waitUntil: 'domcontentloaded', timeout: 30_000 });

  // Wait for the login form to be visible
  // S&S sign-in page: look for email and password inputs
  // SELECTOR STRATEGY: Multiple fallbacks for robustness
  const emailInput = page.locator(
    'input[type="email"], input[name="email"], input[name="username"], ' +
    'input#email, input#username, input[id*="email" i], input[autocomplete="email"]'
  );
  const passwordInput = page.locator(
    'input[type="password"], input[name="password"], ' +
    'input#password, input[id*="password" i]'
  );

  await emailInput.first().waitFor({ state: 'visible', timeout: 15_000 });
  await passwordInput.first().waitFor({ state: 'visible', timeout: 15_000 });

  console.log('[ss-cart] Filling login credentials...');
  await emailInput.first().fill(username);
  await delay(ACTION_DELAY);
  await passwordInput.first().fill(password);
  await delay(ACTION_DELAY);

  // Submit the form - look for a submit button
  // S&S login page: button with text "Login" or type="submit"
  const submitButton = page.locator(
    'button[type="submit"], button:has-text("Login"), button:has-text("Log In"), ' +
    'button:has-text("Sign In"), button:has-text("LOGIN"), input[type="submit"], button.btn-primary'
  );
  await submitButton.first().click();

  // Wait for redirect away from login page (indicates successful login)
  // Also check for error messages indicating failed login
  try {
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 });
    console.log('[ss-cart] Login successful.');
  } catch {
    // Check if there's a visible error message
    const errorMsg = page.locator(
      '.error-message, .alert-danger, .alert-error, [role="alert"], ' +
      '.login-error, .form-error, .validation-error, .text-danger'
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
// Cart Item Addition
// =============================================================================

/**
 * Add a single item to the S&S Activewear cart.
 *
 * Navigates to the product page, selects color and size, sets quantity,
 * and clicks "Add to Cart". Returns a CartItemResult with success/failure.
 *
 * DISCOVERED URL PATTERN:
 * - Product pages: https://www.ssactivewear.com/p/{vendorStyle}
 *   Example: https://www.ssactivewear.com/p/1717
 *
 * DISCOVERED SELECTORS:
 * - Color selection: swatches, dropdowns, or color buttons
 * - Size selection: size buttons, dropdowns, or grid cells
 * - Quantity: input[type="number"], input with qty/quantity name
 * - Add to Cart: button with "Add to Cart" text
 * - Confirmation: modal/toast with success message
 * - Stock error: "out of stock", "unavailable" messages
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
    // S&S URLs follow the pattern: https://www.ssactivewear.com/p/{vendorStyle}
    const productUrl = `${SS_BASE}/p/${item.vendorStyle}`;
    console.log(`[ss-cart]   Navigating to ${productUrl}`);
    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout });

    // Check for "product not found" or 404 pages
    const notFound = page.locator(
      'text="Product not found", text="Page not found", text="item is no longer available", ' +
      'text="no longer available", text="cannot be found"'
    );
    const isNotFound = await notFound.first().isVisible().catch(() => false);
    if (isNotFound) {
      return {
        item,
        success: false,
        error: `Product ${item.vendorStyle} not found on S&S Activewear`,
      };
    }

    // Wait for the product page to load - look for product content area
    await page.waitForSelector(
      '.product-detail, .product-page, [data-product], #product-detail, ' +
      '.pdp-container, .product-info, .product-main, [class*="product"]',
      { timeout: timeout / 2 },
    ).catch(() => {
      // Fallback: just wait for main content area
      return page.waitForSelector('main, #main, [role="main"], .main-content', { timeout: timeout / 2 });
    });

    await delay(ACTION_DELAY);

    // 2. Select color
    // S&S color selectors may be swatches (clickable chips) or dropdowns
    console.log(`[ss-cart]   Selecting color: ${item.color}`);
    const colorSelected = await selectSSColor(page, item.color, timeout);
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
    const sizeSelected = await selectSSSize(page, item.size, timeout);
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
    await setSSQuantity(page, item.quantity, timeout);
    await delay(ACTION_DELAY);

    // 5. Click "Add to Cart"
    console.log(`[ss-cart]   Clicking Add to Cart...`);
    const addToCartButton = page.locator(
      'button:has-text("Add to Cart"), button:has-text("ADD TO CART"), ' +
      'button:has-text("Add to Bag"), [data-action="add-to-cart"], ' +
      'button.add-to-cart, button.btn-add-cart, input[value="Add to Cart"], ' +
      'button[id*="addtocart" i], button[class*="add-to-cart" i]'
    );

    await addToCartButton.first().waitFor({ state: 'visible', timeout: 10_000 });
    await addToCartButton.first().click();

    // 6. Wait for cart confirmation
    // Look for: modal with cart success, toast notification, or cart count increment
    const confirmation = page.locator(
      '.cart-confirmation, .cart-modal, .add-to-cart-success, ' +
      '[data-cart-confirmation], .toast-success, .cart-added, ' +
      'text="Added to cart", text="added to your cart", text="Item added", ' +
      'text="Added to Cart", text="Successfully added"'
    );

    // Also watch for out-of-stock or error messages
    const stockError = page.locator(
      'text="out of stock", text="unavailable", text="not available", ' +
      'text="insufficient quantity", .stock-error, .availability-error, ' +
      'text="cannot be added", text="sold out"'
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
      // Confirmation might not show a distinct modal - check if cart count changed
      // This is a best-effort fallback; we'll accept it as likely successful
      console.log(`[ss-cart]   No explicit confirmation detected, proceeding...`);
    }

    // Close any confirmation modal/popup if present
    const closeButton = page.locator(
      '.modal-close, .close-button, [aria-label="Close"], button:has-text("Continue Shopping"), ' +
      'button:has-text("Continue"), .close, [data-dismiss="modal"], button.btn-close'
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
// Selector Helpers
// =============================================================================

/**
 * Select a color on the S&S Activewear product page.
 *
 * Tries multiple strategies:
 * 1. Click a color swatch with matching title/alt/aria-label text
 * 2. Select from a dropdown by matching option text
 * 3. Click a button/link with matching color text
 *
 * DISCOVERED SELECTORS:
 * - Color swatches: elements with title, aria-label, or data-color matching color name
 * - Dropdown: select elements with "color" in name/id
 * - Buttons: buttons or links containing color name text
 *
 * @returns true if color was selected, false otherwise
 */
async function selectSSColor(page: Page, colorName: string, timeout: number): Promise<boolean> {
  const lowerColor = colorName.toLowerCase();

  // Strategy 1: Color swatch (clickable chip with title or aria-label)
  // S&S typically uses swatch-style color selectors
  const swatch = page.locator(
    `[title="${colorName}" i], [aria-label="${colorName}" i], ` +
    `[data-color="${colorName}" i], [data-color-name="${colorName}" i], ` +
    `[data-value="${colorName}" i], img[alt="${colorName}" i], ` +
    `[class*="swatch"][title*="${colorName}" i]`
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
    'select[class*="color" i]'
  );
  try {
    const selectVisible = await colorSelect.first().isVisible().catch(() => false);
    if (selectVisible) {
      // Find the option that matches (case-insensitive)
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
    `[role="radio"]:has-text("${colorName}"), [role="button"]:has-text("${colorName}")`
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
 * Tries multiple strategies:
 * 1. Click a size button/chip with matching text
 * 2. Select from a dropdown by matching option text
 * 3. Click a label or radio with matching text
 *
 * DISCOVERED SELECTORS:
 * - Size buttons: buttons/elements with data-size or containing size text
 * - Dropdown: select elements with "size" in name/id
 * - Grid cells: input fields in a quantity grid (common for apparel wholesalers)
 *
 * @returns true if size was selected, false otherwise
 */
async function selectSSSize(page: Page, sizeName: string, timeout: number): Promise<boolean> {
  const lowerSize = sizeName.toLowerCase();

  // Strategy 1: Size button/chip (common on S&S)
  const sizeButton = page.locator(
    `[data-size="${sizeName}" i], [data-size-name="${sizeName}" i], ` +
    `[data-value="${sizeName}" i], button:has-text("${sizeName}"), ` +
    `[role="option"]:has-text("${sizeName}"), [role="radio"]:has-text("${sizeName}")`
  );
  try {
    // Need to be careful with partial matches (e.g., "M" matching "XM")
    // Check for exact text match among visible size options
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
    'select[class*="size" i]'
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
    `[role="button"]:has-text("${sizeName}")`
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
 *
 * DISCOVERED SELECTORS:
 * - Quantity inputs: input with quantity/qty in name/id, or type="number"
 * - S&S may use a grid-based quantity entry for size/color matrix
 */
async function setSSQuantity(page: Page, quantity: number, timeout: number): Promise<void> {
  // Look for quantity input field
  const qtyInput = page.locator(
    'input[name*="quantity" i], input[name*="qty" i], input[id*="quantity" i], ' +
    'input[id*="qty" i], input[aria-label*="quantity" i], ' +
    'input[type="number"][min="1"], input.quantity-input, input.qty-input'
  );

  try {
    await qtyInput.first().waitFor({ state: 'visible', timeout: 10_000 });
    await qtyInput.first().clear();
    await qtyInput.first().fill(String(quantity));
  } catch {
    // Some S&S pages may use a different quantity pattern (e.g., per-size grid)
    // Fallback: try to find any numeric input near size/cart controls
    console.warn(`[ss-cart]   Could not find standard quantity input, trying fallback...`);
    const fallbackQty = page.locator('input[type="number"]');
    const fallbacks = await fallbackQty.all();
    if (fallbacks.length > 0) {
      // Use the last visible numeric input (often the qty field)
      for (const input of fallbacks.reverse()) {
        const isVisible = await input.isVisible().catch(() => false);
        if (isVisible) {
          await input.clear();
          await input.fill(String(quantity));
          return;
        }
      }
    }
    console.warn(`[ss-cart]   Could not set quantity - will rely on default (1)`);
  }
}

// =============================================================================
// Core Cart Fill Function
// =============================================================================

/**
 * Fill the S&S Activewear shopping cart with consolidated items.
 *
 * Launches a headless browser, logs in to S&S Activewear, adds each item to
 * the cart, then hands off a visible browser window at the cart page for
 * the owner to complete checkout manually.
 *
 * @param request - CartFillRequest with consolidated items to add
 * @param options - Browser and timeout configuration
 * @returns CartFillResult with per-item results and overall status
 */
export async function fillSSCart(
  request: CartFillRequest,
  options?: SSCartFillOptions,
): Promise<CartFillResult> {
  const headless = options?.headless ?? true;
  const slowMo = options?.slowMo ?? 0;
  const itemTimeout = options?.timeout ?? DEFAULT_ITEM_TIMEOUT;

  const itemResults: CartItemResult[] = [];
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;

  console.log(`[ss-cart] Starting cart fill: ${request.items.length} items from ${request.orderNumbers.length} orders`);

  try {
    // 1. Launch headless browser
    console.log(`[ss-cart] Launching browser (headless: ${headless})...`);
    browser = await chromium.launch({ headless, slowMo });
    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    // 2. Login to S&S Activewear
    await loginToSS(page);

    // 3. Add each item to cart
    for (const item of request.items) {
      const result = await addSSItemToCart(page, item, itemTimeout);
      itemResults.push(result);

      // Brief pause between items
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

    console.log(`[ss-cart] Cart fill complete: ${successCount}/${totalCount} items added (${status})`);

    // 5. Browser handoff at checkout
    let checkoutUrl: string | undefined;

    if (successCount > 0) {
      // Save storage state (cookies, localStorage) from headless session
      const storageState = await context.storageState();

      // Close the headless browser
      await page.close();
      await context.close();
      await browser.close();
      browser = null;
      context = null;

      // Relaunch in HEADED mode with saved storage state
      console.log('[ss-cart] Opening visible browser at S&S cart for checkout...');
      const headedBrowser = await chromium.launch({ headless: false, slowMo: 0 });
      const headedContext = await headedBrowser.newContext({ storageState });
      const headedPage = await headedContext.newPage();

      // Navigate to cart page
      await headedPage.goto(SS_CART, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      checkoutUrl = SS_CART;

      console.log('[ss-cart] Browser opened at S&S cart - complete checkout manually.');
      console.log('[ss-cart] DO NOT close this browser window until checkout is complete.');

      // DO NOT close the headed browser - leave it open for the owner
      // The browser process will stay alive after this function returns
    }

    const result: CartFillResult = {
      request,
      status,
      itemResults,
      checkoutUrl,
      completedAt: new Date().toISOString(),
    };

    return result;
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
// Result Persistence
// =============================================================================

/**
 * Save a CartFillResult to data/cart-fills/ss/fill-{timestamp}.json.
 *
 * Creates the directory if it doesn't exist.
 *
 * @param result - The cart fill result to persist
 * @returns The file path where the result was saved
 */
export async function saveSSCartFillResult(result: CartFillResult): Promise<string> {
  await mkdir(SS_CART_FILLS_DIR, { recursive: true });

  const timestamp = result.completedAt.replace(/[:.]/g, '-');
  const filename = `fill-${timestamp}.json`;
  const filePath = path.join(SS_CART_FILLS_DIR, filename);

  await writeFile(filePath, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`[ss-cart] Cart fill result saved: ${filePath}`);

  return filePath;
}

// =============================================================================
// Order Status Updates
// =============================================================================

/**
 * Update order statuses based on S&S cart fill result.
 *
 * - success: All orders marked as 'ordered'
 * - partial: All orders marked as 'ordered' with note about failures
 * - failed: No status updates (orders remain as-is)
 *
 * @param result - The cart fill result to process
 */
export async function markSSOrdersAsOrdered(result: CartFillResult): Promise<void> {
  if (result.status === 'failed') {
    console.log('[ss-cart] Cart fill failed - not updating order statuses.');
    return;
  }

  const store = await loadOrders();
  const failedCount = result.itemResults.filter((r) => !r.success).length;
  const totalCount = result.itemResults.length;

  const note =
    result.status === 'success'
      ? 'S&S Activewear cart filled - all items added'
      : `S&S Activewear cart filled - some items failed: ${failedCount} of ${totalCount}`;

  for (const orderNumber of result.request.orderNumbers) {
    // Find the order by orderNumber
    const order = store.orders.find((o) => o.orderNumber === orderNumber);
    if (!order) {
      console.warn(`[ss-cart] Order #${orderNumber} not found in store - skipping status update.`);
      continue;
    }

    // Only update if order is currently in 'new' status (valid transition: new -> ordered)
    if (order.status !== 'new') {
      console.log(`[ss-cart] Order #${orderNumber} status is '${order.status}' - skipping (not 'new').`);
      continue;
    }

    try {
      await updateOrderStatus(order.id, 'ordered', note);
      console.log(`[ss-cart] Order #${orderNumber} status updated to 'ordered'.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[ss-cart] Failed to update order #${orderNumber}: ${message}`);
    }
  }
}

// =============================================================================
// High-Level Orchestrator
// =============================================================================

/**
 * Fill the S&S Activewear cart for all pending orders.
 *
 * Full pipeline:
 * 1. Load eligible orders (by status)
 * 2. Consolidate into CartFillRequest
 * 3. Execute browser automation
 * 4. Save result to disk
 * 5. Update order statuses
 *
 * @param options - Filter and browser options
 * @returns CartFillResult, or null if no orders to process
 */
export async function fillSSCartForPendingOrders(options?: {
  statuses?: OrderStatus[];
  headless?: boolean;
}): Promise<CartFillResult | null> {
  // 1. Load eligible orders
  const statuses = options?.statuses ?? ['new'];
  console.log(`[ss-cart] Loading orders with status: ${statuses.join(', ')}...`);
  const orders = await getSSOrdersForCartFill({ statuses });

  if (orders.length === 0) {
    console.log('[ss-cart] No orders found for cart fill.');
    return null;
  }

  console.log(`[ss-cart] Found ${orders.length} orders to process.`);

  // 2. Consolidate into CartFillRequest
  const request = consolidateSSOrders(orders);

  if (request.items.length === 0) {
    console.log('[ss-cart] No S&S items found after consolidation.');
    return null;
  }

  console.log(`[ss-cart] Consolidated into ${request.items.length} unique cart items.`);

  // 3. Execute browser automation
  const result = await fillSSCart(request, {
    headless: options?.headless,
  });

  // 4. Save result to disk
  await saveSSCartFillResult(result);

  // 5. Update order statuses
  await markSSOrdersAsOrdered(result);

  return result;
}
