import { TranslocoDirective } from '@jsverse/transloco';
import {ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {FormsModule} from '@angular/forms';
import {Router, RouterModule} from '@angular/router';
import {GenerationApiService} from '../../services/generation-api.service';
import {FlashcardApiService} from '../../services/flashcard-api.service';
import {FlashcardSetApiService} from '../../services/flashcard-set-api.service';
import {LoggerService} from '../../services/logger.service';
import {ToastService} from '../../shared/services/toast.service';
import {FlashcardProposalDTO, FlashcardSetDTO, GenerateFlashcardsCommand, GenerationDTO} from '../../../types';

import {LoadingIndicatorComponent} from './loading-indicator/loading-indicator.component';
import {ErrorMessageComponent} from './error-message/error-message.component';
import {FlashcardProposalListComponent} from './flashcard-proposal-list/flashcard-proposal-list.component';
import {BulkSaveButtonComponent} from './bulk-save-button/bulk-save-button.component';
import {GenerateButtonComponent} from './generate-button/generate-button.component';
import {SourceTextareaComponent} from './source-textarea/source-textarea.component';

interface FlashcardProposalViewModel extends FlashcardProposalDTO {
  accepted?: boolean;
  _id: string;
}

@Component({
  selector: 'app-generate-view',
  imports: [
    FormsModule,
    RouterModule,
    LoadingIndicatorComponent,
    ErrorMessageComponent,
    FlashcardProposalListComponent,
    BulkSaveButtonComponent,
    GenerateButtonComponent,
    SourceTextareaComponent
  , TranslocoDirective],
  templateUrl: './generate-view.component.html',
  styleUrls: ['./generate-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GenerateViewComponent implements OnInit {
  private generationApi = inject(GenerationApiService);
  private flashcardApi = inject(FlashcardApiService);
  private flashcardSetApi = inject(FlashcardSetApiService);
  private logger: LoggerService = inject(LoggerService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  proposals = signal<FlashcardProposalViewModel[]>([]);
  generationResult = signal<GenerationDTO | null>(null);
  errorMessage = signal<string | null>(null);
  isGenerating = signal(false);
  isSaving = signal(false);

  minTextLength = 1000;
  maxTextLength = 10000;
  sourceText = signal('');
  isSourceValid = signal(false);

  sets = signal<FlashcardSetDTO[]>([]);
  selectedSetId = signal<number | null>(null);

  newSetName = signal('');
  isCreatingSet = signal(false);

  acceptedCount = computed(() => this.proposals().filter(p => p.accepted).length);

  canGenerate = computed(() => this.isSourceValid() && !this.isGenerating() && !this.isSaving());

  canSave = computed(() =>
    this.acceptedCount() > 0 && !this.isGenerating() && !this.isSaving() && this.selectedSetId() !== null
  );

  isButtonLoading = computed(() => this.isGenerating() || this.isSaving());

  ngOnInit() {
    this.loadSets();
  }

  private loadSets(): void {
    this.flashcardSetApi.getSets().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (sets) => this.sets.set(sets),
      error: (err: unknown) => this.logger.error('GenerateViewComponent.loadSets', err)
    });
  }

  onTextChange(value: string): void {
    this.sourceText.set(value);
  }

  onValidityChange(isValid: boolean): void {
    this.isSourceValid.set(isValid);
  }

  createNewSet(): void {
    const name = this.newSetName().trim();
    if (!name) return;
    this.isCreatingSet.set(true);
    this.flashcardSetApi.createSet({ name }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (created) => {
        this.sets.update(s => [created, ...s]);
        this.selectedSetId.set(created.id);
        this.newSetName.set('');
        this.isCreatingSet.set(false);
      },
      error: () => {
        this.isCreatingSet.set(false);
        this.toastService.add({
          severity: 'error',
          summary: 'Błąd',
          detail: 'Nie udało się utworzyć zestawu.'
        });
      }
    });
  }

  generate(): void {
    if (!this.canGenerate()) return;

    this.isGenerating.set(true);
    this.clearMessagesAndProposals();

    const command: GenerateFlashcardsCommand = { text: this.sourceText() };

    this.generationApi.generateFlashcards(command).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.proposals.set(response.flashcards.map((f, i) => ({
          ...f,
          _id: `${Date.now()}-${i}`
        })));
        this.generationResult.set(response.generation);
        this.isGenerating.set(false);
      },
      error: (error) => {
        this.proposals.set([]);
        this.generationResult.set(null);
        this.handleApiError(error, 'generowania');
        this.isGenerating.set(false);
      }
    });
  }

  saveAllProposals(): void {
    if (!this.canSave()) return;

    this.isSaving.set(true);
    this.clearMessages();

    const flashcardsToSave: FlashcardProposalDTO[] = this.proposals()
      .filter(p => p.accepted)
      .map(({ accepted, _id, ...dto }) => dto);

    this.flashcardApi.createFlashcards(flashcardsToSave, this.selectedSetId()!).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (savedFlashcards) => {
        this.toastService.add({
          severity: 'success',
          summary: 'Sukces',
          detail: `Zapisano ${savedFlashcards.length} fiszek.`
        });
        this.proposals.set([]);
        this.generationResult.set(null);
        this.isSaving.set(false);

        this.router.navigate(['/sets', this.selectedSetId()], { queryParams: { saved: savedFlashcards.length } });
      },
      error: (error) => {
        this.handleApiError(error, 'zapisywania');
        this.isSaving.set(false);
      }
    });
  }

  private handleApiError(error: unknown, action: 'generowania' | 'zapisywania'): void {
    let message = `Wystąpił nieoczekiwany błąd podczas ${action}. Spróbuj ponownie później.`;
    let summary = 'Błąd';
    let redirectToLogin = false;

    const err = error as { status?: number; error?: { details?: string }; message?: string };

    if (err.status === 400) {
      message = `Błąd walidacji danych wejściowych podczas ${action}. Sprawdź dane.`;
    } else if (err.status === 401) {
      message = 'Błąd autoryzacji. Zaloguj się ponownie.';
      summary = 'Błąd autoryzacji';
      redirectToLogin = true;
    } else if (err.status && err.status >= 500) {
      message = `Błąd serwera podczas ${action}. Spróbuj ponownie później.`;
    }

    if (err.message && (err.message.includes('nie jest zalogowany') || err.message.includes('Sesja wygasła'))) {
      summary = 'Błąd autoryzacji';
      message = `Musisz być zalogowany, aby korzystać z funkcji ${action}.`;
      redirectToLogin = true;
    }

    this.errorMessage.set(message);
    this.toastService.add({
      severity: 'error',
      summary,
      detail: message,
      life: 5000
    });

    if (redirectToLogin) {
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 2000);
    }
  }

  private clearMessagesAndProposals(): void {
    this.errorMessage.set(null);
    this.proposals.set([]);
    this.generationResult.set(null);
    this.toastService.clear();
  }

  private clearMessages(): void {
    this.errorMessage.set(null);
    this.toastService.clear();
  }

  acceptProposal(proposal: FlashcardProposalViewModel): void {
    this.proposals.update(list =>
      list.map(p => p._id === proposal._id ? { ...p, accepted: !p.accepted } : p)
    );
  }

  rejectProposal(proposal: FlashcardProposalViewModel): void {
    this.proposals.update(list => list.filter(p => p._id !== proposal._id));
    this.toastService.add({
      severity: 'warn',
      summary: 'Informacja',
      detail: 'Propozycja fiszki została odrzucona.'
    });
  }

  editProposal(event: {original: FlashcardProposalDTO, edited: FlashcardProposalDTO}): void {
    this.proposals.update(list => {
      const index = list.findIndex(p =>
        p.front === event.original.front && p.back === event.original.back
      );
      if (index === -1) return list;
      const updated = [...list];
      updated[index] = { ...event.edited, accepted: list[index].accepted, _id: list[index]._id };
      return updated;
    });
    this.toastService.add({
      severity: 'success',
      summary: 'Sukces',
      detail: 'Propozycja fiszki została zaktualizowana.'
    });
  }
}
