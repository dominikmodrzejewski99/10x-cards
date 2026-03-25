import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';

export class LanguageTestPage extends BasePage {
  // List page
  private readonly listTitle: Locator;
  private readonly levelCards: Locator;

  // Test view - header
  private readonly counter: Locator;
  private readonly questionType: Locator;
  private readonly progressBar: Locator;
  private readonly progressFill: Locator;

  // Test view - question
  private readonly questionSentence: Locator;
  private readonly optionButtons: Locator;
  private readonly optionKeys: Locator;
  private readonly wordFormationInput: Locator;
  private readonly baseWordValue: Locator;

  // Test view - actions
  private readonly prevButton: Locator;
  private readonly skipButton: Locator;
  private readonly nextButton: Locator;

  // Results page
  private readonly scoreCircle: Locator;
  private readonly scoreLabel: Locator;
  private readonly scoreDetail: Locator;
  private readonly categoryItems: Locator;
  private readonly retryTestLink: Locator;
  private readonly otherTestLink: Locator;

  constructor(page: Page) {
    super(page);

    // List
    this.listTitle = page.locator('.test-list__title');
    this.levelCards = page.locator('.test-list__card');

    // Header
    this.counter = page.locator('.test-view__counter');
    this.questionType = page.locator('.test-view__type');
    this.progressBar = page.locator('.test-view__progress-bar');
    this.progressFill = page.locator('.test-view__progress-fill');

    // Question
    this.questionSentence = page.locator('.test-view__sentence');
    this.optionButtons = page.locator('.test-view__option');
    this.optionKeys = page.locator('.test-view__option-key');
    this.wordFormationInput = page.locator('.test-view__input');
    this.baseWordValue = page.locator('.test-view__base-word-value');

    // Actions
    this.prevButton = page.locator('.test-view__prev');
    this.skipButton = page.locator('.test-view__skip');
    this.nextButton = page.locator('.test-view__next');

    // Results
    this.scoreCircle = page.locator('.test-results__score-circle');
    this.scoreLabel = page.locator('.test-results__score-label');
    this.scoreDetail = page.locator('.test-results__score-detail');
    this.categoryItems = page.locator('.test-results__category');
    this.retryTestLink = page.locator('a').filter({ hasText: 'Powtórz test' });
    this.otherTestLink = page.locator('a').filter({ hasText: 'Inny test' });
  }

  // ===== Navigation =====

  async navigateToTestList(): Promise<void> {
    await this.navigateTo('/language-test');
  }

  async navigateToTest(level: string): Promise<void> {
    await this.navigateTo(`/language-test/${level}`);
  }

  // ===== List page =====

  async expectListVisible(): Promise<void> {
    await expect(this.listTitle).toBeVisible({ timeout: 10000 });
  }

  async getLevelCardCount(): Promise<number> {
    return this.levelCards.count();
  }

  async clickLevel(level: string): Promise<void> {
    const card: Locator = this.page.locator(`.test-list__card[href*="${level}"]`);
    await card.click();
  }

  // ===== Test view - header =====

  async expectQuestionVisible(): Promise<void> {
    await expect(this.questionSentence).toBeVisible({ timeout: 15000 });
  }

  async getCounterText(): Promise<string> {
    return (await this.counter.textContent()) || '';
  }

  async getQuestionTypeText(): Promise<string> {
    return (await this.questionType.textContent())?.trim() || '';
  }

  async expectCounterVisible(): Promise<void> {
    await expect(this.counter).toBeVisible();
  }

  async expectTypeVisible(): Promise<void> {
    await expect(this.questionType).toBeVisible();
  }

  // ===== Test view - answering =====

  async isMultipleChoice(): Promise<boolean> {
    return this.optionButtons.first().isVisible().catch(() => false);
  }

  async isWordFormation(): Promise<boolean> {
    return this.wordFormationInput.isVisible().catch(() => false);
  }

  async selectOption(index: number): Promise<void> {
    await this.optionButtons.nth(index).click();
  }

  async getSelectedOptionCount(): Promise<number> {
    return this.page.locator('.test-view__option--selected').count();
  }

  async fillWordFormation(answer: string): Promise<void> {
    await this.wordFormationInput.fill(answer);
  }

  async getBaseWord(): Promise<string> {
    return (await this.baseWordValue.textContent())?.trim() || '';
  }

  // ===== Test view - keyboard =====

  async pressKey(key: string): Promise<void> {
    await this.page.keyboard.press(key);
  }

  // ===== Test view - actions =====

  async clickNext(): Promise<void> {
    await this.nextButton.click();
  }

  async clickPrevious(): Promise<void> {
    await this.prevButton.click();
  }

  async clickSkip(): Promise<void> {
    await this.skipButton.click();
  }

  async expectNextEnabled(): Promise<void> {
    await expect(this.nextButton).toBeEnabled();
  }

  async expectNextDisabled(): Promise<void> {
    await expect(this.nextButton).toBeDisabled();
  }

  async expectPrevDisabled(): Promise<void> {
    await expect(this.prevButton).toBeDisabled();
  }

  async expectPrevEnabled(): Promise<void> {
    await expect(this.prevButton).toBeEnabled();
  }

  async expectSkipVisible(): Promise<void> {
    await expect(this.skipButton).toBeVisible();
  }

  async expectSkipHidden(): Promise<void> {
    await expect(this.skipButton).toBeHidden();
  }

  // ===== Complete test flow =====

  async answerCurrentQuestion(): Promise<void> {
    if (await this.isMultipleChoice()) {
      await this.selectOption(0);
      await this.clickNext();
    } else if (await this.isWordFormation()) {
      await this.fillWordFormation('answer');
      await this.clickNext();
    }
  }

  async completeAllQuestions(): Promise<void> {
    let hasQuestion: boolean = await this.questionSentence.isVisible().catch(() => false);
    let safetyCounter: number = 0;
    const maxQuestions: number = 50;

    while (hasQuestion && safetyCounter < maxQuestions) {
      await this.answerCurrentQuestion();
      await this.page.waitForTimeout(300);
      hasQuestion = await this.questionSentence.isVisible().catch(() => false);
      safetyCounter++;
    }
  }

  // ===== Results page =====

  async expectResultsVisible(): Promise<void> {
    await expect(this.scoreCircle).toBeVisible({ timeout: 15000 });
  }

  async getScorePercentage(): Promise<string> {
    return (await this.scoreCircle.textContent())?.trim() || '';
  }

  async getScoreLabel(): Promise<string> {
    return (await this.scoreLabel.textContent())?.trim() || '';
  }

  async getScoreDetail(): Promise<string> {
    return (await this.scoreDetail.textContent())?.trim() || '';
  }

  async getCategoryCount(): Promise<number> {
    return this.categoryItems.count();
  }

  async clickRetryTest(): Promise<void> {
    await this.retryTestLink.click();
  }

  async clickOtherTest(): Promise<void> {
    await this.otherTestLink.click();
  }
}
