import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';

export class GeneratePage extends BasePage {
  private readonly sourceInput: Locator;
  private readonly generateButton: Locator;
  private readonly loadingIndicator: Locator;
  private readonly proposals: Locator;
  private readonly saveButton: Locator;

  constructor(page: Page) {
    super(page);

    this.sourceInput = page.locator('[data-test-id="source-text-input"]');
    this.generateButton = page.locator('[data-test-id="generate-flashcards-button"]');
    this.loadingIndicator = page.locator('[data-test-id="loading-indicator"]');
    this.proposals = page.locator('[data-test-id^="flashcard-proposal-"]');
    this.saveButton = page.locator('[data-test-id="save-all-flashcards-button"]');
  }

  async navigateToGenerate(): Promise<void> {
    await this.navigateTo('/generate');
  }

  async pasteSourceText(text: string): Promise<void> {
    // Jesli nie jestesmy na /generate, nawigujemy
    if (!this.page.url().includes('/generate')) {
      await this.navigateToGenerate();
    }
    await this.sourceInput.waitFor({ state: 'visible', timeout: 15000 });
    await this.sourceInput.fill(text);
  }

  async clickGenerateButton(): Promise<void> {
    await expect(this.generateButton).toBeEnabled({ timeout: 5000 });
    await this.generateButton.click();
  }

  async waitForFlashcardsGeneration(): Promise<void> {
    console.log('Czekanie na loading indicator...');
    await this.loadingIndicator.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {
      console.log('Loading indicator nie pojawil sie — generowanie moglo byc szybkie');
    });

    console.log('Czekanie na pierwsza propozycje...');
    await this.page.locator('[data-test-id="flashcard-proposal-0"]').waitFor({ state: 'visible', timeout: 60000 });
    console.log('Propozycje wygenerowane');
  }

  async getFlashcardCount(): Promise<number> {
    return this.proposals.count();
  }

  async acceptFlashcard(index: number): Promise<void> {
    await this.page.locator(`[data-test-id="accept-flashcard-button-${index}"]`).click();
    await this.page.waitForTimeout(200);
  }

  async rejectFlashcard(index: number): Promise<void> {
    await this.page.locator(`[data-test-id="reject-flashcard-button-${index}"]`).click();
    await this.page.waitForTimeout(200);
  }

  async acceptHalfRejectHalf(): Promise<void> {
    const count: number = await this.getFlashcardCount();
    const halfCount: number = Math.ceil(count / 2);

    for (let i = 0; i < halfCount; i++) {
      await this.acceptFlashcard(i);
    }

    for (let i = halfCount; i < count; i++) {
      await this.rejectFlashcard(i);
    }
  }

  async saveAllFlashcards(): Promise<void> {
    await expect(this.saveButton).toBeEnabled({ timeout: 5000 });
    await this.saveButton.click();
    await this.page.waitForTimeout(2000);
  }
}
