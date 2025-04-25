import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environments';
import { FlashcardProposalDTO, FlashcardDTO, CreateFlashcardCommand, UpdateFlashcardCommand } from '../../types';

@Injectable({
  providedIn: 'root'
})
export class FlashcardApiService {
  private apiUrl = '/functions/v1'; // Stała ścieżka API
  private useMockData = false; // Tryb deweloperski wyłączony

  constructor(private http: HttpClient) { }

  /**
   * Tworzy nowe fiszki na podstawie dostarczonych propozycji (używane w widoku generowania)
   * @param flashcards Tablica propozycji fiszek do zapisania
   * @returns Observable zawierający zapisane fiszki
   */
  createFlashcards(flashcards: FlashcardProposalDTO[]): Observable<FlashcardDTO[]> {
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
    return this.http.post<FlashcardDTO>(`${this.apiUrl}/flashcards`, data);
  }

  /**
   * Aktualizuje istniejącą fiszkę
   * @param id ID fiszki do aktualizacji
   * @param data Dane do aktualizacji (front, back)
   * @returns Observable zawierający zaktualizowaną fiszkę
   */
  updateFlashcard(id: number, data: UpdateFlashcardCommand): Observable<FlashcardDTO> {
    return this.http.put<FlashcardDTO>(`${this.apiUrl}/flashcards/${id}`, data);
  }

  /**
   * Usuwa fiszkę
   * @param id ID fiszki do usunięcia
   * @returns Observable bez zawartości
   */
  deleteFlashcard(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/flashcards/${id}`);
  }
}