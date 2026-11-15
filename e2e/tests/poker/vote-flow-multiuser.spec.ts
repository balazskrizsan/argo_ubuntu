import { test, expect } from '../fixtures';
import { type Page } from '@playwright/test';
import { randomBytes } from 'crypto';
import { quickRegister } from '../helpers';

/**
 * Two-user vote flow. The second user runs in a separate browser context
 * (own cookies/storage -> own OIDC session). Everything is kept inside
 * this file so the test does not depend on any fixture/helper changes.
 */

/**
 * Casts a vote on the currently active ticket: clicks the FIRST (smallest)
 * option of every story-point dimension — the option labels come from the
 * deployed story-point config and vary across builds, but the first button
 * of each column is always value 1 — then clicks VOTE. Voting every
 * dimension is required for the VOTE button to appear.
 *
 * Every click is verified: a selected option gets the .btn-primary class.
 * With two players a mid-round broadcast (e.g. the other user's
 * vote.new_joiner/state message landing between two clicks) re-renders
 * the table and can wipe an early selection — that is how the
 * "uncertainty" column ended up unclicked and the VOTE button never
 * appeared. Columns that already have a selected option are skipped so a
 * re-click cannot toggle it back off.
 *
 * Works on any page where a voting round is already running (the voter
 * table renders for every joined player, not just the poker owner).
 */
async function castVote(page: Page): Promise<void> {
  const voterTable = page.locator('app-voter-table');
  await expect(voterTable).toBeVisible();
  const dimensionColumns = voterTable.locator('div.col');
  await expect(
    dimensionColumns.first().locator('button').first()
  ).toBeVisible();
  const voteButton = voterTable.getByRole('button', {
    name: 'VOTE',
    exact: true,
  });
  await expect(async () => {
    const columnCount = await dimensionColumns.count();
    for (let i = 0; i < columnCount; i++) {
      const column = dimensionColumns.nth(i);
      const selected = column.locator('button.btn-primary');
      if ((await selected.count()) === 0) {
        await column.locator('button').first().click();
      }
      await expect(selected).toHaveCount(1, { timeout: 1_000 });
    }
    await expect(voteButton).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await voteButton.click();
}

test.describe('poker flow (two users)', () => {
  // Two quick-registrations plus the full vote round can exceed the
  // default 30s test timeout.
  test.setTimeout(60_000);

  test('owner creates the poker, second user joins, both vote, owner closes the round', async ({
    page,
    browser,
  }, testInfo) => {
    // Second, fully isolated browser session. browser.newContext() does
    // NOT inherit the config's `use` options, so baseURL and
    // ignoreHTTPSErrors are copied over explicitly.
    const useOpts = testInfo.project.use as {
      baseURL?: string;
      ignoreHTTPSErrors?: boolean;
    };
    const context2 = await browser.newContext({
      baseURL: useOpts.baseURL,
      ignoreHTTPSErrors: useOpts.ignoreHTTPSErrors,
    });
    const page2 = await context2.newPage();
    // Same browser-console recording as the `page` fixture, into a
    // separate file.
    const lines2: string[] = [];
    const stamp = () => new Date().toISOString();
    page2.on('console', (msg) =>
      lines2.push(`${stamp()} [console.${msg.type()}] ${msg.text()}`)
    );
    page2.on('pageerror', (err) => lines2.push(`${stamp()} [pageerror] ${err}`));
    page2.on('requestfailed', (req) =>
      lines2.push(
        `${stamp()} [requestfailed] ${req.method()} ${req.url()} :: ${req.failure()?.errorText}`
      )
    );

    try {
      // Random 32-char strings (16 random bytes as hex -> always unique
      // across CI runs, and a valid >5-char form value).
      const ownerNickname = randomBytes(16).toString('hex');
      const guestNickname = randomBytes(16).toString('hex');
      const pokerName = randomBytes(16).toString('hex');
      const ticketNames = [
        randomBytes(16).toString('hex'),
        randomBytes(16).toString('hex'),
        randomBytes(16).toString('hex'),
      ];

      // Both users register in their own browser sessions (sequential ->
      // deterministic flow and readable console logs).
      await quickRegister(page, ownerNickname);
      await quickRegister(page2, guestNickname);

      // AuthGuard canActivate() does isAuthenticated$.pipe(take(1)) — right
      // after the OIDC redirect that stream can still emit `false`, which
      // silently bounces a guarded route back to '/'. The navbar Profile
      // dropdown only renders once `isAuthenticated$ | async` is true, so
      // wait for it on BOTH pages before navigating.
      await expect(
        page.locator('a.nav-link.dropdown-toggle')
      ).toContainText(`Profile (${ownerNickname})`);
      await expect(
        page2.locator('a.nav-link.dropdown-toggle')
      ).toContainText(`Profile (${guestNickname})`);

      // Navbar link -> /poker/create (urlService.getPokerCreate()).
      await page
        .getByRole('link', { name: 'Create poker', exact: true })
        .click();
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

      // The guest joins simply by opening the poker's display URL — the
      // display component registers them as a player on connect.
      await page2.goto(new URL(page.url()).pathname);

      // Both browsers must now show BOTH players in the "Online players"
      // list — this is the assertion that the join actually propagated
      // over the shared poker channel.
      for (const p of [page, page2]) {
        await expect(
          p.locator('app-online-voters .h6.author-name', {
            hasText: ownerNickname,
          })
        ).toBeVisible();
        await expect(
          p.locator('app-online-voters .h6.author-name', {
            hasText: guestNickname,
          })
        ).toBeVisible();

        // All 3 tickets render as app-ticket-header h2.title in both
        // browsers.
        await expect(p.locator('app-ticket-header h2.title')).toHaveCount(3);
        for (const ticketName of ticketNames) {
          await expect(
            p.locator('app-ticket-header', { hasText: ticketName })
          ).toBeVisible();
        }
      }

      // Start the voting round on the first ticket. The "Start" button
      // only shows for the owner while no ticket is active/opened.
      const firstTicket = page.locator('app-ticket-header', {
        hasText: ticketNames[0],
      });
      await firstTicket
        .getByRole('button', { name: 'Start', exact: true })
        .click();

      // The VOTE_START broadcast makes the voter table appear in BOTH
      // browsers — castVote() waits for it before clicking.
      await castVote(page);
      await castVote(page2);

      // VoteService.addVote() keys the incoming vote by
      // state.activeTicketId, and endTicket() resets that to 0
      // synchronously — so the RECEIVE_POKER_VOTE replies must be
      // registered BEFORE End is clicked, or they land under key 0 and
      // the badges stay "waiting" forever. The per-voter badge flips to
      // "done" exactly when the reply arrives; with two voters both
      // browsers must show TWO "done" badges.
      await expect(
        page.locator('app-voter-list .birthday-date', { hasText: 'done' })
      ).toHaveCount(2);
      await expect(
        page2.locator('app-voter-list .birthday-date', { hasText: 'done' })
      ).toHaveCount(2);

      // End the round -> the backend broadcasts VOTE_STOP, which fills
      // userVoteStats: the Votes/AVG/Min/Max badges on the ticket header
      // switch from "waiting" to real numbers — in BOTH browsers.
      const guestFirstTicket = page2.locator('app-ticket-header', {
        hasText: ticketNames[0],
      });
      await firstTicket
        .getByRole('button', { name: 'End', exact: true })
        .click();
      await expect(
        firstTicket.locator('button', { hasText: 'waiting' })
      ).toHaveCount(0);
      await expect(
        guestFirstTicket.locator('button', { hasText: 'waiting' })
      ).toHaveCount(0);

      // The calculated point is revealed for the finished ticket
      // ("?" -> digit; the template pads the value with whitespace ->
      // /\d+/ not /^\d+$/).
      await expect(
        page.locator('app-voter-list h2.btn').first()
      ).toHaveText(/\d+/);
      await expect(
        page2.locator('app-voter-list h2.btn').first()
      ).toHaveText(/\d+/);
    } finally {
      // Persist page2's console log like the `page` fixture does, then
      // close the second session.
      const body = lines2.join('\n') || '(no console output)';
      const fs = await import('node:fs/promises');
      await fs.writeFile(testInfo.outputPath('browser-console-2.log'), body);
      await testInfo.attach('browser-console-2.log', {
        body,
        contentType: 'text/plain',
      });
      await context2.close();
    }
  });
});
