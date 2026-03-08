import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { GenerationApiService } from '../../services/generation-api.service';
import { FlashcardApiService } from '../../services/flashcard-api.service';
import { FlashcardSetApiService } from '../../services/flashcard-set-api.service';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import { GenerateFlashcardsCommand, GenerationDTO, FlashcardProposalDTO, FlashcardSetDTO } from '../../../types';
import { selectIsAuthenticated } from '../../auth/store/auth.selectors';

// Import komponentów potomnych
import { LoadingIndicatorComponent } from './loading-indicator/loading-indicator.component';
import { ErrorMessageComponent } from './error-message/error-message.component';
import { FlashcardProposalListComponent } from './flashcard-proposal-list/flashcard-proposal-list.component';
import { BulkSaveButtonComponent } from './bulk-save-button/bulk-save-button.component';
import { GenerateButtonComponent } from './generate-button/generate-button.component';
import { SourceTextareaComponent } from './source-textarea/source-textarea.component';

interface FlashcardProposalViewModel extends FlashcardProposalDTO {
  accepted?: boolean;
}

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
    RouterModule,
    ButtonModule,
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
export class GenerateViewComponent implements OnInit, OnDestroy {
  private generationApi = inject(GenerationApiService);
  private flashcardApi = inject(FlashcardApiService);
  private flashcardSetApi = inject(FlashcardSetApiService);
  private messageService = inject(MessageService);
  private store = inject(Store);
  private router = inject(Router);

  proposals: FlashcardProposalViewModel[] = [];
  generationResult: GenerationDTO | null = null;
  errorMessage: string | null = null;
  isLoading = false;
  isGenerating = false;
  isSaving = false;

  minTextLength = 1000;
  maxTextLength = 10000;
  sourceText = '';
  isSourceValid = false;

  sets: FlashcardSetDTO[] = [];
  selectedSetId: number | null = null;

  isAuthenticated = false;
  private subscription = new Subscription();

  ngOnInit() {
    this.subscription.add(
      this.store.select(selectIsAuthenticated).subscribe(isAuthenticated => {
        this.isAuthenticated = isAuthenticated;
        if (!isAuthenticated) {
          this.router.navigate(['/login']);
        } else {
          this.loadSets();
        }
      })
    );
  }

  private loadSets(): void {
    this.flashcardSetApi.getSets().subscribe({
      next: (sets) => { this.sets = sets; }
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  // Metody obsługujące zdarzenia z komponentu SourceTextareaComponent
  onTextChange(value: string): void {
    this.sourceText = value;
  }

  onValidityChange(isValid: boolean): void {
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

  get acceptedCount(): number {
    return this.proposals.filter(p => p.accepted).length;
  }

  canSave(): boolean {
    return this.acceptedCount > 0 && !this.isGenerating && !this.isSaving && this.selectedSetId !== null;
  }

  newSetName = '';
  isCreatingSet = false;

  createNewSet(): void {
    if (!this.newSetName.trim()) return;
    this.isCreatingSet = true;
    this.flashcardSetApi.createSet({ name: this.newSetName.trim() }).subscribe({
      next: (created) => {
        this.sets = [created, ...this.sets];
        this.selectedSetId = created.id;
        this.newSetName = '';
        this.isCreatingSet = false;
      },
      error: () => {
        this.isCreatingSet = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Błąd',
          detail: 'Nie udało się utworzyć zestawu.'
        });
      }
    });
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

    const flashcardsToSave: FlashcardProposalDTO[] = this.proposals
      .filter(p => p.accepted)
      .map(({ accepted, ...dto }) => dto);

    this.flashcardApi.createFlashcards(flashcardsToSave, this.selectedSetId!).subscribe({
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

        this.router.navigate(['/sets', this.selectedSetId]);
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
    let summary = 'Błąd';
    let redirectToLogin = false;

    if (error.status === 400) {
      message = `Błąd walidacji danych wejściowych podczas ${action}. Sprawdź dane.`;
      if (error.error?.details) {
        console.error("Szczegóły błędu walidacji:", error.error.details);
      }
    } else if (error.status === 401) {
      message = 'Błąd autoryzacji. Zaloguj się ponownie.';
      summary = 'Błąd autoryzacji';
      redirectToLogin = true;
    } else if (error.status >= 500) {
      message = `Błąd serwera podczas ${action}. Spróbuj ponownie później.`;
    }

    // Sprawdzamy, czy błąd jest związany z autentykacją
    if (error.message && (error.message.includes('nie jest zalogowany') || error.message.includes('Sesja wygasła') || error.message.includes('problem z kontem'))) {
      summary = 'Błąd autoryzacji';
      message = `Musisz być zalogowany, aby korzystać z funkcji ${action}.`;
      redirectToLogin = true;
    }

    this.errorMessage = message;
    this.messageService.add({
      severity: 'error',
      summary: summary,
      detail: message,
      life: 5000
    });

    // Przekierowanie do strony logowania, jeśli to konieczne
    if (redirectToLogin) {
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 2000);
    }
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

  // Metody obsługi zdarzeń z listy propozycji

  acceptProposal(proposal: FlashcardProposalViewModel): void {
    const match = this.proposals.find(p =>
      p.front === proposal.front && p.back === proposal.back
    );
    if (match) {
      match.accepted = !match.accepted;
    }
  }

  /**
   * Obsługuje odrzucenie propozycji fiszki
   * @param proposal Odrzucona propozycja fiszki
   */
  rejectProposal(proposal: FlashcardProposalDTO): void {
    // Usuwamy odrzuconą propozycję z listy
    this.proposals = this.proposals.filter(p =>
      p.front !== proposal.front || p.back !== proposal.back
    );

    this.messageService.add({
      severity: 'info',
      summary: 'Informacja',
      detail: 'Propozycja fiszki została odrzucona.'
    });
  }

  /**
   * Obsługuje edycję propozycji fiszki
   * @param event Obiekt zawierający oryginalną i zedytowaną propozycję
   */
  editProposal(event: {original: FlashcardProposalDTO, edited: FlashcardProposalDTO}): void {
    // Znajdujemy indeks oryginalnej propozycji
    const index = this.proposals.findIndex(p =>
      p.front === event.original.front && p.back === event.original.back
    );

    if (index !== -1) {
      this.proposals[index] = { ...event.edited, accepted: this.proposals[index].accepted };

      this.messageService.add({
        severity: 'success',
        summary: 'Sukces',
        detail: 'Propozycja fiszki została zaktualizowana.'
      });
    }
  }
}
