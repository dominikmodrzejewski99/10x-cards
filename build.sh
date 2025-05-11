#!/bin/bash

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

# Skopiuj plik environments.default.ts do environments.ts
echo "Copying environment files..."
cp src/environments/environments.default.ts src/environments/environments.ts || exit 1

# Zbuduj aplikację
echo "Building application..."
npm run build:prod || exit 1

# Sprawdź, czy katalog dist istnieje
echo "Checking build output..."
ls -la dist/angular-without-ssr/browser || exit 1

echo "Build completed successfully!"
