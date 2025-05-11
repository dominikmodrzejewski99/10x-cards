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

# Pobierz wartości zmiennych środowiskowych
SUPABASE_URL="${supabaseUrl}"
SUPABASE_KEY="${supabaseKey}"

# Sprawdź różne możliwe nazwy zmiennej dla klucza OpenRouter
if [ -n "${openRouterKey}" ]; then
  OPENROUTER_KEY="${openRouterKey}"
elif [ -n "${OPENROUTER_KEY}" ]; then
  OPENROUTER_KEY="${OPENROUTER_KEY}"
elif [ -n "${openRouter_KEY}" ]; then
  OPENROUTER_KEY="${openRouter_KEY}"
else
  echo "UWAGA: Nie znaleziono zmiennej środowiskowej dla klucza OpenRouter!"
  OPENROUTER_KEY=""
fi

E2E_USERNAME_ID="${E2E_USERNAME_ID}"
E2E_USERNAME="${E2E_USERNAME}"
E2E_PASSWORD="${E2E_PASSWORD}"

# Wyświetl wartości zmiennych (bez pełnych kluczy dla bezpieczeństwa)
echo "SUPABASE_URL: ${SUPABASE_URL}"
echo "SUPABASE_KEY: ${SUPABASE_KEY:0:10}..."
echo "OPENROUTER_KEY: ${OPENROUTER_KEY:0:10}..."

# Sprawdź, czy wszystkie wymagane zmienne środowiskowe są ustawione
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ] || [ -z "$OPENROUTER_KEY" ]; then
  echo "ERROR: Brakuje wymaganych zmiennych środowiskowych (supabaseUrl, supabaseKey, openRouterKey)"
  echo "Te zmienne muszą być ustawione w ustawieniach projektu Cloudflare Pages."
  exit 1
fi

cat > src/environments/environments.ts << EOL
// This file is auto-generated during the build process
// DO NOT EDIT MANUALLY

declare global {
  interface Window {
    RUNTIME_CONFIG: {
      supabaseUrl: string;
      supabaseKey: string;
      openRouterKey: string;
      E2E_USERNAME_ID: string;
      E2E_USERNAME: string;
      E2E_PASSWORD: string;
    };
  }
}

// W środowisku produkcyjnym używamy zmiennych z runtime-config.js
// W środowisku deweloperskim używamy zmiennych z tego pliku
export const environment = {
  production: true,
  get supabaseUrl() {
    return window.RUNTIME_CONFIG?.supabaseUrl || '${SUPABASE_URL}';
  },
  get supabaseKey() {
    return window.RUNTIME_CONFIG?.supabaseKey || '${SUPABASE_KEY}';
  },
  get openRouterKey() {
    return window.RUNTIME_CONFIG?.openRouterKey || '${OPENROUTER_KEY}';
  },
  get E2E_USERNAME_ID() {
    return window.RUNTIME_CONFIG?.E2E_USERNAME_ID || '${E2E_USERNAME_ID}';
  },
  get E2E_USERNAME() {
    return window.RUNTIME_CONFIG?.E2E_USERNAME || '${E2E_USERNAME}';
  },
  get E2E_PASSWORD() {
    return window.RUNTIME_CONFIG?.E2E_PASSWORD || '${E2E_PASSWORD}';
  }
};
EOL

echo "Environment file created successfully"
cat src/environments/environments.ts

# Utwórz plik runtime-config.js z zmiennymi środowiskowymi
echo "Creating runtime-config.js file..."

# Sprawdź, czy katalog assets istnieje
mkdir -p src/assets

# Utwórz plik runtime-config.js
cat > src/assets/runtime-config.js << EOL
window.RUNTIME_CONFIG = {
  supabaseUrl: '${SUPABASE_URL}',
  supabaseKey: '${SUPABASE_KEY}',
  openRouterKey: '${OPENROUTER_KEY}',
  E2E_USERNAME_ID: '${E2E_USERNAME_ID}',
  E2E_USERNAME: '${E2E_USERNAME}',
  E2E_PASSWORD: '${E2E_PASSWORD}'
};
EOL

# Wyświetl zawartość pliku runtime-config.js (z zamaskowanymi kluczami)
echo "Runtime config file created with the following variables:"
echo "- supabaseUrl: ${SUPABASE_URL}"
echo "- supabaseKey: ${SUPABASE_KEY:0:10}..."
echo "- openRouterKey: ${OPENROUTER_KEY:0:10}..."

echo "Runtime config file created successfully"
cat src/assets/runtime-config.js

# Zbuduj aplikację
echo "Building application..."
npm run build:prod || exit 1

# Sprawdź, czy katalog dist istnieje
echo "Checking build output..."
ls -la dist/angular-without-ssr/browser || exit 1

# Upewnij się, że plik _headers jest poprawnie skopiowany
echo "Checking _headers file..."
cat dist/angular-without-ssr/browser/_headers || echo "_headers file not found in output directory!"

echo "Build completed successfully!"
