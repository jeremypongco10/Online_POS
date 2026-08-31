import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/**
 * Regression suite for the admin UI. Runs against the real dev backend +
 * MySQL (there's no isolated test DB for the frontend the way PHPUnit's
 * SQLite fixture covers the backend) — see global-setup.ts for the
 * fixture-user login and global-teardown.ts for cleanup of anything a
 * spec creates. Sequential/single-worker on purpose: specs share that one
 * live database, so parallel runs would race each other.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    storageState: path.join(import.meta.dirname, 'tests/e2e/.auth/qa-user.json'),
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
