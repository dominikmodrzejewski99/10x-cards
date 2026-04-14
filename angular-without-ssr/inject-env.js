const fs = require('fs');
const path = require('path');

// Ścieżka do pliku environments.ts
const envFilePath = path.join(__dirname, 'src', 'environments', 'environments.ts');

// Escape single quotes and backslashes to prevent broken JS output
function escapeForJs(value) {
  return (value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

// Pobierz zmienne środowiskowe
const vars = {
  supabaseUrl: escapeForJs(process.env.supabaseUrl),
  supabaseKey: escapeForJs(process.env.supabaseKey),
  googleAiKey: escapeForJs(process.env.GOOGLE_AI_KEY),
  E2E_USERNAME: escapeForJs(process.env.E2E_USERNAME),
  E2E_PASSWORD: escapeForJs(process.env.E2E_PASSWORD),
  E2E_USERNAME_ID: escapeForJs(process.env.E2E_USERNAME_ID),
  cfAnalyticsToken: escapeForJs(process.env.CF_ANALYTICS_TOKEN),
  sentryDsn: escapeForJs(process.env.SENTRY_DSN),
};

// Zawartość pliku environments.ts
const envFileContent = `// This file is auto-generated during the build process
// DO NOT EDIT MANUALLY

export const environment = {
  production: true,
  supabaseUrl: '${vars.supabaseUrl}',
  supabaseKey: '${vars.supabaseKey}',
  googleAiKey: '${vars.googleAiKey}',
  E2E_USERNAME_ID: '${vars.E2E_USERNAME_ID}',
  E2E_USERNAME: '${vars.E2E_USERNAME}',
  E2E_PASSWORD: '${vars.E2E_PASSWORD}',
  cfAnalyticsToken: '${vars.cfAnalyticsToken}',
  sentryDsn: '${vars.sentryDsn}'
};
`;

// Zapisz plik
fs.writeFileSync(envFilePath, envFileContent);
