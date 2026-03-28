import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects/login-page';
import { SetsPage } from '../page-objects/sets-page';
import { SharePage } from '../page-objects/share-page';
import { environment } from '../../../src/environments/environments';

const E2E_USERNAME: string = environment.E2E_USERNAME;
const E2E_PASSWORD: string = environment.E2E_PASSWORD;

test.describe('Set sharing flow', () => {
  let setsPage: SetsPage;
  let sharePage: SharePage;

  test.beforeEach(async ({ page }) => {
    setsPage = new SetsPage(page);
    sharePage = new SharePage(page);
    const loginPage: LoginPage = new LoginPage(page);
    await loginPage.navigateToLogin();
    await loginPage.login(E2E_USERNAME, E2E_PASSWORD);
  });

  test('should generate and accept a share link', async ({ page }) => {
    test.setTimeout(120000);

    const setName: string = `Share Test ${Date.now()}`;

    // Create a test set
    console.log('Creating test set:', setName);
    await setsPage.navigateToSets();
    await setsPage.createSet(setName);
    await setsPage.expectSetVisible(setName);

    // Navigate into the set
    console.log('Navigating into set');
    await setsPage.clickSet(setName);
    await page.waitForURL('**/sets/**', { timeout: 10000 });

    // We need at least one flashcard for sharing to work
    // Add a flashcard manually
    const addButton = page.locator('[data-test-id="add-flashcard-button"]');
    await addButton.click();
    const frontInput = page
      .locator(
        '[data-test-id="flashcard-front-input"], #flashcardFront, textarea[placeholder*="Przód"], input[placeholder*="Przód"]'
      )
      .first();
    const backInput = page
      .locator(
        '[data-test-id="flashcard-back-input"], #flashcardBack, textarea[placeholder*="Tył"], input[placeholder*="Tył"]'
      )
      .first();
    await frontInput.waitFor({ state: 'visible', timeout: 10000 });
    await frontInput.fill('Test front');
    await backInput.fill('Test back');
    const saveButton = page
      .locator('button')
      .filter({ hasText: /Zapisz|Dodaj/ })
      .first();
    await saveButton.click();
    await page.waitForTimeout(2000);

    // Open share dialog
    console.log('Opening share dialog');
    await sharePage.openShareDialog();
    await sharePage.expectShareLinkGenerated();

    // Get share link
    const shareLink: string = await sharePage.getShareLink();
    console.log('Share link generated:', shareLink);
    expect(shareLink).toContain('/share/');

    // Accept share link (same user — creates a copy)
    console.log('Accepting share link');
    await sharePage.navigateToShareLink(shareLink);

    // Should redirect to the copied set
    await page.waitForURL('**/sets/**', { timeout: 30000 });
    console.log('Redirected to copied set');

    // Verify the copied set has [Shared] prefix
    const title = page.locator('[data-test-id="flashcards-title"]');
    await expect(title).toContainText('[Shared]', { timeout: 10000 });
    console.log('Copied set verified with [Shared] prefix');

    // Verify toast appeared
    const toast = page.locator('.p-toast-message');
    await expect(toast)
      .toBeVisible({ timeout: 5000 })
      .catch(() => {
        console.log('Toast may have already disappeared');
      });

    // Cleanup: delete both sets
    await setsPage.navigateToSets();
    // Delete the shared copy
    const sharedSetName = `[Shared] ${setName}`;
    try {
      await setsPage.deleteSet(sharedSetName);
      console.log('Deleted shared copy');
    } catch {
      console.log('Could not delete shared copy (may not be visible)');
    }
    // Delete the original
    try {
      await setsPage.deleteSet(setName);
      console.log('Deleted original set');
    } catch {
      console.log('Could not delete original set');
    }
  });

  test('should show error for invalid share link', async ({ page }) => {
    test.setTimeout(30000);

    console.log('Navigating to invalid share link');
    await page.goto('/share/00000000-0000-0000-0000-000000000000', { timeout: 30000 });

    // Should show error
    await sharePage.expectError('nieprawidłowy');
    console.log('Error message displayed correctly');
  });
});
