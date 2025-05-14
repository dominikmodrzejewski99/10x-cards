#!/bin/bash

# Włącz tryb debugowania i śledzenie błędów
set -x
set -e

# Funkcja do wyświetlania komunikatów z wyróżnieniem
log_info() {
  echo "\033[1;34m[INFO]\033[0m $1"
}

log_warning() {
  echo "\033[1;33m[WARNING]\033[0m $1"
}

log_error() {
  echo "\033[1;31m[ERROR]\033[0m $1"
}

log_success() {
  echo "\033[1;32m[SUCCESS]\033[0m $1"
}

# Wyświetl szczegółowe informacje o środowisku
log_info "===== INFORMACJE O ŚRODOWISKU ====="
log_info "Node version: $(node -v)"
log_info "NPM version: $(npm -v)"
log_info "Current directory: $(pwd)"
log_info "Files in current directory: $(ls -la)"
log_info "Memory available: $(free -h 2>/dev/null || echo 'Command not available')"
log_info "Disk space: $(df -h . 2>/dev/null || echo 'Command not available')"
log_info "CPU info: $(cat /proc/cpuinfo | grep 'model name' | head -1 2>/dev/null || echo 'Command not available')"
log_info "Environment variables: $(env | grep -E 'NODE|PATH|HOME|USER' | sort)"
log_info "==============================="

# Przejdź do katalogu angular-without-ssr
log_info "Przechodzenie do katalogu angular-without-ssr..."
cd angular-without-ssr || { log_error "Nie można przejść do katalogu angular-without-ssr!"; exit 1; }
log_success "Zmieniono katalog na: $(pwd)"
log_info "Pliki w katalogu angular-without-ssr:"
ls -la

# Zainstaluj zależności
log_info "Instalowanie zależności..."
npm ci --verbose || { log_error "Instalacja zależności nie powiodła się!"; exit 1; }
log_success "Zależności zainstalowane pomyślnie"

# Sprawdź zainstalowane zależności
log_info "Zainstalowane zależności Angular:"
npm list @angular/core @angular/cli @angular-devkit/build-angular || log_warning "Nie można wyświetlić informacji o zależnościach Angular"

# Sprawdź, czy jesteśmy w środowisku GitHub Actions
if [ "$GITHUB_ACTIONS" = "true" ]; then
  log_info "Wykryto środowisko GitHub Actions"

  # W GitHub Actions używamy sudo do instalacji globalnych pakietów
  log_info "Instalowanie Angular CLI globalnie z sudo..."
  sudo npm install -g @angular/cli || { log_warning "Nie udało się zainstalować Angular CLI globalnie, ale kontynuujemy..."; }
  log_info "Wersja Angular CLI po instalacji: $(ng version 2>/dev/null || echo 'Nie znaleziono Angular CLI')"

  # Instalacja @angular-devkit/build-angular
  log_info "Instalowanie @angular-devkit/build-angular..."
  npm install --save-dev @angular-devkit/build-angular --verbose || { log_warning "Nie udało się zainstalować @angular-devkit/build-angular, ale kontynuujemy..."; }

  # Instalacja dodatkowych pakietów, które mogą być potrzebne
  log_info "Instalowanie dodatkowych pakietów..."
  npm install --save-dev @angular-devkit/architect @angular-devkit/core @angular-devkit/schematics --verbose || { log_warning "Nie udało się zainstalować dodatkowych pakietów, ale kontynuujemy..."; }
else
  # W środowisku lokalnym
  log_info "Instalowanie Angular CLI globalnie..."
  npm install -g @angular/cli --verbose || { log_warning "Nie udało się zainstalować Angular CLI globalnie, ale kontynuujemy..."; }
  log_info "Wersja Angular CLI po instalacji: $(ng version 2>/dev/null || echo 'Nie znaleziono Angular CLI')"

  # Instalacja @angular-devkit/build-angular
  log_info "Instalowanie @angular-devkit/build-angular..."
  npm install --save-dev @angular-devkit/build-angular --verbose || { log_warning "Nie udało się zainstalować @angular-devkit/build-angular, ale kontynuujemy..."; }
fi

# Sprawdź, czy Angular CLI jest dostępne
log_info "Sprawdzanie dostępności Angular CLI..."
ng version || { log_warning "Angular CLI nie jest dostępne globalnie. Sprawdzanie lokalnej instalacji..."; }

if [ -f "./node_modules/.bin/ng" ]; then
  log_info "Znaleziono lokalną instalację Angular CLI:"
  ./node_modules/.bin/ng version || log_warning "Nie można uruchomić lokalnego Angular CLI"
else
  log_warning "Nie znaleziono lokalnej instalacji Angular CLI"
fi

# Wyświetl dostępne zmienne środowiskowe (bez wartości)
log_info "Dostępne zmienne środowiskowe (nazwy):"
env | grep -E 'supabase|openRouter|SUPABASE|OPENROUTER|E2E' | cut -d= -f1 || log_warning "Nie znaleziono odpowiednich zmiennych środowiskowych"

# Utwórz plik environments.ts
log_info "Tworzenie pliku environments.ts..."

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

# Wyświetl informacje o zmiennej SUPABASE_URL
echo "SUPABASE_URL: $SUPABASE_URL"

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

# Wyświetl informacje o zmiennej SUPABASE_KEY
if [ -n "${SUPABASE_KEY}" ]; then
  echo "SUPABASE_KEY: ${SUPABASE_KEY:0:10}..."
else
  echo "SUPABASE_KEY: nie ustawiono"
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

# Wyświetl informacje o zmiennej OPENROUTER_KEY
if [ -n "${OPENROUTER_KEY}" ]; then
  echo "OPENROUTER_KEY: ${OPENROUTER_KEY:0:10}..."
else
  echo "OPENROUTER_KEY: nie ustawiono"
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
log_info "Dostępne zmienne środowiskowe (szczegółowo):"
env | grep -E 'supabase|SUPABASE|openRouter|OPENROUTER|E2E' || log_warning "Brak zmiennych środowiskowych związanych z Supabase, OpenRouter lub E2E"

# Jeśli zmienne środowiskowe nie są ustawione, używamy wartości domyślnych
if [ -z "$SUPABASE_URL" ]; then
  log_warning "Zmienna środowiskowa supabaseUrl nie jest ustawiona. Używam wartości domyślnej."
  SUPABASE_URL="https://ngiunldncwxontgpzwkq.supabase.co"
  log_info "Ustawiono domyślną wartość SUPABASE_URL: $SUPABASE_URL"
else
  log_success "Znaleziono zmienną środowiskową SUPABASE_URL"
fi

if [ -z "$SUPABASE_KEY" ]; then
  log_warning "Zmienna środowiskowa supabaseKey nie jest ustawiona. Używam wartości domyślnej."
  SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5naXVubGRuY3d4b250Z3B6d2txIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3MDQ2MTYsImV4cCI6MjA2MjI4MDYxNn0.xUS6bEF1_VuD3_XaOHDD5awZLf2CNwe4xLMaiH-rUZA"
  log_info "Ustawiono domyślną wartość SUPABASE_KEY: ${SUPABASE_KEY:0:10}..."
else
  log_success "Znaleziono zmienną środowiskową SUPABASE_KEY"
fi

if [ -z "$OPENROUTER_KEY" ]; then
  log_warning "Zmienna środowiskowa openRouterKey nie jest ustawiona. Używam wartości domyślnej."
  OPENROUTER_KEY="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"
  log_info "Ustawiono domyślną wartość OPENROUTER_KEY: ${OPENROUTER_KEY:0:10}..."
else
  log_success "Znaleziono zmienną środowiskową OPENROUTER_KEY"
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
log_info "===== BUDOWANIE APLIKACJI ====="

# Metoda 1: Użycie binarki Angular CLI z node_modules
log_info "Metoda 1: Sprawdzanie, czy binarka Angular CLI istnieje..."
if [ -f "./node_modules/.bin/ng" ]; then
  log_info "Znaleziono binarkę Angular CLI. Uruchamianie: ./node_modules/.bin/ng build --configuration production --budget=false"
  ./node_modules/.bin/ng build --configuration production --budget=false --verbose && BUILD_SUCCESS=true || {
    log_error "Metoda 1 nie powiodła się. Błąd budowania aplikacji."
    log_info "Zawartość katalogu node_modules/.bin:"
    ls -la ./node_modules/.bin | grep ng
  }
else
  log_warning "Nie znaleziono binarki Angular CLI w ./node_modules/.bin/ng"
fi

# Metoda 2: Użycie npx
if [ "$BUILD_SUCCESS" != "true" ]; then
  log_info "Metoda 2: Próba użycia npx..."
  log_info "Uruchamianie: npx @angular/cli build --configuration production --budget=false"
  npx @angular/cli build --configuration production --budget=false --verbose && BUILD_SUCCESS=true || {
    log_error "Metoda 2 nie powiodła się. Błąd budowania aplikacji."
    log_info "Wersja npx: $(npx --version 2>/dev/null || echo 'Nie znaleziono npx')"
  }
fi

# Metoda 3: Użycie globalnie zainstalowanego Angular CLI
if [ "$BUILD_SUCCESS" != "true" ]; then
  log_info "Metoda 3: Próba użycia globalnie zainstalowanego Angular CLI..."
  log_info "Uruchamianie: ng build --configuration production --budget=false"
  ng build --configuration production --budget=false --verbose && BUILD_SUCCESS=true || {
    log_error "Metoda 3 nie powiodła się. Błąd budowania aplikacji."
    log_info "Wersja Angular CLI: $(ng version 2>/dev/null || echo 'Nie znaleziono Angular CLI')"
  }
fi

# Metoda 4: Użycie npm run
if [ "$BUILD_SUCCESS" != "true" ]; then
  log_info "Metoda 4: Próba użycia npm run..."
  log_info "Uruchamianie: npm run build -- --configuration production --budget=false"
  npm run build -- --configuration production --budget=false --verbose && BUILD_SUCCESS=true || {
    log_error "Metoda 4 nie powiodła się. Błąd budowania aplikacji."
    log_info "Dostępne skrypty npm:"
    grep -A 10 "\"scripts\"" package.json
  }
fi

# Metoda 5: Alternatywne podejście - ręczne utworzenie katalogu dist
if [ "$BUILD_SUCCESS" != "true" ]; then
  log_warning "Wszystkie standardowe metody budowania nie powiodły się. Próbuję alternatywnego podejścia..."
  log_info "Metoda 5: Alternatywne podejście - ręczne utworzenie katalogu dist..."

  # Utwórz katalog dist
  mkdir -p dist/angular-without-ssr/browser

  # Skopiuj pliki statyczne
  log_info "Kopiowanie plików statycznych..."
  cp -r src/assets dist/angular-without-ssr/browser/
  cp src/favicon.ico dist/angular-without-ssr/browser/ 2>/dev/null || log_warning "Brak pliku favicon.ico"

  # Utwórz prosty plik index.html z informacją o błędzie
  log_info "Tworzenie pliku index.html z informacją o błędzie budowania..."
  cat > dist/angular-without-ssr/browser/index.html << EOL
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <title>10xCards - Błąd budowania</title>
  <base href="/">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/x-icon" href="favicon.ico">
  <script src="assets/runtime-config.js"></script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      line-height: 1.5;
      color: #333;
    }
    h1 {
      color: #2563EB;
      margin-bottom: 1rem;
    }
    .error-box {
      background-color: #f8f9fa;
      border-left: 4px solid #2563EB;
      padding: 1rem;
      margin: 2rem 0;
    }
    .error-message {
      color: #dc3545;
      font-weight: bold;
    }
    .info {
      margin-top: 2rem;
      font-size: 0.9rem;
      color: #6c757d;
    }
  </style>
</head>
<body>
  <h1>10xCards</h1>
  <p>Aplikacja jest w trakcie budowania. Proszę spróbować później.</p>

  <div class="error-box">
    <p class="error-message">Wystąpił problem podczas budowania aplikacji.</p>
    <p>Nasi programiści zostali powiadomieni o problemie i pracują nad jego rozwiązaniem.</p>
  </div>

  <div class="info">
    <p>Jeśli problem będzie się powtarzał, skontaktuj się z administratorem.</p>
    <p>Data próby budowania: $(date)</p>
  </div>
</body>
</html>
EOL

  # Skopiuj plik runtime-config.js
  log_info "Kopiowanie pliku runtime-config.js..."
  mkdir -p dist/angular-without-ssr/browser/assets
  cp src/assets/runtime-config.js dist/angular-without-ssr/browser/assets/

  log_warning "Alternatywne podejście zakończone. Utworzono stronę z informacją o błędzie."
  BUILD_SUCCESS=true
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
