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

    // The navbar "Login" is a plain clickable div (authService.login() in
    // app.component.ts), not a <button> -> role selectors won't match it.
    await page.getByText('Login', { exact: true }).click();

    // authService.login() performs an async OIDC redirect (metadata fetch,
    // then window.location to /connect/authorize -> /Account/Login), so the
    // browser may sit on the frontend URL for a moment: poll with toHaveURL
    // instead of waitForURL.
    await expect(page).toHaveURL(IDS_HOST_PATTERN);

    // The identity server's login page renders the "Multi-login" heading.
    await expect(
      page.getByText('Multi-login', { exact: false }).first()
    ).toBeVisible();
  });
});
