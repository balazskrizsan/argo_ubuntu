import { test, expect } from '@playwright/test';
import { randomBytes } from 'crypto';
import { quickRegister } from '../helpers';

test.describe('poker flow', () => {
  test('create poker and list it under My pokers', async ({ page }) => {
    // Random 32-char strings (16 random bytes as hex -> always unique
    // across CI runs, and a valid >5-char form value).
    const nickname = randomBytes(16).toString('hex');
    const pokerName = randomBytes(16).toString('hex');
    const ticketName = randomBytes(16).toString('hex');
    await quickRegister(page, nickname);

    // AuthGuard canActivate() does isAuthenticated$.pipe(take(1)) — right
    // after the OIDC redirect that stream can still emit `false`, which
    // silently bounces /poker/create back to '/'. The navbar Profile
    // dropdown only renders once `isAuthenticated$ | async` is true, so
    // wait for it before navigating.
    await expect(
      page.locator('a.nav-link.dropdown-toggle')
    ).toContainText(`Profile (${nickname})`);

    // Navbar link -> /poker/create (urlService.getPokerCreate()).
    await page.getByRole('link', { name: 'Create poker', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Create a poker' })
    ).toBeVisible();

    // The form: #name is the sprint name; exactly one ticket-name field is
    // rendered by ngOnInit -> no "Add more tickets" click needed.
    await page.locator('#name').fill(pokerName);
    await page.getByPlaceholder('Ticket name').fill(ticketName);
    await page.getByRole('button', { name: 'Start the poker' }).click();

    // The create reply arrives over STOMP (/user/queue/reply) and the
    // component then navigates to the display page -> poll with toHaveURL
    // instead of waitForURL.
    await expect(page).toHaveURL(/\/poker\/display\//);

    // Navbar link -> /poker/my-pokers; the list renders each poker name as
    // a "a.h6.title" link inside the forums-table.
    await page.getByRole('link', { name: 'My pokers', exact: true }).click();
    await expect(page).toHaveURL(/\/poker\/my-pokers/);
    await expect(
      page.locator('table.forums-table a.h6.title', { hasText: pokerName })
    ).toBeVisible();
  });
});
