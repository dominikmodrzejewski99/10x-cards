// Plik środowiskowy dla testów E2E
// Nie używa obiektu window, który nie jest dostępny w środowisku Node.js

export const environment = {
  production: false,
  // Dane dla testów E2E
  supabaseUrl: 'https://ngiunldncwxontgpzwkq.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5naXVubGRuY3d4b250Z3B6d2txIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3MDQ2MTYsImV4cCI6MjA2MjI4MDYxNn0.xUS6bEF1_VuD3_XaOHDD5awZLf2CNwe4xLMaiH-rUZA',
  openRouterKey: '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',
  E2E_USERNAME_ID: '123e4567-e89b-12d3-a456-426614174000',
  E2E_USERNAME: 'e2e@10x.cards',
  E2E_PASSWORD: '10x.cards'
};
