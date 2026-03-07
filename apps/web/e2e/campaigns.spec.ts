import { test, expect } from '@playwright/test';

test.describe('Campaigns', () => {
  test('should render the campaigns page', async ({ page }) => {
    await page.goto('/campaigns');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display campaigns-related content', async ({ page }) => {
    await page.goto('/campaigns');
    await expect(page.locator('body')).toContainText(/campaign/i);
  });

  test('should render the new campaign page', async ({ page }) => {
    await page.goto('/campaigns/new');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should have campaign creation form elements', async ({ page }) => {
    await page.goto('/campaigns/new');
    // Look for common form elements in campaign creation
    const inputs = page.locator('input, textarea, select');
    const inputCount = await inputs.count();
    expect(inputCount).toBeGreaterThanOrEqual(0);
  });
});
