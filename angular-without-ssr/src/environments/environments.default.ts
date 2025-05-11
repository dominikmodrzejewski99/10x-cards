// Domyślne wartości dla środowiska lokalnego
// W środowisku produkcyjnym te wartości są nadpisywane przez zmienne z runtime-config.js
// UWAGA: Nie umieszczaj tutaj żadnych wrażliwych danych!

declare global {
  interface Window {
    RUNTIME_CONFIG?: {
      supabaseUrl: string;
      supabaseKey: string;
      openRouterKey: string;
      E2E_USERNAME_ID: string;
      E2E_USERNAME: string;
      E2E_PASSWORD: string;
    };
  }
}

export const environment = {
  production: false,
  // Wartości dla środowiska lokalnego - UZUPEŁNIJ SWOIMI DANYMI
  // Jeśli window.RUNTIME_CONFIG jest dostępne, używamy wartości z niego
  get supabaseUrl() {
    return window.RUNTIME_CONFIG?.supabaseUrl || 'http://127.0.0.1:54321';
  },
  get supabaseKey() {
    return window.RUNTIME_CONFIG?.supabaseKey || '';
  },
  get openRouterKey() {
    return window.RUNTIME_CONFIG?.openRouterKey || '';
  },
  get E2E_USERNAME_ID() {
    return window.RUNTIME_CONFIG?.E2E_USERNAME_ID || '';
  },
  get E2E_USERNAME() {
    return window.RUNTIME_CONFIG?.E2E_USERNAME || '';
  },
  get E2E_PASSWORD() {
    return window.RUNTIME_CONFIG?.E2E_PASSWORD || '';
  }
}
