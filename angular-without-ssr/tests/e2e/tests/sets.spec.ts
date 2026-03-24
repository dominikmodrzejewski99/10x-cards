import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects/login-page';
import { SetsPage } from '../page-objects/sets-page';
import { environment } from '../../../src/environments/environments';

const E2E_USERNAME: string = environment.E2E_USERNAME;
const E2E_PASSWORD: string = environment.E2E_PASSWORD;

test.describe('Sets CRUD flow', () => {
  let setsPage: SetsPage;

  test.beforeEach(async ({ page }) => {
    setsPage = new SetsPage(page);

    const loginPage: LoginPage = new LoginPage(page);
    await loginPage.navigateToLogin();
    await loginPage.login(E2E_USERNAME, E2E_PASSWORD);
  });

  test('should create, edit, and delete a set', async ({ page }) => {
    test.setTimeout(120000);

    const setName: string = `E2E Test Set ${Date.now()}`;
    const updatedSetName: string = `${setName} Updated`;

    // Nawigujemy do strony zestawów
    await setsPage.navigateToSets();

    // Tworzymy nowy zestaw
    console.log('Tworzenie zestawu:', setName);
    await setsPage.createSet(setName);

    // Weryfikujemy, że zestaw pojawił się na liście
    await setsPage.expectSetVisible(setName);
    console.log('Zestaw widoczny na liście');

    // Edytujemy nazwę zestawu
    console.log('Edycja zestawu na:', updatedSetName);
    await setsPage.editSet(setName, updatedSetName);

    // Weryfikujemy, że zmieniona nazwa jest widoczna
    await setsPage.expectSetVisible(updatedSetName);
    console.log('Zmieniona nazwa widoczna');

    // Usuwamy zestaw
    console.log('Usuwanie zestawu:', updatedSetName);
    await setsPage.deleteSet(updatedSetName);

    // Weryfikujemy, że zestaw zniknął z listy
    await setsPage.expectSetNotVisible(updatedSetName);
    console.log('Zestaw usunięty pomyślnie');
  });
});
