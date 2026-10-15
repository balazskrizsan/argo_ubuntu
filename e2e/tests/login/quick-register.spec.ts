import { test, expect } from '@playwright/test';
import { randomBytes } from 'crypto';
import { quickRegister } from '../helpers';

test.describe('frontend login flow', () => {
  test('quick-register, login and logout', async ({ page }) => {
    // Random 32-char nickname (16 random bytes as hex -> always unique
    // across CI runs), then the full login flow via the shared helper.
    const nickname = randomBytes(16).toString('hex');
    await quickRegister(page, nickname);

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
