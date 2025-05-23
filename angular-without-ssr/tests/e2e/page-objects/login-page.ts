import { Page } from '@playwright/test';
import { BasePage } from './base-page';
import { environment } from '../../../src/environments/environments.test';

export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async navigateToLogin() {
    // Używamy baseURL z konfiguracji Playwright
    console.log('Nawigacja do strony logowania...');

    try {
      // Najpierw przechodzimy do strony głównej, aby upewnić się, że aplikacja jest załadowana
      await this.page.goto('/', { timeout: 60000 });
      console.log('Załadowano stronę główną:', this.page.url());

      // Czekamy na załadowanie strony
      await this.page.waitForLoadState('domcontentloaded', { timeout: 60000 });
      await this.page.waitForTimeout(2000); // Dodatkowe oczekiwanie

      // Teraz przechodzimy do strony logowania
      await this.page.goto('/login', { timeout: 60000 });
      console.log('Załadowano stronę logowania:', this.page.url());

      // Czekamy na załadowanie strony
      await this.page.waitForLoadState('domcontentloaded', { timeout: 60000 });
      await this.page.waitForTimeout(2000); // Dodatkowe oczekiwanie

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
        await this.page.goto('/login', { timeout: 60000 });
        await this.page.waitForLoadState('domcontentloaded', { timeout: 60000 });
        await this.page.waitForTimeout(2000); // Dodatkowe oczekiwanie
      }
    } catch (error) {
      console.error('Błąd podczas nawigacji do strony logowania:', error);
      // Próbujemy jeszcze raz z innymi opcjami
      try {
        console.log('Próbujemy alternatywnej metody nawigacji...');
        await this.page.goto('/login', { timeout: 60000 });
        await this.page.waitForTimeout(5000); // Dłuższe oczekiwanie
      } catch (retryError) {
        console.error('Błąd podczas ponownej próby nawigacji:', retryError);
        // Kontynuujemy mimo błędu, może uda się wypełnić formularz
      }
    }
  }

  /**
   * Wypełnia formularz logowania i klika przycisk zaloguj
   */
  async fillLoginForm(email: string, password: string) {
    // Sprawdzamy, czy dane logowania są poprawne
    console.log('Dane logowania:', {
      email: email || 'brak email',
      password: password ? '***' : 'brak hasła'
    });

    // Jeśli dane logowania są puste, używamy danych z pliku środowiskowego
    if (!email || !password) {
      console.log('Brak danych logowania. Używam danych z pliku środowiskowego.');
      email = environment.E2E_USERNAME;
      password = environment.E2E_PASSWORD;

      // Sprawdź, czy dane z pliku środowiskowego są dostępne
      if (!email || !password) {
        throw new Error('Brak danych logowania. Email lub hasło jest puste, a dane z pliku środowiskowego są niedostępne.');
      }

      console.log('Używam danych z pliku środowiskowego:', {
        email: email,
        password: password ? '***' : 'brak hasła'
      });
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

    // Metoda 1: Użycie data-testid
    try {
      console.log('Metoda 1: Próba użycia data-testid...');

      // Czekamy na pojawienie się elementów formularza
      await this.page.waitForSelector('[data-testid="login-email-input"]', { timeout: 10000 })
        .catch(() => console.log('Nie znaleziono elementu [data-testid="login-email-input"]'));

      await this.page.waitForSelector('[data-testid="login-password-input"]', { timeout: 10000 })
        .catch(() => console.log('Nie znaleziono elementu [data-testid="login-password-input"]'));

      await this.page.waitForSelector('[data-testid="login-submit-button"]', { timeout: 10000 })
        .catch(() => console.log('Nie znaleziono elementu [data-testid="login-submit-button"]'));

      // Wypełniamy formularz
      await this.page.locator('[data-testid="login-email-input"]').fill(email);
      await this.page.locator('[data-testid="login-password-input"]').fill(password);
      await this.page.locator('[data-testid="login-submit-button"]').click();
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
  }

  /**
   * Czeka na przekierowanie po zalogowaniu
   */
  async waitForRedirectAfterLogin() {
    console.log('Oczekiwanie na przekierowanie do /generate...');
    await this.page.waitForURL('**/generate', { timeout: 60000 });
    console.log('Przekierowano do:', this.page.url());
  }

  /**
   * Loguje się do aplikacji i czeka na przekierowanie
   */
  async login(email: string, password: string) {
    await this.fillLoginForm(email, password);
    await this.waitForRedirectAfterLogin();
  }
}
