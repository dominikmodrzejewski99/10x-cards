import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects/login-page';
import { GeneratePage } from '../page-objects/generate-page';
import { environment } from '../../../src/environments/environments.test';

// Dodajemy dodatkowe logowanie dla lepszego debugowania
test.beforeAll(async () => {
  console.log('Test rozpoczęty');
  console.log('Dostępne zmienne środowiskowe:', Object.keys(environment));
  console.log('Dane testowe:', {
    username: environment.E2E_USERNAME,
    password: environment.E2E_PASSWORD ? '***' : 'brak hasła'
  });
});

test.afterAll(async () => {
  console.log('Test zakończony');
});

/**
 * Test scenariusza generowania i zarządzania fiszkami
 *
 * Scenariusz:
 * 1. Zaloguj się używając danych z environments
 * 2. Wklej tekst o Polsce (1000-10000 znaków)
 * 3. Poczekaj na wygenerowanie fiszek
 * 4. Połowę fiszek zaakceptuj, połowę odrzuć
 * 5. Zapisz fiszki
 */
test('Scenariusz generowania i zarządzania fiszkami', async ({ page }) => {
  // Zwiększamy timeout dla całego testu
  test.setTimeout(300000); // 5 minut

  try {
    // Inicjalizacja klas POM
    const loginPage = new LoginPage(page);
    const generatePage = new GeneratePage(page);

  // Tekst o Polsce (1000-10000 znaków)
  const polandText = `Polska, oficjalnie Rzeczpospolita Polska – państwo unitarne w Europie Środkowej,
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
  na wolnorynkową w latach 90. XX wieku, Polska doświadczyła znacznego wzrostu gospodarczego. Główne sektory gospodarki to usługi, przemysł i rolnictwo.
  Polska jest również ważnym producentem węgla, miedzi, srebra i innych surowców mineralnych.

  Kultura polska ma bogate tradycje w literaturze, muzyce, sztuce i nauce. Wśród najwybitniejszych Polaków można wymienić Mikołaja Kopernika,
  Fryderyka Chopina, Marię Skłodowską-Curie, Czesława Miłosza, Wisławę Szymborską czy Jana Pawła II. Polska kuchnia słynie z pierogów,
  bigosu, żurku i innych tradycyjnych potraw.

  Polska jest republiką parlamentarną z systemem wielopartyjnym. Głową państwa jest prezydent, a szefem rządu premier.
  Władza ustawodawcza należy do dwuizbowego parlamentu składającego się z Sejmu i Senatu.

  Polska jest członkiem wielu organizacji międzynarodowych, w tym Unii Europejskiej, NATO, ONZ, OECD i Grupy Wyszehradzkiej.
  Kraj aktywnie uczestniczy w polityce międzynarodowej, promując demokrację, prawa człowieka i współpracę gospodarczą.

  Polska ma bogatą tradycję edukacyjną, z jednym z najstarszych uniwersytetów w Europie - Uniwersytetem Jagiellońskim w Krakowie,
  założonym w 1364 roku. System edukacji w Polsce obejmuje edukację przedszkolną, podstawową, średnią i wyższą, z obowiązkową nauką do 18 roku życia.

  Sport w Polsce cieszy się dużą popularnością, z piłką nożną, siatkówką, lekkoatletyką i skokami narciarskimi jako najbardziej popularnymi dyscyplinami.
  Polscy sportowcy odnoszą sukcesy na arenie międzynarodowej, zdobywając medale olimpijskie i mistrzostw świata.

  Polska jest krajem o bogatej różnorodności przyrodniczej, z 23 parkami narodowymi i licznymi obszarami chronionymi.
  Puszcza Białowieska, jeden z ostatnich i największych fragmentów pierwotnego lasu nizinnego w Europie, została wpisana na Listę Światowego Dziedzictwa UNESCO.`;

  // Krok 1: Logowanie
  console.log('Krok 1: Logowanie');

  // Sprawdzamy, jakie zmienne środowiskowe są dostępne
  console.log('Dostępne zmienne środowiskowe:', Object.keys(environment));

  // Używamy danych logowania z pliku środowiskowego dla testów E2E
  const username = environment.E2E_USERNAME;
  const password = environment.E2E_PASSWORD;

  console.log('Używam danych logowania z pliku środowiskowego dla testów E2E:');
  console.log('- Username:', username);
  console.log('- Password:', password ? '***' : 'brak hasła');

  // Sprawdzamy, czy dane logowania są dostępne
  if (!username || !password) {
    console.log('UWAGA: Brak danych logowania w pliku środowiskowym. Używam wartości domyślnych.');
  }

  console.log('Używam danych logowania z pliku środowiskowego dla testów E2E');

  console.log('Dane logowania:', {
    username: username,
    password: password ? '***' : 'brak hasła'
  });

  // Nawigujemy do strony logowania
  await loginPage.navigateToLogin();

  // Logujemy się
  await loginPage.login(username, password);

  // Krok 2: Wklejanie tekstu
  console.log('Krok 2: Wklejanie tekstu o Polsce');
  await generatePage.pasteSourceText(polandText);

  // Krok 3: Generowanie fiszek
  console.log('Krok 3: Generowanie fiszek');
  await generatePage.clickGenerateButton();
  await generatePage.waitForFlashcardsGeneration();

  // Sprawdzenie, czy fiszki zostały wygenerowane
  const flashcardCount = await generatePage.getFlashcardCount();
  console.log(`Wygenerowano ${flashcardCount} fiszek`);
  expect(flashcardCount).toBeGreaterThan(0);

  // Krok 4: Akceptacja/odrzucenie fiszek
  console.log('Krok 4: Akceptacja/odrzucenie fiszek');
  await generatePage.acceptHalfRejectHalf();

  // Krok 5: Zapisywanie fiszek
  console.log('Krok 5: Zapisywanie fiszek');
  await generatePage.saveAllFlashcards();

  // Dodatkowa weryfikacja - można dodać sprawdzenie, czy fiszki zostały zapisane
  // Na przykład, można sprawdzić, czy pojawił się komunikat o sukcesie
  // lub przejść do strony z listą fiszek i sprawdzić, czy są tam nowe fiszki

  console.log('Test zakończony sukcesem!');
  } catch (error) {
    console.error('Błąd podczas wykonywania testu:', error);

    // Zrzut ekranu w przypadku błędu
    await page.screenshot({ path: 'test-error.png', fullPage: true });

    // Rzucamy błąd, aby test zakończył się niepowodzeniem
    throw error;
  }
});
