import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';

export class FriendsPage extends BasePage {
  private readonly title: Locator;
  private readonly emailInput: Locator;
  private readonly sendButton: Locator;
  private readonly pendingSection: Locator;
  private readonly friendCards: Locator;
  private readonly emptyState: Locator;
  private readonly acceptButtons: Locator;
  private readonly rejectButtons: Locator;
  private readonly removeButtons: Locator;
  private readonly nudgeButtons: Locator;

  constructor(page: Page) {
    super(page);

    this.title = page.locator('.friends__title');
    this.emailInput = page.locator('.friends__add-input');
    this.sendButton = page.locator('.friends__add-btn');
    this.pendingSection = page.locator('.friends__card--pending');
    this.friendCards = page.locator('.friends__card:not(.friends__card--pending)');
    this.emptyState = page.locator('.friends__empty');
    this.acceptButtons = page.locator('.friends__btn--accept');
    this.rejectButtons = page.locator('.friends__btn--reject');
    this.removeButtons = page.locator('.friends__btn--remove');
    this.nudgeButtons = page.locator('.friends__btn--nudge');
  }

  async navigateToFriends(): Promise<void> {
    await this.navigateTo('/friends');
  }

  async expectPageLoaded(): Promise<void> {
    await expect(this.title).toBeVisible({ timeout: 15000 });
  }

  async sendFriendRequest(email: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.sendButton.click();
  }

  async getFriendCardCount(): Promise<number> {
    await this.page.waitForTimeout(500);
    return this.friendCards.count();
  }

  async getPendingRequestCount(): Promise<number> {
    return this.pendingSection.count();
  }

  async acceptFirstRequest(): Promise<void> {
    await this.acceptButtons.first().click();
  }

  async rejectFirstRequest(): Promise<void> {
    await this.rejectButtons.first().click();
  }

  async removeFirstFriend(): Promise<void> {
    await this.removeButtons.first().click();
  }

  async clickFirstFriend(): Promise<void> {
    await this.friendCards.first().locator('.friends__card-info').click();
  }

  async expectEmptyState(): Promise<void> {
    await expect(this.emptyState).toBeVisible({ timeout: 5000 });
  }

  async expectFriendStatsPage(): Promise<void> {
    await this.page.waitForURL('**/friends/**', { timeout: 10000 });
    await expect(this.page.locator('.fstats__title')).toBeVisible({ timeout: 10000 });
  }
}
