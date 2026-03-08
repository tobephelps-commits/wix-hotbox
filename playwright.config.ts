import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: 1,
  timeout: 30_000,
  globalTimeout: 5 * 60_000,
  reporter: [['html', { open: 'never' }], ['list']],

  projects: [
    {
      name: 'api',
      testMatch: 'api/**/*.test.ts',
    },
    {
      name: 'ui',
      testMatch: 'ui/**/*.test.ts',
      use: {
        browserName: 'chromium',
        baseURL: 'http://localhost:3457',
      },
    },
  ],
});
