import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';

export class PrintTestPage extends BasePage {
  private readonly moreMenuButton: Locator;
  private readonly printTestButton: Locator;
  private readonly printTestDialog: Locator;
  private readonly titleInput: Locator;
  private readonly questionCountInput: Locator;
  private readonly allCheckbox: Locator;
  private readonly writtenCheckbox: Locator;
  private readonly multipleChoiceCheckbox: Locator;
  private readonly trueFalseCheckbox: Locator;
  private readonly matchingCheckbox: Locator;
  private readonly answerKeyCheckbox: Locator;
  private readonly printButton: Locator;
  private readonly cancelButton: Locator;

  constructor(page: Page) {
    super(page);

    this.moreMenuButton = page.locator('.flist__btn--more');
    this.printTestButton = page.getByTestId('print-test-button');
    this.printTestDialog = page.locator('.modern-dialog');
    this.titleInput = page.locator('.ptc__text-input');
    this.questionCountInput = page.locator('.ptc__count-input');
    this.writtenCheckbox = page.locator('.ptc__checkboxes .ptc__check-input').nth(0);
    this.multipleChoiceCheckbox = page.locator('.ptc__checkboxes .ptc__check-input').nth(1);
    this.trueFalseCheckbox = page.locator('.ptc__checkboxes .ptc__check-input').nth(2);
    this.matchingCheckbox = page.locator('.ptc__checkboxes .ptc__check-input').nth(3);
    this.allCheckbox = page.locator('.ptc__all-toggle .ptc__check-input');
    this.answerKeyCheckbox = page.locator('.ptc__check-item--toggle .ptc__check-input');
    this.printButton = page.locator('.ptc__btn--primary');
    this.cancelButton = page.locator('.ptc__btn--secondary');
  }

  async navigateToSet(setId: number): Promise<void> {
    await this.navigateTo(`/sets/${setId}`);
  }

  async openMoreMenu(): Promise<void> {
    await this.moreMenuButton.click();
  }

  async clickPrintTest(): Promise<void> {
    await this.printTestButton.click();
  }

  async openPrintTestDialog(): Promise<void> {
    await this.openMoreMenu();
    await this.clickPrintTest();
  }

  async expectDialogVisible(): Promise<void> {
    await expect(this.titleInput).toBeVisible({ timeout: 5000 });
  }

  async expectDialogHidden(): Promise<void> {
    await expect(this.titleInput).toBeHidden({ timeout: 5000 });
  }

  async setTitle(title: string): Promise<void> {
    await this.titleInput.fill(title);
  }

  async setQuestionCount(count: number): Promise<void> {
    await this.questionCountInput.fill(String(count));
  }

  async toggleAll(): Promise<void> {
    await this.allCheckbox.click();
  }

  async uncheckQuestionType(type: 'written' | 'multiple-choice' | 'true-false' | 'matching'): Promise<void> {
    const checkbox: Locator = this.getTypeCheckbox(type);
    if (await checkbox.isChecked()) {
      await checkbox.click();
    }
  }

  async checkQuestionType(type: 'written' | 'multiple-choice' | 'true-false' | 'matching'): Promise<void> {
    const checkbox: Locator = this.getTypeCheckbox(type);
    if (!(await checkbox.isChecked())) {
      await checkbox.click();
    }
  }

  async toggleAnswerKey(): Promise<void> {
    await this.answerKeyCheckbox.click();
  }

  async clickPrint(): Promise<void> {
    await this.printButton.click();
  }

  async clickCancel(): Promise<void> {
    await this.cancelButton.click();
  }

  async isPrintButtonDisabled(): Promise<boolean> {
    return this.printButton.isDisabled();
  }

  private getTypeCheckbox(type: 'written' | 'multiple-choice' | 'true-false' | 'matching'): Locator {
    switch (type) {
      case 'written': return this.writtenCheckbox;
      case 'multiple-choice': return this.multipleChoiceCheckbox;
      case 'true-false': return this.trueFalseCheckbox;
      case 'matching': return this.matchingCheckbox;
    }
  }
}
