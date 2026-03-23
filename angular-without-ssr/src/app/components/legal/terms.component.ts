import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-terms',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule],
  template: `
    <div class="legal">
      <h1 class="legal__title">Regulamin serwisu Memlo</h1>
      <p class="legal__date">Ostatnia aktualizacja: 23 marca 2026</p>

      <section class="legal__section">
        <h2>1. Postanowienia ogólne</h2>
        <p>Niniejszy regulamin określa zasady korzystania z serwisu internetowego Memlo, dostępnego pod adresem memlo.app.</p>
        <p>Korzystając z serwisu, użytkownik akceptuje poniższe warunki.</p>
      </section>

      <section class="legal__section">
        <h2>2. Definicje</h2>
        <ul>
          <li><strong>Serwis</strong> — aplikacja webowa Memlo do tworzenia i nauki fiszek.</li>
          <li><strong>Użytkownik</strong> — osoba korzystająca z serwisu.</li>
          <li><strong>Konto</strong> — indywidualny profil użytkownika w serwisie.</li>
          <li><strong>Treści</strong> — fiszki, zestawy i inne materiały tworzone przez użytkownika.</li>
        </ul>
      </section>

      <section class="legal__section">
        <h2>3. Rejestracja i konto</h2>
        <p>Rejestracja wymaga podania adresu email i hasła (min. 6 znaków).</p>
        <p>Użytkownik może również korzystać z serwisu anonimowo w trybie testowym.</p>
        <p>Użytkownik zobowiązuje się do podania prawdziwych danych i ochrony poufności hasła.</p>
      </section>

      <section class="legal__section">
        <h2>4. Zasady korzystania</h2>
        <p>Użytkownik zobowiązuje się do:</p>
        <ul>
          <li>Korzystania z serwisu zgodnie z prawem i dobrymi obyczajami.</li>
          <li>Nieumieszczania treści obraźliwych, nielegalnych lub naruszających prawa osób trzecich.</li>
          <li>Nieudostępniania konta osobom trzecim.</li>
        </ul>
      </section>

      <section class="legal__section">
        <h2>5. Generowanie treści przez AI</h2>
        <p>Serwis umożliwia generowanie fiszek przy pomocy sztucznej inteligencji.</p>
        <p>Treści generowane przez AI mają charakter pomocniczy i mogą zawierać błędy. Użytkownik powinien weryfikować ich poprawność.</p>
        <p>Memlo nie ponosi odpowiedzialności za treści wygenerowane przez AI.</p>
      </section>

      <section class="legal__section">
        <h2>6. Własność intelektualna</h2>
        <p>Treści tworzone przez użytkownika pozostają jego własnością.</p>
        <p>Kod źródłowy, design i marka Memlo są chronione prawem autorskim.</p>
      </section>

      <section class="legal__section">
        <h2>7. Usuwanie konta</h2>
        <p>Użytkownik ma prawo w każdej chwili usunąć swoje konto.</p>
        <p>Usunięcie konta jest trwałe i powoduje bezpowrotne usunięcie wszystkich danych, w tym fiszek, zestawów i historii nauki.</p>
      </section>

      <section class="legal__section">
        <h2>8. Ograniczenie odpowiedzialności</h2>
        <p>Serwis jest dostarczany w stanie „tak jak jest" (as-is).</p>
        <p>Memlo dokłada starań, aby zapewnić ciągłość działania, ale nie gwarantuje nieprzerwanego dostępu.</p>
      </section>

      <section class="legal__section">
        <h2>9. Zmiany regulaminu</h2>
        <p>Memlo zastrzega sobie prawo do zmiany regulaminu. O istotnych zmianach użytkownicy zostaną poinformowani.</p>
      </section>

      <section class="legal__section">
        <h2>10. Kontakt</h2>
        <p>Pytania dotyczące regulaminu należy kierować na adres: <strong>kontakt&#64;memlo.app</strong></p>
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
export class TermsComponent {}
