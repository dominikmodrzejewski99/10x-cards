import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, from, map, catchError, throwError, switchMap, of } from 'rxjs';
import { environment } from '../../environments/environments';
import { FlashcardProposalDTO, FlashcardDTO, CreateFlashcardCommand, UpdateFlashcardCommand } from '../../types';
import { SupabaseClient } from '@supabase/supabase-js';
import { Store } from '@ngrx/store';
import { selectUser } from '../auth/store/auth.selectors';
import { SupabaseClientFactory } from './supabase-client.factory';

@Injectable({
  providedIn: 'root'
})
export class FlashcardApiService {
  private apiUrl = environment.supabaseUrl + '/functions/v1'; // Ścieżka API Supabase
  private supabase: SupabaseClient;
  private useMockData = false; // Tryb deweloperski wyłączony

  constructor(
    private http: HttpClient,
    private store: Store,
    private supabaseFactory: SupabaseClientFactory
  ) {
    this.supabase = this.supabaseFactory.getClient();
    console.log('FlashcardApiService: Inicjalizacja klienta Supabase');
  }

  /**
   * Pobiera ID zalogowanego użytkownika bezpośrednio z Supabase Auth
   * @returns Observable zawierający ID użytkownika lub null, jeśli użytkownik nie jest zalogowany
   */
  private getCurrentUserId(): Observable<string | null> {
    return from(this.supabase.auth.getSession()).pipe(
      map(response => {
        if (response.error) {
          console.error('Błąd podczas pobierania sesji:', response.error);
          return null;
        }
        const userId = response.data.session?.user?.id || null;
        console.log('Pobrano ID użytkownika z Supabase Auth:', userId);
        return userId;
      }),
      catchError(error => {
        console.error('Błąd podczas pobierania ID użytkownika:', error);
        return of(null);
      })
    );
  }

  /**
   * Pobiera dane zalogowanego użytkownika bezpośrednio z Supabase Auth
   * @returns Observable zawierający dane użytkownika lub null, jeśli użytkownik nie jest zalogowany
   */
  private getCurrentUser(): Observable<any | null> {
    return from(this.supabase.auth.getUser()).pipe(
      map(response => {
        if (response.error) {
          console.error('Błąd podczas pobierania danych użytkownika:', response.error);
          return null;
        }
        const user = response.data.user;
        console.log('Pobrano dane użytkownika z Supabase Auth:', user);
        return user;
      }),
      catchError(error => {
        console.error('Błąd podczas pobierania danych użytkownika:', error);
        return of(null);
      })
    );
  }

  /**
   * Sprawdza, czy użytkownik jest zalogowany i ma ważny token
   * @param userId ID użytkownika
   * @returns Observable zawierający true, jeśli użytkownik jest zalogowany
   */
  private ensureUserExists(userId: string): Observable<boolean> {
    console.log('Sprawdzanie, czy użytkownik jest zalogowany:', userId);

    // Pobieramy sesję użytkownika z Supabase Auth
    return from(this.supabase.auth.getSession()).pipe(
      map(response => {
        console.log('Odpowiedź z Supabase Auth (getSession):', response);

        if (response.error) {
          console.error('Błąd podczas pobierania sesji:', response.error);
          return false;
        }

        if (!response.data.session) {
          console.error('Brak sesji użytkownika');
          return false;
        }

        const sessionUserId = response.data.session.user.id;
        console.log('ID użytkownika z sesji:', sessionUserId);

        // Sprawdzamy, czy ID użytkownika z sesji jest zgodne z przekazanym ID
        if (sessionUserId !== userId) {
          console.error('ID użytkownika z sesji nie zgadza się z przekazanym ID');
          return false;
        }

        console.log('Użytkownik jest zalogowany i ma ważny token');
        return true;
      }),
      catchError(error => {
        console.error('Błąd podczas sprawdzania sesji użytkownika:', error);
        return of(false);
      })
    );
  }

  /**
   * Tworzy nowe fiszki na podstawie dostarczonych propozycji (używane w widoku generowania)
   * @param flashcards Tablica propozycji fiszek do zapisania
   * @returns Observable zawierający zapisane fiszki
   */
  createFlashcards(flashcards: FlashcardProposalDTO[]): Observable<FlashcardDTO[]> {
    console.log('Zapisywanie fiszek do Supabase:', flashcards);

    return this.getCurrentUserId().pipe(
      switchMap(userId => {
        if (!userId) {
          console.error('Nie można zapisać fiszek: Użytkownik nie jest zalogowany');
          return throwError(() => new Error('Użytkownik nie jest zalogowany'));
        }

        console.log('Zapisywanie fiszek dla użytkownika o ID:', userId);

        // Przygotowanie danych do zapisu
        const flashcardsToInsert = flashcards.map(proposal => ({
          front: proposal.front,
          back: proposal.back,
          source: proposal.source,
          user_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

        console.log('Dane do zapisu:', flashcardsToInsert);

        // Najpierw upewniamy się, że użytkownik jest zalogowany i ma ważny token
        return this.ensureUserExists(userId).pipe(
          switchMap(userExists => {
            if (!userExists) {
              console.error('Nie można zapisać fiszek: Użytkownik nie jest zalogowany, token jest nieważny lub nie udało się utworzyć rekordu użytkownika');
              return throwError(() => new Error('Sesja wygasła lub wystąpił problem z kontem. Zaloguj się ponownie.'));
            }

            // Najpierw tworzymy rekord użytkownika w tabeli users, jeśli nie istnieje
            return from(this.supabase.rpc('create_user_and_flashcards', {
              user_id: userId,
              flashcards: flashcardsToInsert
            })).pipe(
              switchMap(response => {
                console.log('Odpowiedź z Supabase RPC (create_user_and_flashcards):', response);

                if (response.error) {
                  console.error('Błąd podczas tworzenia użytkownika i fiszek:', response.error);

                  // Jeśli funkcja RPC nie istnieje, spróbujmy bezpośrednio zapisać fiszki
                  if (response.error.message.includes('function "create_user_and_flashcards" does not exist')) {
                    console.log('Funkcja RPC nie istnieje. Próba bezpośredniego zapisu fiszek...');

                    return from(this.supabase
                      .from('flashcards')
                      .insert(flashcardsToInsert)
                      .select()
                    );
                  }

                  throw response.error;
                }

                // Jeśli funkcja RPC zwróciła dane, zwracamy je
                if (response.data) {
                  return of(response);
                }

                // Jeśli funkcja RPC nie zwróciła danych, pobieramy fiszki
                return from(this.supabase
                  .from('flashcards')
                  .select('*')
                  .eq('user_id', userId)
                  .order('created_at', { ascending: false })
                  .limit(flashcardsToInsert.length)
                );
              })
            ).pipe(
              map(response => {
                console.log('Odpowiedź z Supabase:', response);
                if (response.error) {
                  console.error('Błąd Supabase:', response.error);
                  throw new Error(`Błąd Supabase: ${response.error.message}`);
                }
                return response.data as FlashcardDTO[];
              }),
              catchError(error => {
                console.error('Błąd podczas zapisywania fiszek:', error);
                return throwError(() => error);
              })
            );
          })
        );
      })
    );
  }

  /**
   * Pobiera listę fiszek z paginacją
   * @param params Parametry paginacji (limit, offset) oraz opcjonalne parametry wyszukiwania i sortowania
   * @returns Observable zawierający fiszki i całkowitą liczbę rekordów
   */
  getFlashcards(params: {
    limit: number,
    offset: number,
    search?: string,
    sortField?: string,
    sortOrder?: number
  }): Observable<{ flashcards: FlashcardDTO[], totalRecords: number }> {

    let httpParams = new HttpParams()
      .set('limit', params.limit.toString())
      .set('offset', params.offset.toString());

    // Dodaj parametr wyszukiwania, jeśli został przekazany
    if (params.search) {
      httpParams = httpParams.set('search', params.search);
    }

    // Dodaj parametry sortowania, jeśli zostały przekazane
    if (params.sortField) {
      httpParams = httpParams.set('sortField', params.sortField);
    }

    if (params.sortOrder !== undefined) {
      httpParams = httpParams.set('sortOrder', params.sortOrder.toString());
    }

    console.log('Pobieranie fiszek z Supabase z parametrami:', params);

    return this.getCurrentUserId().pipe(
      switchMap(userId => {
        if (!userId) {
          return throwError(() => new Error('Użytkownik nie jest zalogowany'));
        }

        // Najpierw upewniamy się, że użytkownik jest zalogowany i ma ważny token
        return this.ensureUserExists(userId).pipe(
          switchMap(userExists => {
            if (!userExists) {
              console.error('Nie można pobrać fiszek: Użytkownik nie jest zalogowany, token jest nieważny lub nie udało się utworzyć rekordu użytkownika');
              return throwError(() => new Error('Sesja wygasła lub wystąpił problem z kontem. Zaloguj się ponownie.'));
            }

            // Przygotowanie zapytania do Supabase
            let query = this.supabase
              .from('flashcards')
              .select('*', { count: 'exact' })
              .eq('user_id', userId) // Filtrowanie po ID użytkownika
              .range(params.offset, params.offset + params.limit - 1);

            // Dodanie wyszukiwania, jeśli zostało przekazane
            if (params.search) {
              query = query.or(`front.ilike.%${params.search}%,back.ilike.%${params.search}%`);
            }

            // Dodanie sortowania, jeśli zostało przekazane
            if (params.sortField) {
              const order = params.sortOrder === -1 ? 'desc' : 'asc';
              query = query.order(params.sortField, { ascending: order === 'asc' });
            }

            return from(query).pipe(
              map(response => {
                console.log('Odpowiedź z Supabase (getFlashcards):', response);
                if (response.error) {
                  throw new Error(`Błąd Supabase: ${response.error.message}`);
                }
                return {
                  flashcards: response.data as FlashcardDTO[],
                  totalRecords: response.count || 0
                };
              }),
              catchError(error => {
                console.error('Błąd podczas pobierania fiszek:', error);
                return throwError(() => error);
              })
            );
          })
        );
      })
    );
  }

  /**
   * Tworzy nową fiszkę
   * @param data Dane nowej fiszki (front, back, source)
   * @returns Observable zawierający utworzoną fiszkę
   */
  createFlashcard(data: CreateFlashcardCommand): Observable<FlashcardDTO> {
    console.log('Tworzenie fiszki w Supabase:', data);

    return this.getCurrentUserId().pipe(
      switchMap(userId => {
        if (!userId) {
          console.error('Nie można utworzyć fiszki: Użytkownik nie jest zalogowany');
          return throwError(() => new Error('Użytkownik nie jest zalogowany'));
        }

        console.log('Tworzenie fiszki dla użytkownika o ID:', userId);

        const flashcardToInsert = {
          front: data.front,
          back: data.back,
          source: data.source || 'manual',
          user_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          generation_id: data.generation_id || null
        };

        console.log('Dane fiszki do zapisu:', flashcardToInsert);

        // Najpierw upewniamy się, że użytkownik jest zalogowany i ma ważny token
        return this.ensureUserExists(userId).pipe(
          switchMap(userExists => {
            if (!userExists) {
              console.error('Nie można utworzyć fiszki: Użytkownik nie jest zalogowany, token jest nieważny lub nie udało się utworzyć rekordu użytkownika');
              return throwError(() => new Error('Sesja wygasła lub wystąpił problem z kontem. Zaloguj się ponownie.'));
            }

            // Najpierw tworzymy rekord użytkownika w tabeli users, jeśli nie istnieje
            return from(this.supabase.rpc('create_user_and_flashcard', {
              user_id: userId,
              flashcard: flashcardToInsert
            })).pipe(
              switchMap(response => {
                console.log('Odpowiedź z Supabase RPC (create_user_and_flashcard):', response);

                if (response.error) {
                  console.error('Błąd podczas tworzenia użytkownika i fiszki:', response.error);

                  // Jeśli funkcja RPC nie istnieje, spróbujmy bezpośrednio zapisać fiszkę
                  if (response.error.message.includes('function "create_user_and_flashcard" does not exist')) {
                    console.log('Funkcja RPC nie istnieje. Próba bezpośredniego zapisu fiszki...');

                    return from(this.supabase
                      .from('flashcards')
                      .insert(flashcardToInsert)
                      .select()
                    );
                  }

                  throw response.error;
                }

                // Jeśli funkcja RPC zwróciła dane, zwracamy je
                if (response.data) {
                  return of(response);
                }

                // Jeśli funkcja RPC nie zwróciła danych, pobieramy fiszkę
                return from(this.supabase
                  .from('flashcards')
                  .select('*')
                  .eq('user_id', userId)
                  .order('created_at', { ascending: false })
                  .limit(1)
                );
              })
            ).pipe(
              map(response => {
                console.log('Odpowiedź z Supabase (createFlashcard):', response);
                if (response.error) {
                  console.error('Błąd Supabase przy tworzeniu fiszki:', response.error);
                  throw new Error(`Błąd Supabase: ${response.error.message}`);
                }
                return response.data[0] as FlashcardDTO;
              }),
              catchError(error => {
                console.error('Błąd podczas tworzenia fiszki:', error);
                return throwError(() => error);
              })
            );
          })
        );
      })
    );
  }

  /**
   * Aktualizuje istniejącą fiszkę
   * @param id ID fiszki do aktualizacji
   * @param data Dane do aktualizacji (front, back)
   * @returns Observable zawierający zaktualizowaną fiszkę
   */
  updateFlashcard(id: number, data: UpdateFlashcardCommand): Observable<FlashcardDTO> {
    console.log(`Aktualizacja fiszki w Supabase o ID ${id}:`, data);

    return this.getCurrentUserId().pipe(
      switchMap(userId => {
        if (!userId) {
          return throwError(() => new Error('Użytkownik nie jest zalogowany'));
        }

        // Najpierw upewniamy się, że użytkownik jest zalogowany i ma ważny token
        return this.ensureUserExists(userId).pipe(
          switchMap(userExists => {
            if (!userExists) {
              console.error('Nie można zaktualizować fiszki: Użytkownik nie jest zalogowany, token jest nieważny lub nie udało się utworzyć rekordu użytkownika');
              return throwError(() => new Error('Sesja wygasła lub wystąpił problem z kontem. Zaloguj się ponownie.'));
            }

            const updates = {
              ...data,
              updated_at: new Date().toISOString()
            };

            return from(this.supabase
              .from('flashcards')
              .update(updates)
              .eq('id', id)
              .eq('user_id', userId) // Upewniamy się, że użytkownik aktualizuje tylko swoje fiszki
              .select()
            ).pipe(
              map(response => {
                console.log('Odpowiedź z Supabase (updateFlashcard):', response);
                if (response.error) {
                  throw new Error(`Błąd Supabase: ${response.error.message}`);
                }
                if (response.data.length === 0) {
                  throw new Error('Nie znaleziono fiszki lub nie masz uprawnień do jej edycji');
                }
                return response.data[0] as FlashcardDTO;
              }),
              catchError(error => {
                console.error('Błąd podczas aktualizacji fiszki:', error);
                return throwError(() => error);
              })
            );
          })
        );
      })
    );
  }

  /**
   * Usuwa fiszkę
   * @param id ID fiszki do usunięcia
   * @returns Observable bez zawartości
   */
  deleteFlashcard(id: number): Observable<void> {
    console.log(`Usuwanie fiszki z Supabase o ID ${id}`);

    return this.getCurrentUserId().pipe(
      switchMap(userId => {
        if (!userId) {
          return throwError(() => new Error('Użytkownik nie jest zalogowany'));
        }

        // Najpierw upewniamy się, że użytkownik jest zalogowany i ma ważny token
        return this.ensureUserExists(userId).pipe(
          switchMap(userExists => {
            if (!userExists) {
              console.error('Nie można usunąć fiszki: Użytkownik nie jest zalogowany, token jest nieważny lub nie udało się utworzyć rekordu użytkownika');
              return throwError(() => new Error('Sesja wygasła lub wystąpił problem z kontem. Zaloguj się ponownie.'));
            }

            return from(this.supabase
              .from('flashcards')
              .delete()
              .eq('id', id)
              .eq('user_id', userId) // Upewniamy się, że użytkownik usuwa tylko swoje fiszki
            ).pipe(
              map(response => {
                console.log('Odpowiedź z Supabase (deleteFlashcard):', response);
                if (response.error) {
                  throw new Error(`Błąd Supabase: ${response.error.message}`);
                }
                if (response.count === 0) {
                  throw new Error('Nie znaleziono fiszki lub nie masz uprawnień do jej usunięcia');
                }
                return undefined;
              }),
              catchError(error => {
                console.error('Błąd podczas usuwania fiszki:', error);
                return throwError(() => error);
              })
            );
          })
        );
      })
    );
  }
}