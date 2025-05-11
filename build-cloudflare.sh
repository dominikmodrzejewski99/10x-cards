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

# Instalacja Angular CLI globalnie
echo "Installing Angular CLI globally..."
npm install -g @angular/cli || echo "Failed to install Angular CLI globally, but continuing..."

# Wyświetl dostępne zmienne środowiskowe (bez wartości)
echo "Available environment variables:"
env | grep -E 'supabase|openRouter|E2E' | cut -d= -f1

# Utwórz plik environments.ts
echo "Creating environments.ts file..."

# Pobierz wartości zmiennych środowiskowych - sprawdzamy różne możliwe formaty

# Dla SUPABASE_URL
if [ -n "${supabaseUrl}" ]; then
  SUPABASE_URL="${supabaseUrl}"
elif [ -n "${SUPABASE_URL}" ]; then
  SUPABASE_URL="${SUPABASE_URL}"
elif [ -n "$supabaseUrl" ]; then
  SUPABASE_URL="$supabaseUrl"
elif [ -n "$SUPABASE_URL" ]; then
  SUPABASE_URL="$SUPABASE_URL"
else
  echo "UWAGA: Nie znaleziono zmiennej środowiskowej dla SUPABASE_URL!"
  SUPABASE_URL=""
fi

# Dla SUPABASE_KEY
if [ -n "${supabaseKey}" ]; then
  SUPABASE_KEY="${supabaseKey}"
elif [ -n "${SUPABASE_KEY}" ]; then
  SUPABASE_KEY="${SUPABASE_KEY}"
elif [ -n "$supabaseKey" ]; then
  SUPABASE_KEY="$supabaseKey"
elif [ -n "$SUPABASE_KEY" ]; then
  SUPABASE_KEY="$SUPABASE_KEY"
else
  echo "UWAGA: Nie znaleziono zmiennej środowiskowej dla SUPABASE_KEY!"
  SUPABASE_KEY=""
fi

# Dla OPENROUTER_KEY
if [ -n "${openRouterKey}" ]; then
  OPENROUTER_KEY="${openRouterKey}"
elif [ -n "${OPENROUTER_KEY}" ]; then
  OPENROUTER_KEY="${OPENROUTER_KEY}"
elif [ -n "${openRouter_KEY}" ]; then
  OPENROUTER_KEY="${openRouter_KEY}"
elif [ -n "$openRouterKey" ]; then
  OPENROUTER_KEY="$openRouterKey"
elif [ -n "$OPENROUTER_KEY" ]; then
  OPENROUTER_KEY="$OPENROUTER_KEY"
elif [ -n "$openRouter_KEY" ]; then
  OPENROUTER_KEY="$openRouter_KEY"
else
  echo "UWAGA: Nie znaleziono zmiennej środowiskowej dla klucza OpenRouter!"
  OPENROUTER_KEY=""
fi

# Dla zmiennych E2E
if [ -n "${E2E_USERNAME_ID}" ]; then
  E2E_USERNAME_ID_VAR="${E2E_USERNAME_ID}"
elif [ -n "$E2E_USERNAME_ID" ]; then
  E2E_USERNAME_ID_VAR="$E2E_USERNAME_ID"
else
  E2E_USERNAME_ID_VAR=""
fi

if [ -n "${E2E_USERNAME}" ]; then
  E2E_USERNAME_VAR="${E2E_USERNAME}"
elif [ -n "$E2E_USERNAME" ]; then
  E2E_USERNAME_VAR="$E2E_USERNAME"
else
  E2E_USERNAME_VAR=""
fi

if [ -n "${E2E_PASSWORD}" ]; then
  E2E_PASSWORD_VAR="${E2E_PASSWORD}"
elif [ -n "$E2E_PASSWORD" ]; then
  E2E_PASSWORD_VAR="$E2E_PASSWORD"
else
  E2E_PASSWORD_VAR=""
fi

# Wyświetl dostępne zmienne środowiskowe dla debugowania
echo "Dostępne zmienne środowiskowe:"
env | grep -E 'supabase|SUPABASE|openRouter|OPENROUTER|E2E'

# Wyświetl wartości zmiennych (bez pełnych kluczy dla bezpieczeństwa)
echo "SUPABASE_URL: ${SUPABASE_URL}"
if [ -n "${SUPABASE_KEY}" ]; then
  echo "SUPABASE_KEY: ${SUPABASE_KEY:0:10}..."
else
  echo "SUPABASE_KEY: nie ustawiono"
fi

if [ -n "${OPENROUTER_KEY}" ]; then
  echo "OPENROUTER_KEY: ${OPENROUTER_KEY:0:10}..."
else
  echo "OPENROUTER_KEY: nie ustawiono"
fi

# Jeśli zmienne środowiskowe nie są ustawione, używamy wartości domyślnych
if [ -z "$SUPABASE_URL" ]; then
  echo "UWAGA: Zmienna środowiskowa supabaseUrl nie jest ustawiona. Używam wartości domyślnej."
  SUPABASE_URL="https://ngiunldncwxontgpzwkq.supabase.co"
fi

if [ -z "$SUPABASE_KEY" ]; then
  echo "UWAGA: Zmienna środowiskowa supabaseKey nie jest ustawiona. Używam wartości domyślnej."
  SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5naXVubGRuY3d4b250Z3B6d2txIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3MDQ2MTYsImV4cCI6MjA2MjI4MDYxNn0.xUS6bEF1_VuD3_XaOHDD5awZLf2CNwe4xLMaiH-rUZA"
fi

if [ -z "$OPENROUTER_KEY" ]; then
  echo "UWAGA: Zmienna środowiskowa openRouterKey nie jest ustawiona. Używam wartości domyślnej."
  OPENROUTER_KEY="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"
fi

# Ustawiamy wartości domyślne dla zmiennych E2E, jeśli nie są ustawione
if [ -z "$E2E_USERNAME_ID_VAR" ]; then
  echo "UWAGA: Zmienna środowiskowa E2E_USERNAME_ID nie jest ustawiona. Używam wartości domyślnej."
  E2E_USERNAME_ID_VAR="123e4567-e89b-12d3-a456-426614174000"
fi

if [ -z "$E2E_USERNAME_VAR" ]; then
  echo "UWAGA: Zmienna środowiskowa E2E_USERNAME nie jest ustawiona. Używam wartości domyślnej."
  E2E_USERNAME_VAR="e2e@10x.cards"
fi

if [ -z "$E2E_PASSWORD_VAR" ]; then
  echo "UWAGA: Zmienna środowiskowa E2E_PASSWORD nie jest ustawiona. Używam wartości domyślnej."
  E2E_PASSWORD_VAR="10x.cards"
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
    return window.RUNTIME_CONFIG?.E2E_USERNAME_ID || '${E2E_USERNAME_ID_VAR}';
  },
  get E2E_USERNAME() {
    return window.RUNTIME_CONFIG?.E2E_USERNAME || '${E2E_USERNAME_VAR}';
  },
  get E2E_PASSWORD() {
    return window.RUNTIME_CONFIG?.E2E_PASSWORD || '${E2E_PASSWORD_VAR}';
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
  E2E_USERNAME_ID: '${E2E_USERNAME_ID_VAR}',
  E2E_USERNAME: '${E2E_USERNAME_VAR}',
  E2E_PASSWORD: '${E2E_PASSWORD_VAR}'
};
EOL

# Wyświetl zawartość pliku runtime-config.js (z zamaskowanymi kluczami)
echo "Runtime config file created with the following variables:"
echo "- supabaseUrl: ${SUPABASE_URL}"
echo "- supabaseKey: ${SUPABASE_KEY:0:10}..."
echo "- openRouterKey: ${OPENROUTER_KEY:0:10}..."
echo "- E2E_USERNAME_ID: ${E2E_USERNAME_ID}"
echo "- E2E_USERNAME: ${E2E_USERNAME}"
echo "- E2E_PASSWORD: ${E2E_PASSWORD:0:1}..."

echo "Runtime config file created successfully"
cat src/assets/runtime-config.js

# Kopiujemy environments.default.ts do environments.ts
echo "Kopiowanie environments.default.ts do environments.ts..."
cp src/environments/environments.default.ts src/environments/environments.ts || exit 1
echo "Plik environments.ts utworzony pomyślnie"

# Zbuduj aplikację używając różnych metod (próbujemy wszystkich dostępnych opcji)
echo "Building application..."

# Metoda 1: Użycie binarki Angular CLI z node_modules
echo "Metoda 1: Sprawdzanie, czy binarka Angular CLI istnieje..."
if [ -f "./node_modules/.bin/ng" ]; then
  echo "Znaleziono binarkę Angular CLI. Uruchamianie: ./node_modules/.bin/ng build --configuration production"
  ./node_modules/.bin/ng build --configuration production && BUILD_SUCCESS=true || echo "Metoda 1 nie powiodła się."
else
  echo "Nie znaleziono binarki Angular CLI w ./node_modules/.bin/ng"
fi

# Metoda 2: Użycie npx
if [ "$BUILD_SUCCESS" != "true" ]; then
  echo "Metoda 2: Próba użycia npx..."
  echo "Uruchamianie: npx @angular/cli build --configuration production"
  npx @angular/cli build --configuration production && BUILD_SUCCESS=true || echo "Metoda 2 nie powiodła się."
fi

# Metoda 3: Użycie globalnie zainstalowanego Angular CLI
if [ "$BUILD_SUCCESS" != "true" ]; then
  echo "Metoda 3: Próba użycia globalnie zainstalowanego Angular CLI..."
  echo "Uruchamianie: ng build --configuration production"
  ng build --configuration production && BUILD_SUCCESS=true || echo "Metoda 3 nie powiodła się."
fi

# Metoda 4: Użycie npm run
if [ "$BUILD_SUCCESS" != "true" ]; then
  echo "Metoda 4: Próba użycia npm run..."
  echo "Uruchamianie: npm run build -- --configuration production"
  npm run build -- --configuration production && BUILD_SUCCESS=true || echo "Metoda 4 nie powiodła się."
fi

# Sprawdź, czy któraś z metod się powiodła
if [ "$BUILD_SUCCESS" != "true" ]; then
  echo "Wszystkie metody budowania aplikacji nie powiodły się."
  exit 1
fi

# Sprawdź, czy katalog dist istnieje
echo "Checking build output..."
ls -la dist/angular-without-ssr/browser || exit 1

# Upewnij się, że plik _headers jest poprawnie skopiowany
echo "Checking _headers file..."
cat dist/angular-without-ssr/browser/_headers || echo "_headers file not found in output directory!"

echo "Build completed successfully!"
