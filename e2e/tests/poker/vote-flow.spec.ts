import { test, expect } from '../fixtures';
import { randomBytes } from 'crypto';
import { quickRegister } from '../helpers';

test.describe('poker flow', () => {
  test('create poker with 3 tickets, vote and close the round', async ({ page }) => {
    // Random 32-char strings (16 random bytes as hex -> always unique
    // across CI runs, and a valid >5-char form value).
    const nickname = randomBytes(16).toString('hex');
    const pokerName = randomBytes(16).toString('hex');
    const ticketNames = [
      randomBytes(16).toString('hex'),
      randomBytes(16).toString('hex'),
      randomBytes(16).toString('hex'),
    ];
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

    // One ticket-name field is rendered by ngOnInit; "Add more tickets"
    // x2 -> 3 fields total.
    await page.locator('#name').fill(pokerName);
    await page.getByRole('button', { name: 'Add more tickets' }).click();
    await page.getByRole('button', { name: 'Add more tickets' }).click();
    const ticketInputs = page.getByPlaceholder('Ticket name');
    await expect(ticketInputs).toHaveCount(3);
    for (let i = 0; i < ticketNames.length; i++) {
      await ticketInputs.nth(i).fill(ticketNames[i]);
    }
    await page.getByRole('button', { name: 'Start the poker' }).click();

    // The create reply arrives over STOMP (/user/queue/reply) and the
    // component then navigates to the display page -> poll with toHaveURL.
    // The poker name heading renders only once state.initDone is true.
    await expect(page).toHaveURL(/\/poker\/display\//);
    await expect(
      page.locator('.h2.author-name', { hasText: pokerName })
    ).toBeVisible();

    // Our user shows up in the "Online players" list.
    await expect(
      page.locator('app-online-voters .h6.author-name', { hasText: nickname })
    ).toBeVisible();

    // All 3 tickets render as app-ticket-header h2.title.
    await expect(page.locator('app-ticket-header h2.title')).toHaveCount(3);
    for (const ticketName of ticketNames) {
      await expect(
        page.locator('app-ticket-header', { hasText: ticketName })
      ).toBeVisible();
    }

    // Start the voting round on the first ticket. The "Start" button only
    // shows for the owner while no ticket is active/opened.
    const firstTicket = page.locator('app-ticket-header', {
      hasText: ticketNames[0],
    });
    await firstTicket.getByRole('button', { name: 'Start', exact: true }).click();

    // Voter table appears for the active ticket: one button column per
    // story-point dimension. The option labels come from the deployed
    // story-point config ("Size S"/"SMALL" etc. vary across builds), so we
    // click the FIRST button of each column — that is always the smallest
    // option (value 1). Voting every dimension makes the VOTE button appear
    // (all dims must be > 0). The first-button wait also guards the race
    // where locator.count() would run before the options render.
    const voterTable = page.locator('app-voter-table');
    await expect(voterTable).toBeVisible();
    const dimensionColumns = voterTable.locator('div.col');
    await expect(
      dimensionColumns.first().locator('button')
    ).toBeVisible();
    const columnCount = await dimensionColumns.count();
    for (let i = 0; i < columnCount; i++) {
      await dimensionColumns.nth(i).locator('button').first().click();
    }
    await voterTable.getByRole('button', { name: 'VOTE', exact: true }).click();

    // VoteService.addVote() keys the incoming vote by state.activeTicketId,
    // and endTicket() resets that to 0 synchronously — so the RECEIVE_POKER_VOTE
    // reply must be registered BEFORE End is clicked, or it lands under key 0
    // and the badges stay "waiting" forever. The per-voter badge flips to
    // "done" exactly when the reply arrives.
    await expect(
      page.locator('app-voter-list .birthday-date', { hasText: 'done' })
    ).toBeVisible();

    // End the round -> the backend broadcasts VOTE_STOP, which fills
    // userVoteStats: the Votes/AVG/Min/Max badges on the ticket header
    // switch from "waiting" to real numbers.
    await firstTicket.getByRole('button', { name: 'End', exact: true }).click();
    await expect(
      firstTicket.locator('button', { hasText: 'waiting' })
    ).toHaveCount(0);

    // The calculated point is revealed for the finished ticket ("?" -> digit;
    // the template pads the value with whitespace -> /\d+/ not /^\d+$/).
    await expect(
      page.locator('app-voter-list h2.btn').first()
    ).toHaveText(/\d+/);
  });
});
