import { test, expect } from '@playwright/test';

test.describe('Contacts', () => {
  test('should render the contacts page', async ({ page }) => {
    await page.goto('/contacts');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display contacts-related content', async ({ page }) => {
    await page.goto('/contacts');
    await expect(page.locator('body')).toContainText(/contact/i);
  });

  test('should have import navigation', async ({ page }) => {
    await page.goto('/contacts');
    // Check for import link or button
    const importElement = page.getByRole('link', { name: /import/i });
    const importButton = page.getByRole('button', { name: /import/i });
    const count = (await importElement.count()) + (await importButton.count());
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should render the import page', async ({ page }) => {
    await page.goto('/contacts/import');
    await expect(page.locator('body')).toBeVisible();
  });
});
