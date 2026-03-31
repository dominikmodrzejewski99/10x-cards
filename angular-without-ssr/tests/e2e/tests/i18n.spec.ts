import { test, expect, Page } from '@playwright/test';
import { LoginPage } from '../page-objects/login-page';
import { environment } from '../../../src/environments/environments';

const E2E_USERNAME: string = environment.E2E_USERNAME;
const E2E_PASSWORD: string = environment.E2E_PASSWORD;

/**
 * Helper: read the current lang attribute from <html>
 */
async function getHtmlLang(page: Page): Promise<string | null> {
  return page.evaluate(() => document.documentElement.lang);
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

test.describe('i18n — language switching', () => {
  test.setTimeout(120000);

  test('landing page renders translated content', async ({ browser }) => {
    // Use a fresh browser context with no cookies/localStorage to see the landing page as a new visitor
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('/', { waitUntil: 'networkidle' });

    // Wait for Transloco to load translations
    await page.waitForTimeout(2000);

    // Hero section should be visible and contain translated text
    const heroTitle = page.locator('.hero__title');
    await expect(heroTitle).toBeVisible({ timeout: 15000 });

    // Check that Transloco rendered actual text (not raw keys)
    const titleText: string = await heroTitle.textContent() ?? '';
    expect(titleText).not.toContain('landing.hero');

    // Should contain one of the translations (PL or EN depending on navigator.language)
    const isPl: boolean = titleText.includes('Przestań zapominać');
    const isEn: boolean = titleText.includes('Stop forgetting');
    expect(isPl || isEn).toBeTruthy();

    await context.close();
  });

  test('settings page shows language section with PL/EN buttons', async ({ page }) => {
    await loginAndGoToSettings(page);

    // Language section exists (it's the second .settings__card--theme)
    const languageCards = page.locator('.settings__card--theme');
    // There should be at least 2 cards with --theme class (theme + language)
    await expect(languageCards.nth(1)).toBeVisible();

    // Both language buttons are visible
    const plBtn = languageCards.nth(1).locator('.settings__theme-btn', { hasText: 'Polski' });
    const enBtn = languageCards.nth(1).locator('.settings__theme-btn', { hasText: 'English' });
    await expect(plBtn).toBeVisible();
    await expect(enBtn).toBeVisible();

    // Polish should be active by default
    await expect(plBtn).toHaveClass(/settings__theme-btn--active/);
  });

  test('switching to English updates settings UI text', async ({ page }) => {
    await loginAndGoToSettings(page);

    // Click English button
    const languageCard = page.locator('.settings__card--theme').nth(1);
    const enBtn = languageCard.locator('.settings__theme-btn', { hasText: 'English' });
    await enBtn.click();

    // Wait for Transloco to re-render
    await page.waitForTimeout(1000);

    // Settings title should now be in English
    await expect(page.locator('.settings__title')).toContainText('Settings');
    await expect(page.locator('.settings__subtitle')).toContainText('Manage your preferences');

    // Save button should be English
    await expect(page.locator('.settings__save-btn')).toContainText('Save');

    // English button should be active
    await expect(enBtn).toHaveClass(/settings__theme-btn--active/);
  });

  test('switching to English sets html lang attribute', async ({ page }) => {
    await loginAndGoToSettings(page);

    // Click English
    const languageCard = page.locator('.settings__card--theme').nth(1);
    const enBtn = languageCard.locator('.settings__theme-btn', { hasText: 'English' });
    await enBtn.click();

    // html[lang] should be "en"
    await page.waitForFunction(
      () => document.documentElement.lang === 'en',
      { timeout: 5000 }
    );
    expect(await getHtmlLang(page)).toBe('en');
  });

  test('language persists after page reload', async ({ page }) => {
    await loginAndGoToSettings(page);

    // Switch to English
    const languageCard = page.locator('.settings__card--theme').nth(1);
    const enBtn = languageCard.locator('.settings__theme-btn', { hasText: 'English' });
    await enBtn.click();

    // Wait for DB save
    await page.waitForTimeout(2000);

    // Reload
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('.settings')).toBeVisible({ timeout: 15000 });

    // Wait for language to be loaded from DB
    await page.waitForFunction(
      () => document.documentElement.lang === 'en',
      { timeout: 10000 }
    );

    // UI should still be in English
    await expect(page.locator('.settings__title')).toContainText('Settings');

    // English button should still be active
    const languageCardAfter = page.locator('.settings__card--theme').nth(1);
    const enBtnAfter = languageCardAfter.locator('.settings__theme-btn', { hasText: 'English' });
    await expect(enBtnAfter).toHaveClass(/settings__theme-btn--active/);
  });

  test('switching back to Polish restores Polish UI', async ({ page }) => {
    await loginAndGoToSettings(page);

    // First switch to English
    const languageCard = page.locator('.settings__card--theme').nth(1);
    const enBtn = languageCard.locator('.settings__theme-btn', { hasText: 'English' });
    await enBtn.click();
    await page.waitForTimeout(500);

    // Verify English is active
    await expect(page.locator('.settings__title')).toContainText('Settings');

    // Switch back to Polish
    const plBtn = languageCard.locator('.settings__theme-btn', { hasText: 'Polski' });
    await plBtn.click();
    await page.waitForTimeout(500);

    // UI should be back in Polish
    await expect(page.locator('.settings__title')).toContainText('Ustawienia');
    await expect(page.locator('.settings__save-btn')).toContainText('Zapisz');
    expect(await getHtmlLang(page)).toBe('pl');
  });

  // Cleanup: restore Polish at the end
  test('cleanup: restore Polish language', async ({ page }) => {
    await loginAndGoToSettings(page);
    const languageCard = page.locator('.settings__card--theme').nth(1);
    const plBtn = languageCard.locator('.settings__theme-btn', { hasText: 'Polski' });
    await plBtn.click();
    await page.waitForTimeout(1500);
    expect(await getHtmlLang(page)).toBe('pl');
  });
});
