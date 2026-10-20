import { defineConfig, devices } from '@playwright/test';

/**
 * Runs against the deployed stack, never a local dev server.
 * CI sets E2E_BASE_URL (see .github/workflows/pr-e2e-stack.yml); locally it
 * defaults to the k8s-local ingress host.
 *
 * The ingress terminates TLS with a self-signed cert -> ignoreHTTPSErrors.
 */
export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL:
      process.env.E2E_BASE_URL ??
      'https://smartscrumpoker.localhost.balazskrizsan.com',
    ignoreHTTPSErrors: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
