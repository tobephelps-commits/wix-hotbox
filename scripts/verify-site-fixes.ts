/**
 * Site Verification Script for HotBox Clothing
 *
 * Tests the live site (https://www.hotboxclothing.shop) for which v0.1
 * manual fixes have been completed and which remain pending.
 *
 * Usage: npm run verify:site-fixes
 *
 * Produces a pass/fail report for each testable fix from UX-ISSUES.md
 * and MOBILE-OPTIMIZATION-MASTER.md.
 */

import { chromium, type Page, type Browser, type BrowserContext } from 'playwright';
import {
  SITE_URL,
  VIEWPORTS,
  TIMEOUTS,
  KNOWN_PAGES,
  BAD_SLUGS,
} from './verify-site-fixes-config.js';

// ─── Result Tracking ────────────────────────────────────────────────

type CheckStatus = 'PASS' | 'FAIL' | 'SKIP' | 'ERROR';

interface CheckResult {
  id: string;
  description: string;
  status: CheckStatus;
  detail?: string;
}

const results: CheckResult[] = [];

function record(id: string, description: string, status: CheckStatus, detail?: string): void {
  results.push({ id, description, status, detail });
  const icon = status === 'PASS' ? '\x1b[32m[PASS]\x1b[0m'
    : status === 'FAIL' ? '\x1b[31m[FAIL]\x1b[0m'
    : status === 'SKIP' ? '\x1b[33m[SKIP]\x1b[0m'
    : '\x1b[35m[ERROR]\x1b[0m';
  const msg = `${icon} ${id}: ${description}`;
  console.log(detail ? `${msg} -- ${detail}` : msg);
}

// ─── Navigation Helper ──────────────────────────────────────────────

async function safeGoto(page: Page, path: string): Promise<boolean> {
  try {
    const url = path.startsWith('http') ? path : `${SITE_URL}${path}`;
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: TIMEOUTS.navigation,
    });
    return true;
  } catch {
    return false;
  }
}

// ─── Homepage Checks ────────────────────────────────────────────────

async function checkHomepageH1(page: Page): Promise<void> {
  try {
    await safeGoto(page, '/');
    const h1 = await page.$('h1');
    if (h1) {
      const text = await h1.textContent();
      record('AC-2', 'Homepage H1 heading exists', 'PASS', `Text: "${text?.trim()}"`);
    } else {
      record('AC-2', 'Homepage H1 heading exists', 'FAIL', 'No <h1> element found on homepage');
    }
  } catch (e: any) {
    record('AC-2', 'Homepage H1 heading exists', 'ERROR', e.message);
  }
}

async function checkLogoAltText(page: Page): Promise<void> {
  try {
    await safeGoto(page, '/');
    // Look for the site logo image in the header area
    const logoImgs = await page.$$('header img, [data-hook="logo"] img, img[alt*="Hotbox"], img[alt*="hotbox"], img[src*="Hotbox"], img[src*="hotbox"]');
    let foundBadAlt = false;
    let foundGoodAlt = false;

    for (const img of logoImgs) {
      const alt = await img.getAttribute('alt');
      if (alt && (alt.includes('Hotbox_edited') || alt.includes('.jpg') || alt.includes('.png'))) {
        foundBadAlt = true;
      } else if (alt && alt.trim().length > 0) {
        foundGoodAlt = true;
      }
    }

    if (foundGoodAlt && !foundBadAlt) {
      record('AC-1', 'Logo alt text is descriptive', 'PASS', 'Logo has descriptive alt text');
    } else if (foundBadAlt) {
      record('AC-1', 'Logo alt text is descriptive', 'FAIL', 'Logo alt text contains filename (e.g. "Hotbox_edited.jpg")');
    } else if (logoImgs.length === 0) {
      record('AC-1', 'Logo alt text is descriptive', 'FAIL', 'No logo image found');
    } else {
      record('AC-1', 'Logo alt text is descriptive', 'FAIL', 'Logo image has empty alt text');
    }
  } catch (e: any) {
    record('AC-1', 'Logo alt text is descriptive', 'ERROR', e.message);
  }
}

async function checkCopyrightYear(page: Page): Promise<void> {
  try {
    await safeGoto(page, '/');
    const footer = await page.$('footer');
    if (!footer) {
      record('AC-3a', 'Copyright year is 2026', 'FAIL', 'No footer element found');
      return;
    }
    const footerText = await footer.textContent() || '';
    const yearMatch = footerText.match(/©\s*(\d{4})|copyright\s*(\d{4})|(?:\(c\))\s*(\d{4})/i);
    const year = yearMatch ? (yearMatch[1] || yearMatch[2] || yearMatch[3]) : null;
    if (year === '2026') {
      record('AC-3a', 'Copyright year is 2026', 'PASS', 'Footer shows 2026');
    } else if (year) {
      record('AC-3a', 'Copyright year is 2026', 'FAIL', `Footer shows ${year} instead of 2026`);
    } else {
      record('AC-3a', 'Copyright year is 2026', 'FAIL', `No copyright year found in footer. Text: "${footerText.trim().substring(0, 100)}"`);
    }
  } catch (e: any) {
    record('AC-3a', 'Copyright year is 2026', 'ERROR', e.message);
  }
}

async function checkFooterNavLinks(page: Page): Promise<void> {
  try {
    await safeGoto(page, '/');
    const footer = await page.$('footer');
    if (!footer) {
      record('AC-3b', 'Footer has navigation links', 'FAIL', 'No footer element found');
      return;
    }
    const links = await footer.$$('a');
    // Filter to only internal/navigation links (exclude mailto and tel)
    const navLinks: string[] = [];
    for (const link of links) {
      const href = await link.getAttribute('href');
      if (href && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
        navLinks.push(href);
      }
    }
    if (navLinks.length >= 3) {
      record('AC-3b', 'Footer has navigation links', 'PASS', `${navLinks.length} navigation links found`);
    } else {
      record('AC-3b', 'Footer has navigation links', 'FAIL', `Only ${navLinks.length} navigation links (need at least 3)`);
    }
  } catch (e: any) {
    record('AC-3b', 'Footer has navigation links', 'ERROR', e.message);
  }
}

async function checkChatWidget(page: Page): Promise<void> {
  try {
    await safeGoto(page, '/');
    // Check for common WIX chat widget selectors
    const chatSelectors = [
      '[data-hook="chat-widget"]',
      '[data-hook="popover-element"]',
      '.sZLWK8K',
      'iframe[title*="chat" i]',
      'iframe[title*="Wix Chat" i]',
      '[id*="chat-widget"]',
    ];
    let chatFound = false;
    let chatSelector = '';
    for (const sel of chatSelectors) {
      const el = await page.$(sel);
      if (el) {
        const box = await el.boundingBox();
        // Only count it as blocking if it's visible and has size
        if (box && box.width > 0 && box.height > 0) {
          chatFound = true;
          chatSelector = sel;
          break;
        }
      }
    }
    if (!chatFound) {
      record('CR-2', 'No chat widget blocking interactions', 'PASS', 'No visible chat widget overlay found');
    } else {
      record('CR-2', 'No chat widget blocking interactions', 'FAIL', `Chat widget found (${chatSelector})`);
    }
  } catch (e: any) {
    record('CR-2', 'No chat widget blocking interactions', 'ERROR', e.message);
  }
}

// ─── Navigation Checks ─────────────────────────────────────────────

async function checkShopAllPage(page: Page): Promise<void> {
  try {
    // Try several possible paths for a "Shop All" page
    const possiblePaths = ['/shop-all', '/all-products', '/shop'];
    let found = false;
    let foundPath = '';

    for (const path of possiblePaths) {
      const ok = await safeGoto(page, path);
      if (ok) {
        const title = await page.title();
        // Check it's not a 404 page
        const is404 = await page.$('text=Page Not Found') || await page.$('text=404');
        if (!is404) {
          // Check there are products on the page
          const products = await page.$$('[data-hook="product-item"], [data-hook*="product"], .product-item, .wixui-gallery__item');
          if (products.length > 0) {
            found = true;
            foundPath = path;
            break;
          }
        }
      }
    }

    if (found) {
      record('CR-5', '"Shop All" browse-all page exists', 'PASS', `Found at ${foundPath}`);
    } else {
      record('CR-5', '"Shop All" browse-all page exists', 'FAIL', 'No shop-all page found at /shop-all, /all-products, or /shop with products');
    }
  } catch (e: any) {
    record('CR-5', '"Shop All" browse-all page exists', 'ERROR', e.message);
  }
}

async function checkNavItemCount(page: Page): Promise<void> {
  try {
    await safeGoto(page, '/');
    // Count top-level navigation items
    const navItems = await page.$$('nav > ul > li, [data-hook="nav-bar"] > ul > li, nav [role="menubar"] > [role="menuitem"], header nav a');
    // Also try WIX-specific selectors
    const wixNavItems = await page.$$('[data-testid="nav-menu"] > li, [id*="navContainer"] a, [data-hook*="menu-item"]');
    const count = Math.max(navItems.length, wixNavItems.length);
    if (count > 0 && count <= 6) {
      record('NV-1', 'Navigation has 6 or fewer top-level items', 'PASS', `${count} items found`);
    } else if (count === 0) {
      record('NV-1', 'Navigation has 6 or fewer top-level items', 'FAIL', 'Could not find navigation items');
    } else {
      record('NV-1', 'Navigation has 6 or fewer top-level items', 'FAIL', `${count} items (maximum 6 recommended)`);
    }
  } catch (e: any) {
    record('NV-1', 'Navigation has 6 or fewer top-level items', 'ERROR', e.message);
  }
}

async function checkUrlSlugs(page: Page): Promise<void> {
  try {
    let badSlugsInUse = 0;
    const foundBad: string[] = [];
    for (const slug of BAD_SLUGS) {
      const ok = await safeGoto(page, slug);
      if (ok) {
        // Check if it's not 404
        const is404 = await page.$('text=Page Not Found') || await page.$('text=404');
        if (!is404) {
          // Page exists at a bad slug
          badSlugsInUse++;
          foundBad.push(slug);
        }
      }
    }

    if (badSlugsInUse === 0) {
      record('NV-5', 'URL slugs are descriptive (not /shop-1, /blank-2)', 'PASS', 'No WIX default slugs found');
    } else {
      record('NV-5', 'URL slugs are descriptive (not /shop-1, /blank-2)', 'FAIL',
        `${badSlugsInUse} default slugs still in use: ${foundBad.join(', ')}`);
    }
  } catch (e: any) {
    record('NV-5', 'URL slugs are descriptive (not /shop-1, /blank-2)', 'ERROR', e.message);
  }
}

// ─── Mobile Checks (375x812) ───────────────────────────────────────

async function checkMobileScrollWidth(page: Page): Promise<void> {
  try {
    await safeGoto(page, '/');
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = VIEWPORTS.mobile.width;
    if (scrollWidth <= viewportWidth) {
      record('CR-1', 'Body scroll width equals viewport width (no horizontal overflow)', 'PASS',
        `scrollWidth=${scrollWidth} <= viewport=${viewportWidth}`);
    } else {
      record('CR-1', 'Body scroll width equals viewport width (no horizontal overflow)', 'FAIL',
        `scrollWidth=${scrollWidth} > viewport=${viewportWidth} (overflow: ${scrollWidth - viewportWidth}px)`);
    }
  } catch (e: any) {
    record('CR-1', 'Body scroll width equals viewport width (no horizontal overflow)', 'ERROR', e.message);
  }
}

async function checkHamburgerMenu(page: Page): Promise<void> {
  try {
    await safeGoto(page, '/');
    // Look for hamburger/mobile menu toggle
    const hamburgerSelectors = [
      '[data-hook="mobile-menu"]',
      '[aria-label="Open mobile menu"]',
      '[aria-label="Menu"]',
      'button[aria-label*="menu" i]',
      '.hamburger',
      '.menu-toggle',
      '[data-testid="hamburger-menu"]',
      'button svg[viewBox*="menu"]',
      'header button',
    ];
    let found = false;
    let foundSelector = '';
    for (const sel of hamburgerSelectors) {
      const el = await page.$(sel);
      if (el) {
        const box = await el.boundingBox();
        if (box && box.width > 0 && box.height > 0) {
          found = true;
          foundSelector = sel;
          break;
        }
      }
    }

    if (found) {
      record('MC-1', 'Hamburger menu icon visible at mobile viewport', 'PASS', `Found via ${foundSelector}`);
    } else {
      record('MC-1', 'Hamburger menu icon visible at mobile viewport', 'FAIL', 'No hamburger/menu toggle element found');
    }
  } catch (e: any) {
    record('MC-1', 'Hamburger menu icon visible at mobile viewport', 'ERROR', e.message);
  }
}

async function checkMobileProductGallery(page: Page): Promise<void> {
  try {
    // Navigate to a known collection page
    const ok = await safeGoto(page, KNOWN_PAGES.bigBarn);
    if (!ok) {
      record('MC-2', 'Product gallery shows images on mobile', 'ERROR', 'Could not load collection page');
      return;
    }
    // Wait a bit for lazy loading
    await page.waitForTimeout(3000);

    // Count visible product images
    const images = await page.evaluate(() => {
      const imgs = document.querySelectorAll(
        '[data-hook="product-item"] img, [data-hook*="product"] img, .product-item img, img[src*="wixstatic"]'
      );
      let visibleCount = 0;
      imgs.forEach(img => {
        const rect = (img as HTMLElement).getBoundingClientRect();
        // Image is "visible" if it's within the horizontal viewport (not off-screen right)
        if (rect.width > 0 && rect.right > 0 && rect.left < window.innerWidth) {
          visibleCount++;
        }
      });
      return { total: imgs.length, visible: visibleCount };
    });

    if (images.visible >= 2) {
      record('MC-2', 'Product gallery shows images on mobile', 'PASS',
        `${images.visible} visible product images (${images.total} total)`);
    } else {
      record('MC-2', 'Product gallery shows images on mobile', 'FAIL',
        `Only ${images.visible} visible product images (${images.total} total in DOM)`);
    }
  } catch (e: any) {
    record('MC-2', 'Product gallery shows images on mobile', 'ERROR', e.message);
  }
}

async function checkAddToCartPosition(page: Page): Promise<void> {
  try {
    // Navigate to a product page -- find one from the Big Barn collection
    await safeGoto(page, KNOWN_PAGES.bigBarn);
    // Try to find a product link
    const productLinks = await page.$$('a[href*="/product-page/"]');
    if (productLinks.length === 0) {
      record('MC-3', 'Add to Cart within 1.5 viewport heights on product page', 'FAIL',
        'Could not find any product page links');
      return;
    }
    const href = await productLinks[0].getAttribute('href');
    if (!href) {
      record('MC-3', 'Add to Cart within 1.5 viewport heights on product page', 'ERROR',
        'Product link has no href');
      return;
    }
    await safeGoto(page, href);
    await page.waitForTimeout(2000);

    // Find Add to Cart button
    const addToCartSelectors = [
      '[data-hook="add-to-cart"]',
      'button:has-text("Add to Cart")',
      '[data-hook="product-action-button"]',
      'button:has-text("ADD TO CART")',
    ];
    let buttonY: number | null = null;
    for (const sel of addToCartSelectors) {
      try {
        const btn = await page.$(sel);
        if (btn) {
          const box = await btn.boundingBox();
          if (box) {
            buttonY = box.y;
            break;
          }
        }
      } catch {
        // selector might not match, continue
      }
    }

    const maxY = VIEWPORTS.mobile.height * 1.5;
    if (buttonY !== null && buttonY <= maxY) {
      record('MC-3', 'Add to Cart within 1.5 viewport heights on product page', 'PASS',
        `Button at y=${Math.round(buttonY)} (max: ${maxY})`);
    } else if (buttonY !== null) {
      record('MC-3', 'Add to Cart within 1.5 viewport heights on product page', 'FAIL',
        `Button at y=${Math.round(buttonY)} (max: ${maxY}, over by ${Math.round(buttonY - maxY)}px)`);
    } else {
      record('MC-3', 'Add to Cart within 1.5 viewport heights on product page', 'FAIL',
        'Add to Cart button not found on product page');
    }
  } catch (e: any) {
    record('MC-3', 'Add to Cart within 1.5 viewport heights on product page', 'ERROR', e.message);
  }
}

// ─── Product Page Checks ────────────────────────────────────────────

async function checkSizeGuide(page: Page): Promise<void> {
  try {
    // Navigate to a product page
    await safeGoto(page, KNOWN_PAGES.bigBarn);
    const productLinks = await page.$$('a[href*="/product-page/"]');
    if (productLinks.length === 0) {
      record('CK-2', 'Size guide info section present on product page', 'FAIL',
        'Could not find product page links');
      return;
    }
    const href = await productLinks[0].getAttribute('href');
    if (!href) {
      record('CK-2', 'Size guide info section present on product page', 'ERROR',
        'Product link has no href');
      return;
    }
    await safeGoto(page, href);
    await page.waitForTimeout(2000);

    // Look for size guide text or section
    const sizeGuideIndicators = [
      'text=Size Guide',
      'text=size guide',
      'text=SIZE GUIDE',
      'text=Size Chart',
      'text=size chart',
      'text=Sizing',
      '[data-hook="info-section-description"]',
    ];
    let found = false;
    for (const sel of sizeGuideIndicators) {
      try {
        const el = await page.$(sel);
        if (el) {
          found = true;
          break;
        }
      } catch {
        // continue
      }
    }

    // Also check page text content
    if (!found) {
      const bodyText = await page.evaluate(() => document.body.innerText);
      if (bodyText.toLowerCase().includes('size guide') || bodyText.toLowerCase().includes('size chart')) {
        found = true;
      }
    }

    if (found) {
      record('CK-2', 'Size guide info section present on product page', 'PASS', 'Size guide information found');
    } else {
      record('CK-2', 'Size guide info section present on product page', 'FAIL', 'No size guide or size chart content found');
    }
  } catch (e: any) {
    record('CK-2', 'Size guide info section present on product page', 'ERROR', e.message);
  }
}

async function checkRelatedProducts(page: Page): Promise<void> {
  try {
    // Navigate to a product page
    await safeGoto(page, KNOWN_PAGES.bigBarn);
    const productLinks = await page.$$('a[href*="/product-page/"]');
    if (productLinks.length === 0) {
      record('NV-6', 'Related products section present on product page', 'FAIL',
        'Could not find product page links');
      return;
    }
    const href = await productLinks[0].getAttribute('href');
    if (!href) {
      record('NV-6', 'Related products section present on product page', 'ERROR',
        'Product link has no href');
      return;
    }
    await safeGoto(page, href);
    await page.waitForTimeout(2000);

    // Look for related products indicators
    const relatedSelectors = [
      'text=You might also like',
      'text=Related Products',
      'text=Customers Also Viewed',
      'text=You May Also Like',
      'text=Recommended',
      '[data-hook="related-products"]',
      '[data-hook="product-widget"]',
    ];
    let found = false;
    for (const sel of relatedSelectors) {
      try {
        const el = await page.$(sel);
        if (el) {
          found = true;
          break;
        }
      } catch {
        // continue
      }
    }

    // Also check page text
    if (!found) {
      const bodyText = await page.evaluate(() => document.body.innerText);
      if (
        bodyText.toLowerCase().includes('you might also like') ||
        bodyText.toLowerCase().includes('related products') ||
        bodyText.toLowerCase().includes('you may also like') ||
        bodyText.toLowerCase().includes('customers also viewed')
      ) {
        found = true;
      }
    }

    if (found) {
      record('NV-6', 'Related products section present on product page', 'PASS', 'Related products section found');
    } else {
      record('NV-6', 'Related products section present on product page', 'FAIL', 'No related/recommended products section found');
    }
  } catch (e: any) {
    record('NV-6', 'Related products section present on product page', 'ERROR', e.message);
  }
}

// ─── Checkout Checks ────────────────────────────────────────────────

async function checkCheckoutPolicies(page: Page): Promise<void> {
  try {
    // We cannot navigate to the actual checkout without adding a product.
    // Instead, check for policy pages / links on the site.
    await safeGoto(page, '/');

    // Check for policy pages in footer or body
    const policyIndicators = [
      'text=Return Policy',
      'text=Shipping Policy',
      'text=Privacy Policy',
      'text=Terms & Conditions',
      'text=Terms and Conditions',
      'a[href*="policy"]',
      'a[href*="terms"]',
      'a[href*="shipping"]',
      'a[href*="return"]',
    ];
    let policiesFound = 0;
    for (const sel of policyIndicators) {
      try {
        const el = await page.$(sel);
        if (el) {
          policiesFound++;
        }
      } catch {
        // continue
      }
    }

    if (policiesFound >= 2) {
      record('CK-1', 'Checkout policies visible (links/content on site)', 'PASS',
        `${policiesFound} policy indicators found`);
    } else {
      record('CK-1', 'Checkout policies visible (links/content on site)', 'FAIL',
        `Only ${policiesFound} policy indicators found (expected at least 2)`);
    }
  } catch (e: any) {
    record('CK-1', 'Checkout policies visible (links/content on site)', 'ERROR', e.message);
  }
}

// ─── SKIP-only Checks ───────────────────────────────────────────────

function recordSkippedChecks(): void {
  record('CK-3', 'Variant image switching', 'SKIP', 'Requires manual visual verification of color swatch interaction');
  record('CK-4', 'Direct Add to Cart on all galleries', 'SKIP', 'Requires checking all 7 collection pages manually');
  record('CK-5', 'Sezzle BNPL consistency', 'SKIP', 'Async loading behavior requires manual timing verification');
  record('MC-4', 'Color swatches meet 44x44px tap target', 'SKIP', 'WIX custom element sizing requires visual inspection');
  record('MC-5', '32-color products usable on mobile', 'SKIP', 'Subjective usability requires manual testing');
  record('MC-6', 'Tablet horizontal overflow', 'SKIP', 'Covered partially by CR-1; full tablet test requires 768px viewport run');
  record('PT-1', 'Image lazy-loading works on scroll', 'SKIP', 'Requires scrolling interaction and visual verification');
  record('AC-4', 'Keyboard navigation for product options', 'SKIP', 'WIX platform limitation; requires manual keyboard testing');
  record('NV-2', 'Search functionality exists', 'SKIP', 'Requires visual verification of search bar/icon');
  record('NV-3', 'Product filtering and sorting', 'SKIP', 'Requires visual verification of filter controls');
  record('NV-4', '"Shop" link placement', 'SKIP', 'Requires checking navigation menu structure manually');
  record('CL-1', 'UNMH page heading correct', 'SKIP', 'Requires visual verification of heading text change');
  record('CL-2', 'Fall PreOrder typo "20256" fixed', 'SKIP', 'Requires visual content verification');
  record('CL-3', 'Consistent product gallery layouts', 'SKIP', 'Requires visual comparison across collection pages');
  record('CL-4', 'Big Barn Team Hat has images/content', 'SKIP', 'Requires product content verification');
  record('CL-5', 'External CompanyCasuals link removed', 'SKIP', 'Requires checking Big Barn subheading link target');
}

// ─── Print Summary ──────────────────────────────────────────────────

function printSummary(): void {
  const pass = results.filter(r => r.status === 'PASS').length;
  const fail = results.filter(r => r.status === 'FAIL').length;
  const skip = results.filter(r => r.status === 'SKIP').length;
  const error = results.filter(r => r.status === 'ERROR').length;
  const total = results.length;

  console.log('\n' + '='.repeat(60));
  console.log('SITE VERIFICATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Site: ${SITE_URL}`);
  console.log(`Date: ${new Date().toISOString()}`);
  console.log('');
  console.log(`  \x1b[32mPASS:\x1b[0m  ${pass}`);
  console.log(`  \x1b[31mFAIL:\x1b[0m  ${fail}`);
  console.log(`  \x1b[33mSKIP:\x1b[0m  ${skip}`);
  if (error > 0) console.log(`  \x1b[35mERROR:\x1b[0m ${error}`);
  console.log(`  TOTAL: ${total}`);
  console.log('');
  console.log(`${pass}/${total} checks passed, ${fail} failed, ${skip} skipped`);
  console.log('='.repeat(60));
}

// ─── Main Execution ─────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('HotBox Clothing -- Site Fix Verification');
  console.log(`Target: ${SITE_URL}`);
  console.log(`Date: ${new Date().toISOString()}`);
  console.log('='.repeat(60));
  console.log('');

  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless: true });

    // ── Desktop checks ──────────────────────────────────────────
    console.log('--- Desktop Viewport (1440x900) ---\n');
    const desktopContext: BrowserContext = await browser.newContext({
      viewport: VIEWPORTS.desktop,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    const desktopPage: Page = await desktopContext.newPage();

    // Homepage checks
    await checkHomepageH1(desktopPage);
    await checkLogoAltText(desktopPage);
    await checkCopyrightYear(desktopPage);
    await checkFooterNavLinks(desktopPage);
    await checkChatWidget(desktopPage);

    // Navigation checks
    await checkShopAllPage(desktopPage);
    await checkNavItemCount(desktopPage);
    await checkUrlSlugs(desktopPage);

    // Product page checks (desktop viewport)
    await checkSizeGuide(desktopPage);
    await checkRelatedProducts(desktopPage);

    // Checkout checks
    await checkCheckoutPolicies(desktopPage);

    await desktopContext.close();

    // ── Mobile checks ───────────────────────────────────────────
    console.log('\n--- Mobile Viewport (375x812) ---\n');
    const mobileContext: BrowserContext = await browser.newContext({
      viewport: VIEWPORTS.mobile,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage: Page = await mobileContext.newPage();

    await checkMobileScrollWidth(mobilePage);
    await checkHamburgerMenu(mobilePage);
    await checkMobileProductGallery(mobilePage);
    await checkAddToCartPosition(mobilePage);

    await mobileContext.close();

    // ── Skipped checks ──────────────────────────────────────────
    console.log('\n--- Skipped Checks (require manual verification) ---\n');
    recordSkippedChecks();

  } catch (e: any) {
    console.error(`\nFATAL ERROR: ${e.message}`);
    console.error('Site may be unreachable. All remaining checks marked as ERROR.');

    // If we haven't run any checks yet, mark all as ERROR
    if (results.length === 0) {
      record('ALL', 'Site reachable', 'ERROR', e.message);
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  printSummary();

  // Exit with code 1 if any failures (useful for CI)
  const failures = results.filter(r => r.status === 'FAIL' || r.status === 'ERROR');
  if (failures.length > 0) {
    process.exit(1);
  }
}

main();
