/**
 * UI E2E tests for the Inventory tab.
 *
 * The inventory tab currently renders a placeholder view indicating
 * that the full monitoring interface is planned for Phase 51.
 * Tests verify navigation to the tab and placeholder content.
 *
 * Phase 57 Plan 06: UI E2E Tests (Inventory, Customers, System)
 */

import { test, expect } from '../fixtures.js';

test.describe('Inventory tab', () => {
  test('navigating to inventory tab shows placeholder content', async ({ server, page }) => {
    await page.goto(server.baseUrl);

    // Click the Inventory sidebar tab
    await page.locator('.sidebar-tab__label:text("Inventory")').click();

    // Placeholder should be visible with tab label
    const placeholder = page.locator('.app-content__placeholder');
    await expect(placeholder).toBeVisible();
    await expect(placeholder).toContainText('Inventory');
  });

  test('inventory tab placeholder shows phase reference', async ({ server, page }) => {
    await page.goto(server.baseUrl);

    await page.locator('.sidebar-tab__label:text("Inventory")').click();

    // Should indicate the phase where inventory UI will be built
    const placeholder = page.locator('.app-content__placeholder');
    await expect(placeholder).toContainText('Phase 51');
  });

  test('inventory tab marks sidebar button as active', async ({ server, page }) => {
    await page.goto(server.baseUrl);

    await page.locator('.sidebar-tab__label:text("Inventory")').click();

    const inventoryTab = page.locator('.sidebar-tab', {
      has: page.locator('.sidebar-tab__label:text("Inventory")'),
    });
    await expect(inventoryTab).toHaveClass(/sidebar-tab--active/);
    await expect(inventoryTab).toHaveAttribute('aria-current', 'page');
  });

  test('navigating away from inventory tab and back preserves state', async ({ server, page }) => {
    await page.goto(server.baseUrl);

    // Go to inventory
    await page.locator('.sidebar-tab__label:text("Inventory")').click();
    await expect(page.locator('.app-content__placeholder')).toContainText('Inventory');

    // Go to products
    await page.locator('.sidebar-tab__label:text("Products")').click();
    await expect(page.locator('.products-tab')).toBeVisible();

    // Go back to inventory
    await page.locator('.sidebar-tab__label:text("Inventory")').click();
    await expect(page.locator('.app-content__placeholder')).toContainText('Inventory');
  });
});
