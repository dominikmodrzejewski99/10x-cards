// Domyślne wartości dla środowiska lokalnego
// W środowisku produkcyjnym te wartości są nadpisywane przez zmienne środowiskowe
// UWAGA: Nie umieszczaj tutaj żadnych wrażliwych danych!
export const environment = {
  production: false,
  // Wartości dla środowiska lokalnego - UZUPEŁNIJ SWOIMI DANYMI
  supabaseUrl: 'http://127.0.0.1:54321',  // Lokalny Supabase lub twój URL
  supabaseKey: '',  // Twój klucz Supabase
  openRouterKey: '', // Twój klucz OpenRouter
  E2E_USERNAME_ID: '', // ID użytkownika do testów E2E
  E2E_USERNAME: '',    // Nazwa użytkownika do testów E2E
  E2E_PASSWORD: ''     // Hasło do testów E2E
}
