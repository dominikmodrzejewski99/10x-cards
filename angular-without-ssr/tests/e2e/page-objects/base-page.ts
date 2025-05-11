import { Page } from '@playwright/test';

export class BasePage {
  constructor(protected page: Page) {}

  async navigateTo(path: string) {
    console.log(`Nawigacja do: ${path}`);
    const url = path.startsWith('/') ? path : `/${path}`;
    console.log(`Nawigacja do URL: ${url}`);
    await this.page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    console.log(`Aktualny URL po nawigacji: ${this.page.url()}`);

    // Dodajemy oczekiwanie na załadowanie strony
    await this.page.waitForLoadState('networkidle');
  }

  async waitForLoadingToDisappear() {
    try {
      // Najpierw sprawdzamy, czy wskaźnik ładowania jest widoczny
      const isLoadingVisible = await this.page.isVisible('[data-test-id="loading-indicator"]');
      console.log(`Wskaźnik ładowania widoczny: ${isLoadingVisible}`);

      if (isLoadingVisible) {
        // Jeśli jest widoczny, czekamy aż zniknie
        await this.page.waitForSelector('[data-test-id="loading-indicator"]', { state: 'detached', timeout: 60000 });
        console.log('Wskaźnik ładowania zniknął');
      } else {
        console.log('Wskaźnik ładowania nie był widoczny, pomijamy oczekiwanie');
      }
    } catch (error) {
      console.log('Błąd podczas oczekiwania na zniknięcie wskaźnika ładowania:', error.message);
      // Dodajemy zrzut ekranu dla diagnostyki
      await this.page.screenshot({ path: 'loading-indicator-error.png' });
    }
  }
}
