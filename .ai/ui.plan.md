# Architektura UI dla 10x-cards

## 1. Przegląd struktury UI

Architektura UI dla aplikacji 10x-cards została zaprojektowana jako Single Page Application (SPA) przy użyciu Angulara 19 z SSR. Centralnym elementem jest `Dashboard`, który służy jako główny kontener i punkt nawigacyjny po zalogowaniu użytkownika. Aplikacja składa się z dedykowanych widoków dla kluczowych funkcjonalności: uwierzytelniania, generowania fiszek AI, zarządzania fiszkami, panelu użytkownika oraz sesji nauki. Do zarządzania stanem aplikacji wykorzystany zostanie NgRX, a komunikacja z API będzie optymalizowana za pomocą technik debouncingu (RxJS). Interfejs będzie responsywny i dostępny (WCAG AA), zbudowany przy użyciu komponentów PrimeNG stylizowanych za pomocą Tailwind CSS. Nawigacja opiera się na Angular Routing, z planowanym wdrożeniem Route Guards dla zabezpieczenia ścieżek.

## 2. Lista widoków

**1. Widok Uwierzytelniania (Auth)**
    - **Ścieżka:** `/login ` i `/register`
    - **Główny cel:** Umożliwienie użytkownikom rejestracji i logowania do aplikacji.
    - **Kluczowe informacje do wyświetlenia:** Formularze logowania i rejestracji.
    - **Kluczowe komponenty widoku:**
        - Formularz logowania (pola: email, hasło, przycisk "Zaloguj")
        - Formularz rejestracji (pola: email, hasło, przycisk "Zarejestruj")
        - Przełącznik między logowaniem a rejestracją.
        - Komunikaty błędów inline dla walidacji i błędów API (np. nieprawidłowe dane, zajęty email).
    - **UX, dostępność i względy bezpieczeństwa:**
        - UX: Prosty, jasny przepływ, minimalna liczba kroków. Automatyczne przekierowanie do dashboardu po udanym logowaniu/rejestracji.
        - Dostępność: Etykiety dla pól formularza, obsługa nawigacji klawiaturą, odpowiedni kontrast.
        - Bezpieczeństwo: Komunikacja przez HTTPS, hasła przesyłane bezpiecznie (obsługa przez Supabase Auth).


**2. Widok Generowania Fiszki (Generate)**
    - **Ścieżka:** `/generate`
    - **Główny cel:** Umożliwienie użytkownikom wklejenia tekstu i wygenerowania propozycji fiszek za pomocą AI. Przeglądanie, akceptacja, edycja lub odrzucenie wygenerowanych propozycji. Zapisanie wybranych fiszek.
    - **Kluczowe informacje do wyświetlenia:** Pole tekstowe na tekst źródłowy, lista wygenerowanych propozycji fiszek (przód, tył), stan ładowania.
    - **Kluczowe komponenty widoku:**
        - Pole tekstowe (`textarea`) na tekst źródłowy (z walidacją długości 1000-10000 znaków i komunikatami inline).
        - Przycisk "Generuj Fiszki".
        - Wskaźnik ładowania (np. spinner PrimeNG) podczas komunikacji z API AI.
        - Lista wygenerowanych propozycji fiszek (każda z przyciskami: Akceptuj, Edytuj, Odrzuć).
        - Przyciski akcji zbiorczej: "Zapisz zaakceptowane", "Zapisz wszystkie" (lub podobne, zależnie od ostatecznej decyzji projektowej).
        - Komunikaty błędów inline (np. błąd API AI, przekroczenie limitu znaków).
        - Modal Edycji Fiszki (ten sam co w Widoku Listy Fiszki) uruchamiany przyciskiem "Edytuj".
    - **UX, dostępność i względy bezpieczeństwa:**
        - UX: Intuicyjny proces: wklej -> generuj -> przeglądaj -> zapisz. Jasne wskazanie statusu generowania. Łatwa interakcja z propozycjami. Domyślny widok po zalogowaniu/rejestracji.
        - Dostępność: Dostępność pola tekstowego, przycisków, listy wyników. Komunikowanie stanu ładowania (np. przez ARIA).
        - Bezpieczeństwo: Walidacja długości tekstu po stronie klienta i serwera. Ograniczenie liczby zapytań do API (debouncing).

**3. Widok Listy Fiszki (Flashcard List)**
    - **Ścieżka:** `/flashcards`
    - **Główny cel:** Wyświetlanie listy zapisanych fiszek użytkownika. Umożliwienie ręcznego dodawania, edycji i usuwania fiszek.
    - **Kluczowe informacje do wyświetlenia:** Lista fiszek użytkownika (przód, tył, źródło - opcjonalnie). Opcje filtrowania/sortowania (opcjonalnie w MVP).
    - **Kluczowe komponenty widoku:**
        - Tabela lub lista fiszek (np. `p-table` lub `p-dataView` z PrimeNG).
        - Przyciski akcji dla każdej fiszki: "Edytuj", "Usuń".
        - Przycisk "Dodaj nową fiszkę".
        - Modal Edycji/Dodawania Fiszki (współdzielony komponent):
            - Pola formularza: "Przód", "Tył".
            - Przyciski: "Zapisz", "Anuluj".
            - Walidacja inline (np. pola nie mogą być puste).
        - Modal potwierdzenia usunięcia (np. `p-confirmDialog` PrimeNG).
        - Paginacja (jeśli liczba fiszek jest duża).
        - Stan pusty (gdy użytkownik nie ma jeszcze fiszek).
    - **UX, dostępność i względy bezpieczeństwa:**
        - UX: Przejrzyste zarządzanie fiszkami. Łatwy dostęp do edycji i usuwania. Potwierdzenie przed usunięciem.
        - Dostępność: Dostępność tabeli/listy, przycisków, modali. Odpowiednie etykiety i obsługa klawiatury.
        - Bezpieczeństwo: Operacje modyfikacji/usuwania wymagają potwierdzenia. Dostęp tylko do własnych fiszek (zapewniane przez API RLS).

**4. Widok Panelu Użytkownika (User Panel)**
    - **Ścieżka:** `/profile`
    - **Główny cel:** Wyświetlanie podstawowych informacji o koncie użytkownika. Umożliwienie usunięcia konta.
    - **Kluczowe informacje do wyświetlenia:** Adres e-mail użytkownika.
    - **Kluczowe komponenty widoku:**
        - Wyświetlenie adresu e-mail.
        - Przycisk "Usuń konto" (z modalem potwierdzającym).
    - **UX, dostępność i względy bezpieczeństwa:**
        - UX: Prosty dostęp do informacji o koncie i opcji jego usunięcia.
        - Dostępność: Czytelne przedstawienie informacji, dostępność przycisku i modala potwierdzającego.
        - Bezpieczeństwo: Operacja usunięcia konta wymaga jednoznacznego potwierdzenia.

**5. Widok Sesji Nauki (Study Session)**
    - **Ścieżka:** `/study`
    - **Główny cel:** Przeprowadzenie sesji nauki fiszek z wykorzystaniem algorytmu powtórek (spaced repetition).
    - **Kluczowe informacje do wyświetlenia:** Przód fiszki, tył fiszki (po interakcji), opcje oceny znajomości fiszki.
    - **Kluczowe komponenty widoku:**
        - Wyświetlanie przodu fiszki.
        - Przycisk/Interakcja "Pokaż odpowiedź".
        - Wyświetlanie tyłu fiszki.
        - Przyciski oceny znajomości (zgodne z wymaganiami zewnętrznego algorytmu, np. "Łatwe", "Średnie", "Trudne" lub podobne).
        - Wskaźnik postępu sesji (opcjonalnie).
        - Ekran zakończenia sesji.
    - **UX, dostępność i względy bezpieczeństwa:**
        - UX: Płynny przepływ nauki: pokaż pytanie -> pokaż odpowiedź -> oceń -> następna fiszka. Jasne instrukcje.
        - Dostępność: Czytelność treści fiszek, dostępność przycisków interakcji i oceny.
        - Bezpieczeństwo: Interakcja z zewnętrznym algorytmem odbywa się w sposób bezpieczny.

## 3. Mapa podróży użytkownika

**Główny przepływ (Generowanie AI):**

1.  **Użytkownik wchodzi na stronę:** Zostaje przekierowany do `Widoku Uwierzytelniania` (`/auth`).
2.  **Logowanie/Rejestracja:** Użytkownik wprowadza dane i klika "Zaloguj" lub "Zarejestruj".
3.  **Przekierowanie:** Po pomyślnym uwierzytelnieniu, użytkownik jest przekierowywany do `Widoku Generowania Fiszki` (`/generate`) wewnątrz `Dashboardu`.
4.  **Wprowadzenie tekstu:** Użytkownik wkleja tekst (1000-10000 znaków) do pola tekstowego. Walidacja inline informuje o ewentualnych problemach z długością.
5.  **Generowanie:** Użytkownik klika "Generuj Fiszki". Wyświetlany jest wskaźnik ładowania. Aplikacja wysyła zapytanie do `POST /generations`.
6.  **Przeglądanie propozycji:** Po otrzymaniu odpowiedzi z API, wskaźnik ładowania znika, a pod polem tekstowym wyświetlana jest lista propozycji fiszek.
7.  **Interakcja z propozycjami:** Dla każdej propozycji użytkownik może:
    *   Kliknąć "Akceptuj" (fiszka jest oznaczana do zapisu).
    *   Kliknąć "Edytuj": Otwiera się `Modal Edycji`, użytkownik modyfikuje przód/tył, klika "Zapisz" w modalu (fiszka jest oznaczana jako edytowana i zaakceptowana).
    *   Kliknąć "Odrzuć" (fiszka jest ignorowana).
8.  **Zapis fiszek:** Po przejrzeniu propozycji, użytkownik klika "Zapisz zaakceptowane" (lub podobny przycisk akcji zbiorczej). Aplikacja wysyła zapytanie do `POST /flashcards` z listą zaakceptowanych/edytowanych fiszek.
9.  **Potwierdzenie/Przekierowanie:** Po pomyślnym zapisie, użytkownik może otrzymać komunikat potwierdzający (np. toast) i opcjonalnie zostać przekierowany do `Widoku Listy Fiszki` (`/flashcards`), aby zobaczyć nowo dodane pozycje.

**Inne kluczowe przepływy:**

*   **Ręczne dodawanie fiszki:** `Dashboard` -> `Widok Listy Fiszki` -> Kliknięcie "Dodaj nową fiszkę" -> Wypełnienie `Modala Edycji/Dodawania` -> Kliknięcie "Zapisz" -> Fiszka pojawia się na liście (`POST /flashcards`).
*   **Edycja fiszki:** `Dashboard` -> `Widok Listy Fiszki` -> Kliknięcie "Edytuj" przy fiszce -> Modyfikacja w `Modalu Edycji` -> Kliknięcie "Zapisz" -> Zmiany widoczne na liście (`PUT /flashcards/{id}`).
*   **Usuwanie fiszki:** `Dashboard` -> `Widok Listy Fiszki` -> Kliknięcie "Usuń" przy fiszce -> Potwierdzenie w `Modalu Potwierdzenia` -> Fiszka znika z listy (`DELETE /flashcards/{id}`).
*   **Rozpoczęcie sesji nauki:** `Dashboard` -> Nawigacja do `Widoku Sesji Nauki` (`/study`) -> Rozpoczęcie sesji.

## 4. Układ i struktura nawigacji

*   **Układ główny:** Po zalogowaniu, aplikacja wykorzystuje stały układ (`Dashboard`) zawierający:
    *   **Panel nawigacyjny:** Implementowany jako boczny pasek (sidebar) lub górne menu, zawsze widoczny. Zawiera linki do głównych sekcji: Generuj (`/generate`), Moje Fiszki (`/flashcards`), Sesja Nauki (`/study`), Profil (`/profile`).
    *   **Obszar treści:** Główna część strony, gdzie renderowane są poszczególne widoki za pomocą Angular Router (`<router-outlet>`).
*   **Nawigacja:** Odbywa się poprzez klikanie linków w panelu nawigacyjnym. Angular Router zarządza przełączaniem widoków w obszarze treści.
*   **Widok Auth:** Jest osobnym widokiem poza głównym układem `Dashboardu`, dostępnym przed zalogowaniem.

## 5. Kluczowe komponenty

*   **Panel Nawigacyjny (Navigation Panel):** Wspólny komponent (sidebar lub topbar) zapewniający spójną nawigację po aplikacji.
*   **Modal Edycji/Dodawania Fiszki (Flashcard Edit/Add Modal):** Współdzielony modal (np. `p-dialog` PrimeNG) z formularzem do tworzenia i edycji fiszek (pola: Przód, Tył), z walidacją inline i przyciskami akcji.
*   **Lista Fiszki/Propozycji (Flashcard/Proposal List):** Komponent wyświetlający listę fiszek (w `/flashcards`) lub propozycji (w `/generate`), z odpowiednimi przyciskami akcji (Edytuj, Usuń, Akceptuj, Odrzuć). Może wykorzystywać `p-table` lub `p-dataView`.
*   **Wskaźnik Ładowania (Loading Indicator):** Komponent (np. `p-progressSpinner` PrimeNG) używany do informowania użytkownika o trwających operacjach (np. generowanie AI, zapis danych).
*   **Komponent Karty Fiszki (Flashcard Card):** Używany w `Widoku Sesji Nauki` do wyświetlania przodu i tyłu fiszki.
*   **Modal Potwierdzenia (Confirmation Modal):** Standardowy modal (np. `p-confirmDialog`) używany do potwierdzania krytycznych akcji (np. usuwanie fiszki, usuwanie konta).
*   **Komunikaty Błędów Inline (Error Messages):** Komponenty do wyświetlania błędów walidacji przy polach formularzy oraz globalnych błędów API (np. jako `p-toast`). 