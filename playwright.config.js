module.exports = {
  testDir: './tests/browser',
  timeout: 45000,
  fullyParallel: false,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'line',
  use: { headless: true, browserName: 'chromium' }
};
