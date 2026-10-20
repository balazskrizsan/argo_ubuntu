import { promises as fs } from 'node:fs';
import { test as base, expect, type Page } from '@playwright/test';

/**
 * Extended test object that records the browser console for every test and
 * attaches it to the report as `browser-console.log` (also saved under
 * test-results/<test>/attachments on failure).
 *
 * Usage in tests:
 *   import { test, expect } from './fixtures';
 */
export const test = base.extend<{ page: Page }>({
  page: async ({ page }, use, testInfo) => {
    const lines: string[] = [];
    const stamp = () => new Date().toISOString();

    page.on('console', (msg) => {
      lines.push(`${stamp()} [console.${msg.type()}] ${msg.text()}`);
    });
    page.on('pageerror', (err) => {
      lines.push(`${stamp()} [pageerror] ${err}`);
    });
    page.on('requestfailed', (req) => {
      lines.push(
        `${stamp()} [requestfailed] ${req.method()} ${req.url()} :: ${req.failure()?.errorText}`,
      );
    });

    await use(page);

    const body = lines.join('\n') || '(no console output)';

    // Written to disk unconditionally -> test-results/<test>/browser-console.log
    // exists even with the `list` reporter where attachments aren't rendered.
    await fs.writeFile(testInfo.outputPath('browser-console.log'), body);

    // Also attached so it shows up in the HTML report when one is generated.
    await testInfo.attach('browser-console.log', {
      body,
      contentType: 'text/plain',
    });
  },
});

export { expect };
