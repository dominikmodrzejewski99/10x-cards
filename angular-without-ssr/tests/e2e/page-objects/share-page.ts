import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';

export class SharePage extends BasePage {
  // Locators for share functionality on the set list page
  private readonly setCards: Locator;

  // Locators for share functionality on the flashcard list page
  private readonly shareButton: Locator;
  private readonly shareDialog: Locator;
  private readonly shareLinkInput: Locator;
  private readonly copyLinkButton: Locator;

  // Locators for share-accept page
  private readonly loadingSpinner: Locator;
  private readonly errorMessage: Locator;
  private readonly dashboardButton: Locator;

  constructor(page: Page) {
    super(page);
    this.setCards = page.locator('.set-card');
    this.shareButton = page.locator('[data-test-id="share-button"]');
    this.shareDialog = page.locator('p-dialog').filter({ hasText: 'Udostępnij zestaw' });
    this.shareLinkInput = page.locator('.flist__share-input');
    this.copyLinkButton = page.locator('.flist__share-link-row p-button');
    this.loadingSpinner = page.locator('.share-accept p-progressSpinner, .share-accept p-progressspinner');
    this.errorMessage = page.locator('.share-accept--error');
    this.dashboardButton = page.locator('p-button').filter({ hasText: 'Przejdź do panelu' });
  }

  // Share from flashcard list view
  async openShareDialog(): Promise<void> {
    await this.shareButton.click();
    await this.shareDialog.waitFor({ state: 'visible', timeout: 10000 });
  }

  async getShareLink(): Promise<string> {
    await this.shareLinkInput.waitFor({ state: 'visible', timeout: 10000 });
    const value = await this.shareLinkInput.inputValue();
    return value;
  }

  async expectShareDialogVisible(): Promise<void> {
    await expect(this.shareDialog).toBeVisible({ timeout: 10000 });
  }

  async expectShareLinkGenerated(): Promise<void> {
    await expect(this.shareLinkInput).toBeVisible({ timeout: 10000 });
    const value = await this.shareLinkInput.inputValue();
    expect(value).toContain('/share/');
  }

  // Share from set list view
  async shareSetFromList(setName: string): Promise<void> {
    const card = this.setCards.filter({ hasText: setName });
    await card.locator('button[title="Udostępnij"]').click();
  }

  // Navigate to share link
  async navigateToShareLink(shareUrl: string): Promise<void> {
    await this.page.goto(shareUrl, { timeout: 30000 });
  }

  // Error state assertions
  async expectError(text: string): Promise<void> {
    await expect(this.errorMessage).toBeVisible({ timeout: 10000 });
    await expect(this.errorMessage).toContainText(text);
  }

  async goToDashboard(): Promise<void> {
    await this.dashboardButton.click();
  }
}
