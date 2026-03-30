import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';

export class SetsPage extends BasePage {
  private readonly createSetButton: Locator;
  private readonly setCards: Locator;
  private readonly dialogNameInput: Locator;
  private readonly dialogSaveButton: Locator;
  private readonly dialogCancelButton: Locator;
  private readonly emptyState: Locator;

  constructor(page: Page) {
    super(page);

    this.createSetButton = page.locator('button').filter({ hasText: 'Nowy zestaw' });
    this.setCards = page.locator('.set-card');
    this.dialogNameInput = page.locator('#setName');
    this.dialogSaveButton = page.locator('.set-form__actions button.sets__btn--create');
    this.dialogCancelButton = page.locator('button').filter({ hasText: 'Anuluj' });
    this.emptyState = page.locator('.sets__empty');
  }

  async navigateToSets(): Promise<void> {
    await this.navigateTo('/sets');
  }

  async createSet(name: string): Promise<void> {
    await this.createSetButton.click();
    await this.dialogNameInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.dialogNameInput.fill(name);
    await this.dialogSaveButton.click();
    // Czekamy na zamkniecie dialogu
    await this.dialogNameInput.waitFor({ state: 'hidden', timeout: 10000 });
  }

  async editSet(name: string, newName: string): Promise<void> {
    const card: Locator = this.setCards.filter({ hasText: name });
    await card.locator('button[title="Edytuj"]').click();
    await this.dialogNameInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.dialogNameInput.clear();
    await this.dialogNameInput.fill(newName);
    await this.dialogSaveButton.click();
    await this.dialogNameInput.waitFor({ state: 'hidden', timeout: 10000 });
  }

  async deleteSet(name: string): Promise<void> {
    const card: Locator = this.setCards.filter({ hasText: name });
    await card.locator('button[title="Usu\u0144"]').click();
    // Potwierdzenie w p-confirmDialog
    const confirmButton: Locator = this.page.locator('.p-confirmdialog-accept-button, .p-confirm-dialog-accept');
    await confirmButton.waitFor({ state: 'visible', timeout: 10000 });
    await confirmButton.click();
    // Czekamy na znikniecie dialogu
    await this.page.waitForTimeout(1000);
  }

  async getSetCards(): Promise<Locator> {
    return this.setCards;
  }

  async getSetCardCount(): Promise<number> {
    return this.setCards.count();
  }

  async expectSetVisible(name: string): Promise<void> {
    await expect(this.setCards.filter({ hasText: name })).toBeVisible({ timeout: 10000 });
  }

  async expectSetNotVisible(name: string): Promise<void> {
    await expect(this.setCards.filter({ hasText: name })).toHaveCount(0, { timeout: 10000 });
  }

  async clickSet(name: string): Promise<void> {
    const card: Locator = this.setCards.filter({ hasText: name });
    await card.locator('.set-card__name').click();
    // Czekamy na nawigacje do /sets/:id
    await this.page.waitForURL(/\/sets\//, { timeout: 15000 });
  }
}
