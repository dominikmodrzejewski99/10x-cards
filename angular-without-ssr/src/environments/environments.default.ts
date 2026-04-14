// Domyślne wartości dla środowiska lokalnego
// W środowisku produkcyjnym te wartości są nadpisywane przez zmienne z runtime-config.js
// UWAGA: Nie umieszczaj tutaj żadnych wrażliwych danych!

declare global {
  interface Window {
    RUNTIME_CONFIG?: {
      supabaseUrl: string;
      supabaseKey: string;
      googleAiKey: string;
      cfAnalyticsToken: string;
      sentryDsn: string;
    };
  }
}

export const environment = {
  production: false,
  get supabaseUrl() {
    return window.RUNTIME_CONFIG?.supabaseUrl || 'http://127.0.0.1:54321';
  },
  get supabaseKey() {
    return window.RUNTIME_CONFIG?.supabaseKey || '';
  },
  get googleAiKey() {
    return window.RUNTIME_CONFIG?.googleAiKey || '';
  },
  get cfAnalyticsToken() {
    return window.RUNTIME_CONFIG?.cfAnalyticsToken || '';
  },
  get sentryDsn() {
    return window.RUNTIME_CONFIG?.sentryDsn || '';
  }
}
