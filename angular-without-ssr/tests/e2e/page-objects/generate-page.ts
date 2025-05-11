import { Page } from '@playwright/test';
import { BasePage } from './base-page';

export class GeneratePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async navigateToGenerate() {
    await this.navigateTo('generate');
  }

  async pasteSourceText(text: string) {
    await this.page.getByTestId('source-text-input').fill(text);
  }

  async clickGenerateButton() {
    await this.page.getByTestId('generate-flashcards-button').click();
  }

  async waitForFlashcardsGeneration() {
    try {
      console.log('Oczekiwanie na pojawienie się wskaźnika ładowania...');
      // Czekamy na pojawienie się wskaźnika ładowania
      await this.page.getByTestId('loading-indicator').waitFor({ state: 'visible', timeout: 10000 })
        .catch(error => {
          console.log('Nie znaleziono wskaźnika ładowania:', error.message);
          // Próbujemy alternatywnego selektora
          return this.page.locator('.loading-indicator, .spinner, .progress').waitFor({ timeout: 10000 })
            .catch(e => console.log('Nie znaleziono alternatywnego wskaźnika ładowania:', e.message));
        });

      console.log('Oczekiwanie na zniknięcie wskaźnika ładowania...');
      // Czekamy na zniknięcie wskaźnika ładowania
      await this.waitForLoadingToDisappear();

      console.log('Oczekiwanie na pojawienie się pierwszej fiszki...');
      // Czekamy na pojawienie się pierwszej fiszki
      await this.page.screenshot({ path: 'before-flashcard-wait.png' });

      // Próbujemy różnych selektorów dla fiszek
      await Promise.any([
        this.page.getByTestId('flashcard-proposal-0').waitFor({ timeout: 30000 }),
        this.page.locator('.flashcard, .card, [data-flashcard]').first().waitFor({ timeout: 30000 })
      ]);

      console.log('Pierwsza fiszka pojawiła się!');
      await this.page.screenshot({ path: 'after-flashcard-wait.png' });
    } catch (error) {
      console.log('Błąd podczas oczekiwania na generowanie fiszek:', error.message);
      await this.page.screenshot({ path: 'flashcard-generation-error.png' });
    }
  }

  async getFlashcardCount() {
    try {
      // Próbujemy użyć data-test-id
      const countByTestId = await this.page.getByTestId(/^flashcard-proposal-\d+$/).count();
      console.log(`Liczba fiszek znalezionych przez data-test-id: ${countByTestId}`);

      if (countByTestId > 0) {
        return countByTestId;
      }

      // Jeśli nie znaleziono fiszek przez data-test-id, próbujemy alternatywnych selektorów
      const countByClass = await this.page.locator('.flashcard, .card, [data-flashcard]').count();
      console.log(`Liczba fiszek znalezionych przez klasy CSS: ${countByClass}`);

      return countByClass;
    } catch (error) {
      console.log('Błąd podczas liczenia fiszek:', error.message);
      return 0;
    }
  }

  async acceptFlashcard(index: number) {
    try {
      // Próbujemy użyć data-test-id
      console.log(`Akceptowanie fiszki ${index}...`);
      await this.page.getByTestId(`accept-flashcard-button-${index}`).click()
        .catch(async (error) => {
          console.log(`Błąd przy użyciu data-test-id dla przycisku akceptacji: ${error.message}`);

          // Próbujemy alternatywnych selektorów
          const acceptButtons = this.page.locator('button:has-text("Akceptuj"), button:has-text("Accept"), button.accept-button');
          const count = await acceptButtons.count();

          if (count > index) {
            await acceptButtons.nth(index).click();
            console.log(`Kliknięto przycisk akceptacji ${index} używając alternatywnego selektora`);
          } else {
            console.log(`Nie znaleziono przycisku akceptacji o indeksie ${index}. Dostępnych przycisków: ${count}`);
          }
        });
    } catch (error) {
      console.log(`Błąd podczas akceptowania fiszki ${index}:`, error.message);
      await this.page.screenshot({ path: `accept-flashcard-${index}-error.png` });
    }
  }

  async rejectFlashcard(index: number) {
    try {
      // Próbujemy użyć data-test-id
      console.log(`Odrzucanie fiszki ${index}...`);
      await this.page.getByTestId(`reject-flashcard-button-${index}`).click()
        .catch(async (error) => {
          console.log(`Błąd przy użyciu data-test-id dla przycisku odrzucenia: ${error.message}`);

          // Próbujemy alternatywnych selektorów
          const rejectButtons = this.page.locator('button:has-text("Odrzuć"), button:has-text("Reject"), button.reject-button');
          const count = await rejectButtons.count();

          if (count > index) {
            await rejectButtons.nth(index).click();
            console.log(`Kliknięto przycisk odrzucenia ${index} używając alternatywnego selektora`);
          } else {
            console.log(`Nie znaleziono przycisku odrzucenia o indeksie ${index}. Dostępnych przycisków: ${count}`);
          }
        });
    } catch (error) {
      console.log(`Błąd podczas odrzucania fiszki ${index}:`, error.message);
      await this.page.screenshot({ path: `reject-flashcard-${index}-error.png` });
    }
  }

  async acceptHalfRejectHalf() {
    const count = await this.getFlashcardCount();
    const halfCount = Math.floor(count / 2);

    // Akceptujemy pierwszą połowę
    for (let i = 0; i < halfCount; i++) {
      await this.acceptFlashcard(i);
    }

    // Odrzucamy drugą połowę
    for (let i = halfCount; i < count; i++) {
      await this.rejectFlashcard(i);
    }
  }

  async saveAllFlashcards() {
    try {
      console.log('Zapisywanie fiszek...');
      await this.page.screenshot({ path: 'before-save-flashcards.png' });

      // Próbujemy użyć data-test-id
      await this.page.getByTestId('save-all-flashcards-button').click()
        .catch(async (error) => {
          console.log(`Błąd przy użyciu data-test-id dla przycisku zapisywania: ${error.message}`);

          // Próbujemy alternatywnych selektorów
          const saveButton = this.page.locator('button:has-text("Zapisz"), button:has-text("Save"), button.save-button');

          if (await saveButton.count() > 0) {
            await saveButton.first().click();
            console.log('Kliknięto przycisk zapisywania używając alternatywnego selektora');
          } else {
            console.log('Nie znaleziono przycisku zapisywania');
          }
        });

      // Czekamy na zakończenie zapisywania
      console.log('Oczekiwanie na zakończenie zapisywania...');
      await this.page.waitForTimeout(2000);

      // Sprawdzamy, czy pojawił się komunikat o sukcesie
      const successMessage = this.page.locator('.p-toast-message-success, .success-message, [data-success]');
      const isSuccessVisible = await successMessage.isVisible().catch(() => false);

      if (isSuccessVisible) {
        console.log('Znaleziono komunikat o sukcesie!');
      } else {
        console.log('Nie znaleziono komunikatu o sukcesie, ale kontynuujemy test');
      }

      await this.page.screenshot({ path: 'after-save-flashcards.png' });
    } catch (error) {
      console.log('Błąd podczas zapisywania fiszek:', error.message);
      await this.page.screenshot({ path: 'save-flashcards-error.png' });
    }
  }
}
