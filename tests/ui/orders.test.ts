/**
 * UI E2E tests for the Orders tab.
 *
 * Uses seededServer fixture so there are orders to display.
 * Tests list view, order detail, pipeline toggle, search, filters,
 * and bulk toolbar.
 *
 * Phase 57 Plan 05: UI E2E Tests
 */

import { test, expect } from '../fixtures.js';

test.describe('Orders tab', () => {
  test('orders tab shows order list header and controls', async ({ seededServer, page }) => {
    await page.goto(seededServer.baseUrl);

    // Navigate to Orders tab
    await page.locator('.sidebar-tab__label:text("Orders")').click();
    await expect(page.locator('.orders-layout')).toBeVisible();

    // Header
    await expect(page.locator('.orders-header__title')).toHaveText('Orders');

    // View toggle buttons (list and pipeline)
    const viewBtns = page.locator('.orders-header__view-btn');
    await expect(viewBtns).toHaveCount(2);

    // List view button should be active by default
    await expect(viewBtns.first()).toHaveClass(/orders-header__view-btn--active/);

    // Sync button
    await expect(page.locator('.orders-header__sync-btn')).toBeVisible();
    await expect(page.locator('.orders-header__sync-btn')).toHaveText('Sync Orders');
  });

  test('order list displays seeded orders with order number and status', async ({ seededServer, page }) => {
    await page.goto(seededServer.baseUrl);
    await page.locator('.sidebar-tab__label:text("Orders")').click();

    // Wait for order list to populate
    await expect(page.locator('.order-row')).toHaveCount(1, { timeout: 5_000 });

    // Order row should show order number #1001
    await expect(page.locator('.order-row__number')).toContainText('#1001');

    // Status badge
    await expect(page.locator('.status-badge')).toBeVisible();
    await expect(page.locator('.status-badge')).toHaveText('New');

    // Customer name
    await expect(page.locator('.order-row__customer')).toContainText('Test Customer');

    // Date
    await expect(page.locator('.order-row__date')).toBeVisible();

    // Total
    await expect(page.locator('.order-row__total')).toBeVisible();
  });

  test('search input is present and functional', async ({ seededServer, page }) => {
    await page.goto(seededServer.baseUrl);
    await page.locator('.sidebar-tab__label:text("Orders")').click();

    const searchInput = page.locator('.orders-search__input');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute('placeholder', 'Search by name, email, or order #');

    // Searching for a non-existent term should show empty state
    await searchInput.fill('nonexistent-xyz');

    // Wait for debounce and API response
    await expect(page.locator('.orders-empty')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('.orders-empty__title')).toHaveText('No orders found');
    await expect(page.locator('.orders-empty__text')).toHaveText('Try a different search term');

    // Clear search to restore order list
    await searchInput.clear();
    await expect(page.locator('.order-row')).toHaveCount(1, { timeout: 5_000 });
  });

  test('status filter pills are present', async ({ seededServer, page }) => {
    await page.goto(seededServer.baseUrl);
    await page.locator('.sidebar-tab__label:text("Orders")').click();

    // "All" filter pill should be visible and active
    const allPill = page.locator('.orders-filter-pill:text("All")');
    await expect(allPill).toBeVisible();
    await expect(allPill).toHaveClass(/orders-filter-pill--active/);

    // The "New" status pill should be visible (we have a seeded order with status "new")
    await expect(page.locator('.orders-filter-pill:text("New")')).toBeVisible({ timeout: 5_000 });
  });

  test('clicking an order shows order detail', async ({ seededServer, page }) => {
    await page.goto(seededServer.baseUrl);
    await page.locator('.sidebar-tab__label:text("Orders")').click();

    // Initially, detail panel shows empty state
    await expect(page.locator('.order-detail__empty')).toBeVisible();
    await expect(page.locator('.order-detail__empty')).toHaveText('Select an order to view details');

    // Click on the order
    await page.locator('.order-row__body').first().click();

    // Order detail should load
    await expect(page.locator('.order-detail')).toBeVisible({ timeout: 5_000 });

    // Order header with order number
    await expect(page.locator('.order-detail__order-number')).toContainText('Order #1001');

    // Status badge
    await expect(page.locator('.order-detail .status-badge')).toBeVisible();
  });

  test('order detail shows customer info', async ({ seededServer, page }) => {
    await page.goto(seededServer.baseUrl);
    await page.locator('.sidebar-tab__label:text("Orders")').click();
    await page.locator('.order-row__body').first().click();

    await expect(page.locator('.order-detail')).toBeVisible({ timeout: 5_000 });

    // Customer section
    const customerSection = page.locator('.order-detail__section', {
      has: page.locator('.order-detail__section-title:text("Customer")'),
    });
    await expect(customerSection).toBeVisible();

    // Customer name
    await expect(page.locator('.order-detail__customer-name')).toContainText('Test Customer');

    // Customer email
    await expect(page.locator('.order-detail__customer-contact')).toContainText('test@example.com');
  });

  test('order detail shows line items', async ({ seededServer, page }) => {
    await page.goto(seededServer.baseUrl);
    await page.locator('.sidebar-tab__label:text("Orders")').click();
    await page.locator('.order-row__body').first().click();

    await expect(page.locator('.order-detail')).toBeVisible({ timeout: 5_000 });

    // Line items section
    const itemsSection = page.locator('.order-detail__section', {
      has: page.locator('.order-detail__section-title:text("Line Items")'),
    });
    await expect(itemsSection).toBeVisible();

    // Items table
    await expect(page.locator('.order-detail__items-table')).toBeVisible();

    // Table headers
    const headers = page.locator('.order-detail__items-table th');
    await expect(headers).toHaveCount(4);

    // Should have 2 line items (from seeded data)
    const rows = page.locator('.order-detail__items-table tbody tr');
    await expect(rows).toHaveCount(2);

    // First item should show product name
    await expect(rows.first().locator('.order-detail__item-name')).toHaveText('Test Tee');
  });

  test('order detail shows status transition buttons', async ({ seededServer, page }) => {
    await page.goto(seededServer.baseUrl);
    await page.locator('.sidebar-tab__label:text("Orders")').click();
    await page.locator('.order-row__body').first().click();

    await expect(page.locator('.order-detail')).toBeVisible({ timeout: 5_000 });

    // Update Status section (for "new" status, valid transitions are: ordered, on-hold, cancelled)
    const statusSection = page.locator('.order-detail__section', {
      has: page.locator('.order-detail__section-title:text("Update Status")'),
    });
    await expect(statusSection).toBeVisible();

    // Status action buttons
    const statusBtns = page.locator('.order-detail__status-btn');
    await expect(statusBtns.first()).toBeVisible();

    // Should have the expected transition buttons for "new" status
    await expect(page.locator('.order-detail__status-btn:text("Ordered")')).toBeVisible();
    await expect(page.locator('.order-detail__status-btn:text("On Hold")')).toBeVisible();
    await expect(page.locator('.order-detail__status-btn:text("Cancelled")')).toBeVisible();
  });

  test('order detail shows financials', async ({ seededServer, page }) => {
    await page.goto(seededServer.baseUrl);
    await page.locator('.sidebar-tab__label:text("Orders")').click();
    await page.locator('.order-row__body').first().click();

    await expect(page.locator('.order-detail')).toBeVisible({ timeout: 5_000 });

    // Financials section
    const financialsSection = page.locator('.order-detail__section', {
      has: page.locator('.order-detail__section-title:text("Financials")'),
    });
    await expect(financialsSection).toBeVisible();

    // Subtotal row
    await expect(page.locator('.order-detail__financial-row:has-text("Subtotal")')).toBeVisible();

    // Total row
    await expect(page.locator('.order-detail__financial-row--total')).toBeVisible();
  });

  test('order detail shows document download buttons', async ({ seededServer, page }) => {
    await page.goto(seededServer.baseUrl);
    await page.locator('.sidebar-tab__label:text("Orders")').click();
    await page.locator('.order-row__body').first().click();

    await expect(page.locator('.order-detail')).toBeVisible({ timeout: 5_000 });

    // Documents section
    const docsSection = page.locator('.order-detail__section', {
      has: page.locator('.order-detail__section-title:text("Documents")'),
    });
    await expect(docsSection).toBeVisible();

    await expect(page.locator('.order-detail__pdf-btn:text("Production Sheet")')).toBeVisible();
    await expect(page.locator('.order-detail__pdf-btn:text("Invoice")')).toBeVisible();
  });

  test('pipeline view toggle shows kanban columns', async ({ seededServer, page }) => {
    await page.goto(seededServer.baseUrl);
    await page.locator('.sidebar-tab__label:text("Orders")').click();

    // Click pipeline view button (second view toggle btn)
    const pipelineBtn = page.locator('.orders-header__view-btn').nth(1);
    await pipelineBtn.click();

    // Pipeline view should be visible
    await expect(page.locator('.pipeline-wrapper')).toBeVisible({ timeout: 5_000 });

    // Pipeline should have stage columns
    const stages = page.locator('.pipeline-stage');
    await expect(stages).toHaveCount(6); // 6 active stages

    // Stage headers should show expected labels
    await expect(page.locator('.pipeline-stage__name:text("New")')).toBeVisible();
    await expect(page.locator('.pipeline-stage__name:text("Ordered")')).toBeVisible();
    await expect(page.locator('.pipeline-stage__name:text("Received")')).toBeVisible();
    await expect(page.locator('.pipeline-stage__name:text("In Production")')).toBeVisible();
    await expect(page.locator('.pipeline-stage__name:text("Packed")')).toBeVisible();
    await expect(page.locator('.pipeline-stage__name:text("Shipped")')).toBeVisible();

    // The seeded order (status "new") should appear as a card in the New column
    await expect(page.locator('.pipeline-card')).toHaveCount(1, { timeout: 5_000 });
    await expect(page.locator('.pipeline-card__number')).toContainText('#1001');
  });

  test('pipeline view card shows order details', async ({ seededServer, page }) => {
    await page.goto(seededServer.baseUrl);
    await page.locator('.sidebar-tab__label:text("Orders")').click();
    await page.locator('.orders-header__view-btn').nth(1).click();

    await expect(page.locator('.pipeline-card')).toBeVisible({ timeout: 5_000 });

    // Card shows customer name
    await expect(page.locator('.pipeline-card__customer')).toContainText('Test Customer');

    // Card shows total
    await expect(page.locator('.pipeline-card__total')).toBeVisible();
  });

  test('selecting an order via checkbox shows bulk toolbar', async ({ seededServer, page }) => {
    await page.goto(seededServer.baseUrl);
    await page.locator('.sidebar-tab__label:text("Orders")').click();

    // Wait for orders to load
    await expect(page.locator('.order-row')).toHaveCount(1, { timeout: 5_000 });

    // Bulk toolbar should not be visible initially
    await expect(page.locator('.bulk-toolbar')).not.toBeVisible();

    // Click the checkbox on the order row
    const checkbox = page.locator('.order-row__checkbox input[type="checkbox"]');
    await checkbox.check();

    // Bulk toolbar should appear
    await expect(page.locator('.bulk-toolbar')).toBeVisible();
    await expect(page.locator('.bulk-toolbar__count')).toHaveText('1 order selected');

    // Toolbar should have action buttons
    await expect(page.locator('.bulk-toolbar__btn:text("Update Status")')).toBeVisible();
    await expect(page.locator('.bulk-toolbar__btn:text("Production Sheets")')).toBeVisible();
    await expect(page.locator('.bulk-toolbar__btn:text("Deselect")')).toBeVisible();

    // Click Deselect to hide toolbar
    await page.locator('.bulk-toolbar__btn:text("Deselect")').click();
    await expect(page.locator('.bulk-toolbar')).not.toBeVisible();
  });

  test('switching between list and pipeline preserves view mode', async ({ seededServer, page }) => {
    await page.goto(seededServer.baseUrl);
    await page.locator('.sidebar-tab__label:text("Orders")').click();

    // Switch to pipeline
    await page.locator('.orders-header__view-btn').nth(1).click();
    await expect(page.locator('.pipeline-wrapper')).toBeVisible({ timeout: 5_000 });

    // Pipeline button should be active
    await expect(page.locator('.orders-header__view-btn').nth(1)).toHaveClass(/orders-header__view-btn--active/);

    // Switch back to list
    await page.locator('.orders-header__view-btn').first().click();
    await expect(page.locator('.orders-list')).toBeVisible({ timeout: 5_000 });

    // List button should be active
    await expect(page.locator('.orders-header__view-btn').first()).toHaveClass(/orders-header__view-btn--active/);
  });
});
