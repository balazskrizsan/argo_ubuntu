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

    await testInfo.attach('browser-console.log', {
      body: lines.join('\n') || '(no console output)',
      contentType: 'text/plain',
    });
  },
});

export { expect };
