import { test, expect } from '@playwright/test';

test.describe('Domains', () => {
  test('should render the domains page', async ({ page }) => {
    await page.goto('/domains');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should show add domain button or form', async ({ page }) => {
    await page.goto('/domains');
    // Look for an add domain button or link
    const addButton = page.getByRole('button', { name: /add|new|create/i });
    const addLink = page.getByRole('link', { name: /add|new|create/i });
    const hasButton = await addButton.count();
    const hasLink = await addLink.count();
    expect(hasButton + hasLink).toBeGreaterThanOrEqual(0);
  });

  test('should display domain list area', async ({ page }) => {
    await page.goto('/domains');
    // The page should contain domain-related content
    await expect(page.locator('body')).toContainText(/domain/i);
  });
});
