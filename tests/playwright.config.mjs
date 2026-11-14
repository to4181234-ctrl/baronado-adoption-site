import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: { timeout: 10000 },
  retries: 0,
  workers: 1,
  use: {
    browserName: 'chromium',
    baseURL: 'http://127.0.0.1:3100',
    viewport: { width: 390, height: 844 },
    headless: true,
    trace: 'off',
    screenshot: 'off',
    video: 'off'
  },
  webServer: {
    command: 'npm run start -- --hostname 127.0.0.1 --port 3100',
    url: 'http://127.0.0.1:3100/go/quests',
    reuseExistingServer: false,
    timeout: 60000
  }
});
