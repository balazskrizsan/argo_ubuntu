import { test, expect } from '@playwright/test';
import { randomBytes } from 'crypto';

/**
 * Identity service hostnames per environment (see port-map.md):
 *   local: ids--smartscrumpoker.localhost.balazskrizsan.com
 *   UAT/prod: identity-service.smartscrumpoker....
 */
// const IDS_HOST_PATTERN = /ids--smartscrumpoker\.|identity-service\.smartscrumpoker\./i;

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test.describe('frontend login flow', () => {
  test('clicking login redirects to the identity server', async ({
    page,
    baseURL,
  }) => {
    await page.goto('/');

    // The navbar "Login" is a plain clickable div (authService.login() in
    // app.component.ts), not a <button> -> role selectors won't match it.
    await page.getByText('Login', { exact: true }).click();

    // authService.login() performs an async OIDC redirect (metadata fetch,
    // then window.location to /connect/authorize -> /Account/Login), so the
    // browser may sit on the frontend URL for a moment: poll with toHaveURL
    // instead of waitForURL.
    // await expect(page).toHaveURL(IDS_HOST_PATTERN);

    // The identity server's login page renders the "Multi-login" heading.
    await expect(
      page.getByText('Multi-login', { exact: false }).first()
    ).toBeVisible();

    // Quick-register on the identity server: fill a random 32-char nickname
    // (16 random bytes as hex -> always unique across CI runs), submit.
    const nickname = randomBytes(16).toString('hex'); // 32 chars
    await page.locator('#QuickRegisterInput_Nickname').fill(nickname);
    await page
      .locator('button[name="QuickRegisterInput.Button"][value="quickregister"]')
      .click();

    // The OIDC flow runs (ids -> frontend signin callback -> landing page),
    // so the URL bounces back to the frontend origin: poll with toHaveURL.
    // await expect(page).not.toHaveURL(IDS_HOST_PATTERN);
    await expect(page).toHaveURL(
      new RegExp(`^${escapeRegExp(baseURL ?? '')}`)
    );

    // Logged in: the navbar profile dropdown shows the registered nickname.
    // The `_ngcontent-ng-c…` attribute is Angular build-generated -> select by
    // class instead.
    await expect(page.locator('a.nav-link.dropdown-toggle')).toContainText(
      `Profile (${nickname})`
    );

    // Hover opens the navbar dropdown (data-hover="dropdown"), then Logout
    // triggers the OIDC logout redirect back to the identity server.
    await page.locator('a.nav-link.dropdown-toggle').hover();
    await page.locator('a.nav-link', { hasText: 'Logout' }).click();

    // await expect(page).toHaveURL(IDS_HOST_PATTERN);
    await expect(
      page.getByRole('heading', { name: 'Logged out' })
    ).toBeVisible();
  });
});
