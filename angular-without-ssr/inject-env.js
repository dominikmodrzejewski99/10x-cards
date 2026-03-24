const fs = require('fs');
const path = require('path');

// Ścieżka do pliku environments.ts
const envFilePath = path.join(__dirname, 'src', 'environments', 'environments.ts');

// Pobierz zmienne środowiskowe
const supabaseUrl = process.env.supabaseUrl || '';
const supabaseKey = process.env.supabaseKey || '';
const openRouterKey = process.env.openRouterKey || '';
const e2eUsername = process.env.E2E_USERNAME || '';
const e2ePassword = process.env.E2E_PASSWORD || '';
const e2eUsernameId = process.env.E2E_USERNAME_ID || '';
const cfAnalyticsToken = process.env.CF_ANALYTICS_TOKEN || '';
const sentryDsn = process.env.SENTRY_DSN || '';

// Zawartość pliku environments.ts
const envFileContent = `// This file is auto-generated during the build process
// DO NOT EDIT MANUALLY

export const environment = {
  production: true,
  supabaseUrl: '${supabaseUrl}',
  supabaseKey: '${supabaseKey}',
  openRouterKey: '${openRouterKey}',
  E2E_USERNAME_ID: '${e2eUsernameId}',
  E2E_USERNAME: '${e2eUsername}',
  E2E_PASSWORD: '${e2ePassword}',
  cfAnalyticsToken: '${cfAnalyticsToken}',
  sentryDsn: '${sentryDsn}'
};
`;

// Zapisz plik
fs.writeFileSync(envFilePath, envFileContent);
