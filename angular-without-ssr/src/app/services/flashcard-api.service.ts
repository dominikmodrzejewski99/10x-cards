import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, delay } from 'rxjs';
import { environment } from '../../environments/environments';
import { FlashcardProposalDTO, FlashcardDTO, CreateFlashcardCommand, UpdateFlashcardCommand } from '../../types';

@Injectable({
  providedIn: 'root'
})
export class FlashcardApiService {
  private apiUrl = '/functions/v1'; // Stała ścieżka API
  private useMockData = true; // Ustawienie na true włącza tryb deweloperski z symulowanymi danymi

  constructor(private http: HttpClient) { }

  /**
   * Tworzy nowe fiszki na podstawie dostarczonych propozycji (używane w widoku generowania)
   * @param flashcards Tablica propozycji fiszek do zapisania
   * @returns Observable zawierający zapisane fiszki
   */
  createFlashcards(flashcards: FlashcardProposalDTO[]): Observable<FlashcardDTO[]> {
    if (this.useMockData) {
      return this.createMockFlashcards(flashcards);
    }
    return this.http.post<FlashcardDTO[]>(`${this.apiUrl}/flashcards`, flashcards);
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
    if (this.useMockData) {
      return this.getMockFlashcards(params);
    }

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

    return this.http.get<{ flashcards: FlashcardDTO[], totalRecords: number }>(
      `${this.apiUrl}/flashcards`,
      { params: httpParams }
    );
  }

  /**
   * Tworzy nową fiszkę
   * @param data Dane nowej fiszki (front, back, source)
   * @returns Observable zawierający utworzoną fiszkę
   */
  createFlashcard(data: CreateFlashcardCommand): Observable<FlashcardDTO> {
    if (this.useMockData) {
      return this.createMockFlashcard(data);
    }
    return this.http.post<FlashcardDTO>(`${this.apiUrl}/flashcards`, data);
  }

  /**
   * Aktualizuje istniejącą fiszkę
   * @param id ID fiszki do aktualizacji
   * @param data Dane do aktualizacji (front, back)
   * @returns Observable zawierający zaktualizowaną fiszkę
   */
  updateFlashcard(id: number, data: UpdateFlashcardCommand): Observable<FlashcardDTO> {
    if (this.useMockData) {
      return this.updateMockFlashcard(id, data);
    }
    return this.http.put<FlashcardDTO>(`${this.apiUrl}/flashcards/${id}`, data);
  }

  /**
   * Usuwa fiszkę
   * @param id ID fiszki do usunięcia
   * @returns Observable bez zawartości
   */
  deleteFlashcard(id: number): Observable<void> {
    if (this.useMockData) {
      return this.deleteMockFlashcard(id);
    }
    return this.http.delete<void>(`${this.apiUrl}/flashcards/${id}`);
  }

  /**
   * Tworzy symulowane fiszki w trybie deweloperskim
   * @param proposals Propozycje fiszek do zapisania
   * @returns Observable z symulowanymi zapisanymi fiszkami
   */
  private createMockFlashcards(proposals: FlashcardProposalDTO[]): Observable<FlashcardDTO[]> {
    console.log('Tryb deweloperski: Symulacja zapisywania fiszek');

    // Symulacja opóźnienia sieciowego (500ms)
    return of(proposals.map((proposal, index) => ({
      id: Date.now() + index, // Generowanie unikalnego ID
      front: proposal.front,
      back: proposal.back,
      source: proposal.source,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: 'mock-user-id',
      generation_id: null
    }))).pipe(delay(500));
  }

  /**
   * Tworzy symulowaną pojedynczą fiszkę w trybie deweloperskim
   * @param data Dane fiszki do utworzenia
   * @returns Observable z symulowaną zapisaną fiszką
   */
  private createMockFlashcard(data: CreateFlashcardCommand): Observable<FlashcardDTO> {
    console.log('Tryb deweloperski: Symulacja tworzenia pojedynczej fiszki');

    return of({
      id: Date.now(),
      front: data.front,
      back: data.back,
      source: data.source || 'manual',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: 'mock-user-id',
      generation_id: data.generation_id || null
    }).pipe(delay(500));
  }

  /**
   * Aktualizuje symulowaną fiszkę w trybie deweloperskim
   * @param id ID fiszki do aktualizacji
   * @param data Dane do aktualizacji
   * @returns Observable z symulowaną zaktualizowaną fiszką
   */
  private updateMockFlashcard(id: number, data: UpdateFlashcardCommand): Observable<FlashcardDTO> {
    console.log(`Tryb deweloperski: Symulacja aktualizacji fiszki o ID ${id}`);

    return of({
      id: id,
      front: data.front || 'Przykładowy front',
      back: data.back || 'Przykładowy tył',
      source: data.source || 'manual',
      created_at: new Date(Date.now() - 86400000).toISOString(), // Wczoraj
      updated_at: new Date().toISOString(),
      user_id: 'mock-user-id',
      generation_id: data.generation_id || null
    }).pipe(delay(500));
  }

  /**
   * Pobiera symulowane fiszki w trybie deweloperskim
   * @param params Parametry paginacji i filtrowania
   * @returns Observable z symulowanymi fiszkami i liczbą rekordów
   */
  private getMockFlashcards(params: {
    limit: number,
    offset: number,
    search?: string,
    sortField?: string,
    sortOrder?: number
  }): Observable<{ flashcards: FlashcardDTO[], totalRecords: number }> {
    console.log('Tryb deweloperski: Symulacja pobierania fiszek');

    // Generowanie przykładowych fiszek
    const mockFlashcards: FlashcardDTO[] = Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      front: `Przykładowy front ${i + 1}`,
      back: `Przykładowy tył ${i + 1}`,
      source: i % 3 === 0 ? 'ai-full' : (i % 3 === 1 ? 'ai-edited' : 'manual'),
      created_at: new Date(Date.now() - i * 86400000).toISOString(),
      updated_at: new Date(Date.now() - i * 43200000).toISOString(),
      user_id: 'mock-user-id',
      generation_id: i % 2 === 0 ? 123 : null
    }));

    // Filtrowanie po wyszukiwaniu
    let filteredFlashcards = [...mockFlashcards];
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filteredFlashcards = filteredFlashcards.filter(f =>
        f.front.toLowerCase().includes(searchLower) ||
        f.back.toLowerCase().includes(searchLower)
      );
    }

    // Sortowanie
    if (params.sortField) {
      const field = params.sortField as keyof FlashcardDTO;
      const order = params.sortOrder || 1;

      filteredFlashcards.sort((a, b) => {
        // Bezpieczne porównanie z uwzględnieniem możliwych wartości null/undefined
        const valueA = a[field] ?? '';
        const valueB = b[field] ?? '';

        if (valueA < valueB) return -1 * order;
        if (valueA > valueB) return 1 * order;
        return 0;
      });
    }

    // Paginacja
    const totalRecords = filteredFlashcards.length;
    const paginatedFlashcards = filteredFlashcards.slice(
      params.offset,
      params.offset + params.limit
    );

    return of({ flashcards: paginatedFlashcards, totalRecords }).pipe(delay(500));
  }

  /**
   * Usuwa symulowaną fiszkę w trybie deweloperskim
   * @param id ID fiszki do usunięcia
   * @returns Observable bez zawartości
   */
  private deleteMockFlashcard(id: number): Observable<void> {
    console.log(`Tryb deweloperski: Symulacja usunięcia fiszki o ID ${id}`);
    return of(undefined).pipe(delay(500));
  }
}