import { defineConfig, devices } from '@playwright/test';

const port = process.env.OPENMAIC_E2E_PORT || '3102';
const baseURL = `http://127.0.0.1:${port}`;
const isolatedCatalog = `${process.cwd()}/output/playwright/course-portal/catalog.json`;

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'html' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: process.env.CI
      ? 'node scripts/prepare-e2e-data.mjs && pnpm build && pnpm start --hostname 127.0.0.1'
      : 'node scripts/prepare-e2e-data.mjs && pnpm dev --hostname 127.0.0.1',
    url: `${baseURL}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    // Enable the MAIC Editor (Pro mode) so editor e2e can reach it. This is a
    // build-time NEXT_PUBLIC_* flag, so it must be set when the webServer runs
    // `pnpm build` (CI) or `pnpm dev` (local).
    env: {
      PORT: port,
      COURSE_PORTAL_DATA_FILE: isolatedCatalog,
      NEXT_DIST_DIR: '.next-e2e',
      NEXT_TYPESCRIPT_CONFIG: 'tsconfig.e2e.json',
      NEXT_PUBLIC_MAIC_EDITOR_ENABLED: 'true',
    },
  },
});
