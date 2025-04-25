import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GenerateFlashcardsCommand, GenerationDTO, FlashcardProposalDTO } from '../../types';

@Injectable({
  providedIn: 'root'
})
export class GenerationApiService {
  private apiUrl = '/functions/v1'; // Stała ścieżka API zgodna z planem implementacji
  
  constructor(private http: HttpClient) { }
  
  /**
   * Generuje propozycje fiszek na podstawie dostarczonego tekstu
   * @param command Obiekt zawierający tekst źródłowy i opcjonalnie model AI do użycia
   * @returns Observable zawierający wygenerowane metadane generacji i propozycje fiszek
   */
  generateFlashcards(command: GenerateFlashcardsCommand): Observable<{ 
    generation: GenerationDTO, 
    flashcards: FlashcardProposalDTO[] 
  }> {
    return this.http.post<{ 
      generation: GenerationDTO, 
      flashcards: FlashcardProposalDTO[] 
    }>(`${this.apiUrl}/generations`, command);
  }
} 