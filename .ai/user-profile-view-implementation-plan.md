# Plan implementacji widoku: Profil Użytkownika

## 1. Przegląd
Widok Profilu Użytkownika dostępny pod ścieżką `/profile` pozwala zalogowanemu użytkownikowi na przeglądanie podstawowych informacji o swoim koncie (adres e-mail) oraz na zainicjowanie procesu trwałego usunięcia swojego konta wraz ze wszystkimi powiązanymi danymi. Operacja usunięcia wymaga dodatkowego potwierdzenia ze strony użytkownika.

## 2. Routing widoku
Widok powinien być dostępny pod ścieżką `/profile`. Dostęp do tej ścieżki powinien być chroniony przez `AuthGuard`, wymagający zalogowania użytkownika.

## 3. Struktura komponentów
Widok składa się z jednego głównego komponentu routowalnego:
```
UserProfileComponent (/profile) [Route Component]
├── p-toast (PrimeNG MessageService)
├── p-confirmDialog (PrimeNG ConfirmationService)
└── p-card [styleClass]="'max-w-lg mx-auto mt-10'">
    ├── ng-template pTemplate="title"
    │   └── h2.text-center Profil Użytkownika
    ├── ng-template pTemplate="content"
    │   ├── div.mb-4
    │   │   └── p *ngIf="userEmail()"> E-mail: <span class="font-semibold">{{ userEmail() }}</span> </p>
    │   │   └── p *ngIf="!userEmail() && !loading()"> Ładowanie danych użytkownika... </p> 
    │   └── p-button label="Usuń konto" icon="pi pi-trash" severity="danger" (click)="confirmDeleteAccount()" [loading]="loading()"
```

## 4. Szczegóły komponentów

### `UserProfileComponent`
-   **Opis komponentu:** Komponent routowalny dla ścieżki `/profile`. Odpowiedzialny za wyświetlanie emaila zalogowanego użytkownika (pobranego z `AuthService`), obsługę procesu usuwania konta poprzez interakcję z `ConfirmationService` i `AuthService`, zarządzanie stanem ładowania oraz informowanie użytkownika o wyniku operacji za pomocą `MessageService`.
-   **Główne elementy:** Komponent `p-card` do grupowania treści, wyświetlanie emaila, przycisk `p-button` "Usuń konto", wykorzystanie `ConfirmationService` (`p-confirmDialog`) i `MessageService` (`p-toast`).
-   **Obsługiwane interakcje/zdarzenia:**
    -   Inicjalizacja (`ngOnInit`): Pobranie danych użytkownika (email) z `AuthService`.
    -   Kliknięcie przycisku "Usuń konto": Wywołanie metody `confirmDeleteAccount()`.
    -   Potwierdzenie w `p-confirmDialog`: Wywołanie metody `deleteAccount()`.
-   **Obsługiwana walidacja:** Brak walidacji danych wejściowych; polega na potwierdzeniu użytkownika w modalu.
-   **Typy:** `AuthService`, `ConfirmationService`, `MessageService`, `Router`, `User` (Supabase) lub `UserDTO` (do pobrania emaila).
-   **Propsy:** Brak (komponent routowalny).

## 5. Typy
-   **`User` (z `@supabase/supabase-js`):** Obiekt użytkownika dostarczany przez Supabase Auth, zawiera m.in. `email`.
    ```typescript
    // Przykład struktury (może się różnić w zależności od wersji SDK)
    interface User {
      id: string;
      app_metadata: { provider?: string; providers?: string[]; [key: string]: any; };
      user_metadata: { [key: string]: any; };
      aud: string;
      confirmation_sent_at?: string;
      recovery_sent_at?: string;
      email_change_sent_at?: string;
      new_email?: string;
      invited_at?: string;
      action_link?: string;
      email?: string;
      phone?: string;
      created_at: string;
      confirmed_at?: string;
      email_confirmed_at?: string;
      phone_confirmed_at?: string;
      last_sign_in_at?: string;
      role?: string;
      updated_at?: string;
      identities?: UserIdentity[];
      factors?: Factor[];
    }
    ```
-   **`UserDTO` (z `src/types.ts`):** Alternatywnie, jeśli `AuthService` mapuje dane na ten typ.
    ```typescript
    export interface UserDTO {
      id: string;
      email: string;
      created_at: string;
      updated_at: string;
    }
    ```
-   **`ConfirmationService` (PrimeNG):** Serwis do wyświetlania modali potwierdzających.
-   **`MessageService` (PrimeNG):** Serwis do wyświetlania powiadomień toast.

## 6. Zarządzanie stanem
-   **`UserProfileComponent`:** Używa Angular Signals do zarządzania stanem lokalnym:
    -   `userEmail = signal<string | null>(null)`: Przechowuje pobrany email użytkownika.
    -   `loading = signal<boolean>(false)`: Wskazuje, czy operacja usuwania konta jest w toku.
-   Globalny stan autentykacji (czy użytkownik jest zalogowany, obiekt `User`) jest zarządzany i udostępniany przez `AuthService`.

## 7. Integracja API (Poprzez AuthService)
-   **Pobranie danych użytkownika:** W `ngOnInit`, komponent wywołuje metodę lub uzyskuje dostęp do sygnału w `AuthService` (np. `authService.currentUser()`) w celu pobrania obiektu zalogowanego użytkownika i wyekstrahowania adresu `email`.
-   **Usunięcie konta:** Po potwierdzeniu przez użytkownika, komponent wywołuje metodę `AuthService.deleteCurrentUserAccount(): Promise<void>` (lub `Observable<void>`).
    -   **Implementacja w `AuthService` (Założenie):** Ta metoda musi istnieć w `AuthService`. Powinna ona wywołać odpowiedni mechanizm backendowy (np. dedykowaną Supabase Edge Function), który:
        1.  Zweryfikuje tożsamość użytkownika (na podstawie JWT).
        2.  Usunie wszystkie dane powiązane z `user_id` (np. fiszki, generacje) z bazy danych.
        3.  Wywoła funkcję administracyjną Supabase (`auth.admin.deleteUser(userId)`) w celu usunięcia użytkownika z systemu Auth.
        4.  Po pomyślnym zakończeniu operacji backendowej, `AuthService` powinien również wywołać `supabase.auth.signOut()`, aby wyczyścić lokalną sesję.
    -   **Żądanie/Odpowiedź (dla `AuthService.deleteCurrentUserAccount`):**
        -   Żądanie: Brak parametrów.
        -   Odpowiedź (sukces): `void` (lub `null`).
        -   Odpowiedź (błąd): Zgłoszenie błędu (np. `HttpErrorResponse` lub niestandardowy błąd).

## 8. Interakcje użytkownika
-   **Wejście na `/profile`:** Wyświetlenie adresu email i przycisku "Usuń konto".
-   **Kliknięcie "Usuń konto":** Otwarcie modala z prośbą o potwierdzenie i ostrzeżeniem o nieodwracalności.
-   **Potwierdzenie usunięcia ("Tak"):** Przycisk "Usuń konto" pokazuje stan ładowania. Wywoływana jest logika usuwania w `AuthService`. Po sukcesie: użytkownik jest wylogowany, przekierowany na `/login`, widzi powiadomienie o sukcesie. Po błędzie: stan ładowania znika, widzi powiadomienie o błędzie.
-   **Anulowanie usunięcia ("Nie"):** Modal potwierdzenia jest zamykany.

## 9. Warunki i walidacja
-   Jedynym warunkiem po stronie UI jest uzyskanie jawnego potwierdzenia od użytkownika w modalu (`p-confirmDialog`) przed wykonaniem operacji usunięcia konta.
-   Dostęp do ścieżki `/profile` jest warunkowany stanem zalogowania (realizowane przez `AuthGuard`).

## 10. Obsługa błędów
-   **Błąd pobrania danych użytkownika:** Jeśli `AuthService` nie dostarczy danych użytkownika w `ngOnInit`, komponent powinien wyświetlić odpowiedni komunikat (np. "Nie można załadować danych profilu.").
-   **Błąd podczas usuwania konta:** Jeśli `AuthService.deleteCurrentUserAccount()` zwróci błąd, komponent ustawi `loading.set(false)` i użyje `MessageService` do wyświetlenia komunikatu toast (np. "Wystąpił błąd podczas usuwania konta. Spróbuj ponownie.").
-   **Błąd sieciowy / Inne:** Ogólne błędy komunikacji powinny być obsługiwane globalnie (interceptor) lub lokalnie, informując użytkownika przez `MessageService`.

## 11. Kroki implementacji
1.  **Utworzenie komponentu:** Stworzyć plik dla `UserProfileComponent`.
2.  **Routing:** Skonfigurować ścieżkę `/profile` wskazującą na `UserProfileComponent` i zabezpieczyć ją za pomocą `AuthGuard`.
3.  **Implementacja `AuthService` (metoda usuwania):**
    -   Dodać metodę `deleteCurrentUserAccount(): Promise<void>` (lub `Observable<void>`).
    -   Zaimplementować w niej logikę wywołania odpowiedniej funkcji backendowej Supabase (np. `supabase.functions.invoke('delete-user-account')`) lub innej logiki usuwania.
    -   Upewnić się, że metoda obsługuje błędy i wywołuje `signOut()` po sukcesie.
4.  **Implementacja `UserProfileComponent`:**
    -   Zdefiniować sygnały `userEmail` i `loading`.
    -   Wstrzyknąć `AuthService`, `ConfirmationService`, `MessageService`, `Router`.
    -   W `ngOnInit` pobrać dane aktualnego użytkownika z `AuthService` i ustawić `userEmail`.
    -   Zaimplementować metodę `confirmDeleteAccount()`:
        -   Wywołać `confirmationService.confirm()` z odpowiednim komunikatem (ostrzeżenie o nieodwracalności i usunięciu danych) i ikoną.
        -   W callbacku `accept` wywołać metodę `deleteAccount()`.
    -   Zaimplementować metodę `deleteAccount()`:
        -   Ustawić `loading.set(true)`.
        -   Wywołać `authService.deleteCurrentUserAccount()`.
        -   Obsłużyć sukces: ustawić `loading.set(false)`, wyświetlić `messageService.add()` (sukces), nawigować do `/login` (`router.navigate`).
        -   Obsłużyć błąd: ustawić `loading.set(false)`, wyświetlić `messageService.add()` (błąd).
    -   Zaimplementować szablon HTML z `p-card`, wyświetlaniem `userEmail()`, przyciskiem `p-button` z bindowaniem `(click)` i `[loading]`, oraz `p-toast` i `p-confirmDialog`.
5.  **Konfiguracja Modułu:** Zaimportować wymagane moduły PrimeNG (`CardModule`, `ButtonModule`, `ToastModule`, `ConfirmDialogModule`). Zapewnić dostarczenie `ConfirmationService` i `MessageService` (zazwyczaj w komponencie głównym aplikacji lub module core).
6.  **Implementacja funkcji backendowej (jeśli konieczna):** Stworzyć i wdrożyć Supabase Edge Function odpowiedzialną za bezpieczne usuwanie danych użytkownika i konta.
7.  **Styling:** Zastosować Tailwind do stylizacji komponentu.
8.  **Testowanie:** Testy jednostkowe dla `UserProfileComponent` (mockując serwisy) i `AuthService`. Testy E2E dla przepływu usuwania konta. 