import { test, expect } from '@playwright/test';

/**
 * Identity service hostnames per environment (see port-map.md):
 *   local: ids--smartscrumpoker.localhost.balazskrizsan.com
 *   UAT/prod: identity-service.smartscrumpoker....
 */
const IDS_HOST_PATTERN = /ids--smartscrumpoker\.|identity-service\.smartscrumpoker\./i;

test.describe('frontend login flow', () => {
  test('clicking login redirects to the identity server', async ({ page }) => {
    await page.goto('/');

    // Wait for the full navigation to the identity server so the URL
    // assertion runs after the redirect, not during it.
    await Promise.all([
      page.waitForURL(IDS_HOST_PATTERN),
      page.getByRole('button', { name: /log.?in/i }).first().click(),
    ]);

    // The identity server's login page renders the "Multi-login" heading.
    await expect(
      page.getByText('Multi-login', { exact: false }).first()
    ).toBeVisible();
  });
});
