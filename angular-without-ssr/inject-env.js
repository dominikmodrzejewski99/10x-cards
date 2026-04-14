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
  cfAnalyticsToken: '${vars.cfAnalyticsToken}',
  sentryDsn: '${vars.sentryDsn}'
};
`;

// Zapisz plik
fs.writeFileSync(envFilePath, envFileContent);
