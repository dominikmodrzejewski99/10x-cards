import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';

export class StudyPage extends BasePage {
  private readonly flashcard: Locator;
  private readonly flipButton: Locator;
  private readonly knownButton: Locator;
  private readonly hardButton: Locator;
  private readonly unknownButton: Locator;
  private readonly counter: Locator;
  private readonly sessionComplete: Locator;
  private readonly progressBar: Locator;
  private readonly studyTitle: Locator;
  private readonly restartButton: Locator;
  private readonly emptyState: Locator;

  constructor(page: Page) {
    super(page);

    this.flashcard = page.locator('.flip-card');
    this.flipButton = page.locator('.study__ctrl--flip');
    this.knownButton = page.locator('.study__ctrl--right');
    this.hardButton = page.locator('.study__ctrl--hard');
    this.unknownButton = page.locator('.study__ctrl--wrong');
    this.counter = page.locator('.study__counter');
    this.sessionComplete = page.locator('.study__state--complete');
    this.progressBar = page.locator('.study__progress-bar');
    this.studyTitle = page.locator('.study__title');
    this.restartButton = page.locator('button').filter({ hasText: 'Powtórz wszystkie' });
    this.emptyState = page.locator('.study__state');
  }

  async navigateToStudy(): Promise<void> {
    await this.navigateTo('/study');
  }

  async expectStudyBodyVisible(): Promise<void> {
    await expect(this.studyTitle).toBeVisible({ timeout: 15000 });
  }

  async flipCard(): Promise<void> {
    // Klikamy kartę lub przycisk flip
    const isFlipButtonVisible: boolean = await this.flipButton.isVisible().catch(() => false);
    if (isFlipButtonVisible) {
      await this.flipButton.click();
    } else {
      await this.flashcard.click();
    }
    // Czekamy na pojawienie się przycisków odpowiedzi
    await this.knownButton.waitFor({ state: 'visible', timeout: 5000 });
  }

  async answerKnown(): Promise<void> {
    await this.knownButton.click();
    // Czekamy na załadowanie następnej karty
    await this.page.waitForTimeout(300);
  }

  async answerHard(): Promise<void> {
    await this.hardButton.click();
    await this.page.waitForTimeout(300);
  }

  async answerUnknown(): Promise<void> {
    await this.unknownButton.click();
    await this.page.waitForTimeout(300);
  }

  async getProgressText(): Promise<string> {
    return (await this.counter.textContent()) || '';
  }

  async isSessionComplete(): Promise<boolean> {
    return this.sessionComplete.isVisible().catch(() => false);
  }

  async expectSessionComplete(): Promise<void> {
    await expect(this.sessionComplete).toBeVisible({ timeout: 15000 });
  }

  async completeAllCards(): Promise<void> {
    let isStudyBody: boolean = await this.studyTitle.isVisible().catch(() => false);
    while (isStudyBody) {
      await this.flipCard();
      await this.answerKnown();
      await this.page.waitForTimeout(300);
      isStudyBody = await this.studyTitle.isVisible().catch(() => false);
    }
  }

  async restartSession(): Promise<void> {
    await this.restartButton.click();
    await this.page.waitForTimeout(500);
  }
}
