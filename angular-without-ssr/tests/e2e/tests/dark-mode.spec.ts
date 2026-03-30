import { test, expect, Page } from '@playwright/test';
import { LoginPage } from '../page-objects/login-page';
import { environment } from '../../../src/environments/environments';

const E2E_USERNAME: string = environment.E2E_USERNAME;
const E2E_PASSWORD: string = environment.E2E_PASSWORD;

/**
 * Helper: read the current data-theme attribute from <html>
 */
async function getTheme(page: Page): Promise<string | null> {
  return page.evaluate(() => document.documentElement.getAttribute('data-theme'));
}

/**
 * Helper: log in and navigate to settings
 */
async function loginAndGoToSettings(page: Page): Promise<void> {
  const loginPage = new LoginPage(page);
  await loginPage.navigateToLogin();
  await loginPage.login(E2E_USERNAME, E2E_PASSWORD);

  await page.goto('/settings', { waitUntil: 'networkidle' });
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('.settings')).toBeVisible({ timeout: 15000 });
}

test.describe('Dark mode', () => {
  test.setTimeout(120000);

  test('settings page shows theme section with light/dark buttons', async ({ page }) => {
    await loginAndGoToSettings(page);

    // Theme section exists
    const themeCard = page.locator('.settings__card--theme');
    await expect(themeCard).toBeVisible();

    // Both buttons are visible
    const lightBtn = themeCard.locator('.settings__theme-btn', { hasText: 'Jasny' });
    const darkBtn = themeCard.locator('.settings__theme-btn', { hasText: 'Ciemny' });
    await expect(lightBtn).toBeVisible();
    await expect(darkBtn).toBeVisible();

    // Light button should be active by default (or whichever is current)
    const theme = await getTheme(page);
    if (theme === 'dark') {
      await expect(darkBtn).toHaveClass(/settings__theme-btn--active/);
    } else {
      await expect(lightBtn).toHaveClass(/settings__theme-btn--active/);
    }
  });

  test('clicking dark mode applies data-theme="dark" to html', async ({ page }) => {
    await loginAndGoToSettings(page);

    const themeCard = page.locator('.settings__card--theme');
    const darkBtn = themeCard.locator('.settings__theme-btn', { hasText: 'Ciemny' });

    await darkBtn.click();

    // data-theme should be "dark"
    const theme = await getTheme(page);
    expect(theme).toBe('dark');

    // Dark button should now be active
    await expect(darkBtn).toHaveClass(/settings__theme-btn--active/);
  });

  test('clicking light mode applies data-theme="light" to html', async ({ page }) => {
    await loginAndGoToSettings(page);

    const themeCard = page.locator('.settings__card--theme');
    const darkBtn = themeCard.locator('.settings__theme-btn', { hasText: 'Ciemny' });
    const lightBtn = themeCard.locator('.settings__theme-btn', { hasText: 'Jasny' });

    // Switch to dark first
    await darkBtn.click();
    expect(await getTheme(page)).toBe('dark');

    // Switch back to light
    await lightBtn.click();
    expect(await getTheme(page)).toBe('light');
    await expect(lightBtn).toHaveClass(/settings__theme-btn--active/);
  });

  test('dark mode persists after page reload', async ({ page }) => {
    await loginAndGoToSettings(page);

    // Activate dark mode
    const darkBtn = page.locator('.settings__card--theme .settings__theme-btn', { hasText: 'Ciemny' });
    await darkBtn.click();
    expect(await getTheme(page)).toBe('dark');

    // Wait a bit for the DB save to complete
    await page.waitForTimeout(1500);

    // Reload the page
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('.settings')).toBeVisible({ timeout: 15000 });

    // Theme should still be dark after reload
    // Wait for theme to be applied (it loads async from DB)
    await page.waitForFunction(
      () => document.documentElement.getAttribute('data-theme') === 'dark',
      { timeout: 10000 }
    );
    expect(await getTheme(page)).toBe('dark');

    // Dark button should still be active
    const darkBtnAfter = page.locator('.settings__card--theme .settings__theme-btn', { hasText: 'Ciemny' });
    await expect(darkBtnAfter).toHaveClass(/settings__theme-btn--active/);
  });

  test('dark mode CSS variables are applied correctly', async ({ page }) => {
    await loginAndGoToSettings(page);

    // Switch to dark
    const darkBtn = page.locator('.settings__card--theme .settings__theme-btn', { hasText: 'Ciemny' });
    await darkBtn.click();

    // Verify key CSS variables have dark values
    const bgColor = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--app-bg').trim()
    );
    expect(bgColor).toBe('#0b1120');

    const textColor = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--app-text').trim()
    );
    expect(textColor).toBe('#f1f5f9');

    const whiteColor = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--app-white').trim()
    );
    expect(whiteColor).toBe('#141c2e');
  });

  test('dark mode applies to dashboard elements', async ({ page }) => {
    await loginAndGoToSettings(page);

    // Activate dark mode
    const darkBtn = page.locator('.settings__card--theme .settings__theme-btn', { hasText: 'Ciemny' });
    await darkBtn.click();
    expect(await getTheme(page)).toBe('dark');

    // Navigate to dashboard
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    await expect(page.locator('.dash')).toBeVisible({ timeout: 15000 });

    // Theme should still be dark
    expect(await getTheme(page)).toBe('dark');

    // Verify body background is dark (computed)
    const bodyBg = await page.evaluate(() =>
      getComputedStyle(document.body).backgroundColor
    );
    // Should NOT be white/light — the rgb values should be dark
    // #0b1120 = rgb(11, 17, 32)
    expect(bodyBg).not.toBe('rgb(255, 255, 255)');
    expect(bodyBg).not.toBe('rgb(248, 250, 252)'); // light mode --app-bg
  });

  test('dark mode applies to pomodoro timer dropdown', async ({ page }) => {
    await loginAndGoToSettings(page);

    // Activate dark mode
    const darkBtn = page.locator('.settings__card--theme .settings__theme-btn', { hasText: 'Ciemny' });
    await darkBtn.click();

    // Navigate to dashboard where pomodoro is visible
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    await expect(page.locator('.dash')).toBeVisible({ timeout: 15000 });

    // Click pomodoro trigger to open dropdown
    const pomodoroTrigger = page.locator('.pomodoro-trigger');
    if (await pomodoroTrigger.isVisible()) {
      await pomodoroTrigger.click();

      // Verify dropdown background is NOT white
      const dropdown = page.locator('.pomodoro-dropdown');
      await expect(dropdown).toBeVisible({ timeout: 5000 });

      const dropdownBg = await dropdown.evaluate(el =>
        getComputedStyle(el).backgroundColor
      );
      // Should be dark (#141c2e = rgb(20, 28, 46)), not white
      expect(dropdownBg).not.toBe('rgb(255, 255, 255)');
    }
  });

  test('switching back to light mode restores light theme', async ({ page }) => {
    await loginAndGoToSettings(page);

    // Activate dark
    const darkBtn = page.locator('.settings__card--theme .settings__theme-btn', { hasText: 'Ciemny' });
    await darkBtn.click();
    expect(await getTheme(page)).toBe('dark');

    // Switch to light
    const lightBtn = page.locator('.settings__card--theme .settings__theme-btn', { hasText: 'Jasny' });
    await lightBtn.click();
    expect(await getTheme(page)).toBe('light');

    // Wait for DB save
    await page.waitForTimeout(1500);

    // Reload and verify
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('.settings')).toBeVisible({ timeout: 15000 });

    await page.waitForFunction(
      () => document.documentElement.getAttribute('data-theme') === 'light',
      { timeout: 10000 }
    );
    expect(await getTheme(page)).toBe('light');

    // Verify CSS vars are light
    const bgColor = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--app-bg').trim()
    );
    expect(bgColor).toBe('#F8FAFC');
  });

  // Cleanup: restore light theme at the end
  test('cleanup: restore light theme', async ({ page }) => {
    await loginAndGoToSettings(page);
    const lightBtn = page.locator('.settings__card--theme .settings__theme-btn', { hasText: 'Jasny' });
    await lightBtn.click();
    await page.waitForTimeout(1500);
    expect(await getTheme(page)).toBe('light');
  });
});
