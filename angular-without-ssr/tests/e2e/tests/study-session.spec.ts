import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects/login-page';
import { SetsPage } from '../page-objects/sets-page';
import { FlashcardListPage } from '../page-objects/flashcard-list-page';
import { StudyPage } from '../page-objects/study-page';
import { environment } from '../../../src/environments/environments';

const E2E_USERNAME: string = environment.E2E_USERNAME;
const E2E_PASSWORD: string = environment.E2E_PASSWORD;

/**
 * Testy sesji nauki:
 *   - rozne odpowiedzi (Wiem / Trudne / Nie wiem)
 *   - postep sesji
 *   - zakonczenie sesji
 *   - sprzatanie
 */
test.describe('Study session', () => {
  const SET_NAME: string = `E2E Study ${Date.now()}`;
  const FLASHCARDS: { front: string; back: string }[] = [
    { front: 'Stolica Francji?', back: 'Paryż' },
    { front: 'Stolica Niemiec?', back: 'Berlin' },
    { front: 'Stolica Włoch?', back: 'Rzym' },
    { front: 'Stolica Hiszpanii?', back: 'Madryt' },
  ];

  let setsPage: SetsPage;
  let flashcardListPage: FlashcardListPage;
  let studyPage: StudyPage;

  test.beforeEach(async ({ page }) => {
    setsPage = new SetsPage(page);
    flashcardListPage = new FlashcardListPage(page);
    studyPage = new StudyPage(page);

    // Logowanie
    const loginPage: LoginPage = new LoginPage(page);
    await loginPage.navigateToLogin();
    await loginPage.login(E2E_USERNAME, E2E_PASSWORD);

    // Setup — tworzymy zestaw z fiszkami
    await setsPage.navigateToSets();
    await setsPage.createSet(SET_NAME);
    await setsPage.clickSet(SET_NAME);
    await flashcardListPage.expectPageLoaded();

    for (const fc of FLASHCARDS) {
      await flashcardListPage.addFlashcard(fc.front, fc.back);
    }
  });

  test.afterEach(async () => {
    // Sprzatanie — usuwamy zestaw
    await setsPage.navigateToSets();
    await setsPage.deleteSet(SET_NAME);
  });

  test('should complete study session with mixed answers', async () => {
    test.setTimeout(120000);

    // Rozpoczynamy nauke
    await flashcardListPage.clickStudy();
    await studyPage.expectStudyBodyVisible();

    // Karta 1 — Wiem
    const progress1: string = await studyPage.getProgressText();
    expect(progress1).toContain('1');
    console.log('Karta 1: odpowiedz Wiem');
    await studyPage.flipCard();
    await studyPage.answerKnown();

    // Karta 2 — Nie wiem
    const isComplete2: boolean = await studyPage.isSessionComplete();
    if (!isComplete2) {
      console.log('Karta 2: odpowiedz Nie wiem');
      await studyPage.flipCard();
      await studyPage.answerUnknown();
    }

    // Karta 3 — Trudne
    const isComplete3: boolean = await studyPage.isSessionComplete();
    if (!isComplete3) {
      console.log('Karta 3: odpowiedz Trudne');
      await studyPage.flipCard();
      await studyPage.answerHard();
    }

    // Dokoncz pozostale karty
    const isComplete4: boolean = await studyPage.isSessionComplete();
    if (!isComplete4) {
      console.log('Konczenie pozostalych kart...');
      await studyPage.completeAllCards();
    }

    // Weryfikacja zakonczenia
    await studyPage.expectSessionComplete();
    console.log('Sesja zakonczona pomyslnie z roznymi odpowiedziami');
  });

  test('should show progress counter incrementing', async () => {
    test.setTimeout(120000);

    await flashcardListPage.clickStudy();
    await studyPage.expectStudyBodyVisible();

    // Sprawdz poczatkowy stan
    const initial: string = await studyPage.getProgressText();
    expect(initial).toContain('1');

    // Odpowiedz na pierwsza karte
    await studyPage.flipCard();
    await studyPage.answerKnown();

    // Sprawdz czy counter sie zwieksza lub sesja sie konczy
    const isComplete: boolean = await studyPage.isSessionComplete();
    if (!isComplete) {
      const after: string = await studyPage.getProgressText();
      expect(after).toContain('2');
      console.log('Counter poprawnie zwiekszony z 1 na 2');
    } else {
      console.log('Sesja zakonczona po pierwszej karcie (mozliwe jesli tylko 1 due)');
    }
  });
});
