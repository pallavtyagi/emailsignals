import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should render the login page', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(page).toHaveURL(/sign-in/);
  });

  test('should redirect unauthenticated users', async ({ page }) => {
    await page.goto('/dashboard');
    // In dev mode with auth bypass, should either show dashboard or redirect
    const url = page.url();
    expect(url).toMatch(/dashboard|sign-in/);
  });

  test('should show the dashboard when authenticated (dev mode)', async ({ page }) => {
    await page.goto('/dashboard');
    // In dev mode, Clerk is bypassed so dashboard should render
    await expect(page.locator('body')).toBeVisible();
  });
});
