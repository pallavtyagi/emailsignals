import { test, expect } from '@playwright/test';

test.describe('Templates', () => {
  test('should render the templates page', async ({ page }) => {
    await page.goto('/templates');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display templates-related content', async ({ page }) => {
    await page.goto('/templates');
    await expect(page.locator('body')).toContainText(/template/i);
  });

  test('should render the new template page', async ({ page }) => {
    await page.goto('/templates/new');
    await expect(page.locator('body')).toBeVisible();
  });
});
