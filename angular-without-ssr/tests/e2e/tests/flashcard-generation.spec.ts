import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects/login-page';
import { GeneratePage } from '../page-objects/generate-page';
import { environment } from '../../../src/environments/environments';

const E2E_USERNAME: string = environment.E2E_USERNAME;
const E2E_PASSWORD: string = environment.E2E_PASSWORD;

const POLAND_TEXT: string = `Polska, oficjalnie Rzeczpospolita Polska – państwo unitarne w Europie Środkowej,
położone między Morzem Bałtyckim na północy a Sudetami i Karpatami na południu,
w przeważającej części w dorzeczu Wisły i Odry. Powierzchnia Polski wynosi 312 696 km², co daje jej 69. miejsce na świecie i 9. w Europie.
Zamieszkana przez ponad 38 milionów ludzi, zajmuje pod względem liczby ludności 38. miejsce na świecie, a 5. w Unii Europejskiej.

Polska jest krajem o bogatej historii i kulturze. Jej początki sięgają X wieku, kiedy to Mieszko I, pierwszy historyczny władca Polski,
przyjął chrzest w 966 roku, co uznaje się za symboliczny początek państwa polskiego. W ciągu wieków Polska przechodziła przez różne okresy
świetności i upadku, od potęgi Rzeczypospolitej Obojga Narodów w XVI-XVII wieku, przez rozbiory w XVIII wieku, odzyskanie niepodległości w 1918 roku,
tragedię II wojny światowej, okres komunizmu, aż po transformację ustrojową po 1989 roku i wstąpienie do Unii Europejskiej w 2004 roku.

Geograficznie Polska jest krajem nizinnym, z górami na południu (Karpaty i Sudety) i wybrzeżem Morza Bałtyckiego na północy.
Klimat Polski jest umiarkowany, przejściowy między oceanicznym a kontynentalnym. Kraj posiada bogatą sieć rzeczną, z głównymi rzekami Wisłą i Odrą,
oraz liczne jeziora, szczególnie na północy w regionie Mazur, zwanym "Krainą Tysiąca Jezior".

Polska gospodarka jest jedną z najszybciej rozwijających się w Unii Europejskiej. Po transformacji z gospodarki centralnie planowanej
na wolnorynkową w latach 90. XX wieku, Polska doświadczyła znacznego wzrostu gospodarczego. Główne sektory gospodarki to usługi, przemysł i rolnictwo.`;

/**
 * Generowanie fiszek z tekstu:
 *   1. Logowanie
 *   2. Wklejenie tekstu
 *   3. Generowanie fiszek
 *   4. Akceptacja polowy, odrzucenie reszty
 *   5. Zapisanie fiszek
 */
test.describe('Flashcard generation', () => {
  test('should generate, accept half, reject half, and save', async ({ page }) => {
    test.setTimeout(120000);

    const loginPage: LoginPage = new LoginPage(page);
    const generatePage: GeneratePage = new GeneratePage(page);

    // Logowanie
    await loginPage.navigateToLogin();
    await loginPage.login(E2E_USERNAME, E2E_PASSWORD);

    // Wklejanie tekstu
    console.log('Wklejanie tekstu');
    await generatePage.pasteSourceText(POLAND_TEXT);

    // Generowanie
    console.log('Generowanie fiszek...');
    await generatePage.clickGenerateButton();
    await generatePage.waitForFlashcardsGeneration();

    // Sprawdzenie
    const flashcardCount: number = await generatePage.getFlashcardCount();
    console.log(`Wygenerowano ${flashcardCount} fiszek`);
    expect(flashcardCount).toBeGreaterThan(0);

    // Akceptacja/odrzucenie
    console.log('Akceptacja polowy, odrzucenie reszty');
    await generatePage.acceptHalfRejectHalf();

    // Zapisywanie
    console.log('Zapisywanie fiszek');
    await generatePage.saveAllFlashcards();

    console.log('Test zakonczony sukcesem');
  });
});
