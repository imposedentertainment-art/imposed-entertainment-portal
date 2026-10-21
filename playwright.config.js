module.exports = {
  testDir: './tests/browser',
  timeout: 30000,
  fullyParallel: true,
  reporter: 'line',
  use: { headless: true, browserName: 'chromium' }
};
