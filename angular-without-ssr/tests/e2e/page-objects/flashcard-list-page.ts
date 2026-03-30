import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';

export class FlashcardListPage extends BasePage {
  private readonly title: Locator;
  private readonly addButton: Locator;
  private readonly studyLink: Locator;
  private readonly flashcardForm: Locator;
  private readonly frontInput: Locator;
  private readonly backInput: Locator;
  private readonly formSaveButton: Locator;
  private readonly formCancelButton: Locator;
  private readonly tableRows: Locator;
  private readonly emptyState: Locator;

  constructor(page: Page) {
    super(page);

    this.title = page.getByTestId('flashcards-title');
    this.addButton = page.getByTestId('add-flashcard-button');
    this.studyLink = page.getByTestId('start-study-button');
    this.flashcardForm = page.getByTestId('flashcard-form');
    this.frontInput = page.getByTestId('front-input');
    this.backInput = page.getByTestId('back-input');
    this.formSaveButton = page.locator('[data-test-id="flashcard-form"] button[type="submit"]');
    this.formCancelButton = page.locator('[data-test-id="flashcard-form"] button[type="button"]').filter({ hasText: 'Anuluj' });
    this.tableRows = page.locator('.fc-table__card');
    this.emptyState = page.locator('.fc-table__empty');
  }

  async expectPageLoaded(): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout: 15000 });
    await expect(this.title).toBeVisible({ timeout: 15000 });
  }

  async addFlashcard(front: string, back: string): Promise<void> {
    await this.addButton.click();
    await this.flashcardForm.waitFor({ state: 'visible', timeout: 10000 });
    await this.frontInput.fill(front);
    await this.backInput.fill(back);
    await this.formSaveButton.click();
    await this.flashcardForm.waitFor({ state: 'hidden', timeout: 10000 });
  }

  async expectFlashcardVisible(text: string): Promise<void> {
    await expect(this.page.locator('.fc-table__card').filter({ hasText: text })).toBeVisible({ timeout: 10000 });
  }

  async getFlashcardCount(): Promise<number> {
    // Poczekaj az tabela sie zaladuje
    await this.page.waitForTimeout(500);
    return this.tableRows.count();
  }

  async clickStudy(): Promise<void> {
    await this.studyLink.click();
  }

  async getTitle(): Promise<string> {
    return (await this.title.textContent()) || '';
  }
}
