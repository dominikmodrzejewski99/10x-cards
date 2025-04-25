import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GenerationApiService } from '../../services/generation-api.service';
import { FlashcardApiService } from '../../services/flashcard-api.service';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { GenerateFlashcardsCommand, GenerationDTO, FlashcardProposalDTO } from '../../../types';

// Import komponentów potomnych
import { LoadingIndicatorComponent } from './loading-indicator/loading-indicator.component';
import { ErrorMessageComponent } from './error-message/error-message.component';
import { FlashcardProposalListComponent } from './flashcard-proposal-list/flashcard-proposal-list.component';
import { BulkSaveButtonComponent } from './bulk-save-button/bulk-save-button.component';
import { GenerateButtonComponent } from './generate-button/generate-button.component';
import { SourceTextareaComponent } from './source-textarea/source-textarea.component';

// Zdefiniowanie typu dla widoku
interface FlashcardProposalViewModel extends FlashcardProposalDTO {}

// Interfejs dla przetworzonych fiszek
interface Flashcard {
  id?: number;
  question: string;
  answer: string;
}

@Component({
  selector: 'app-generate-view',
  standalone: true,
  imports: [
    CommonModule,
    ToastModule,
    FormsModule,
    LoadingIndicatorComponent,
    ErrorMessageComponent,
    FlashcardProposalListComponent,
    BulkSaveButtonComponent,
    GenerateButtonComponent,
    SourceTextareaComponent
  ],
  providers: [MessageService],
  templateUrl: './generate-view.component.html',
  styleUrls: ['./generate-view.component.css']
})
export class GenerateViewComponent implements OnInit {
  // Standardowe zmienne zamiast sygnałów
  proposals: FlashcardProposalViewModel[] = [];
  generationResult: GenerationDTO | null = null;
  errorMessage: string | null = null;
  isLoading = false;
  isGenerating = false;
  isSaving = false;

  // Zmienne dla tekstu źródłowego
  minTextLength = 1000;
  maxTextLength = 10000;
  sourceText = '';
  isSourceValid = false;

  constructor(
    private generationApi: GenerationApiService,
    private flashcardApi: FlashcardApiService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    console.log('22222')
  }

  // Metody obsługujące zdarzenia z komponentu SourceTextareaComponent
  onTextChange(value: string): void {
    console.log('onTextChange:', value);
    this.sourceText = value;
  }

  onValidityChange(isValid: boolean): void {
    console.log('onValidityChange:', isValid);
    this.isSourceValid = isValid;
  }

  // Metoda do obsługi zdarzeń textarea
  onTextareaInput(value: string): void {
    this.sourceText = value;
    this.isSourceValid = this.isTextValid();
  }

  // Metoda do sprawdzania poprawności tekstu
  isTextValid(): boolean {
    return this.sourceText.length >= this.minTextLength &&
           this.sourceText.length <= this.maxTextLength &&
           this.sourceText.trim() !== '';
  }

  canGenerate(): boolean {
    return this.isSourceValid && !this.isGenerating && !this.isSaving;
  }

  canSave(): boolean {
    return this.proposals.length > 0 && !this.isGenerating && !this.isSaving;
  }

  generate(): void {
    if (!this.canGenerate()) return;

    this.isGenerating = true;
    this.isLoading = true;
    this.clearMessagesAndProposals();

    // Utworzenie obiektu GenerateFlashcardsCommand
    const command: GenerateFlashcardsCommand = { text: this.sourceText };

    this.generationApi.generateFlashcards(command).subscribe({
      next: (response) => {
        // Zakładamy, że response.flashcards to tablica fiszek
        this.proposals = response.flashcards; // Przypisanie bezpośrednio do proposals
        this.generationResult = response.generation; // Upewnij się, że response.generation jest zgodne z typem GenerationDTO
        this.isGenerating = false;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Błąd generowania fiszek:', error);
        this.handleApiError(error, 'generowania');
        this.isGenerating = false;
        this.isLoading = false;
      }
    });
  }

  saveAllProposals(): void {
    if (!this.canSave()) return;

    this.isSaving = true;
    this.isLoading = true;
    this.clearMessages();

    const flashcardsToSave: FlashcardProposalDTO[] = this.proposals;

    this.flashcardApi.createFlashcards(flashcardsToSave).subscribe({
      next: (savedFlashcards) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Sukces',
          detail: `Zapisano ${savedFlashcards.length} fiszek.`
        });
        this.proposals = [];
        this.generationResult = null;
        this.isSaving = false;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Błąd zapisywania fiszek:', error);
        this.handleApiError(error, 'zapisywania');
        this.isSaving = false;
        this.isLoading = false;
      }
    });
  }

  private handleApiError(error: any, action: 'generowania' | 'zapisywania'): void {
    const defaultMessage = `Wystąpił nieoczekiwany błąd podczas ${action}. Spróbuj ponownie później.`;
    let message = defaultMessage;

    if (error.status === 400) {
      message = `Błąd walidacji danych wejściowych podczas ${action}. Sprawdź dane.`;
      if (error.error?.details) {
        console.error("Szczegóły błędu walidacji:", error.error.details);
      }
    } else if (error.status === 401) {
      message = 'Błąd autoryzacji. Zaloguj się ponownie.';
    } else if (error.status >= 500) {
      message = `Błąd serwera podczas ${action}. Spróbuj ponownie później.`;
    }

    this.errorMessage = message;
    this.messageService.add({
      severity: 'error',
      summary: 'Błąd',
      detail: message,
      sticky: true
    });
  }

  private clearMessagesAndProposals(): void {
    this.errorMessage = null;
    this.proposals = [];
    this.generationResult = null;
    this.messageService.clear();
  }

  private clearMessages(): void {
    this.errorMessage = null;
    this.messageService.clear();
  }

  // Funkcja do przetwarzania odpowiedzi (przykład)
  private parseFlashcards(response: FlashcardProposalDTO[]): Flashcard[] {
    // Implementacja przetwarzania odpowiedzi w celu uzyskania fiszek
    return response.map(flashcard => {
      return {
        question: flashcard.front,
        answer: flashcard.back
      };
    });
  }
}
