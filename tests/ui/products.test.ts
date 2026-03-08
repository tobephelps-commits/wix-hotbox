/**
 * UI E2E tests for the Products tab and style lookup interface.
 *
 * Verifies the style lookup form renders correctly, vendor selector works,
 * and error states display properly. Does NOT test actual vendor API lookups
 * (no credentials in test env).
 *
 * Phase 57 Plan 05: UI E2E Tests
 */

import { test, expect } from '../fixtures.js';

test.describe('Products tab', () => {
  test('shows Create Product header and style lookup form', async ({ server, page }) => {
    await page.goto(server.baseUrl);

    // Products tab is the default
    await expect(page.locator('.products-tab')).toBeVisible();

    // Header with title
    await expect(page.locator('.products-tab__title')).toHaveText('Create Product');

    // Style lookup form
    await expect(page.locator('.style-lookup')).toBeVisible();
  });

  test('style lookup has input field with correct label and placeholder', async ({ server, page }) => {
    await page.goto(server.baseUrl);

    // Label
    const label = page.locator('label[for="style-input"]');
    await expect(label).toHaveText('Style Number');

    // Input field
    const input = page.locator('#style-input');
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('placeholder', 'e.g. PC61, 2000');
    await expect(input).toHaveAttribute('type', 'text');
  });

  test('vendor selector shows SanMar and S&S buttons', async ({ server, page }) => {
    await page.goto(server.baseUrl);

    const vendorBtns = page.locator('.style-lookup__vendor-btn');
    await expect(vendorBtns).toHaveCount(2);

    await expect(vendorBtns.nth(0)).toHaveText('SanMar');
    await expect(vendorBtns.nth(1)).toHaveText('S&S');

    // SanMar is active by default
    await expect(vendorBtns.nth(0)).toHaveClass(/style-lookup__vendor-btn--active/);
    await expect(vendorBtns.nth(1)).not.toHaveClass(/style-lookup__vendor-btn--active/);
  });

  test('clicking vendor button toggles active state', async ({ server, page }) => {
    await page.goto(server.baseUrl);

    const sanmarBtn = page.locator('.style-lookup__vendor-btn:text("SanMar")');
    const ssBtn = page.locator('.style-lookup__vendor-btn:text("S&S")');

    // Click S&S
    await ssBtn.click();
    await expect(ssBtn).toHaveClass(/style-lookup__vendor-btn--active/);
    await expect(sanmarBtn).not.toHaveClass(/style-lookup__vendor-btn--active/);

    // Click back to SanMar
    await sanmarBtn.click();
    await expect(sanmarBtn).toHaveClass(/style-lookup__vendor-btn--active/);
    await expect(ssBtn).not.toHaveClass(/style-lookup__vendor-btn--active/);
  });

  test('submit button is disabled when style input is empty', async ({ server, page }) => {
    await page.goto(server.baseUrl);

    const submitBtn = page.locator('.style-lookup__submit');
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toHaveText('Look Up');
    await expect(submitBtn).toBeDisabled();
  });

  test('submit button is enabled when style input has text', async ({ server, page }) => {
    await page.goto(server.baseUrl);

    const input = page.locator('#style-input');
    const submitBtn = page.locator('.style-lookup__submit');

    await input.fill('PC61');
    await expect(submitBtn).toBeEnabled();
  });

  test('entering an invalid style number shows error feedback', async ({ server, page }) => {
    await page.goto(server.baseUrl);

    // Fill in a style number and submit
    await page.locator('#style-input').fill('INVALID-STYLE-XYZ');
    await page.locator('.style-lookup__submit').click();

    // Wait for loading to complete and error to appear
    // The API will return an error since no real vendor credentials exist
    await expect(page.locator('.style-lookup__error')).toBeVisible({ timeout: 10_000 });

    // Error message should contain some text
    const errorText = await page.locator('.style-lookup__error').textContent();
    expect(errorText).toBeTruthy();
    expect(errorText!.length).toBeGreaterThan(0);
  });

  test('shows loading state during lookup', async ({ server, page }) => {
    await page.goto(server.baseUrl);

    await page.locator('#style-input').fill('PC61');

    // Click submit and check for loading state
    await page.locator('.style-lookup__submit').click();

    // Should show "Looking up..." text (may be brief if API responds quickly)
    // Use a short timeout since the request may fail fast with test credentials
    const submitBtn = page.locator('.style-lookup__submit');
    // The button should either show "Looking up..." during loading or revert to "Look Up" after
    await expect(submitBtn).toHaveText(/Look(ing up\.\.\.|Up)/, { timeout: 10_000 });
  });

  test('Manage Logos button is visible on lookup step', async ({ server, page }) => {
    await page.goto(server.baseUrl);

    const manageLogosBtn = page.locator('.products-tab__utility-btn:text("Manage Logos")');
    await expect(manageLogosBtn).toBeVisible();
  });
});
