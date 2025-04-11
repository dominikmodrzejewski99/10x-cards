# API Endpoint Implementation Plan: POST /generations

## 1. Przegląd punktu końcowego
Endpoint służy do inicjowania procesu generowania fiszek przy użyciu AI na podstawie tekstu wejściowego przesłanego przez użytkownika. Endpoint weryfikuje token JWT, sprawdza długość tekstu (musi być od 1000 do 10000 znaków), komunikuje się z usługą AI oraz zapisuje metadane generacji w bazie danych. Na końcu zwraca wygenerowane fiszki oraz metadane (np. generated_count, generation_duration).

## 2. Szczegóły żądania
- Metoda HTTP: POST
- Struktura URL: /generations
- Parametry:
  - Wymagane:
    - Nagłówek `Authorization` zawierający token JWT (Bearer token)
    - Ciało żądania:
      - `text`: string (tekst o długości od 1000 do 10000 znaków)
  - Opcjonalne:
    - `model`: string (nazwa modelu AI do użycia, jeśli nie podano, używany jest model domyślny)
- Przykładowe ciało żądania:
  ```json
  {
    "text": "Przykładowy tekst o długości od 1000 do 10000 znaków...",
    "model": "chosen-model-name"
  }
  ```

## 3. Wykorzystywane typy
- @types:
  - `GenerateFlashcardsCommand` (zdefiniowany w pliku `angular/src/types.ts`)
  - Dodatkowe DTO dla metadanych generacji mogą być uzupełnione według potrzeb

## 4. Szczegóły odpowiedzi
- Status 200: Generowanie zakończone sukcesem, zwracana jest lista wygenerowanych propozycji fiszek oraz metadane generacji (np. `generated_count`, `generation_duration`).
- Status 400: Błąd walidacji danych wejściowych (np. niepoprawna długość tekstu).
- Status 401: Błąd autoryzacji - brak lub nieprawidłowy token.
- Status 500: Błąd po stronie serwera (np. problem z usługą AI lub bazą danych).

## 5. Przepływ danych
1. Klient wysyła żądanie POST na endpoint `/generations` z odpowiednim tokenem JWT i danymi wejściowymi.
2. Kontroler weryfikuje autoryzację oraz waliduje dane wejściowe (sprawdzenie długości `text` oraz opcjonalnego pola `model`).
3. Dane są przekazywane do warstwy serwisowej (np. `GenerationService`), która:
   - Inicjuje wywołanie zewnętrznej usługi AI (np. Openrouter.ai)
   - Monitoruje czas generacji
   - Otrzymuje propozycje fiszek i metadane generacji
4. Informacje o generacji są zapisywane w tabeli `generation` (@db-resources), a w przypadku błędów odpowiednie logi trafiają do tabeli `generation_error_logs`.
5. Kontroler zwraca odpowiedź JSON z kodem 200 lub odpowiednim kodem błędu.

## 6. Względy bezpieczeństwa
- Uwierzytelnianie: Endpoint wymaga tokenu JWT przesłanego w nagłówku `Authorization`.
- Autoryzacja: Użytkownicy mają dostęp jedynie do swoich danych, co jest wymuszane przez mechanizmy RLS w bazie danych.
- Walidacja wejścia: Weryfikacja, czy tekst mieści się w przedziale 1000-10000 znaków oraz czy opcjonalne pole `model` jest poprawne.
- Komunikacja: Zapewnienie bezpiecznej komunikacji (HTTPS) między klientem, backendem oraz usługą AI.

## 7. Obsługa błędów
- Błąd walidacji (400): Zwracany, gdy `text` nie spełnia wymagań długościowych lub inne dane wejściowe są nieprawidłowe.
- Błąd autoryzacji (401): Zwracany w przypadku nieobecnego lub nieprawidłowego tokena.
- Błąd po stronie serwera (500): Występuje np. przy problemach z usługą AI lub zapisywaniu danych; błędy te powinny być rejestrowane w tabeli `generation_error_logs`.

## 8. Rozważania dotyczące wydajności
- Ograniczenie długości tekstu wejściowego do zakresu 1000-10000 znaków, aby zapobiec nadmiernemu obciążeniu.
- Indeksacja kolumny `user_id` w tabeli `generation` dla szybkich zapytań.
- Możliwość wprowadzenia paginacji wyników, jeżeli liczba generacji wzrośnie.

## 9. Etapy wdrożenia
1. Utworzenie lub aktualizacja endpointu POST `/generations` w warstwie kontrolera.
2. Implementacja weryfikacji tokenu JWT oraz walidacji danych wejściowych (sprawdzenie długości `text` i poprawności opcjonalnego `model`).
3. Stworzenie warstwy serwisowej (`GenerationService`), która:
   - Komunikuje się z usługą AI (np. Openrouter.ai)
   - Monitoruje czas generacji i zbiera metadane
   - Zapisuje dane generacji w bazie danych (tabela `generation`)
4. Implementacja mechanizmu rejestrowania błędów (zapisywanie informacji o błędach w tabeli `generation_error_logs`).
5. Testowanie integracyjne endpointu (testy jednostkowe i integracyjne).
6. Przegląd i optymalizacja kodu oraz weryfikacja wydajności (np. indeksacja bazy danych).
7. Aktualizacja dokumentacji API wraz z przykładami żądań i odpowiedzi. 