import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';

export class QuizPage extends BasePage {
  // Quiz list page
  private readonly setCards: Locator;
  private readonly startTestButtons: Locator;

  // Quiz config page
  private readonly configTitle: Locator;
  private readonly questionCountSelect: Locator;
  private readonly writtenCheckbox: Locator;
  private readonly multipleChoiceCheckbox: Locator;
  private readonly trueFalseCheckbox: Locator;
  private readonly startQuizButton: Locator;
  private readonly goBackButton: Locator;

  // Quiz question page
  private readonly questionText: Locator;
  private readonly progressText: Locator;
  private readonly writtenInput: Locator;
  private readonly checkButton: Locator;
  private readonly nextButton: Locator;
  private readonly optionButtons: Locator;
  private readonly trueFalseTrue: Locator;
  private readonly trueFalseFalse: Locator;

  // Quiz results page
  private readonly resultsGrade: Locator;
  private readonly resultsRing: Locator;
  private readonly correctCount: Locator;
  private readonly incorrectCount: Locator;
  private readonly retryButton: Locator;
  private readonly retryWrongButton: Locator;
  private readonly goBackFromResults: Locator;
  private readonly answersToggle: Locator;
  private readonly answerItems: Locator;
  private readonly markButtons: Locator;
  private readonly retryStarredCard: Locator;

  constructor(page: Page) {
    super(page);

    // Quiz list
    this.setCards = page.locator('.quiz-list__card');
    this.startTestButtons = page.locator('.quiz-list__card-action:not([disabled])');

    // Config
    this.configTitle = page.locator('.quiz-config__title');
    this.questionCountSelect = page.locator('p-select');
    this.writtenCheckbox = page.locator('input[type="checkbox"]').nth(0);
    this.multipleChoiceCheckbox = page.locator('input[type="checkbox"]').nth(1);
    this.trueFalseCheckbox = page.locator('input[type="checkbox"]').nth(2);
    this.startQuizButton = page.locator('button').filter({ hasText: 'Rozpocznij test' });
    this.goBackButton = page.locator('button').filter({ hasText: 'Wróć' });

    // Question
    this.questionText = page.locator('.quiz-question__text');
    this.progressText = page.locator('.quiz-question__progress-text');
    this.writtenInput = page.locator('.quiz-question__input');
    this.checkButton = page.locator('button').filter({ hasText: 'Sprawdź' });
    this.nextButton = page.locator('button').filter({ hasText: 'Dalej' });
    this.optionButtons = page.locator('.quiz-question__option');
    this.trueFalseTrue = page.locator('.quiz-question__tf-btn--true');
    this.trueFalseFalse = page.locator('.quiz-question__tf-btn--false');

    // Results
    this.resultsGrade = page.locator('.quiz-results__grade');
    this.resultsRing = page.locator('.quiz-results__ring');
    this.correctCount = page.locator('.quiz-results__count-badge--correct');
    this.incorrectCount = page.locator('.quiz-results__count-badge--wrong');
    this.retryButton = page.locator('.quiz-results__action-card').filter({ hasText: 'Powtórz cały test' });
    this.retryWrongButton = page.locator('.quiz-results__action-card').filter({ hasText: 'Powtórz błędne' });
    this.goBackFromResults = page.locator('.quiz-results__action-card').filter({ hasText: 'Wróć do zestawu' });
    this.answersToggle = page.locator('.quiz-results__answers-toggle');
    this.answerItems = page.locator('.quiz-results__answer-item');
    this.markButtons = page.locator('.quiz-results__mark-btn');
    this.retryStarredCard = page.locator('.quiz-results__action-card').filter({ hasText: 'Powtórz wyróżnione' });
  }

  // Navigation
  async navigateToQuizList(): Promise<void> {
    await this.navigateTo('/quiz');
  }

  async navigateToQuiz(setId: number): Promise<void> {
    await this.navigateTo(`/quiz/${setId}`);
  }

  // Quiz list assertions
  async expectSetCardsVisible(): Promise<void> {
    await expect(this.setCards.first()).toBeVisible({ timeout: 10000 });
  }

  async getSetCardCount(): Promise<number> {
    return this.setCards.count();
  }

  async clickFirstAvailableTest(): Promise<void> {
    await this.startTestButtons.first().click();
  }

  // Config page
  async expectConfigPageVisible(): Promise<void> {
    await expect(this.configTitle).toBeVisible({ timeout: 10000 });
  }

  async startQuiz(): Promise<void> {
    await this.startQuizButton.click();
  }

  async uncheckQuestionType(type: 'written' | 'multiple-choice' | 'true-false'): Promise<void> {
    const checkbox: Locator = type === 'written'
      ? this.writtenCheckbox
      : type === 'multiple-choice'
        ? this.multipleChoiceCheckbox
        : this.trueFalseCheckbox;

    if (await checkbox.isChecked()) {
      await checkbox.click();
    }
  }

  async checkQuestionType(type: 'written' | 'multiple-choice' | 'true-false'): Promise<void> {
    const checkbox: Locator = type === 'written'
      ? this.writtenCheckbox
      : type === 'multiple-choice'
        ? this.multipleChoiceCheckbox
        : this.trueFalseCheckbox;

    if (!(await checkbox.isChecked())) {
      await checkbox.click();
    }
  }

  // Question page
  async expectQuestionVisible(): Promise<void> {
    await expect(this.questionText).toBeVisible({ timeout: 10000 });
  }

  async getQuestionText(): Promise<string> {
    return (await this.questionText.textContent()) || '';
  }

  async getProgressText(): Promise<string> {
    return (await this.progressText.textContent()) || '';
  }

  async answerCurrentQuestion(): Promise<void> {
    // Detect question type and answer accordingly
    if (await this.writtenInput.isVisible().catch(() => false)) {
      await this.answerWritten('test answer');
    } else if (await this.optionButtons.first().isVisible().catch(() => false)) {
      await this.answerMultipleChoice();
    } else if (await this.trueFalseTrue.isVisible().catch(() => false)) {
      await this.answerTrueFalse(true);
    }
  }

  async answerWritten(answer: string): Promise<void> {
    await this.writtenInput.fill(answer);
    await this.checkButton.click();
    await this.nextButton.waitFor({ state: 'visible', timeout: 5000 });
    await this.nextButton.click();
  }

  async answerMultipleChoice(optionIndex: number = 0): Promise<void> {
    await this.optionButtons.nth(optionIndex).click();
    await this.nextButton.waitFor({ state: 'visible', timeout: 5000 });
    await this.nextButton.click();
  }

  async answerTrueFalse(value: boolean): Promise<void> {
    if (value) {
      await this.trueFalseTrue.click();
    } else {
      await this.trueFalseFalse.click();
    }
    await this.nextButton.waitFor({ state: 'visible', timeout: 5000 });
    await this.nextButton.click();
  }

  async completeAllQuestions(): Promise<void> {
    let isQuestion: boolean = await this.questionText.isVisible().catch(() => false);
    while (isQuestion) {
      await this.answerCurrentQuestion();
      // Small delay for Angular change detection
      await this.page.waitForTimeout(300);
      isQuestion = await this.questionText.isVisible().catch(() => false);
    }
  }

  // Results page
  async expectResultsVisible(): Promise<void> {
    await expect(this.resultsGrade).toBeVisible({ timeout: 10000 });
  }

  async getGradeText(): Promise<string> {
    return (await this.resultsGrade.textContent()) || '';
  }

  async expectRingVisible(): Promise<void> {
    await expect(this.resultsRing).toBeVisible();
  }

  async getCorrectCount(): Promise<string> {
    return (await this.correctCount.textContent()) || '';
  }

  async getIncorrectCount(): Promise<string> {
    return (await this.incorrectCount.textContent()) || '';
  }

  async getAnswerItemCount(): Promise<number> {
    return this.answerItems.count();
  }

  async clickRetry(): Promise<void> {
    await this.retryButton.click();
  }

  async clickRetryWrong(): Promise<void> {
    await this.retryWrongButton.click();
  }

  async clickGoBackFromResults(): Promise<void> {
    await this.goBackFromResults.click();
  }

  async starAnswer(index: number): Promise<void> {
    await this.markButtons.nth(index).click();
  }

  async expectRetryStarredVisible(): Promise<void> {
    await expect(this.retryStarredCard).toBeVisible();
  }

  async clickRetryStarred(): Promise<void> {
    await this.retryStarredCard.click();
  }
}
