import { test, expect } from '@playwright/test';

test.describe('Analytics', () => {
  test('should render the analytics page', async ({ page }) => {
    await page.goto('/analytics');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display analytics-related content', async ({ page }) => {
    await page.goto('/analytics');
    await expect(page.locator('body')).toContainText(/analytics|overview|metric|stat/i);
  });
});
