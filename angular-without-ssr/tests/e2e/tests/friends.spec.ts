import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects/login-page';
import { FriendsPage } from '../page-objects/friends-page';

const E2E_USERNAME: string = process.env['E2E_USERNAME'] || '';
const E2E_PASSWORD: string = process.env['E2E_PASSWORD'] || '';

test.describe('Friends feature', () => {
  let friendsPage: FriendsPage;

  test.beforeEach(async ({ page }) => {
    friendsPage = new FriendsPage(page);

    if (E2E_USERNAME && E2E_PASSWORD) {
      const loginPage: LoginPage = new LoginPage(page);
      await loginPage.navigateToLogin();
      await loginPage.login(E2E_USERNAME, E2E_PASSWORD);
    }
  });

  test('should display friends page', async () => {
    await friendsPage.navigateToFriends();
    await friendsPage.expectPageLoaded();
  });

  test('should show empty state when no friends', async () => {
    await friendsPage.navigateToFriends();
    await friendsPage.expectPageLoaded();

    const friendCount: number = await friendsPage.getFriendCardCount();
    if (friendCount === 0) {
      await friendsPage.expectEmptyState();
    }
  });

  test('should show email input and send button', async ({ page }) => {
    await friendsPage.navigateToFriends();
    await friendsPage.expectPageLoaded();

    const emailInput = page.locator('.friends__add-input');
    const sendButton = page.locator('.friends__add-btn');

    await expect(emailInput).toBeVisible();
    await expect(sendButton).toBeVisible();
  });

  test('should show error when sending request to non-existent user', async ({ page }) => {
    await friendsPage.navigateToFriends();
    await friendsPage.expectPageLoaded();

    await friendsPage.sendFriendRequest('nonexistent-user-xyz@example.com');

    // Wait for toast error message
    const toast = page.locator('.p-toast-message');
    await expect(toast).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to friend stats when clicking a friend', async () => {
    await friendsPage.navigateToFriends();
    await friendsPage.expectPageLoaded();

    const friendCount: number = await friendsPage.getFriendCardCount();
    if (friendCount === 0) {
      test.skip();
      return;
    }

    await friendsPage.clickFirstFriend();
    await friendsPage.expectFriendStatsPage();
  });

  test('should show notification bell in navbar', async ({ page }) => {
    await friendsPage.navigateToFriends();

    const bell = page.locator('.notif-bell__btn');
    await expect(bell).toBeVisible({ timeout: 10000 });
  });

  test('should open notification panel on bell click', async ({ page }) => {
    await friendsPage.navigateToFriends();

    const bell = page.locator('.notif-bell__btn');
    await bell.click();

    const panel = page.locator('.notif-bell__panel');
    await expect(panel).toBeVisible({ timeout: 5000 });
  });
});
