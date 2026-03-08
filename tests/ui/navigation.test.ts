/**
 * UI E2E tests for sidebar navigation and tab switching.
 *
 * Verifies the app shell renders correctly (header, sidebar, content area),
 * all 5 sidebar tabs are clickable, and the active tab indicator works.
 *
 * Phase 57 Plan 05: UI E2E Tests
 */

import { test, expect } from '../fixtures.js';

test.describe('Sidebar navigation', () => {
  test('page loads and renders app shell', async ({ server, page }) => {
    await page.goto(server.baseUrl);

    // App header
    await expect(page.locator('.app-header')).toBeVisible();
    await expect(page.locator('.app-header__title')).toHaveText('HotBox');
    await expect(page.locator('.app-header__status')).toHaveText('System Ready');

    // Sidebar
    await expect(page.locator('.app-sidebar')).toBeVisible();
    await expect(page.locator('nav.sidebar')).toBeVisible();

    // Content area
    await expect(page.locator('.app-content')).toBeVisible();
  });

  test('all 5 sidebar tabs are visible with correct labels', async ({ server, page }) => {
    await page.goto(server.baseUrl);

    const tabLabels = ['Products', 'Orders', 'Inventory', 'Customers', 'System'];

    for (const label of tabLabels) {
      const tab = page.locator('.sidebar-tab', { has: page.locator(`.sidebar-tab__label:text("${label}")`) });
      await expect(tab).toBeVisible();
    }

    // Confirm exactly 5 tabs
    const tabs = page.locator('.sidebar-tab');
    await expect(tabs).toHaveCount(5);
  });

  test('clicking each tab shows the corresponding content panel', async ({ server, page }) => {
    await page.goto(server.baseUrl);

    // Products tab (default) shows the products tab content
    await expect(page.locator('.products-tab')).toBeVisible();

    // Click Orders tab
    await page.locator('.sidebar-tab__label:text("Orders")').click();
    await expect(page.locator('.orders-layout')).toBeVisible();

    // Click Inventory tab — shows placeholder
    await page.locator('.sidebar-tab__label:text("Inventory")').click();
    await expect(page.locator('.app-content__placeholder')).toBeVisible();
    await expect(page.locator('.app-content__placeholder')).toContainText('Inventory');

    // Click Customers tab — shows placeholder
    await page.locator('.sidebar-tab__label:text("Customers")').click();
    await expect(page.locator('.app-content__placeholder')).toBeVisible();
    await expect(page.locator('.app-content__placeholder')).toContainText('Customers');

    // Click System tab — shows placeholder
    await page.locator('.sidebar-tab__label:text("System")').click();
    await expect(page.locator('.app-content__placeholder')).toBeVisible();
    await expect(page.locator('.app-content__placeholder')).toContainText('System');

    // Click back to Products tab
    await page.locator('.sidebar-tab__label:text("Products")').click();
    await expect(page.locator('.products-tab')).toBeVisible();
  });

  test('active tab has visual indication', async ({ server, page }) => {
    await page.goto(server.baseUrl);

    // Products tab should be active by default
    const productsTab = page.locator('.sidebar-tab', { has: page.locator('.sidebar-tab__label:text("Products")') });
    await expect(productsTab).toHaveClass(/sidebar-tab--active/);

    // Click Orders tab — it should become active, Products should not
    await page.locator('.sidebar-tab__label:text("Orders")').click();

    const ordersTab = page.locator('.sidebar-tab', { has: page.locator('.sidebar-tab__label:text("Orders")') });
    await expect(ordersTab).toHaveClass(/sidebar-tab--active/);
    await expect(productsTab).not.toHaveClass(/sidebar-tab--active/);

    // Active tab also has aria-current="page"
    await expect(ordersTab).toHaveAttribute('aria-current', 'page');
    await expect(productsTab).not.toHaveAttribute('aria-current', 'page');
  });

  test('sidebar responsive behavior at 768px hides labels', async ({ server, page }) => {
    await page.goto(server.baseUrl);

    // At default viewport, labels should be visible
    await expect(page.locator('.sidebar-tab__label').first()).toBeVisible();

    // Resize to 768px width
    await page.setViewportSize({ width: 768, height: 600 });

    // Labels should be hidden (CSS media query hides them)
    await expect(page.locator('.sidebar-tab__label').first()).toBeHidden();

    // Icons should still be visible
    await expect(page.locator('.sidebar-tab__icon').first()).toBeVisible();

    // Tabs should still be clickable
    await page.locator('.sidebar-tab__icon').nth(1).click(); // Orders
    await expect(page.locator('.orders-layout')).toBeVisible();
  });
});
