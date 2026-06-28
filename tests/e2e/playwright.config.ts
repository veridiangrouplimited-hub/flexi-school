import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir:    './tests/e2e',
  fullyParallel: true,
  retries:    process.env.CI ? 2 : 0,
  reporter:   'html',

  use: {
    baseURL:      process.env.BASE_URL ?? 'http://localhost:5173',
    trace:        'on-first-retry',
    screenshot:   'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'mobile',   use: { ...devices['Pixel 5'] } },
  ],

  webServer: {
    command: 'npm run dev --workspace=apps/web',
    url:     'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
