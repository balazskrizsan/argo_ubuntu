import { test, expect } from '@playwright/test';

test.describe('frontend homepage', () => {
  test('shows product name and tagline', async ({ page }) => {
    await page.goto('/');

    // Both assertions must pass -> the test is green only when the
    // frontend actually renders its landing page, not an error/blank page.
    await expect(
      page.getByText('Smart Scrum Poker', { exact: false }).first()
    ).toBeVisible();
    await expect(
      page.getByText('Smarter Estimations for Agile Teams', { exact: false }).first()
    ).toBeVisible();
  });
});
