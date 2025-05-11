import { Page } from '@playwright/test';
import { BasePage } from './base-page';

export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async navigateToLogin() {
    // Używamy baseURL z konfiguracji Playwright
    console.log('Nawigacja do strony logowania...');

    // Najpierw przechodzimy do strony głównej, aby upewnić się, że aplikacja jest załadowana
    await this.page.goto('/', { waitUntil: 'networkidle', timeout: 60000 });
    console.log('Załadowano stronę główną:', this.page.url());

    // Teraz przechodzimy do strony logowania
    await this.page.goto('/login', { waitUntil: 'networkidle', timeout: 60000 });
    console.log('Załadowano stronę logowania:', this.page.url());

    // Dodajemy oczekiwanie na załadowanie strony
    await this.page.waitForLoadState('networkidle');

    // Dodajemy debug - zrzut ekranu
    await this.page.screenshot({ path: 'login-page.png' });

    // Sprawdzamy, jakie elementy są dostępne na stronie
    console.log('Dostępne elementy na stronie:');
    console.log('Email input:', await this.page.locator('input[type="email"]').count());
    console.log('Password input:', await this.page.locator('input[type="password"]').count());
    console.log('Submit button:', await this.page.locator('button[type="submit"]').count());

    // Sprawdzamy, czy jesteśmy na stronie logowania
    const currentUrl = this.page.url();
    console.log(`Aktualny URL: ${currentUrl}`);
    if (!currentUrl.includes('/login')) {
      console.log('Nie jesteśmy na stronie logowania, próbujemy ponownie...');
      await this.page.goto('/login', { waitUntil: 'networkidle', timeout: 60000 });
    }
  }

  async login(email: string, password: string) {
    // Sprawdzamy, czy dane logowania są poprawne
    console.log('Dane logowania:', {
      email: email || 'brak email',
      password: password ? '***' : 'brak hasła'
    });

    if (!email || !password) {
      throw new Error('Brak danych logowania. Email lub hasło jest puste.');
    }

    // Czekamy na załadowanie strony
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(2000); // Dodatkowe oczekiwanie

    // Dodajemy debug - zrzut ekranu przed wypełnieniem formularza
    await this.page.screenshot({ path: 'login-form-before.png' });

    // Sprawdzamy, jakie elementy są dostępne na stronie
    const emailInputCount = await this.page.locator('input[type="email"]').count();
    const passwordInputCount = await this.page.locator('input[type="password"]').count();
    const submitButtonCount = await this.page.locator('button[type="submit"]').count();

    console.log('Dostępne elementy formularza:', {
      emailInputs: emailInputCount,
      passwordInputs: passwordInputCount,
      submitButtons: submitButtonCount
    });

    // Sprawdzamy HTML strony, aby zobaczyć, co jest dostępne
    const html = await this.page.content();
    console.log('Fragment HTML strony:', html.substring(0, 500) + '...');

    // Próbujemy wypełnić formularz różnymi metodami
    let success = false;

    // Metoda 1: Użycie data-test-id
    try {
      console.log('Metoda 1: Próba użycia data-test-id...');
      await this.page.getByTestId('login-email-input').fill(email);
      await this.page.getByTestId('login-password-input').fill(password);
      await this.page.getByTestId('login-submit-button').click();
      success = true;
      console.log('Metoda 1 zakończona sukcesem');
    } catch (error) {
      console.log('Metoda 1 nie powiodła się:', error.message);
    }

    // Metoda 2: Użycie standardowych selektorów
    if (!success) {
      try {
        console.log('Metoda 2: Próba użycia standardowych selektorów...');
        const emailInput = this.page.locator('input[type="email"]').first();
        await emailInput.fill(email);

        const passwordInput = this.page.locator('input[type="password"]').first();
        await passwordInput.fill(password);

        const submitButton = this.page.locator('button[type="submit"]').first();
        await submitButton.click();
        success = true;
        console.log('Metoda 2 zakończona sukcesem');
      } catch (error) {
        console.log('Metoda 2 nie powiodła się:', error.message);
      }
    }

    // Metoda 3: Użycie selektorów CSS
    if (!success) {
      try {
        console.log('Metoda 3: Próba użycia selektorów CSS...');
        await this.page.locator('#email').fill(email);
        await this.page.locator('#password').fill(password);
        await this.page.locator('.submit-button').click();
        success = true;
        console.log('Metoda 3 zakończona sukcesem');
      } catch (error) {
        console.log('Metoda 3 nie powiodła się:', error.message);
      }
    }

    // Metoda 4: Użycie JavaScript
    if (!success) {
      try {
        console.log('Metoda 4: Próba użycia JavaScript...');
        await this.page.evaluate((email, password) => {
          const emailInput = document.querySelector('input[type="email"]');
          const passwordInput = document.querySelector('input[type="password"]');
          const submitButton = document.querySelector('button[type="submit"]');

          if (emailInput) emailInput.value = email;
          if (passwordInput) passwordInput.value = password;
          if (submitButton) submitButton.click();
        }, email, password);
        success = true;
        console.log('Metoda 4 zakończona sukcesem');
      } catch (error) {
        console.log('Metoda 4 nie powiodła się:', error.message);
      }
    }

    if (!success) {
      throw new Error('Nie udało się wypełnić formularza logowania żadną z metod');
    }

    // Dodajemy debug - zrzut ekranu po wypełnieniu formularza
    await this.page.screenshot({ path: 'login-form-after.png' });

    // Czekamy na przekierowanie po zalogowaniu
    console.log('Oczekiwanie na przekierowanie do /generate...');
    await this.page.waitForURL('**/generate', { timeout: 60000 });
    console.log('Przekierowano do:', this.page.url());
  }
}
