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
  E2E_PASSWORD: '${e2ePassword}'
};
`;

// Zapisz plik
fs.writeFileSync(envFilePath, envFileContent);

console.log('Environment variables injected successfully!');
console.log('Generated environments.ts with the following variables:');
console.log(`- supabaseUrl: ${supabaseUrl ? '✓ Set' : '✗ Not set'}`);
console.log(`- supabaseKey: ${supabaseKey ? '✓ Set' : '✗ Not set'}`);
console.log(`- openRouterKey: ${openRouterKey ? '✓ Set' : '✗ Not set'}`);
console.log(`- E2E_USERNAME: ${e2eUsername ? '✓ Set' : '✗ Not set'}`);
console.log(`- E2E_PASSWORD: ${e2ePassword ? '✓ Set' : '✗ Not set'}`);
console.log(`- E2E_USERNAME_ID: ${e2eUsernameId ? '✓ Set' : '✗ Not set'}`);
