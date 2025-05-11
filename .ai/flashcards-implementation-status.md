# Status implementacji widoków fiszek

## Widok Generowania Fiszek (Generate View)

### Zrealizowane kroki
1. **Utworzenie routingu**:
   - Dodano ścieżkę `/generate` prowadzącą do `GenerateViewComponent` w pliku `app.routes.ts`
   - Ustawiono przekierowanie domyślne do widoku generowania (`path: ''`)

2. **Utworzenie/aktualizacja serwisów API**:
   - Zaimplementowano `GenerationApiService` do generowania propozycji fiszek
   - Zaimplementowano `FlashcardApiService` do zarządzania fiszkami (CRUD operacje)
   - Dodano metody do tworzenia fiszek, pobierania listy, aktualizacji i usuwania

3. **Utworzenie szkieletów komponentów**:
   - `GenerateViewComponent` - główny komponent kontenera
   - `SourceTextareaComponent` - formularz do wprowadzania tekstu źródłowego
   - `GenerateButtonComponent` - przycisk inicjujący generowanie
   - `LoadingIndicatorComponent` - wskaźnik ładowania
   - `ErrorMessageComponent` - wyświetlanie komunikatów błędów
   - `FlashcardProposalListComponent` - lista propozycji fiszek
   - `BulkSaveButtonComponent` - przycisk do zapisywania wszystkich propozycji

4. **Implementacja głównego komponentu**:
   - `GenerateViewComponent` z zarządzaniem stanem przy użyciu Angular Signals
   - Integracja z odpowiednimi API
   - Obsługa błędów i komunikatów

5. **Dodanie interceptora HTTP**:
   - Zaimplementowano `authInterceptor` do dodawania tokena JWT do żądań
   - Zarejestrowano interceptor w konfiguracji aplikacji

6. **Dodanie nawigacji**:
   - Utworzono pasek nawigacyjny w `app.component.html`
   - Dodano linki do widoków generowania i listy fiszek

## Widok Listy Fiszek (Flashcards List View)

### Zrealizowane kroki
1. **Utworzenie komponentów**:
   - `FlashcardListComponent` - główny komponent kontenerowy
   - `FlashcardTableComponent` - do wyświetlania tabeli fiszek
   - `FlashcardFormComponent` - formularz do dodawania/edycji fiszek

2. **Routing**:
   - Dodano ścieżkę `/flashcards` prowadzącą do `FlashcardListComponent`

3. **Implementacja `FlashcardListComponent`**:
   - Zaimplementowano zarządzanie stanem przy użyciu Angular Signals
   - Dodano metody do obsługi operacji CRUD (dodawanie, edycja, usuwanie fiszek)
   - Obsługa paginacji i wyświetlania listy fiszek
   - Implementacja modala formularza
   - Obsługa błędów i komunikatów

4. **Implementacja `FlashcardTableComponent`**:
   - Wyświetlanie tabeli fiszek z kolumnami: przód, tył, akcje
   - Obsługa interakcji użytkownika (edycja, usuwanie)
   - Obsługa paginacji i stanów pustych

5. **Implementacja `FlashcardFormComponent`**:
   - Formularz do dodawania/edycji fiszek z walidacją
   - Obsługa komunikacji z komponentem nadrzędnym

## Kolejne kroki

### Widok Generowania Fiszek
1. **Wykończenie i dopracowanie UI**:
   - Poprawienie stylów i responsywności
   - Dopracowanie animacji i przejść

2. **Testy i debugowanie**:
   - Testowanie generowania fiszek z różnymi tekstami
   - Sprawdzenie obsługi błędów i stanów granicznych
   - Testy responsywności na różnych urządzeniach

### Widok Listy Fiszek
1. **Implementacja filtrowania i sortowania**:
   - Dodanie możliwości wyszukiwania fiszek
   - Sortowanie po różnych kolumnach

2. **Usprawnienia UI**:
   - Dodanie widoku karty jako alternatywy dla tabeli
   - Podgląd fiszki przed edycją

3. **Implementacja testów jednostkowych**:
   - Testy komponentów
   - Testy integracyjne z API

### Ogólne
1. **Implementacja mechanizmu obsługi sesji**:
   - Dodanie strony logowania/rejestracji
   - Przekierowanie do logowania, gdy użytkownik nie jest zalogowany

2. **Optymalizacja wydajności**:
   - Buforowanie danych z API
   - Lazy loading dla komponentów

3. **Rozszerzenie Supabase Interceptora**:
   - Dodanie automatycznego odświeżania tokenów
   - Obsługa błędów autoryzacji 