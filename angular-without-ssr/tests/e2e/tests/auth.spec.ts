import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects/login-page';
import { environment } from '../../../src/environments/environments';

const E2E_USERNAME: string = environment.E2E_USERNAME;
const E2E_PASSWORD: string = environment.E2E_PASSWORD;

test.describe('Auth flow', () => {
  test('should login with E2E credentials and verify dashboard loads', async ({ page }) => {
    test.setTimeout(120000);

    const loginPage: LoginPage = new LoginPage(page);
    await loginPage.navigateToLogin();
    await loginPage.login(E2E_USERNAME, E2E_PASSWORD);

    // Po zalogowaniu sprawdzamy, czy przekierowano do /generate
    expect(page.url()).toContain('/generate');

    // Nawigujemy do dashboard i weryfikujemy załadowanie
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    await expect(page.locator('.dash')).toBeVisible({ timeout: 15000 });
  });

  test('should register with random email and verify redirect', async ({ page }) => {
    test.setTimeout(120000);

    const randomEmail: string = `e2e-test-${Date.now()}@test.com`;
    const password: string = 'TestPassword123!';

    await page.goto('/register', { waitUntil: 'networkidle' });
    await page.waitForLoadState('domcontentloaded');

    await page.locator('[data-testid="login-email-input"]').fill(randomEmail);
    await page.locator('[data-testid="login-password-input"]').fill(password);
    await page.locator('[data-testid="login-submit-button"]').click();

    // Czekamy na przekierowanie po rejestracji
    await page.waitForURL('**/generate', { timeout: 60000 });
    expect(page.url()).toContain('/generate');
  });

  test('should logout and verify redirect to landing', async ({ page }) => {
    test.setTimeout(120000);

    // Najpierw logujemy się
    const loginPage: LoginPage = new LoginPage(page);
    await loginPage.navigateToLogin();
    await loginPage.login(E2E_USERNAME, E2E_PASSWORD);

    // Otwieramy menu użytkownika
    const userMenuButton: import('@playwright/test').Locator = page.locator('.user-menu-button');
    await userMenuButton.waitFor({ state: 'visible', timeout: 10000 });
    await userMenuButton.click();

    // Klikamy wyloguj
    const logoutButton: import('@playwright/test').Locator = page.locator('.dropdown-item--logout');
    await logoutButton.waitFor({ state: 'visible', timeout: 5000 });
    await logoutButton.click();

    // Weryfikujemy przekierowanie na landing page
    await page.waitForURL('**/', { timeout: 15000 });
    const currentUrl: string = page.url();
    // Na landing page URL powinien być root lub /login
    expect(currentUrl.endsWith('/') || currentUrl.includes('/login')).toBeTruthy();
  });

  test('should login anonymously and verify dashboard', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Klikamy przycisk logowania anonimowego
    const anonButton: import('@playwright/test').Locator = page.locator('[data-testid="anonymous-login-button"]');
    await anonButton.waitFor({ state: 'visible', timeout: 10000 });
    await anonButton.click();

    // Czekamy na przekierowanie do /generate
    await page.waitForURL('**/generate', { timeout: 60000 });
    expect(page.url()).toContain('/generate');

    // Nawigujemy do dashboard i weryfikujemy
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    await expect(page.locator('.dash')).toBeVisible({ timeout: 15000 });
  });
});
