import { test, expect, Page } from '@playwright/test';
import { StudyPage } from '../page-objects/study-page';
import { environment } from '../../../src/environments/environments';

const E2E_USERNAME: string = environment.E2E_USERNAME;
const E2E_PASSWORD: string = environment.E2E_PASSWORD;

/**
 * Login helper that waits for any authenticated redirect (dashboard or generate).
 */
async function login(page: Page): Promise<void> {
  await page.goto('/login', { timeout: 60000 });
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);

  await page.locator('[data-testid="login-email-input"]').fill(E2E_USERNAME);
  await page.locator('[data-testid="login-password-input"]').fill(E2E_PASSWORD);
  await page.locator('[data-testid="login-submit-button"]').click();

  // Wait for redirect to any authenticated page
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 60000 });
}

/**
 * Clears the IndexedDB offline queue so tests start clean.
 */
async function clearOfflineQueue(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const dbs = await indexedDB.databases();
    for (const db of dbs) {
      if (db.name === '10x-cards-offline') {
        indexedDB.deleteDatabase(db.name!);
      }
    }
  });
}

/**
 * Reads the number of items in the IndexedDB queue.
 */
async function getQueueCount(page: Page): Promise<number> {
  return page.evaluate((): Promise<number> => {
    return new Promise<number>((resolve) => {
      const request = indexedDB.open('10x-cards-offline', 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('review-queue')) {
          db.createObjectStore('review-queue', { keyPath: 'id', autoIncrement: true });
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('review-queue')) {
          db.close();
          resolve(0);
          return;
        }
        const tx = db.transaction('review-queue', 'readonly');
        const store = tx.objectStore('review-queue');
        const countReq = store.count();
        countReq.onsuccess = () => {
          db.close();
          resolve(countReq.result);
        };
        countReq.onerror = () => {
          db.close();
          resolve(0);
        };
      };
      request.onerror = () => resolve(0);
    });
  });
}

test.describe('Offline queue', () => {
  let studyPage: StudyPage;

  test.beforeEach(async ({ page }) => {
    studyPage = new StudyPage(page);
    await login(page);
    await clearOfflineQueue(page);
  });

  test('should show sync status badge when offline and answering cards', async ({ page, context }) => {
    test.setTimeout(180000);

    await studyPage.navigateToStudy();
    await studyPage.expectStudyBodyVisible();

    // Go offline
    await context.setOffline(true);

    // Verify the offline indicator appears
    const offlineIndicator = page.locator('.sync-status');
    await expect(offlineIndicator).toBeVisible({ timeout: 5000 });
    await expect(offlineIndicator).toContainText('Offline');

    // Flip and answer a card while offline
    await studyPage.flipCard();
    await studyPage.answerKnown();

    // Check that the badge now shows pending count
    await expect(offlineIndicator).toContainText('w kolejce', { timeout: 5000 });

    // Verify the item is actually in IndexedDB
    const queueCount: number = await getQueueCount(page);
    expect(queueCount).toBeGreaterThanOrEqual(1);

    // Go back online
    await context.setOffline(false);

    // Wait for sync — the badge should disappear
    await expect(offlineIndicator).toBeHidden({ timeout: 15000 });

    // Verify the queue is empty after sync
    const queueCountAfterSync: number = await getQueueCount(page);
    expect(queueCountAfterSync).toBe(0);
  });

  test('should continue study session without errors while offline', async ({ page, context }) => {
    test.setTimeout(180000);

    await studyPage.navigateToStudy();
    await studyPage.expectStudyBodyVisible();

    // Record initial progress
    const initialProgress: string = await studyPage.getProgressText();
    expect(initialProgress).toContain('1');

    // Go offline
    await context.setOffline(true);

    // Answer first card
    await studyPage.flipCard();
    await studyPage.answerKnown();

    // Session should continue normally (no error message visible)
    const errorState = page.locator('.study__state-icon--error');
    await expect(errorState).toBeHidden({ timeout: 3000 });

    // Either we moved to next card or session completed
    const isComplete: boolean = await studyPage.isSessionComplete();
    if (!isComplete) {
      const newProgress: string = await studyPage.getProgressText();
      expect(newProgress).toContain('2');
    }

    // Go back online
    await context.setOffline(false);
  });

  test('should queue multiple answers offline and sync all when back online', async ({ page, context }) => {
    test.setTimeout(180000);

    await studyPage.navigateToStudy();
    await studyPage.expectStudyBodyVisible();

    // Go offline
    await context.setOffline(true);

    // Answer multiple cards
    let cardsAnswered: number = 0;
    let isStudyBody: boolean = await page.locator('.study__title').isVisible().catch(() => false);

    while (isStudyBody && cardsAnswered < 3) {
      await studyPage.flipCard();
      await studyPage.answerKnown();
      cardsAnswered++;
      await page.waitForTimeout(300);
      isStudyBody = await page.locator('.study__title').isVisible().catch(() => false);
    }

    // Verify items are queued
    const queueCount: number = await getQueueCount(page);
    expect(queueCount).toBeGreaterThanOrEqual(1);

    // Go back online
    await context.setOffline(false);

    // Wait for sync to complete
    const syncIndicator = page.locator('.sync-status');
    await expect(syncIndicator).toBeHidden({ timeout: 15000 });

    // Queue should be empty
    const queueCountAfterSync: number = await getQueueCount(page);
    expect(queueCountAfterSync).toBe(0);
  });

  test('should persist queue across page reload', async ({ page, context }) => {
    test.setTimeout(180000);

    await studyPage.navigateToStudy();
    await studyPage.expectStudyBodyVisible();

    // Go offline and answer a card
    await context.setOffline(true);
    await studyPage.flipCard();
    await studyPage.answerKnown();

    // Verify queue has items
    const queueBefore: number = await getQueueCount(page);
    expect(queueBefore).toBeGreaterThanOrEqual(1);

    // Go back online first (so page can reload)
    await context.setOffline(false);

    // Reload page — but first navigate while online to ensure reload works
    // The queue should be synced during or after reload
    await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // After reload + online, the service should have processed the queue
    const queueAfterReload: number = await getQueueCount(page);
    expect(queueAfterReload).toBe(0);
  });
});
