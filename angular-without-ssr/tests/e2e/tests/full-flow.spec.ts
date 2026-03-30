import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects/login-page';
import { SetsPage } from '../page-objects/sets-page';
import { FlashcardListPage } from '../page-objects/flashcard-list-page';
import { StudyPage } from '../page-objects/study-page';
import { environment } from '../../../src/environments/environments';

const E2E_USERNAME: string = environment.E2E_USERNAME;
const E2E_PASSWORD: string = environment.E2E_PASSWORD;

/**
 * Pelny flow uzytkownika:
 *   1. Logowanie
 *   2. Stworzenie nowego zestawu
 *   3. Wejscie w zestaw
 *   4. Dodanie 3 fiszek recznie
 *   5. Rozpoczecie sesji nauki
 *   6. Odpowiedz na wszystkie fiszki
 *   7. Weryfikacja ekranu zakonczenia sesji
 *   8. Sprzatanie — usuniecie zestawu
 */
test.describe('Full user flow: create set → add flashcards → study → cleanup', () => {
  const SET_NAME: string = `E2E Full Flow ${Date.now()}`;

  const FLASHCARDS: { front: string; back: string }[] = [
    { front: 'Co to jest HTTP?', back: 'Protokół komunikacji w sieci WWW' },
    { front: 'Co to jest DNS?', back: 'System nazw domenowych — tłumaczy domeny na adresy IP' },
    { front: 'Co to jest TCP?', back: 'Protokół zapewniający niezawodne dostarczanie pakietów' },
  ];

  let setsPage: SetsPage;
  let flashcardListPage: FlashcardListPage;
  let studyPage: StudyPage;

  test.beforeEach(async ({ page }) => {
    setsPage = new SetsPage(page);
    flashcardListPage = new FlashcardListPage(page);
    studyPage = new StudyPage(page);

    const loginPage: LoginPage = new LoginPage(page);
    await loginPage.navigateToLogin();
    await loginPage.login(E2E_USERNAME, E2E_PASSWORD);
  });

  test('complete flow: set → flashcards → study → cleanup', async ({ page }) => {
    test.setTimeout(180000);

    // ── 1. Stworzenie zestawu ──
    console.log('1. Tworzenie zestawu:', SET_NAME);
    await setsPage.navigateToSets();
    await setsPage.createSet(SET_NAME);
    await setsPage.expectSetVisible(SET_NAME);
    console.log('   Zestaw utworzony');

    // ── 2. Wejscie w zestaw ──
    console.log('2. Wejscie w zestaw');
    await setsPage.clickSet(SET_NAME);
    await flashcardListPage.expectPageLoaded();
    const title: string = await flashcardListPage.getTitle();
    expect(title).toContain(SET_NAME);
    console.log('   Strona fiszek zaladowana:', title);

    // ── 3. Dodanie fiszek ──
    console.log('3. Dodawanie fiszek');
    for (const fc of FLASHCARDS) {
      console.log(`   Dodaje: "${fc.front}"`);
      await flashcardListPage.addFlashcard(fc.front, fc.back);
    }

    // Weryfikacja
    const count: number = await flashcardListPage.getFlashcardCount();
    console.log(`   Dodano ${count} fiszek`);
    expect(count).toBe(FLASHCARDS.length);
    await flashcardListPage.expectFlashcardVisible(FLASHCARDS[0].front);

    // ── 4. Rozpoczecie nauki ──
    console.log('4. Rozpoczecie sesji nauki');
    await flashcardListPage.clickStudy();

    // Czekamy na zaladowanie widoku nauki
    await studyPage.expectStudyBodyVisible();
    const progress: string = await studyPage.getProgressText();
    console.log('   Poczatkowy postep:', progress);
    expect(progress).toContain('1');

    // ── 5. Odpowiedz na wszystkie karty ──
    console.log('5. Odpowiadanie na karty');
    await studyPage.completeAllCards();

    // ── 6. Weryfikacja zakonczenia sesji ──
    console.log('6. Weryfikacja zakonczenia sesji');
    await studyPage.expectSessionComplete();
    console.log('   Sesja zakonczona pomyslnie');

    // ── 7. Sprzatanie — usuwamy zestaw ──
    console.log('7. Sprzatanie — usuwanie zestawu');
    await setsPage.navigateToSets();
    await setsPage.deleteSet(SET_NAME);
    await setsPage.expectSetNotVisible(SET_NAME);
    console.log('   Zestaw usuniety');

    console.log('Test zakonczony sukcesem!');
  });
});
