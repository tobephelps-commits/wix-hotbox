/**
 * UI E2E tests for the Customers tab.
 *
 * The customers tab currently renders a placeholder view indicating
 * that the full customer management interface is planned for Phase 53.
 * Tests verify navigation to the tab and placeholder content.
 *
 * Phase 57 Plan 06: UI E2E Tests (Inventory, Customers, System)
 */

import { test, expect } from '../fixtures.js';

test.describe('Customers tab', () => {
  test('navigating to customers tab shows placeholder content', async ({ seededServer, page }) => {
    await page.goto(seededServer.baseUrl);

    // Click the Customers sidebar tab
    await page.locator('.sidebar-tab__label:text("Customers")').click();

    // Placeholder should be visible with tab label
    const placeholder = page.locator('.app-content__placeholder');
    await expect(placeholder).toBeVisible();
    await expect(placeholder).toContainText('Customers');
  });

  test('customers tab placeholder shows phase reference', async ({ seededServer, page }) => {
    await page.goto(seededServer.baseUrl);

    await page.locator('.sidebar-tab__label:text("Customers")').click();

    // Should indicate the phase where customer UI will be built
    const placeholder = page.locator('.app-content__placeholder');
    await expect(placeholder).toContainText('Phase 53');
  });

  test('customers tab marks sidebar button as active', async ({ seededServer, page }) => {
    await page.goto(seededServer.baseUrl);

    await page.locator('.sidebar-tab__label:text("Customers")').click();

    const customersTab = page.locator('.sidebar-tab', {
      has: page.locator('.sidebar-tab__label:text("Customers")'),
    });
    await expect(customersTab).toHaveClass(/sidebar-tab--active/);
    await expect(customersTab).toHaveAttribute('aria-current', 'page');
  });

  test('navigating between customers and orders preserves tab state', async ({ seededServer, page }) => {
    await page.goto(seededServer.baseUrl);

    // Go to customers
    await page.locator('.sidebar-tab__label:text("Customers")').click();
    await expect(page.locator('.app-content__placeholder')).toContainText('Customers');

    // Go to orders
    await page.locator('.sidebar-tab__label:text("Orders")').click();
    await expect(page.locator('.orders-layout')).toBeVisible();

    // Return to customers
    await page.locator('.sidebar-tab__label:text("Customers")').click();
    await expect(page.locator('.app-content__placeholder')).toContainText('Customers');
  });
});
