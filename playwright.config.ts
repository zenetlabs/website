import { defineConfig, type PlaywrightTestProject } from '@playwright/test';
import { rejectedConsent } from './e2e/consent-seed';

const visualProject: PlaywrightTestProject = {
  name: 'visual',
  testMatch: '**/visual.e2e.ts',
  use: { browserName: 'chromium' },
};

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:4173';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL,
    storageState: rejectedConsent(baseURL),
    trace: process.env.CI ? 'retain-on-failure' : 'on-first-retry',
    screenshot: process.env.CI ? 'only-on-failure' : 'off',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: ['**/webmcp-real.e2e.ts', '**/visual.e2e.ts'],
      use: { browserName: 'chromium' },
    },
    ...(process.env.VISUAL === '1' ? [visualProject] : []),
    {
      name: 'chromium-webmcp',
      testMatch: '**/webmcp-real.e2e.ts',
      use: {
        browserName: 'chromium',
        launchOptions: { args: ['--enable-blink-features=WebMCP'] },
      },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : [
        {
          command: 'node scripts/fake-services.mjs',
          url: 'http://127.0.0.1:4175/__health',
          reuseExistingServer: !process.env.CI,
          timeout: 30_000,
        },
        {
          command:
            'pnpm db:migrate:local && pnpm db:clear-bookings:local && pnpm preview',
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      ],
});
