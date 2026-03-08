/**
 * UI E2E tests for the System tab and Logo Manager.
 *
 * The system tab currently renders a placeholder view indicating
 * the full system dashboard is planned for Phase 44. Tests verify
 * placeholder rendering and navigation.
 *
 * The Logo Manager is a fully functional component accessible from
 * the Products tab via the "Manage Logos" button. Tests verify the
 * logo management UI including upload form, logo grid, and CRUD operations.
 *
 * Phase 57 Plan 06: UI E2E Tests (Inventory, Customers, System)
 */

import { test, expect } from '../fixtures.js';

test.describe('System tab', () => {
  test('navigating to system tab shows placeholder content', async ({ server, page }) => {
    await page.goto(server.baseUrl);

    // Click the System sidebar tab
    await page.locator('.sidebar-tab__label:text("System")').click();

    // Placeholder should be visible with tab label
    const placeholder = page.locator('.app-content__placeholder');
    await expect(placeholder).toBeVisible();
    await expect(placeholder).toContainText('System');
  });

  test('system tab placeholder shows phase reference', async ({ server, page }) => {
    await page.goto(server.baseUrl);

    await page.locator('.sidebar-tab__label:text("System")').click();

    // Should indicate the phase where system UI will be built
    const placeholder = page.locator('.app-content__placeholder');
    await expect(placeholder).toContainText('Phase 44');
  });

  test('system tab marks sidebar button as active', async ({ server, page }) => {
    await page.goto(server.baseUrl);

    await page.locator('.sidebar-tab__label:text("System")').click();

    const systemTab = page.locator('.sidebar-tab', {
      has: page.locator('.sidebar-tab__label:text("System")'),
    });
    await expect(systemTab).toHaveClass(/sidebar-tab--active/);
    await expect(systemTab).toHaveAttribute('aria-current', 'page');
  });

  test('system tab is in the sidebar bottom section', async ({ server, page }) => {
    await page.goto(server.baseUrl);

    // System tab should be in the sidebar bottom section (below separator)
    const bottomSection = page.locator('.sidebar__bottom');
    await expect(bottomSection).toBeVisible();

    const systemTab = bottomSection.locator('.sidebar-tab', {
      has: page.locator('.sidebar-tab__label:text("System")'),
    });
    await expect(systemTab).toBeVisible();
  });

  test('separator divides main tabs from system tab', async ({ server, page }) => {
    await page.goto(server.baseUrl);

    // Separator should be visible between main tabs and system tab
    await expect(page.locator('.sidebar__separator')).toBeVisible();
  });
});

test.describe('Logo Manager', () => {
  test('Manage Logos button opens logo manager panel', async ({ server, page }) => {
    await page.goto(server.baseUrl);

    // Products tab is the default — click Manage Logos
    const manageLogosBtn = page.locator('.products-tab__utility-btn:text("Manage Logos")');
    await expect(manageLogosBtn).toBeVisible();
    await manageLogosBtn.click();

    // Logo manager should be visible
    await expect(page.locator('.logo-manager')).toBeVisible();
    await expect(page.locator('.logo-manager__title')).toHaveText('Manage Logos');
  });

  test('logo manager has back button that returns to products', async ({ server, page }) => {
    await page.goto(server.baseUrl);

    await page.locator('.products-tab__utility-btn:text("Manage Logos")').click();
    await expect(page.locator('.logo-manager')).toBeVisible();

    // Click back button
    await page.locator('.logo-manager__back-btn').click();

    // Should be back to products tab with style lookup
    await expect(page.locator('.style-lookup')).toBeVisible();
    await expect(page.locator('.logo-manager')).not.toBeVisible();
  });

  test('logo manager shows empty state when no logos exist', async ({ server, page }) => {
    await page.goto(server.baseUrl);

    await page.locator('.products-tab__utility-btn:text("Manage Logos")').click();
    await expect(page.locator('.logo-manager')).toBeVisible();

    // Should show empty state (no logos seeded in plain server)
    await expect(page.locator('.logo-manager__empty')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('.logo-manager__empty')).toContainText('No logos yet');
  });

  test('upload toggle button shows and hides upload form', async ({ server, page }) => {
    await page.goto(server.baseUrl);

    await page.locator('.products-tab__utility-btn:text("Manage Logos")').click();
    await expect(page.locator('.logo-manager')).toBeVisible();

    // Upload toggle should say "+ Upload Logo"
    const uploadToggle = page.locator('.logo-manager__upload-toggle');
    await expect(uploadToggle).toBeVisible();
    await expect(uploadToggle).toHaveText('+ Upload Logo');

    // Click to show upload form
    await uploadToggle.click();
    await expect(page.locator('.logo-manager__upload-form')).toBeVisible();
    await expect(uploadToggle).toHaveText('Cancel Upload');

    // Click again to hide
    await uploadToggle.click();
    await expect(page.locator('.logo-manager__upload-form')).not.toBeVisible();
    await expect(uploadToggle).toHaveText('+ Upload Logo');
  });

  test('upload form has required fields', async ({ server, page }) => {
    await page.goto(server.baseUrl);

    await page.locator('.products-tab__utility-btn:text("Manage Logos")').click();
    await page.locator('.logo-manager__upload-toggle').click();

    // Display Name field
    const displayNameInput = page.locator('#logo-display-name');
    await expect(displayNameInput).toBeVisible();
    await expect(displayNameInput).toHaveAttribute('type', 'text');

    // Key field
    const keyInput = page.locator('#logo-key');
    await expect(keyInput).toBeVisible();

    // File input
    const fileInput = page.locator('#logo-file-input');
    await expect(fileInput).toBeVisible();
    await expect(fileInput).toHaveAttribute('accept', 'image/*');

    // Upload button (should be disabled when no file selected)
    const uploadBtn = page.locator('.logo-manager__upload-btn');
    await expect(uploadBtn).toBeVisible();
    await expect(uploadBtn).toBeDisabled();
  });

  test('display name auto-generates key', async ({ server, page }) => {
    await page.goto(server.baseUrl);

    await page.locator('.products-tab__utility-btn:text("Manage Logos")').click();
    await page.locator('.logo-manager__upload-toggle').click();

    // Type a display name
    await page.locator('#logo-display-name').fill('Big Logo Black');

    // Key should be auto-generated
    await expect(page.locator('#logo-key')).toHaveValue('big-logo-black');
  });

  test('key field can be manually edited', async ({ server, page }) => {
    await page.goto(server.baseUrl);

    await page.locator('.products-tab__utility-btn:text("Manage Logos")').click();
    await page.locator('.logo-manager__upload-toggle').click();

    // Type display name first (auto-generates key)
    await page.locator('#logo-display-name').fill('My Logo');
    await expect(page.locator('#logo-key')).toHaveValue('my-logo');

    // Manually edit the key
    await page.locator('#logo-key').fill('custom-key');
    await expect(page.locator('#logo-key')).toHaveValue('custom-key');

    // After manual edit, changing display name should NOT overwrite key
    await page.locator('#logo-display-name').fill('Another Name');
    await expect(page.locator('#logo-key')).toHaveValue('custom-key');
  });
});
