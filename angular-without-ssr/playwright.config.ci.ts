import { defineConfig, devices } from '@playwright/test';

/**
 * Konfiguracja Playwright dla środowiska CI
 * https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e/tests',
  /* Uruchamiaj testy równolegle */
  fullyParallel: true,
  /* Przerwij budowanie na CI, jeśli przypadkowo zostawiono test.only w kodzie źródłowym. */
  forbidOnly: !!process.env.CI,
  /* Powtórz testy tylko na CI */
  retries: process.env.CI ? 2 : 0,
  /* Wyłącz równoległe testy na CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter do użycia. Zobacz https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['github'],
    ['list']
  ],
  /* Zwiększ timeout dla testów */
  timeout: 120000,
  /* Wspólne ustawienia dla wszystkich projektów poniżej. Zobacz https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Bazowy URL do użycia w akcjach takich jak `await page.goto('/')`. */
    baseURL: 'http://localhost:1234',

    /* Zbieraj ślad podczas powtarzania nieudanego testu. Zobacz https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    /* Zwiększ timeouty dla lepszej stabilności */
    navigationTimeout: 60000,
    actionTimeout: 30000,
    /* Włącz JavaScript w przeglądarce */
    javaScriptEnabled: true,
  },

  /* Konfiguruj projekty dla głównych przeglądarek */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  /* Uruchom lokalny serwer deweloperski przed rozpoczęciem testów */
  webServer: {
    command: 'npm run start -- --port 1234',
    url: 'http://localhost:1234',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    // Nie zatrzymuj testów, jeśli serwer nie może się uruchomić
    ignoreHTTPSErrors: true,
    stderr: 'pipe',
    stdout: 'pipe',
  },
});
