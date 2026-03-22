import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects/login-page';
import { QuizPage } from '../page-objects/quiz-page';

const E2E_USERNAME: string = process.env['E2E_USERNAME'] || '';
const E2E_PASSWORD: string = process.env['E2E_PASSWORD'] || '';

test.describe('Quiz / Test mode', () => {
  let quizPage: QuizPage;

  test.beforeEach(async ({ page }) => {
    quizPage = new QuizPage(page);

    if (E2E_USERNAME && E2E_PASSWORD) {
      const loginPage: LoginPage = new LoginPage(page);
      await loginPage.navigateToLogin();
      await loginPage.login(E2E_USERNAME, E2E_PASSWORD);
    }
  });

  async function navigateToConfigAndStart(onlyMultipleChoice: boolean = false): Promise<void> {
    await quizPage.navigateToQuizList();
    await quizPage.expectSetCardsVisible();
    await quizPage.clickFirstAvailableTest();
    await quizPage.expectConfigPageVisible();

    if (onlyMultipleChoice) {
      await quizPage.uncheckQuestionType('written');
      await quizPage.uncheckQuestionType('true-false');
    }

    await quizPage.startQuiz();
    await quizPage.expectQuestionVisible();
  }

  async function completeQuizAndExpectResults(): Promise<void> {
    await quizPage.completeAllQuestions();
    await quizPage.expectResultsVisible();
  }

  test('should display quiz list with available sets', async () => {
    await quizPage.navigateToQuizList();
    await quizPage.expectSetCardsVisible();

    const count: number = await quizPage.getSetCardCount();
    expect(count).toBeGreaterThan(0);
  });

  test('should navigate to quiz config from quiz list', async () => {
    await quizPage.navigateToQuizList();
    await quizPage.expectSetCardsVisible();
    await quizPage.clickFirstAvailableTest();
    await quizPage.expectConfigPageVisible();
  });

  test('should start quiz and display first question', async () => {
    await navigateToConfigAndStart(true);

    const progressText: string = await quizPage.getProgressText();
    expect(progressText).toContain('1');
  });

  test('should complete quiz and show results with ring and counts', async () => {
    test.setTimeout(120000);

    await navigateToConfigAndStart(true);
    await completeQuizAndExpectResults();

    await quizPage.expectRingVisible();

    const gradeText: string = await quizPage.getGradeText();
    expect(gradeText.trim().length).toBeGreaterThan(0);

    const correctCount: string = await quizPage.getCorrectCount();
    const incorrectCount: string = await quizPage.getIncorrectCount();
    expect(Number(correctCount) + Number(incorrectCount)).toBeGreaterThan(0);
  });

  test('should show all answers expanded by default in results', async () => {
    test.setTimeout(120000);

    await navigateToConfigAndStart(true);
    await completeQuizAndExpectResults();

    const answerCount: number = await quizPage.getAnswerItemCount();
    expect(answerCount).toBeGreaterThan(0);
  });

  test('should star answers and show retry starred option', async () => {
    test.setTimeout(120000);

    await navigateToConfigAndStart(true);
    await completeQuizAndExpectResults();

    await quizPage.starAnswer(0);
    await quizPage.expectRetryStarredVisible();
  });

  test('should retry full quiz from results', async () => {
    test.setTimeout(120000);

    await navigateToConfigAndStart(true);
    await completeQuizAndExpectResults();

    await quizPage.clickRetry();
    await quizPage.expectQuestionVisible();
  });

  test('should go back to set from results', async ({ page }) => {
    test.setTimeout(120000);

    await navigateToConfigAndStart(true);
    await completeQuizAndExpectResults();

    await quizPage.clickGoBackFromResults();
    await page.waitForURL('**/sets/**', { timeout: 10000 });
    expect(page.url()).toContain('/sets/');
  });
});
