import { Injectable, inject, signal, computed, Signal, WritableSignal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { GenerationApiService } from '../api/generation-api.service';
import { FlashcardApiService } from '../api/flashcard-api.service';
import { FlashcardSetApiService } from '../api/flashcard-set-api.service';
import { LoggerService } from '../infrastructure/logger.service';
import { ToastService } from '../../shared/services/toast.service';
import { FlashcardProposalDTO, FlashcardSetDTO, GenerateFlashcardsCommand, GenerationDTO } from '../../../types';

export interface FlashcardProposalViewModel extends FlashcardProposalDTO {
  accepted?: boolean;
  _id: string;
}

@Injectable({ providedIn: 'root' })
export class GenerateFacadeService {
  private readonly generationApi: GenerationApiService = inject(GenerationApiService);
  private readonly flashcardApi: FlashcardApiService = inject(FlashcardApiService);
  private readonly flashcardSetApi: FlashcardSetApiService = inject(FlashcardSetApiService);
  private readonly logger: LoggerService = inject(LoggerService);
  private readonly toastService: ToastService = inject(ToastService);
  private readonly t: TranslocoService = inject(TranslocoService);

  // --- Writable signals (private) ---

  private readonly _proposals: WritableSignal<FlashcardProposalViewModel[]> = signal<FlashcardProposalViewModel[]>([]);
  private readonly _generationResult: WritableSignal<GenerationDTO | null> = signal<GenerationDTO | null>(null);
  private readonly _errorMessage: WritableSignal<string | null> = signal<string | null>(null);
  private readonly _isGenerating: WritableSignal<boolean> = signal<boolean>(false);
  private readonly _isSaving: WritableSignal<boolean> = signal<boolean>(false);
  private readonly _sourceText: WritableSignal<string> = signal<string>('');
  private readonly _isSourceValid: WritableSignal<boolean> = signal<boolean>(false);
  private readonly _sets: WritableSignal<FlashcardSetDTO[]> = signal<FlashcardSetDTO[]>([]);
  private readonly _selectedSetId: WritableSignal<number | null> = signal<number | null>(null);
  private readonly _newSetName: WritableSignal<string> = signal<string>('');
  private readonly _isCreatingSet: WritableSignal<boolean> = signal<boolean>(false);
  private readonly _dailyCount: WritableSignal<number> = signal<number>(0);
  private readonly _navigationTarget: WritableSignal<{ setId: number; savedCount: number } | null> = signal<{ setId: number; savedCount: number } | null>(null);
  private readonly _needsAuthRedirect: WritableSignal<boolean> = signal<boolean>(false);

  // --- Public readonly signals ---

  public readonly proposalsSignal: Signal<FlashcardProposalViewModel[]> = this._proposals.asReadonly();
  public readonly generationResultSignal: Signal<GenerationDTO | null> = this._generationResult.asReadonly();
  public readonly errorMessageSignal: Signal<string | null> = this._errorMessage.asReadonly();
  public readonly isGeneratingSignal: Signal<boolean> = this._isGenerating.asReadonly();
  public readonly isSavingSignal: Signal<boolean> = this._isSaving.asReadonly();
  public readonly sourceTextSignal: Signal<string> = this._sourceText.asReadonly();
  public readonly isSourceValidSignal: Signal<boolean> = this._isSourceValid.asReadonly();
  public readonly setsSignal: Signal<FlashcardSetDTO[]> = this._sets.asReadonly();
  public readonly selectedSetIdSignal: Signal<number | null> = this._selectedSetId.asReadonly();
  public readonly newSetNameSignal: Signal<string> = this._newSetName.asReadonly();
  public readonly isCreatingSetSignal: Signal<boolean> = this._isCreatingSet.asReadonly();
  public readonly dailyCountSignal: Signal<number> = this._dailyCount.asReadonly();
  public readonly navigationTargetSignal: Signal<{ setId: number; savedCount: number } | null> = this._navigationTarget.asReadonly();
  public readonly needsAuthRedirectSignal: Signal<boolean> = this._needsAuthRedirect.asReadonly();

  // --- Constants ---

  public readonly minTextLength: number = 1000;
  public readonly maxTextLength: number = 10000;
  public readonly dailyLimit: number = this.generationApi.getDailyLimit();

  // --- Computed signals ---

  public readonly remainingGenerationsSignal: Signal<number> = computed(() => Math.max(0, this.dailyLimit - this._dailyCount()));
  public readonly limitReachedSignal: Signal<boolean> = computed(() => this._dailyCount() >= this.dailyLimit);
  public readonly acceptedCountSignal: Signal<number> = computed(() => this._proposals().filter((p: FlashcardProposalViewModel) => p.accepted).length);
  public readonly canGenerateSignal: Signal<boolean> = computed(() => this._isSourceValid() && !this._isGenerating() && !this._isSaving() && !this.limitReachedSignal());
  public readonly canSaveSignal: Signal<boolean> = computed(() => this.acceptedCountSignal() > 0 && !this._isGenerating() && !this._isSaving() && this._selectedSetId() !== null);
  public readonly isButtonLoadingSignal: Signal<boolean> = computed(() => this._isGenerating() || this._isSaving());

  // --- Public methods ---

  public loadDailyCount(): void {
    this.generationApi.getDailyGenerationCount().subscribe({
      next: (count: number) => this._dailyCount.set(count),
      error: (err: unknown) => this.logger.error('GenerateFacadeService.loadDailyCount', err),
    });
  }

  public loadSets(): void {
    this.flashcardSetApi.getSets().subscribe({
      next: (sets: FlashcardSetDTO[]) => this._sets.set(sets),
      error: (err: unknown) => this.logger.error('GenerateFacadeService.loadSets', err),
    });
  }

  public onTextChange(value: string): void {
    this._sourceText.set(value);
  }

  public onValidityChange(isValid: boolean): void {
    this._isSourceValid.set(isValid);
  }

  public setSelectedSetId(id: number | null): void {
    this._selectedSetId.set(id);
  }

  public setNewSetName(name: string): void {
    this._newSetName.set(name);
  }

  public createNewSet(): void {
    const name: string = this._newSetName().trim();
    if (!name) return;

    this._isCreatingSet.set(true);

    this.flashcardSetApi.createSet({ name }).subscribe({
      next: (created: FlashcardSetDTO) => {
        this._sets.update((s: FlashcardSetDTO[]) => [created, ...s]);
        this._selectedSetId.set(created.id);
        this._newSetName.set('');
        this._isCreatingSet.set(false);
      },
      error: () => {
        this._isCreatingSet.set(false);
        this.toastService.add({
          severity: 'error',
          summary: this.t.translate('toasts.error'),
          detail: this.t.translate('generate.toasts.createSetFailed'),
        });
      },
    });
  }

  public generate(): void {
    if (!this.canGenerateSignal()) return;

    this._isGenerating.set(true);
    this.clearMessagesAndProposals();

    const command: GenerateFlashcardsCommand = { text: this._sourceText() };

    this.generationApi.generateFlashcards(command).subscribe({
      next: (response: { generation: GenerationDTO; flashcards: FlashcardProposalDTO[] }) => {
        this._proposals.set(
          response.flashcards.map((f: FlashcardProposalDTO, i: number) => ({
            ...f,
            _id: `${Date.now()}-${i}`,
          })),
        );
        this._generationResult.set(response.generation);
        this._isGenerating.set(false);
        this._dailyCount.update((c: number) => c + 1);
      },
      error: (error: unknown) => {
        this._proposals.set([]);
        this._generationResult.set(null);
        this.handleApiError(error, 'generate');
        this._isGenerating.set(false);
      },
    });
  }

  public saveAllProposals(): void {
    if (!this.canSaveSignal()) return;

    this._isSaving.set(true);
    this.clearMessages();

    const flashcardsToSave: FlashcardProposalDTO[] = this._proposals()
      .filter((p: FlashcardProposalViewModel) => p.accepted)
      .map(({ accepted, _id, ...dto }: FlashcardProposalViewModel) => dto as FlashcardProposalDTO);

    const setId: number = this._selectedSetId()!;

    this.flashcardApi.createFlashcards(flashcardsToSave, setId).subscribe({
      next: (savedFlashcards: FlashcardProposalDTO[]) => {
        this.toastService.add({
          severity: 'success',
          summary: this.t.translate('toasts.success'),
          detail: this.t.translate('generate.toasts.flashcardsSaved', { count: savedFlashcards.length }),
        });
        this._proposals.set([]);
        this._generationResult.set(null);
        this._isSaving.set(false);

        this._navigationTarget.set({ setId, savedCount: savedFlashcards.length });
      },
      error: (error: unknown) => {
        this.handleApiError(error, 'save');
        this._isSaving.set(false);
      },
    });
  }

  public acceptProposal(proposal: FlashcardProposalViewModel): void {
    this._proposals.update((list: FlashcardProposalViewModel[]) =>
      list.map((p: FlashcardProposalViewModel) => (p._id === proposal._id ? { ...p, accepted: !p.accepted } : p)),
    );
  }

  public rejectProposal(proposal: FlashcardProposalViewModel): void {
    this._proposals.update((list: FlashcardProposalViewModel[]) => list.filter((p: FlashcardProposalViewModel) => p._id !== proposal._id));
    this.toastService.add({
      severity: 'warn',
      summary: this.t.translate('generate.toasts.info'),
      detail: this.t.translate('generate.toasts.proposalRejected'),
    });
  }

  public toggleAcceptAll(): void {
    const allAccepted: boolean = this.acceptedCountSignal() === this._proposals().length;
    this._proposals.update((list: FlashcardProposalViewModel[]) =>
      list.map((p: FlashcardProposalViewModel) => ({ ...p, accepted: !allAccepted })),
    );
  }

  public editProposal(event: { original: FlashcardProposalDTO; edited: FlashcardProposalDTO }): void {
    this._proposals.update((list: FlashcardProposalViewModel[]) => {
      const index: number = list.findIndex(
        (p: FlashcardProposalViewModel) => p.front === event.original.front && p.back === event.original.back,
      );
      if (index === -1) return list;
      const updated: FlashcardProposalViewModel[] = [...list];
      updated[index] = { ...event.edited, accepted: list[index].accepted, _id: list[index]._id };
      return updated;
    });
    this.toastService.add({
      severity: 'success',
      summary: this.t.translate('toasts.success'),
      detail: this.t.translate('generate.toasts.proposalUpdated'),
    });
  }

  public dismissError(): void {
    this._errorMessage.set(null);
  }

  public clearNavigationTarget(): void {
    this._navigationTarget.set(null);
  }

  // --- Private methods ---

  private handleApiError(error: unknown, action: 'generate' | 'save'): void {
    let message: string = this.t.translate('generate.toasts.unexpectedError', { action });
    let summary: string = this.t.translate('toasts.error');
    let redirectToLogin: boolean = false;

    const err = error as { status?: number; error?: { details?: string } };

    if (err.status === 400) {
      message = this.t.translate('generate.toasts.validationError', { action });
    } else if (err.status === 401) {
      summary = this.t.translate('generate.toasts.authSummary');
      message = this.t.translate('generate.toasts.loginRequired', { action });
      redirectToLogin = true;
    } else if (err.status && err.status >= 500) {
      message = this.t.translate('generate.toasts.serverError', { action });
    }

    this._errorMessage.set(message);
    this.toastService.add({
      severity: 'error',
      summary,
      detail: message,
      life: 5000,
    });

    if (redirectToLogin) {
      setTimeout(() => {
        this._needsAuthRedirect.set(true);
      }, 2000);
    }
  }

  private clearMessagesAndProposals(): void {
    this._errorMessage.set(null);
    this._proposals.set([]);
    this._generationResult.set(null);
    this.toastService.clear();
  }

  private clearMessages(): void {
    this._errorMessage.set(null);
    this.toastService.clear();
  }
}
