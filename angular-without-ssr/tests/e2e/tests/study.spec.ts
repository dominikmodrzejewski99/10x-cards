import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects/login-page';
import { StudyPage } from '../page-objects/study-page';
import { environment } from '../../../src/environments/environments';

const E2E_USERNAME: string = environment.E2E_USERNAME;
const E2E_PASSWORD: string = environment.E2E_PASSWORD;

test.describe('Study flow', () => {
  let studyPage: StudyPage;

  test.beforeEach(async ({ page }) => {
    studyPage = new StudyPage(page);

    const loginPage: LoginPage = new LoginPage(page);
    await loginPage.navigateToLogin();
    await loginPage.login(E2E_USERNAME, E2E_PASSWORD);
  });

  test('should flip card, answer "Wiem", verify progress, and complete session', async ({ page }) => {
    test.setTimeout(180000);

    // Nawigujemy do strony nauki
    await studyPage.navigateToStudy();

    // Czekamy na załadowanie widoku nauki
    await studyPage.expectStudyBodyVisible();
    console.log('Widok nauki załadowany');

    // Sprawdzamy początkowy postęp
    const initialProgress: string = await studyPage.getProgressText();
    console.log('Początkowy postęp:', initialProgress);
    expect(initialProgress).toContain('1');

    // Odwracamy kartę
    console.log('Odwracanie karty...');
    await studyPage.flipCard();

    // Odpowiadamy "Wiem"
    console.log('Odpowiedź: Wiem');
    await studyPage.answerKnown();

    // Sprawdzamy, czy postęp się zmienił lub sesja się zakończyła
    const isComplete: boolean = await studyPage.isSessionComplete();
    if (isComplete) {
      console.log('Sesja zakończona po pierwszej karcie');
      await studyPage.expectSessionComplete();
    } else {
      const newProgress: string = await studyPage.getProgressText();
      console.log('Nowy postęp:', newProgress);
      expect(newProgress).toContain('2');
    }

    // Kończymy wszystkie pozostałe karty
    if (!isComplete) {
      console.log('Kończenie pozostałych kart...');
      await studyPage.completeAllCards();
    }

    // Weryfikujemy ekran zakończenia sesji
    await studyPage.expectSessionComplete();
    console.log('Sesja nauki zakończona pomyślnie');
  });
});
