import { expect, type Page } from '@playwright/test';

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Identity service hostnames per environment (see port-map.md):
 *   local: ids--smartscrumpoker.localhost.balazskrizsan.com
 *   UAT/prod: identity-service.smartscrumpoker....
 */
// const IDS_HOST_PATTERN = /ids--smartscrumpoker\.|identity-service\.smartscrumpoker\./i;

/**
 * Quick-registers a brand-new user on the identity server and completes the
 * OIDC login flow. Call it at the start of any test that needs a logged-in
 * user — returns with `page` back on the frontend, logged in as `username`.
 *
 *   await quickRegister(page, 'my-test-user');
 */
export async function quickRegister(
  page: Page,
  username: string
): Promise<void> {
  await page.goto('/');

  // The frontend origin is needed later to detect the post-login redirect,
  // so capture it before the flow navigates away to the identity server.
  const frontendOrigin = new URL(page.url()).origin;

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

  await page.locator('#QuickRegisterInput_Nickname').fill(username);
  await page
    .locator('button[name="QuickRegisterInput.Button"][value="quickregister"]')
    .click();

  // The OIDC flow runs (ids -> frontend signin callback -> landing page),
  // so the URL bounces back to the frontend origin: poll with toHaveURL.
  // await expect(page).not.toHaveURL(IDS_HOST_PATTERN);
  await expect(page).toHaveURL(new RegExp(`^${escapeRegExp(frontendOrigin)}`));
}
