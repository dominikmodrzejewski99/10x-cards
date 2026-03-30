import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects/login-page';
import { SetsPage } from '../page-objects/sets-page';
import { environment } from '../../../src/environments/environments';

const E2E_USERNAME: string = environment.E2E_USERNAME;
const E2E_PASSWORD: string = environment.E2E_PASSWORD;

const SOURCE_TEXT: string = `Protokół TCP/IP to zestaw protokołów komunikacyjnych używanych w sieciach komputerowych.
TCP (Transmission Control Protocol) zapewnia niezawodne, uporządkowane dostarczanie strumienia bajtów
między aplikacjami uruchomionymi na hostach komunikujących się przez sieć IP. IP (Internet Protocol)
odpowiada za adresowanie i routing pakietów danych między sieciami. Model TCP/IP składa się z czterech warstw:
warstwa dostępu do sieci, warstwa internetowa, warstwa transportowa i warstwa aplikacji.

HTTP (Hypertext Transfer Protocol) to protokół warstwy aplikacji służący do przesyłania dokumentów
hipertekstowych, takich jak strony HTML. Został zaprojektowany do komunikacji między przeglądarkami
internetowymi a serwerami WWW. HTTPS to bezpieczna wersja HTTP, która używa szyfrowania TLS/SSL.

DNS (Domain Name System) to hierarchiczny system nazw domenowych, który tłumaczy nazwy domen
czytelne dla ludzi na adresy IP zrozumiałe dla komputerów. Serwery DNS działają jak książka telefoniczna
internetu, umożliwiając użytkownikom dostęp do stron internetowych za pomocą łatwych do zapamiętania nazw
zamiast numerycznych adresów IP.

DHCP (Dynamic Host Configuration Protocol) to protokół sieciowy umożliwiający automatyczne przydzielanie
adresów IP i innych parametrów konfiguracji sieci urządzeniom podłączonym do sieci. Dzięki DHCP administrator
nie musi ręcznie konfigurować każdego urządzenia w sieci.`;

/**
 * Test generowania fiszek przez AI:
 *   1. Logowanie
 *   2. Wklejenie tekstu zrodlowego
 *   3. Generowanie fiszek
 *   4. Akceptacja czesci, odrzucenie reszty
 *   5. Utworzenie nowego zestawu
 *   6. Zapisanie zaakceptowanych fiszek
 *   7. Weryfikacja ze fiszki sa w zestawie
 *   8. Sprzatanie
 */
test.describe('AI flashcard generation', () => {
  const SET_NAME: string = `E2E AI Gen ${Date.now()}`;

  test('should generate flashcards, accept some, reject rest, and save to new set', async ({ page }) => {
    test.setTimeout(60000);

    // Logowanie
    const loginPage: LoginPage = new LoginPage(page);
    await loginPage.navigateToLogin();
    await loginPage.login(E2E_USERNAME, E2E_PASSWORD);

    // ── 1. Wklejenie tekstu ──
    console.log('1. Wklejanie tekstu zrodlowego');
    await page.goto('/generate', { waitUntil: 'networkidle', timeout: 30000 });
    const textarea = page.locator('[data-test-id="source-text-input"]');
    await textarea.waitFor({ state: 'visible', timeout: 15000 });
    await textarea.fill(SOURCE_TEXT);
    console.log(`   Tekst wklejony (${SOURCE_TEXT.length} znakow)`);

    // ── 2. Generowanie ──
    console.log('2. Klikanie Generuj');
    const generateBtn = page.locator('[data-test-id="generate-flashcards-button"]');
    await expect(generateBtn).toBeEnabled({ timeout: 5000 });
    await generateBtn.click();

    // Czekamy na zaladowanie — loading indicator pojawi sie i zniknie
    console.log('   Czekanie na wygenerowanie...');
    const loadingIndicator = page.locator('[data-test-id="loading-indicator"]');
    await loadingIndicator.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {
      console.log('   Loading indicator nie pojawil sie — moze generowanie bylo szybkie');
    });
    // Czekamy az loading zniknie lub pojawi sie pierwsza propozycja
    await page.locator('[data-test-id="flashcard-proposal-0"]').waitFor({ state: 'visible', timeout: 120000 });
    console.log('   Fiszki wygenerowane');

    // ── 3. Liczenie propozycji ──
    const proposalCount: number = await page.locator('[data-test-id^="flashcard-proposal-"]').count();
    console.log(`   Wygenerowano ${proposalCount} propozycji`);
    expect(proposalCount).toBeGreaterThan(0);

    // ── 4. Akceptacja polowy, odrzucenie reszty ──
    const acceptCount: number = Math.ceil(proposalCount / 2);
    const rejectCount: number = proposalCount - acceptCount;

    console.log(`3. Akceptuje ${acceptCount}, odrzucam ${rejectCount}`);

    // Akceptujemy pierwsza polowe
    for (let i = 0; i < acceptCount; i++) {
      await page.locator(`[data-test-id="accept-flashcard-button-${i}"]`).click();
      await page.waitForTimeout(200);
    }

    // Odrzucamy reszte
    for (let i = acceptCount; i < proposalCount; i++) {
      await page.locator(`[data-test-id="reject-flashcard-button-${i}"]`).click();
      await page.waitForTimeout(200);
    }

    // Weryfikacja statystyk
    const acceptedStat = page.locator('.gen__stat--accepted');
    await expect(acceptedStat).toContainText(`${acceptCount}`);
    console.log(`   Zaakceptowano: ${acceptCount}`);

    // ── 5. Utworzenie nowego zestawu ──
    console.log('4. Tworzenie nowego zestawu:', SET_NAME);
    const newSetInput = page.locator('.gen__set-input');
    await newSetInput.fill(SET_NAME);
    await page.locator('.gen__btn--small').filter({ hasText: 'Utwórz' }).click();

    // Czekamy az zestaw zostanie utworzony (select powinien sie zmienic)
    await page.waitForTimeout(2000);
    console.log('   Zestaw utworzony');

    // ── 6. Zapisanie fiszek ──
    console.log('5. Zapisywanie fiszek');
    const saveBtn = page.locator('[data-test-id="save-all-flashcards-button"]');
    await expect(saveBtn).toBeEnabled({ timeout: 5000 });
    await saveBtn.click();

    // Czekamy na toast sukcesu
    const successToast = page.locator('.p-toast-message-success, .p-toast-message-info');
    await successToast.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {
      console.log('   Toast nie pojawil sie — sprawdzamy czy propozycje zniknely');
    });
    console.log('   Fiszki zapisane');

    // ── 7. Weryfikacja — przechodzimy do zestawu i sprawdzamy fiszki ──
    console.log('6. Weryfikacja fiszek w zestawie');
    const setsPage: SetsPage = new SetsPage(page);
    await setsPage.navigateToSets();
    await setsPage.expectSetVisible(SET_NAME);
    console.log('   Zestaw widoczny na liscie');

    // Wchodzimy w zestaw
    await setsPage.clickSet(SET_NAME);
    await page.getByTestId('flashcards-title').waitFor({ state: 'visible', timeout: 15000 });

    // Sprawdzamy ilosc fiszek
    await page.waitForTimeout(1000);
    const cardCount: number = await page.locator('.fc-table__card').count();
    console.log(`   Fiszki w zestawie: ${cardCount}`);
    expect(cardCount).toBe(acceptCount);

    // ── 8. Sprzatanie ──
    console.log('7. Sprzatanie — usuwanie zestawu');
    await setsPage.navigateToSets();
    await setsPage.deleteSet(SET_NAME);
    await setsPage.expectSetNotVisible(SET_NAME);
    console.log('   Zestaw usuniety');

    console.log('Test AI generation zakonczony sukcesem!');
  });
});
