import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-privacy',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule],
  template: `
    <div class="legal">
      <h1 class="legal__title">Polityka prywatności 10xCards</h1>
      <p class="legal__date">Ostatnia aktualizacja: 23 marca 2026</p>

      <section class="legal__section">
        <h2>1. Administrator danych</h2>
        <p>Administratorem danych osobowych jest 10xCards. Kontakt: <strong>kontakt&#64;10xcards.com</strong></p>
      </section>

      <section class="legal__section">
        <h2>2. Zbierane dane</h2>
        <p>Zbieramy następujące dane:</p>
        <ul>
          <li><strong>Adres email</strong> — do rejestracji, logowania i komunikacji.</li>
          <li><strong>Hasło</strong> — przechowywane w formie zaszyfrowanej (Supabase Auth).</li>
          <li><strong>Treści użytkownika</strong> — fiszki, zestawy, wyniki nauki i historia powtórek.</li>
          <li><strong>Preferencje</strong> — ustawienia nauki (seria, statystyki).</li>
        </ul>
      </section>

      <section class="legal__section">
        <h2>3. Cel przetwarzania</h2>
        <p>Dane przetwarzamy w celu:</p>
        <ul>
          <li>Świadczenia usługi (tworzenie i nauka fiszek).</li>
          <li>Autentykacji i bezpieczeństwa konta.</li>
          <li>Algorytmu powtórek (Spaced Repetition SM-2).</li>
          <li>Generowania treści z pomocą AI (OpenRouter API).</li>
        </ul>
      </section>

      <section class="legal__section">
        <h2>4. Podstawa prawna</h2>
        <p>Przetwarzanie danych odbywa się na podstawie:</p>
        <ul>
          <li>Art. 6 ust. 1 lit. b RODO — wykonanie umowy (świadczenie usługi).</li>
          <li>Art. 6 ust. 1 lit. a RODO — zgoda użytkownika.</li>
          <li>Art. 6 ust. 1 lit. f RODO — uzasadniony interes administratora (bezpieczeństwo).</li>
        </ul>
      </section>

      <section class="legal__section">
        <h2>5. Udostępnianie danych</h2>
        <p>Dane mogą być przekazywane:</p>
        <ul>
          <li><strong>Supabase</strong> (hostowanie bazy danych i autentykacja) — serwery w EU.</li>
          <li><strong>OpenRouter</strong> (generowanie fiszek AI) — wyłącznie treść tekstu, bez danych osobowych.</li>
        </ul>
        <p>Nie sprzedajemy danych osobom trzecim.</p>
      </section>

      <section class="legal__section">
        <h2>6. Przechowywanie danych</h2>
        <p>Dane przechowujemy tak długo, jak konto jest aktywne.</p>
        <p>Po usunięciu konta wszystkie dane są trwale usuwane.</p>
      </section>

      <section class="legal__section">
        <h2>7. Prawa użytkownika (RODO)</h2>
        <p>Masz prawo do:</p>
        <ul>
          <li><strong>Dostępu</strong> do swoich danych.</li>
          <li><strong>Sprostowania</strong> nieprawidłowych danych.</li>
          <li><strong>Usunięcia</strong> danych (prawo do bycia zapomnianym) — dostępne w ustawieniach konta.</li>
          <li><strong>Przenoszenia</strong> danych.</li>
          <li><strong>Wniesienia sprzeciwu</strong> wobec przetwarzania.</li>
          <li><strong>Złożenia skargi</strong> do organu nadzorczego (UODO).</li>
        </ul>
      </section>

      <section class="legal__section">
        <h2>8. Pliki cookies i localStorage</h2>
        <p>Serwis korzysta z localStorage do przechowywania sesji autentykacji (token JWT).</p>
        <p>Nie stosujemy plików cookies śledzących ani reklamowych.</p>
      </section>

      <section class="legal__section">
        <h2>9. Bezpieczeństwo</h2>
        <p>Stosujemy odpowiednie środki techniczne:</p>
        <ul>
          <li>Szyfrowanie HTTPS.</li>
          <li>Row Level Security (RLS) w bazie danych.</li>
          <li>Content Security Policy (CSP) headers.</li>
          <li>Hashowanie haseł (bcrypt via Supabase Auth).</li>
        </ul>
      </section>

      <section class="legal__section">
        <h2>10. Zmiany polityki</h2>
        <p>O istotnych zmianach poinformujemy użytkowników. Zachęcamy do regularnego zaglądania na tę stronę.</p>
      </section>

      <section class="legal__section">
        <h2>11. Kontakt</h2>
        <p>W sprawach dotyczących prywatności: <strong>kontakt&#64;10xcards.com</strong></p>
      </section>

      <div class="legal__back">
        <a routerLink="/" class="legal__back-link">
          <i class="pi pi-arrow-left"></i> Strona główna
        </a>
      </div>
    </div>
  `,
  styles: [`
    .legal {
      max-width: 720px;
      margin: 0 auto;
      padding: clamp(1.5rem, 4vw, 3rem) clamp(1rem, 3vw, 1.5rem);
    }
    .legal__title {
      font-size: clamp(1.5rem, 4vw, 2rem);
      font-weight: 900;
      color: #282e3e;
      margin: 0 0 0.25rem;
    }
    .legal__date {
      font-size: 0.85rem;
      color: #586380;
      margin: 0 0 2rem;
    }
    .legal__section {
      margin-bottom: 1.75rem;
    }
    .legal__section h2 {
      font-size: 1.1rem;
      font-weight: 700;
      color: #282e3e;
      margin: 0 0 0.5rem;
    }
    .legal__section p {
      font-size: 0.9rem;
      color: #586380;
      line-height: 1.65;
      margin: 0 0 0.5rem;
    }
    .legal__section ul {
      padding-left: 1.25rem;
      margin: 0.25rem 0 0.5rem;
    }
    .legal__section li {
      font-size: 0.9rem;
      color: #586380;
      line-height: 1.65;
      margin-bottom: 0.25rem;
    }
    .legal__back {
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid #d9dbe9;
    }
    .legal__back-link {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      color: #4255ff;
      font-weight: 600;
      font-size: 0.875rem;
      text-decoration: none;
    }
    .legal__back-link:hover { gap: 0.5rem; }
  `]
})
export class PrivacyComponent {}
