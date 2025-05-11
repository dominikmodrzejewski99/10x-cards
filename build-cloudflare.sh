#!/bin/bash

# Włącz tryb debugowania
set -x

# Wyświetl informacje o środowisku
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"
echo "Current directory: $(pwd)"
echo "Files in current directory: $(ls -la)"

# Przejdź do katalogu angular-without-ssr
cd angular-without-ssr || exit 1
echo "Changed directory to: $(pwd)"
echo "Files in angular-without-ssr: $(ls -la)"

# Zainstaluj zależności
echo "Installing dependencies..."
npm ci || exit 1

# Wyświetl dostępne zmienne środowiskowe (bez wartości)
echo "Available environment variables:"
env | grep -E 'supabase|openRouter|E2E' | cut -d= -f1

# Utwórz plik environments.ts
echo "Creating environments.ts file..."

# Pobierz wartości zmiennych środowiskowych lub użyj wartości domyślnych
SUPABASE_URL="${supabaseUrl:-https://ngiunldncwxontgpzwkq.supabase.co}"
SUPABASE_KEY="${supabaseKey:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5naXVubGRuY3d4b250Z3B6d2txIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3MDQ2MTYsImV4cCI6MjA2MjI4MDYxNn0.xUS6bEF1_VuD3_XaOHDD5awZLf2CNwe4xLMaiH-rUZA}"
OPENROUTER_KEY="${openRouterKey:-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}"
E2E_USERNAME_ID="${E2E_USERNAME_ID:-054cdcec-17dc-47f2-8979-915a23ff1d7a}"
E2E_USERNAME="${E2E_USERNAME:-test@gmail.com}"
E2E_PASSWORD="${E2E_PASSWORD:-123123qwe}"

cat > src/environments/environments.ts << EOL
// This file is auto-generated during the build process
// DO NOT EDIT MANUALLY

export const environment = {
  production: true,
  supabaseUrl: '${SUPABASE_URL}',
  supabaseKey: '${SUPABASE_KEY}',
  openRouterKey: '${OPENROUTER_KEY}',
  E2E_USERNAME_ID: '${E2E_USERNAME_ID}',
  E2E_USERNAME: '${E2E_USERNAME}',
  E2E_PASSWORD: '${E2E_PASSWORD}'
};
EOL

echo "Environment file created successfully"
cat src/environments/environments.ts

# Zbuduj aplikację
echo "Building application..."
npm run build:prod || exit 1

# Sprawdź, czy katalog dist istnieje
echo "Checking build output..."
ls -la dist/angular-without-ssr/browser || exit 1

echo "Build completed successfully!"
