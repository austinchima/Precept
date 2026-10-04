import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end journeys against a running stack (API + PostgreSQL + Vite or the built app).
 * Not part of `npm test`: start the stack, then run `npm run test:e2e`.
 *
 *   E2E_BASE_URL                    app URL (default http://127.0.0.1:3000)
 *   PLAYWRIGHT_CHROMIUM_EXECUTABLE  use an already-installed Chromium instead of Playwright's download
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
          : {},
      },
    },
  ],
});
