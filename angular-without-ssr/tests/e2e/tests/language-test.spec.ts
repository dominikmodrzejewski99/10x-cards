import { test, expect } from '@playwright/test';
import { LanguageTestPage } from '../page-objects/language-test-page';

async function loginAnonymously(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);

  const anonButton: import('@playwright/test').Locator = page.locator('[data-testid="anonymous-login-button"]');
  await anonButton.waitFor({ state: 'visible', timeout: 10000 });
  await anonButton.click();

  await page.waitForURL('**/generate', { timeout: 60000 });
}

test.describe('Language Test', () => {
  let testPage: LanguageTestPage;

  test.beforeEach(async ({ page }) => {
    testPage = new LanguageTestPage(page);
    await loginAnonymously(page);
  });

  test('should display test list with available levels', async () => {
    await testPage.navigateToTestList();
    await testPage.expectListVisible();

    const count: number = await testPage.getLevelCardCount();
    expect(count).toBe(3);
  });

  test('should navigate from list to test and show first question', async () => {
    await testPage.navigateToTestList();
    await testPage.expectListVisible();

    await testPage.clickLevel('b1');
    await testPage.expectQuestionVisible();

    const counterText: string = await testPage.getCounterText();
    expect(counterText).toContain('1/');

    await testPage.expectCounterVisible();
    await testPage.expectTypeVisible();

    const typeText: string = await testPage.getQuestionTypeText();
    expect(['Multiple Choice', 'Word Formation']).toContain(typeText);
  });

  test('should have previous button disabled on first question', async () => {
    await testPage.navigateToTest('b1');
    await testPage.expectQuestionVisible();

    await testPage.expectPrevDisabled();
  });

  test('should enable next button after selecting an option on MC question', async ({ page }) => {
    await testPage.navigateToTest('b1');
    await testPage.expectQuestionVisible();

    // Jeśli to MC, sprawdzamy flow
    const isMC: boolean = await testPage.isMultipleChoice();
    if (isMC) {
      await testPage.expectNextDisabled();
      await testPage.selectOption(0);
      await testPage.expectNextEnabled();
    }
  });

  test('should support keyboard shortcuts (1-4) for MC questions', async ({ page }) => {
    await testPage.navigateToTest('b1');
    await testPage.expectQuestionVisible();

    const isMC: boolean = await testPage.isMultipleChoice();
    if (isMC) {
      // Naciskamy klawisz "2" i sprawdzamy, czy opcja została zaznaczona
      await testPage.pressKey('2');
      await page.waitForTimeout(200);

      const selectedCount: number = await testPage.getSelectedOptionCount();
      expect(selectedCount).toBe(1);
    }
  });

  test('should skip question and advance without saving answer', async ({ page }) => {
    await testPage.navigateToTest('b1');
    await testPage.expectQuestionVisible();

    const counterBefore: string = await testPage.getCounterText();
    expect(counterBefore).toContain('1/');

    await testPage.clickSkip();
    await page.waitForTimeout(300);

    const counterAfter: string = await testPage.getCounterText();
    expect(counterAfter).toContain('2/');
  });

  test('should navigate back with previous button and restore answer', async ({ page }) => {
    await testPage.navigateToTest('b1');
    await testPage.expectQuestionVisible();

    const isMC: boolean = await testPage.isMultipleChoice();
    if (isMC) {
      // Wybieramy opcję i przechodzimy dalej
      await testPage.selectOption(1);
      await testPage.clickNext();
      await page.waitForTimeout(300);

      const counterAfterNext: string = await testPage.getCounterText();
      expect(counterAfterNext).toContain('2/');

      // Wracamy do poprzedniego pytania
      await testPage.clickPrevious();
      await page.waitForTimeout(300);

      const counterAfterPrev: string = await testPage.getCounterText();
      expect(counterAfterPrev).toContain('1/');

      // Opcja powinna być nadal zaznaczona
      const selectedCount: number = await testPage.getSelectedOptionCount();
      expect(selectedCount).toBe(1);

      await testPage.expectPrevDisabled();
    }
  });

  test('should complete entire B1 test and show results', async ({ page }) => {
    test.setTimeout(180000);

    await testPage.navigateToTest('b1');
    await testPage.expectQuestionVisible();

    await testPage.completeAllQuestions();

    // Czekamy na stronę wyników
    await page.waitForURL('**/language-test/b1/results', { timeout: 30000 });
    await testPage.expectResultsVisible();

    // Sprawdzamy, czy wynik jest wyświetlany
    const percentage: string = await testPage.getScorePercentage();
    expect(percentage).toMatch(/\d+%/);

    const label: string = await testPage.getScoreLabel();
    expect(['Zdane!', 'Nie zdane']).toContain(label);

    const detail: string = await testPage.getScoreDetail();
    expect(detail).toContain('/');
    expect(detail).toContain('B1');

    // Sprawdzamy kategorie
    const categoryCount: number = await testPage.getCategoryCount();
    expect(categoryCount).toBeGreaterThan(0);
  });

  test('should retry test from results page', async ({ page }) => {
    test.setTimeout(180000);

    await testPage.navigateToTest('b1');
    await testPage.expectQuestionVisible();

    await testPage.completeAllQuestions();

    await page.waitForURL('**/language-test/b1/results', { timeout: 30000 });
    await testPage.expectResultsVisible();

    // Klikamy "Powtórz test"
    await testPage.clickRetryTest();
    await testPage.expectQuestionVisible();

    const counterText: string = await testPage.getCounterText();
    expect(counterText).toContain('1/');
  });

  test('should navigate to other test from results page', async ({ page }) => {
    test.setTimeout(180000);

    await testPage.navigateToTest('b1');
    await testPage.expectQuestionVisible();

    await testPage.completeAllQuestions();

    await page.waitForURL('**/language-test/b1/results', { timeout: 30000 });
    await testPage.expectResultsVisible();

    // Klikamy "Inny test"
    await testPage.clickOtherTest();
    await testPage.expectListVisible();
  });

  test('should hide skip button on last question', async ({ page }) => {
    test.setTimeout(180000);

    await testPage.navigateToTest('b1');
    await testPage.expectQuestionVisible();

    // Przechodzimy przez wszystkie pytania oprócz ostatniego
    const counterText: string = await testPage.getCounterText();
    const totalQuestions: number = parseInt(counterText.split('/')[1], 10);

    for (let i: number = 0; i < totalQuestions - 1; i++) {
      await testPage.expectSkipVisible();
      await testPage.clickSkip();
      await page.waitForTimeout(200);
    }

    // Na ostatnim pytaniu przycisk "Pomiń" nie powinien być widoczny
    await testPage.expectSkipHidden();
  });
});
