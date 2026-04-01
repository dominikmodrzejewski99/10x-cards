import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects/login-page';
import { FlashcardListPage } from '../page-objects/flashcard-list-page';
import { PrintTestPage } from '../page-objects/print-test-page';

const E2E_USERNAME: string = process.env['E2E_USERNAME'] || '';
const E2E_PASSWORD: string = process.env['E2E_PASSWORD'] || '';

test.describe('Print Test feature', () => {
  let printTestPage: PrintTestPage;
  let flashcardListPage: FlashcardListPage;

  test.beforeEach(async ({ page }) => {
    printTestPage = new PrintTestPage(page);
    flashcardListPage = new FlashcardListPage(page);

    if (E2E_USERNAME && E2E_PASSWORD) {
      const loginPage: LoginPage = new LoginPage(page);
      await loginPage.navigateToLogin();
      await loginPage.login(E2E_USERNAME, E2E_PASSWORD);
    }
  });

  async function navigateToFirstSet(page: import('@playwright/test').Page): Promise<void> {
    // Navigate to sets list, then click first set
    await page.goto('/sets', { waitUntil: 'networkidle', timeout: 30000 });
    await page.locator('.set-card').first().click();
    await flashcardListPage.expectPageLoaded();
  }

  test('should show print test button in more menu', async ({ page }) => {
    await navigateToFirstSet(page);

    await printTestPage.openMoreMenu();
    const printButton = page.getByTestId('print-test-button');
    await expect(printButton).toBeVisible({ timeout: 5000 });
  });

  test('should open print test config dialog', async ({ page }) => {
    await navigateToFirstSet(page);

    await printTestPage.openPrintTestDialog();
    await printTestPage.expectDialogVisible();
  });

  test('should close dialog on cancel', async ({ page }) => {
    await navigateToFirstSet(page);

    await printTestPage.openPrintTestDialog();
    await printTestPage.expectDialogVisible();

    await printTestPage.clickCancel();
    await printTestPage.expectDialogHidden();
  });

  test('should disable print button when no question types are selected', async ({ page }) => {
    await navigateToFirstSet(page);

    await printTestPage.openPrintTestDialog();
    await printTestPage.expectDialogVisible();

    await printTestPage.uncheckQuestionType('written');
    await printTestPage.uncheckQuestionType('multiple-choice');
    await printTestPage.uncheckQuestionType('true-false');
    await printTestPage.uncheckQuestionType('matching');

    const isDisabled: boolean = await printTestPage.isPrintButtonDisabled();
    expect(isDisabled).toBe(true);
  });

  test('should set custom test title', async ({ page }) => {
    await navigateToFirstSet(page);

    await printTestPage.openPrintTestDialog();
    await printTestPage.expectDialogVisible();

    await printTestPage.setTitle('Sprawdzian z angielskiego');

    const titleInput = page.locator('.ptc__text-input');
    await expect(titleInput).toHaveValue('Sprawdzian z angielskiego');
  });

  test('should open new print window when print is clicked', async ({ page, context }) => {
    await navigateToFirstSet(page);

    // Ensure set has flashcards
    const cardCount: number = await flashcardListPage.getFlashcardCount();
    if (cardCount === 0) {
      test.skip();
      return;
    }

    await printTestPage.openPrintTestDialog();
    await printTestPage.expectDialogVisible();

    // Listen for new page (print window)
    const newPagePromise = context.waitForEvent('page', { timeout: 10000 });

    await printTestPage.clickPrint();

    const newPage = await newPagePromise;
    await newPage.waitForLoadState('domcontentloaded', { timeout: 10000 });

    // Verify the print window contains test content
    const content: string = await newPage.content();
    expect(content).toContain('<!DOCTYPE html>');
    expect(content).toContain('header__branding');

    await newPage.close();
  });

  test('should generate test with only written questions when other types are unchecked', async ({ page, context }) => {
    await navigateToFirstSet(page);

    const cardCount: number = await flashcardListPage.getFlashcardCount();
    if (cardCount === 0) {
      test.skip();
      return;
    }

    await printTestPage.openPrintTestDialog();
    await printTestPage.expectDialogVisible();

    await printTestPage.uncheckQuestionType('multiple-choice');
    await printTestPage.uncheckQuestionType('true-false');
    await printTestPage.uncheckQuestionType('matching');

    const newPagePromise = context.waitForEvent('page', { timeout: 10000 });
    await printTestPage.clickPrint();

    const newPage = await newPagePromise;
    await newPage.waitForLoadState('domcontentloaded', { timeout: 10000 });

    const content: string = await newPage.content();
    expect(content).toContain('question--written');
    expect(content).not.toContain('question--mc');
    expect(content).not.toContain('question--tf');
    expect(content).not.toContain('matching__col');

    await newPage.close();
  });

  test('should include answer key when option is checked', async ({ page, context }) => {
    await navigateToFirstSet(page);

    const cardCount: number = await flashcardListPage.getFlashcardCount();
    if (cardCount === 0) {
      test.skip();
      return;
    }

    await printTestPage.openPrintTestDialog();
    await printTestPage.expectDialogVisible();

    const newPagePromise = context.waitForEvent('page', { timeout: 10000 });
    await printTestPage.clickPrint();

    const newPage = await newPagePromise;
    await newPage.waitForLoadState('domcontentloaded', { timeout: 10000 });

    const content: string = await newPage.content();
    expect(content).toContain('answer-key');

    await newPage.close();
  });
});
