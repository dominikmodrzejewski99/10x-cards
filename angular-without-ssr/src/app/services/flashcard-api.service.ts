import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, from, map, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environments';
import { FlashcardProposalDTO, FlashcardDTO, CreateFlashcardCommand, UpdateFlashcardCommand } from '../../types';
import { createClient } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class FlashcardApiService {
  private apiUrl = environment.supabaseUrl + '/functions/v1'; // Ścieżka API Supabase
  private supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
  private useMockData = false; // Tryb deweloperski wyłączony

  constructor(private http: HttpClient) { }

  /**
   * Tworzy nowe fiszki na podstawie dostarczonych propozycji (używane w widoku generowania)
   * @param flashcards Tablica propozycji fiszek do zapisania
   * @returns Observable zawierający zapisane fiszki
   */
  createFlashcards(flashcards: FlashcardProposalDTO[]): Observable<FlashcardDTO[]> {
    console.log('Zapisywanie fiszek do Supabase:', flashcards);

    // Przygotowanie danych do zapisu
    const flashcardsToInsert = flashcards.map(proposal => ({
      front: proposal.front,
      back: proposal.back,
      source: proposal.source,
      user_id: 'test-user-id', // Tymczasowy ID użytkownika
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    // Zapis do bazy danych
    return from(this.supabase
      .from('flashcards')
      .insert(flashcardsToInsert)
      .select()
    ).pipe(
      map(response => {
        console.log('Odpowiedź z Supabase:', response);
        if (response.error) {
          throw new Error(`Błąd Supabase: ${response.error.message}`);
        }
        return response.data as FlashcardDTO[];
      }),
      catchError(error => {
        console.error('Błąd podczas zapisywania fiszek:', error);
        return throwError(() => error);
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

    // Przygotowanie zapytania do Supabase
    let query = this.supabase
      .from('flashcards')
      .select('*', { count: 'exact' })
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
  }

  /**
   * Tworzy nową fiszkę
   * @param data Dane nowej fiszki (front, back, source)
   * @returns Observable zawierający utworzoną fiszkę
   */
  createFlashcard(data: CreateFlashcardCommand): Observable<FlashcardDTO> {
    console.log('Tworzenie fiszki w Supabase:', data);

    const flashcardToInsert = {
      front: data.front,
      back: data.back,
      source: data.source || 'manual',
      user_id: 'test-user-id', // Tymczasowy ID użytkownika
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      generation_id: data.generation_id || null
    };

    return from(this.supabase
      .from('flashcards')
      .insert(flashcardToInsert)
      .select()
    ).pipe(
      map(response => {
        console.log('Odpowiedź z Supabase (createFlashcard):', response);
        if (response.error) {
          throw new Error(`Błąd Supabase: ${response.error.message}`);
        }
        return response.data[0] as FlashcardDTO;
      }),
      catchError(error => {
        console.error('Błąd podczas tworzenia fiszki:', error);
        return throwError(() => error);
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

    const updates = {
      ...data,
      updated_at: new Date().toISOString()
    };

    return from(this.supabase
      .from('flashcards')
      .update(updates)
      .eq('id', id)
      .select()
    ).pipe(
      map(response => {
        console.log('Odpowiedź z Supabase (updateFlashcard):', response);
        if (response.error) {
          throw new Error(`Błąd Supabase: ${response.error.message}`);
        }
        return response.data[0] as FlashcardDTO;
      }),
      catchError(error => {
        console.error('Błąd podczas aktualizacji fiszki:', error);
        return throwError(() => error);
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

    return from(this.supabase
      .from('flashcards')
      .delete()
      .eq('id', id)
    ).pipe(
      map(response => {
        console.log('Odpowiedź z Supabase (deleteFlashcard):', response);
        if (response.error) {
          throw new Error(`Błąd Supabase: ${response.error.message}`);
        }
        return undefined;
      }),
      catchError(error => {
        console.error('Błąd podczas usuwania fiszki:', error);
        return throwError(() => error);
      })
    );
  }
}