import { Injectable, inject, signal, Signal, WritableSignal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FlashcardApiService } from './flashcard-api.service';
import { FlashcardSetApiService } from './flashcard-set-api.service';
import { FlashcardExportService } from './flashcard-export.service';
import { ImageUploadService } from './image-upload.service';
import { AudioUploadService } from './audio-upload.service';
import { OpenRouterService } from './openrouter.service';
import { LoggerService } from './logger.service';
import { PrintTestService, PrintTestConfig } from './print-test.service';
import { ToastService } from '../shared/services/toast.service';
import { FlashcardDTO, FlashcardLanguage, FlashcardProposalDTO } from '../../types';
import { FlashcardFormData } from '../components/flashcards/flashcard-form/flashcard-form.component';
import { ReorderEvent } from '../components/flashcards/flashcard-table/flashcard-table.component';

@Injectable({ providedIn: 'root' })
export class FlashcardsFacadeService {
  private readonly flashcardApi: FlashcardApiService = inject(FlashcardApiService);
  private readonly setApi: FlashcardSetApiService = inject(FlashcardSetApiService);
  private readonly exportService: FlashcardExportService = inject(FlashcardExportService);
  private readonly imageUploadService: ImageUploadService = inject(ImageUploadService);
  private readonly audioUploadService: AudioUploadService = inject(AudioUploadService);
  private readonly openRouterService: OpenRouterService = inject(OpenRouterService);
  private readonly logger: LoggerService = inject(LoggerService);
  private readonly printTestService: PrintTestService = inject(PrintTestService);
  private readonly toastService: ToastService = inject(ToastService);
  private readonly t: TranslocoService = inject(TranslocoService);

  private readonly _flashcards: WritableSignal<FlashcardDTO[]> = signal<FlashcardDTO[]>([]);
  private readonly _totalRecords: WritableSignal<number> = signal<number>(0);
  private readonly _loading: WritableSignal<boolean> = signal<boolean>(false);
  private readonly _error: WritableSignal<string | null> = signal<string | null>(null);
  private readonly _rows: WritableSignal<number> = signal<number>(10);
  private readonly _first: WritableSignal<number> = signal<number>(0);
  private readonly _searchTerm: WritableSignal<string> = signal<string>('');
  private readonly _sortField: WritableSignal<string> = signal<string>('position');
  private readonly _sortOrder: WritableSignal<number> = signal<number>(1);
  private readonly _setId: WritableSignal<number> = signal<number>(0);
  private readonly _setName: WritableSignal<string> = signal<string>('');
  private readonly _isFormModalVisible: WritableSignal<boolean> = signal<boolean>(false);
  private readonly _isImportModalVisible: WritableSignal<boolean> = signal<boolean>(false);
  private readonly _flashcardBeingEdited: WritableSignal<FlashcardDTO | null> = signal<FlashcardDTO | null>(null);
  private readonly _lastDeleted: WritableSignal<FlashcardDTO | null> = signal<FlashcardDTO | null>(null);
  private readonly _savedCount: WritableSignal<number> = signal<number>(0);
  private readonly _shareLink: WritableSignal<string | null> = signal<string | null>(null);
  private readonly _shareLoading: WritableSignal<boolean> = signal<boolean>(false);
  private readonly _needsAuthRedirect: WritableSignal<boolean> = signal<boolean>(false);
  private readonly _imagePreview: WritableSignal<string | null> = signal<string | null>(null);
  private readonly _imageUploading: WritableSignal<boolean> = signal<boolean>(false);
  private readonly _imageError: WritableSignal<string | null> = signal<string | null>(null);
  private readonly _audioPreview: WritableSignal<string | null> = signal<string | null>(null);
  private readonly _audioUploading: WritableSignal<boolean> = signal<boolean>(false);
  private readonly _audioError: WritableSignal<string | null> = signal<string | null>(null);
  private readonly _translationSuggestion: WritableSignal<string | null> = signal<string | null>(null);
  private readonly _translating: WritableSignal<boolean> = signal<boolean>(false);

  public readonly flashcardsSignal: Signal<FlashcardDTO[]> = this._flashcards.asReadonly();
  public readonly totalRecordsSignal: Signal<number> = this._totalRecords.asReadonly();
  public readonly loadingSignal: Signal<boolean> = this._loading.asReadonly();
  public readonly errorSignal: Signal<string | null> = this._error.asReadonly();
  public readonly rowsSignal: Signal<number> = this._rows.asReadonly();
  public readonly firstSignal: Signal<number> = this._first.asReadonly();
  public readonly searchTermSignal: Signal<string> = this._searchTerm.asReadonly();
  public readonly sortFieldSignal: Signal<string> = this._sortField.asReadonly();
  public readonly sortOrderSignal: Signal<number> = this._sortOrder.asReadonly();
  public readonly setIdSignal: Signal<number> = this._setId.asReadonly();
  public readonly setNameSignal: Signal<string> = this._setName.asReadonly();
  public readonly isFormModalVisibleSignal: Signal<boolean> = this._isFormModalVisible.asReadonly();
  public readonly isImportModalVisibleSignal: Signal<boolean> = this._isImportModalVisible.asReadonly();
  public readonly flashcardBeingEditedSignal: Signal<FlashcardDTO | null> = this._flashcardBeingEdited.asReadonly();
  public readonly lastDeletedSignal: Signal<FlashcardDTO | null> = this._lastDeleted.asReadonly();
  public readonly savedCountSignal: Signal<number> = this._savedCount.asReadonly();
  public readonly shareLinkSignal: Signal<string | null> = this._shareLink.asReadonly();
  public readonly shareLoadingSignal: Signal<boolean> = this._shareLoading.asReadonly();
  public readonly needsAuthRedirectSignal: Signal<boolean> = this._needsAuthRedirect.asReadonly();
  public readonly imagePreviewSignal: Signal<string | null> = this._imagePreview.asReadonly();
  public readonly imageUploadingSignal: Signal<boolean> = this._imageUploading.asReadonly();
  public readonly imageErrorSignal: Signal<string | null> = this._imageError.asReadonly();
  public readonly audioPreviewSignal: Signal<string | null> = this._audioPreview.asReadonly();
  public readonly audioUploadingSignal: Signal<boolean> = this._audioUploading.asReadonly();
  public readonly audioErrorSignal: Signal<string | null> = this._audioError.asReadonly();
  public readonly translationSuggestionSignal: Signal<string | null> = this._translationSuggestion.asReadonly();
  public readonly translatingSignal: Signal<boolean> = this._translating.asReadonly();

  private undoTimer: ReturnType<typeof setTimeout> | null = null;
  private redirectTimer: ReturnType<typeof setTimeout> | null = null;

  public initForSet(setId: number): void {
    this._setId.set(setId);
    this._first.set(0);
    this._needsAuthRedirect.set(false);
    this.loadSetName(setId);
    this.loadFlashcards();
  }

  public loadFlashcards(event?: { first?: number; rows?: number; sortField?: string; sortOrder?: number }): void {
    const first: number = event?.first ?? this._first();
    const rows: number = event?.rows ?? this._rows();
    const sortField: string = event?.sortField ?? this._sortField();
    const sortOrder: number = event?.sortOrder !== undefined ? event.sortOrder : this._sortOrder();

    this._loading.set(true);
    this._first.set(first);
    this._rows.set(rows);
    if (sortField) this._sortField.set(sortField);
    this._sortOrder.set(sortOrder);

    this.flashcardApi.getFlashcards({
      limit: rows,
      offset: first,
      search: this._searchTerm(),
      sortField: this._sortField(),
      sortOrder: this._sortOrder(),
      setId: this._setId()
    }).subscribe({
      next: (response) => {
        this._flashcards.set(response.flashcards);
        this._totalRecords.set(response.totalRecords);
        this._loading.set(false);
        this._error.set(null);
      },
      error: (error) => this.handleApiError(error, 'ładowania')
    });
  }

  public onSearch(term: string): void {
    this._searchTerm.set(term);
    this._first.set(0);
    this.loadFlashcards();
  }

  public onPageChange(event: { first: number; rows: number }): void {
    this._first.set(event.first);
    this._rows.set(event.rows);
    this.loadFlashcards(event);
  }

  public onSort(event: { sortField: string; sortOrder: number }): void {
    this._sortField.set(event.sortField);
    this._sortOrder.set(event.sortOrder);
    this.loadFlashcards(event);
  }

  public onRowsChange(rows: number): void {
    this._rows.set(rows);
    this._first.set(0);
    this.loadFlashcards();
  }

  public resetFilters(): void {
    this._searchTerm.set('');
    this._sortField.set('id');
    this._sortOrder.set(-1);
    this._first.set(0);
    this.loadFlashcards();
  }

  public openAddModal(): void {
    this._flashcardBeingEdited.set(null);
    this.initFormMediaState(null);
    this._isFormModalVisible.set(true);
  }

  public openEditModal(flashcard: FlashcardDTO): void {
    this._flashcardBeingEdited.set(flashcard);
    this.initFormMediaState(flashcard);
    this._isFormModalVisible.set(true);
  }

  public closeFormModal(): void {
    this._isFormModalVisible.set(false);
    this._flashcardBeingEdited.set(null);
    this.resetFormMediaState();
  }

  public saveFlashcard(formData: FlashcardFormData): void {
    const isEdit: boolean = !!formData.id;
    this._loading.set(true);

    if (isEdit && formData.id) {
      this.flashcardApi.updateFlashcard(formData.id, {
        front: formData.front,
        back: formData.back,
        front_image_url: formData.front_image_url,
        front_language: formData.front_language,
        back_language: formData.back_language,
        back_audio_url: formData.back_audio_url,
      }).subscribe({
        next: (updatedFlashcard: FlashcardDTO) => {
          this._flashcards.update((cards: FlashcardDTO[]) =>
            cards.map((f: FlashcardDTO) => f.id === updatedFlashcard.id ? updatedFlashcard : f)
          );
          this._loading.set(false);
          this.closeFormModal();
          this.toastService.add({
            severity: 'success',
            summary: this.t.translate('toasts.success'),
            detail: this.t.translate('flashcards.toasts.cardUpdated')
          });
        },
        error: (error) => this.handleApiError(error, 'aktualizacji')
      });
    } else {
      this.flashcardApi.createFlashcard({
        front: formData.front,
        back: formData.back,
        front_image_url: formData.front_image_url,
        front_language: formData.front_language,
        back_language: formData.back_language,
        back_audio_url: formData.back_audio_url,
        source: 'manual',
        set_id: this._setId()
      }).subscribe({
        next: () => {
          this.loadFlashcards();
          this._loading.set(false);
          this.closeFormModal();
          this.toastService.add({
            severity: 'success',
            summary: this.t.translate('toasts.success'),
            detail: this.t.translate('flashcards.toasts.cardAdded')
          });
        },
        error: (error) => this.handleApiError(error, 'dodawania')
      });
    }
  }

  public deleteFlashcard(flashcard: FlashcardDTO): void {
    this._loading.set(true);
    this.flashcardApi.deleteFlashcard(flashcard.id).subscribe({
      next: () => {
        this._flashcards.update((cards: FlashcardDTO[]) => cards.filter((f: FlashcardDTO) => f.id !== flashcard.id));
        this._totalRecords.update((total: number) => total - 1);
        this._loading.set(false);
        if (this._flashcards().length === 0 && this._first() > 0) {
          this.loadFlashcards({ first: Math.max(0, this._first() - this._rows()) });
        } else {
          this.loadFlashcards();
        }
        this.showUndoDelete(flashcard);
      },
      error: (error) => this.handleApiError(error, 'usuwania')
    });
  }

  public bulkDeleteFlashcards(ids: number[]): void {
    this._loading.set(true);
    const deleteObservables = ids.map((id: number) =>
      this.flashcardApi.deleteFlashcard(id).pipe(
        catchError(() => of({ error: true, id }))
      )
    );
    forkJoin(deleteObservables).subscribe({
      next: (results) => {
        const failed = results.filter((r): r is { error: true; id: number } => typeof r === 'object' && r !== null && 'error' in r);
        const successCount: number = ids.length - failed.length;

        if (failed.length === 0) {
          this.toastService.add({
            severity: 'success',
            summary: this.t.translate('toasts.success'),
            detail: this.t.translate('flashcards.toasts.cardsDeleted', { count: successCount })
          });
        } else if (successCount > 0) {
          this.toastService.add({
            severity: 'warn',
            summary: this.t.translate('flashcards.toasts.partialSuccess'),
            detail: this.t.translate('flashcards.toasts.partialDeleteDetail', { success: successCount, total: ids.length, failed: failed.length }),
            life: 5000
          });
        } else {
          this.toastService.add({
            severity: 'error',
            summary: this.t.translate('toasts.error'),
            detail: this.t.translate('flashcards.toasts.deleteFailed'),
            life: 5000
          });
        }
        this.loadFlashcards();
      }
    });
  }

  public undoDelete(): void {
    const flashcard: FlashcardDTO | null = this._lastDeleted();
    if (!flashcard) return;

    if (this.undoTimer) clearTimeout(this.undoTimer);
    this._lastDeleted.set(null);

    this.flashcardApi.createFlashcard({
      front: flashcard.front,
      back: flashcard.back,
      front_image_url: flashcard.front_image_url,
      back_audio_url: flashcard.back_audio_url,
      front_language: flashcard.front_language,
      back_language: flashcard.back_language,
      source: flashcard.source,
      set_id: flashcard.set_id
    }).subscribe({
      next: () => {
        this.loadFlashcards();
        this.toastService.add({
          severity: 'success',
          summary: this.t.translate('flashcards.toasts.restoredSummary'),
          detail: this.t.translate('flashcards.toasts.restored')
        });
      },
      error: () => {
        this.toastService.add({
          severity: 'error',
          summary: this.t.translate('toasts.error'),
          detail: this.t.translate('flashcards.toasts.restoreFailed')
        });
      }
    });
  }

  public dismissUndo(): void {
    if (this.undoTimer) clearTimeout(this.undoTimer);
    this._lastDeleted.set(null);
  }

  public openImportModal(): void {
    this._isImportModalVisible.set(true);
  }

  public closeImportModal(): void {
    this._isImportModalVisible.set(false);
  }

  public importFlashcards(proposals: FlashcardProposalDTO[]): void {
    this._loading.set(true);
    this.flashcardApi.createFlashcards(proposals, this._setId()).subscribe({
      next: (savedFlashcards: FlashcardDTO[]) => {
        this._isImportModalVisible.set(false);
        this._loading.set(false);
        this.toastService.add({
          severity: 'success',
          summary: this.t.translate('toasts.success'),
          detail: this.t.translate('flashcards.toasts.cardsImported', { count: savedFlashcards.length })
        });
        this.loadFlashcards();
      },
      error: (error) => this.handleApiError(error, 'importowania')
    });
  }

  public exportCsv(): void {
    this.fetchAllFlashcards((flashcards: FlashcardDTO[]) => {
      const filename: string = `${this._setName() || 'flashcards'}.csv`;
      this.exportService.exportToCsv(flashcards, filename);
    }, 'eksportowania', this.t.translate('flashcards.toasts.cardsExported', { count: this._totalRecords() }));
  }

  public exportJson(): void {
    this.fetchAllFlashcards((flashcards: FlashcardDTO[]) => {
      const filename: string = `${this._setName() || 'flashcards'}.json`;
      this.exportService.exportToJson(flashcards, filename);
    }, 'eksportowania', this.t.translate('flashcards.toasts.cardsExported', { count: this._totalRecords() }));
  }

  public printTest(config: PrintTestConfig): void {
    this.fetchAllFlashcards((flashcards: FlashcardDTO[]) => {
      const opened: boolean = this.printTestService.generateAndPrint(flashcards, config);
      if (!opened) {
        this.toastService.add({
          severity: 'warn',
          summary: this.t.translate('flashcards.toasts.popupBlocked'),
          detail: this.t.translate('flashcards.toasts.popupBlockedDetail'),
          life: 5000
        });
      }
    }, 'generowania testu');
  }

  public onReorder(events: ReorderEvent[]): void {
    const offset: number = this._first();
    const updates = events.map((e: ReorderEvent) => ({ id: e.id, position: offset + e.newIndex + 1 }));

    const reordered: FlashcardDTO[] = events
      .sort((a: ReorderEvent, b: ReorderEvent) => a.newIndex - b.newIndex)
      .map((e: ReorderEvent) => this._flashcards().find((f: FlashcardDTO) => f.id === e.id)!)
      .filter(Boolean);
    this._flashcards.set(reordered);

    this.flashcardApi.reorderFlashcards(updates).subscribe({
      next: () => {
        this.toastService.add({
          severity: 'success',
          summary: this.t.translate('toasts.success'),
          detail: this.t.translate('flashcards.toasts.orderChanged')
        });
      },
      error: () => {
        this.toastService.add({
          severity: 'error',
          summary: this.t.translate('toasts.error'),
          detail: this.t.translate('flashcards.toasts.orderSaveFailed'),
          life: 3000
        });
        this.loadFlashcards();
      }
    });
  }

  public generateShareLink(setId: number): void {
    this._shareLink.set(null);
    this._shareLoading.set(true);
    // ShareService is async/promise-based, imported in the component
    // This method is called by the component which handles the async part
  }

  public setShareLink(link: string | null): void {
    this._shareLink.set(link);
    this._shareLoading.set(false);
  }

  public setShareLoading(loading: boolean): void {
    this._shareLoading.set(loading);
  }

  public setSavedCount(count: number): void {
    this._savedCount.set(count);
  }

  public dismissSavedBanner(): void {
    this._savedCount.set(0);
  }

  public uploadImage(file: File): void {
    this._imageError.set(null);
    const validationError: string | null = this.imageUploadService.validateFile(file);
    if (validationError) {
      this._imageError.set(validationError);
      return;
    }
    this._imageUploading.set(true);
    this.imageUploadService.uploadImage(file).subscribe({
      next: (url: string) => {
        this._imagePreview.set(url);
        this._imageUploading.set(false);
      },
      error: (err: Error) => {
        this._imageError.set(err.message);
        this._imageUploading.set(false);
      }
    });
  }

  public deleteImage(): void {
    const currentUrl: string | null = this._imagePreview();
    if (currentUrl) {
      this.imageUploadService.deleteImage(currentUrl).subscribe({
        error: (err: unknown) => this.logger.error('FlashcardsFacade.deleteImage', err)
      });
    }
    this._imagePreview.set(null);
    this._imageError.set(null);
  }

  public uploadAudio(file: File): void {
    this._audioError.set(null);
    const validationError: string | null = this.audioUploadService.validateFile(file);
    if (validationError) {
      this._audioError.set(validationError);
      return;
    }
    this._audioUploading.set(true);
    this.audioUploadService.uploadAudio(file).subscribe({
      next: (url: string) => {
        this._audioPreview.set(url);
        this._audioUploading.set(false);
      },
      error: (err: Error) => {
        this._audioError.set(err.message);
        this._audioUploading.set(false);
      }
    });
  }

  public deleteAudio(): void {
    const currentUrl: string | null = this._audioPreview();
    if (currentUrl) {
      this.audioUploadService.deleteAudio(currentUrl).subscribe({
        error: (err: unknown) => this.logger.error('FlashcardsFacade.deleteAudio', err)
      });
    }
    this._audioPreview.set(null);
    this._audioError.set(null);
  }

  public requestTranslation(text: string, fromLang: FlashcardLanguage, toLang: FlashcardLanguage): void {
    this._translating.set(true);
    this._translationSuggestion.set(null);
    this.openRouterService.translateText(text, fromLang, toLang)
      .then((translation: string) => {
        this._translationSuggestion.set(translation);
        this._translating.set(false);
      })
      .catch(() => {
        this._translating.set(false);
      });
  }

  public clearTranslationSuggestion(): void {
    this._translationSuggestion.set(null);
  }

  public resetFormMediaState(): void {
    this._imagePreview.set(null);
    this._imageUploading.set(false);
    this._imageError.set(null);
    this._audioPreview.set(null);
    this._audioUploading.set(false);
    this._audioError.set(null);
    this._translationSuggestion.set(null);
    this._translating.set(false);
  }

  public initFormMediaState(flashcard: FlashcardDTO | null): void {
    this.resetFormMediaState();
    if (flashcard) {
      this._imagePreview.set(flashcard.front_image_url || null);
      this._audioPreview.set(flashcard.back_audio_url || null);
    }
  }

  public destroy(): void {
    if (this.undoTimer) clearTimeout(this.undoTimer);
    if (this.redirectTimer) clearTimeout(this.redirectTimer);
  }

  private loadSetName(setId: number): void {
    this.setApi.getSet(setId).subscribe({
      next: (set) => {
        this._setName.set(set.name);
      },
      error: () => {
        this._needsAuthRedirect.set(true);
      }
    });
  }

  private showUndoDelete(flashcard: FlashcardDTO): void {
    this._lastDeleted.set(flashcard);
    if (this.undoTimer) clearTimeout(this.undoTimer);
    this.undoTimer = setTimeout(() => this._lastDeleted.set(null), 6000);
  }

  private fetchAllFlashcards(
    callback: (flashcards: FlashcardDTO[]) => void,
    errorContext: string = 'eksportowania',
    successMessage?: string
  ): void {
    this._loading.set(true);
    this.flashcardApi.getFlashcards({
      limit: 10000,
      offset: 0,
      search: '',
      sortField: 'id',
      sortOrder: -1,
      setId: this._setId()
    }).subscribe({
      next: (response: { flashcards: FlashcardDTO[]; totalRecords: number }) => {
        this._loading.set(false);
        callback(response.flashcards);
        if (successMessage) {
          this.toastService.add({
            severity: 'success',
            summary: this.t.translate('toasts.success'),
            detail: successMessage
          });
        }
      },
      error: (error: unknown) => this.handleApiError(error, errorContext)
    });
  }

  private handleApiError(error: unknown, action: string): void {
    let errorMessage: string = this.t.translate('flashcards.toasts.operationFailed', { action });
    let summary: string = this.t.translate('toasts.error');
    let redirectToLogin: boolean = false;

    const err = error as { status?: number; message?: string };

    if (err.status === 401) {
      errorMessage = this.t.translate('flashcards.toasts.authLogin');
      summary = this.t.translate('flashcards.toasts.authSummary');
      redirectToLogin = true;
    } else if (err.status === 403) {
      errorMessage = this.t.translate('flashcards.toasts.permissionError');
      summary = this.t.translate('flashcards.toasts.permissionSummary');
    } else if (err.status === 404) {
      errorMessage = this.t.translate('flashcards.toasts.notFoundDetail');
      this.loadFlashcards();
    }

    if (err.message && (err.message.includes('nie jest zalogowany') || err.message.includes('Sesja wygasła'))) {
      errorMessage = this.t.translate('flashcards.toasts.loginRequired');
      summary = this.t.translate('flashcards.toasts.authSummary');
      redirectToLogin = true;
    }

    this._loading.set(false);
    this._error.set(errorMessage);

    this.toastService.add({
      severity: 'error',
      summary: summary,
      detail: errorMessage,
      life: 5000
    });

    if (redirectToLogin) {
      this.redirectTimer = setTimeout(() => {
        this._needsAuthRedirect.set(true);
      }, 2000);
    }
  }
}
