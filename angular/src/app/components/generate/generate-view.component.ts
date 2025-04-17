import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GenerationApiService } from '../../services/generation-api.service';
import { FlashcardApiService } from '../../services/flashcard-api.service';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { GenerateFlashcardsCommand, GenerationDTO, FlashcardProposalDTO } from '../../../types';

// Import komponentów potomnych (zostawiamy te, które nadal są potrzebne)
import { LoadingIndicatorComponent } from './loading-indicator/loading-indicator.component';
import { ErrorMessageComponent } from './error-message/error-message.component';
import { FlashcardProposalListComponent } from './flashcard-proposal-list/flashcard-proposal-list.component';
import { BulkSaveButtonComponent } from './bulk-save-button/bulk-save-button.component';

// Zdefiniowanie typu dla widoku
interface FlashcardProposalViewModel extends FlashcardProposalDTO {}

@Component({
  selector: 'app-generate-view',
  standalone: true,
  imports: [
    CommonModule,
    ToastModule,
    FormsModule,
    // Usunięto SourceTextareaComponent i GenerateButtonComponent
    LoadingIndicatorComponent,
    ErrorMessageComponent,
    FlashcardProposalListComponent,
    BulkSaveButtonComponent
  ],
  providers: [MessageService],
  templateUrl: './generate-view.component.html',
  styleUrls: ['./generate-view.component.css']
})
export class GenerateViewComponent {

  // Definicje stałych dla długości tekstu
  readonly minTextLength = 1000;
  readonly maxTextLength = 10000;

  // --- Sygnały ---
  sourceText = signal<string>('');
  // Usunięto isTextValid, teraz logika jest w canGenerate
  isGenerating = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  isLoading = computed(() => this.isGenerating() || this.isSaving());
  generationResult = signal<GenerationDTO | null>(null);
  proposals = signal<FlashcardProposalViewModel[]>([]);
  errorMessage = signal<string | null>(null);

  // --- Computed Signals ---
  isTextValid = computed(() => {
    const length = this.sourceText().length;
    return length >= this.minTextLength && length <= this.maxTextLength;
  });
  canGenerate = computed(() => this.isTextValid() && !this.isLoading());
  canSave = computed(() => this.proposals().length > 0 && !this.isLoading());

  constructor(
    private generationApi: GenerationApiService,
    private flashcardApi: FlashcardApiService,
    private messageService: MessageService
  ) {
  }

  generate(): void {
    if (!this.canGenerate()) return;

    this.isGenerating.set(true);
    this.clearMessagesAndProposals();

    const command: GenerateFlashcardsCommand = { text: this.sourceText() };

    this.generationApi.generateFlashcards(command).subscribe({
      next: (response) => {
        this.proposals.set(response.flashcards);
        this.generationResult.set(response.generation);
        this.isGenerating.set(false);
      },
      error: (error) => {
        console.error('Błąd generowania fiszek:', error);
        this.handleApiError(error, 'generowania');
        this.isGenerating.set(false);
      }
    });
  }

  saveAllProposals(): void {
    if (!this.canSave()) return;

    this.isSaving.set(true);
    this.clearMessages();

    const flashcardsToSave: FlashcardProposalDTO[] = this.proposals();

    this.flashcardApi.createFlashcards(flashcardsToSave).subscribe({
      next: (savedFlashcards) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Sukces',
          detail: `Zapisano ${savedFlashcards.length} fiszek.`
        });
        this.proposals.set([]);
        this.generationResult.set(null);
        this.isSaving.set(false);
      },
      error: (error) => {
        console.error('Błąd zapisywania fiszek:', error);
        this.handleApiError(error, 'zapisywania');
        this.isSaving.set(false);
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

    this.errorMessage.set(message);
    this.messageService.add({
      severity: 'error',
      summary: 'Błąd',
      detail: message,
      sticky: true
    });
  }

  private clearMessagesAndProposals(): void {
    this.errorMessage.set(null);
    this.proposals.set([]);
    this.generationResult.set(null);
    this.messageService.clear();
  }

  private clearMessages(): void {
    this.errorMessage.set(null);
    this.messageService.clear();
  }
}
