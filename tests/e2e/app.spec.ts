import { test, expect } from '@playwright/test';

test.describe('App', () => {
  test('should display the app title', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('AIO Media Manager')).toBeVisible();
  });

  test('should display action buttons', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Get Started')).toBeVisible();
    await expect(page.getByText('Learn More')).toBeVisible();
  });

  test('should have proper page title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/AIO Media Manager/);
  });
});
