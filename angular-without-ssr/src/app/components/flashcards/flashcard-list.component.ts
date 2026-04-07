import { TranslocoDirective } from '@jsverse/transloco';
import { Component, OnInit, OnDestroy, signal, inject, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DialogComponent } from '../../shared/components/dialog/dialog.component';
import { ToastService } from '../../shared/services/toast.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { SpinnerComponent } from '../../shared/components/spinner/spinner.component';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { FlashcardApiService } from '../../services/flashcard-api.service';
import { FlashcardSetApiService } from '../../services/flashcard-set-api.service';
import { FlashcardExportService } from '../../services/flashcard-export.service';
import { PrintTestService, PrintTestConfig } from '../../services/print-test.service';
import { ShareService } from '../../services/share.service';
import { FlashcardTableComponent, ReorderEvent } from './flashcard-table/flashcard-table.component';
import { FlashcardFormComponent, FlashcardFormData } from './flashcard-form/flashcard-form.component';
import { ImportModalComponent } from './import-modal/import-modal.component';
import { PrintTestConfigComponent } from './print-test-config/print-test-config.component';
import { FlashcardDTO, FlashcardProposalDTO } from '../../../types';
import { ShareToFriendDialogComponent } from '../friends/share-to-friend-dialog.component';

interface FlashcardListState {
  flashcards: FlashcardDTO[];
  totalRecords: number;
  loading: boolean;
  error: string | null;
  rows: number;
  first: number;
  isFormModalVisible: boolean;
  isImportModalVisible: boolean;
  flashcardBeingEdited: FlashcardDTO | null;
  searchTerm: string;
  sortField: string;
  sortOrder: number;
  setId: number;
  setName: string;
}

@Component({
  selector: 'app-flashcard-list',
  imports: [
    DialogComponent,
    SpinnerComponent,
    FlashcardTableComponent,
    FlashcardFormComponent,
    ImportModalComponent,
    PrintTestConfigComponent,
    ShareToFriendDialogComponent,
    RouterModule,
    TranslocoDirective
  ],
  templateUrl: './flashcard-list.component.html',
  styleUrls: ['./flashcard-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FlashcardListComponent implements OnInit, OnDestroy {
  private flashcardApiService: FlashcardApiService = inject(FlashcardApiService);
  private flashcardSetApiService: FlashcardSetApiService = inject(FlashcardSetApiService);
  private flashcardExportService: FlashcardExportService = inject(FlashcardExportService);
  private toastService: ToastService = inject(ToastService);
  private confirmService = inject(ConfirmService);
  private router: Router = inject(Router);
  private route: ActivatedRoute = inject(ActivatedRoute);
  private destroyRef: DestroyRef = inject(DestroyRef);
  private readonly shareService = inject(ShareService);
  private readonly printTestService = inject(PrintTestService);

  state = signal<FlashcardListState>({
    flashcards: [],
    totalRecords: 0,
    loading: false,
    error: null,
    rows: 10,
    first: 0,
    isFormModalVisible: false,
    isImportModalVisible: false,
    flashcardBeingEdited: null,
    searchTerm: '',
    sortField: 'position',
    sortOrder: 1,
    setId: 0,
    setName: ''
  });

  public lastDeletedSignal = signal<FlashcardDTO | null>(null);
  public savedCountSignal = signal<number>(0);
  public moreMenuOpen = signal(false);
  readonly shareDialogVisible = signal(false);
  readonly shareLink = signal<string | null>(null);
  readonly shareLoading = signal(false);
  readonly printTestDialogVisible = signal(false);
  readonly shareToFriendVisible = signal(false);
  private undoTimer: ReturnType<typeof setTimeout> | null = null;
  private redirectTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.route.params.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const setId = Number(params['id']);
      if (!setId) {
        this.router.navigate(['/sets']);
        return;
      }
      this.state.update(s => ({ ...s, setId, first: 0 }));
      this.loadSetName(setId);
      this.loadFlashcards();
    });

    const saved = this.route.snapshot.queryParams['saved'];
    if (saved) {
      this.savedCountSignal.set(Number(saved));
      this.router.navigate([], { queryParams: {}, replaceUrl: true });
    }

    const shared = this.route.snapshot.queryParams['shared'];
    if (shared) {
      this.toastService.add({
        severity: 'success',
        summary: 'Skopiowano',
        detail: 'Zestaw został skopiowany na Twoje konto',
      });
      this.router.navigate([], { queryParams: {}, replaceUrl: true });
    }
  }

  dismissSavedBanner(): void {
    this.savedCountSignal.set(0);
  }

  ngOnDestroy(): void {
    if (this.undoTimer) {
      clearTimeout(this.undoTimer);
    }
    if (this.redirectTimer) {
      clearTimeout(this.redirectTimer);
    }
  }

  private loadSetName(setId: number): void {
    this.flashcardSetApiService.getSet(setId).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (set) => {
        this.state.update(s => ({ ...s, setName: set.name }));
      },
      error: () => {
        this.router.navigate(['/sets']);
      }
    });
  }

  goBackToSets(): void {
    this.router.navigate(['/sets']);
  }

  // Ładowanie fiszek z API
  loadFlashcards(event?: { first?: number; rows?: number; sortField?: string; sortOrder?: number }): void {
    const first = event?.first ?? this.state().first;
    const rows = event?.rows ?? this.state().rows;
    const sortField = event?.sortField ?? this.state().sortField;
    const sortOrder = event?.sortOrder ?? this.state().sortOrder;

    // Aktualizuj stan jako "ładowanie"
    this.state.update(state => ({
      ...state,
      loading: true,
      first,
      rows,
      sortField: sortField || state.sortField,
      sortOrder: sortOrder !== undefined ? sortOrder : state.sortOrder
    }));

    this.flashcardApiService.getFlashcards({
      limit: rows,
      offset: first,
      search: this.state().searchTerm,
      sortField: this.state().sortField,
      sortOrder: this.state().sortOrder,
      setId: this.state().setId
    }).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (response) => {
        this.state.update(state => ({
          ...state,
          flashcards: response.flashcards,
          totalRecords: response.totalRecords,
          loading: false,
          error: null
        }));
      },
      error: (error) => {
        let errorMessage = 'Nie udało się pobrać fiszek. Spróbuj ponownie później.';

        // Sprawdzamy, czy błąd jest związany z autentykacją
        if (error.message && error.message.includes('nie jest zalogowany')) {
          errorMessage = 'Musisz być zalogowany, aby zobaczyć swoje fiszki.';

          // Wyświetlamy komunikat w toaście
          this.toastService.add({
            severity: 'error',
            summary: 'Błąd autoryzacji',
            detail: errorMessage,
            life: 5000
          });
        }

        this.state.update(state => ({
          ...state,
          loading: false,
          error: errorMessage
        }));
      }
    });
  }

  // Otwarcie modala dodawania nowej fiszki
  openAddModal(): void {
    // Ustaw stan
    this.state.update(state => ({
      ...state,
      flashcardBeingEdited: null,
      isFormModalVisible: true
    }));
  }

  openEditModal(flashcard: FlashcardDTO): void {
    this.state.update(state => ({
      ...state,
      flashcardBeingEdited: flashcard,
      isFormModalVisible: true
    }));
  }

  onCloseFormModal(): void {
    this.state.update(state => ({
      ...state,
      isFormModalVisible: false,
      flashcardBeingEdited: null
    }));
  }

  // Obsługa zapisu (dodawanie lub edycja)
  onSave(formData: FlashcardFormData): void {
    const isEdit = !!formData.id;

    // Symulacja zapisywania
    this.state.update(state => ({
      ...state,
      loading: true
    }));

    if (isEdit && formData.id) {
      this.flashcardApiService.updateFlashcard(
        formData.id,
        {
          front: formData.front,
          back: formData.back,
          front_image_url: formData.front_image_url,
          front_language: formData.front_language,
          back_language: formData.back_language,
          back_audio_url: formData.back_audio_url,
        }
      ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (updatedFlashcard) => {
          this.state.update(state => ({
            ...state,
            flashcards: state.flashcards.map(f =>
              f.id === updatedFlashcard.id ? updatedFlashcard : f
            ),
            loading: false
          }));
          this.onCloseFormModal();
          this.toastService.add({
            severity: 'success',
            summary: 'Sukces',
            detail: 'Fiszka została zaktualizowana.'
          });
        },
        error: (error) => this.handleApiError(error, 'aktualizacji')
      });
    } else {
      this.flashcardApiService.createFlashcard({
        front: formData.front,
        back: formData.back,
        front_image_url: formData.front_image_url,
        front_language: formData.front_language,
        back_language: formData.back_language,
        back_audio_url: formData.back_audio_url,
        source: 'manual',
        set_id: this.state().setId
      }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.loadFlashcards();
          this.state.update(state => ({
            ...state,
            loading: false
          }));
          this.onCloseFormModal();
          this.toastService.add({
            severity: 'success',
            summary: 'Sukces',
            detail: 'Nowa fiszka została dodana.'
          });
        },
        error: (error) => this.handleApiError(error, 'dodawania')
      });
    }
  }

  // Obsługa usuwania fiszki
  async handleDelete(flashcard: FlashcardDTO): Promise<void> {
    const confirmed = await this.confirmService.confirm({
      message: `Czy na pewno chcesz usunąć fiszkę "${flashcard.front}"?`,
      header: 'Potwierdzenie usunięcia',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Tak',
      rejectLabel: 'Nie',
      acceptClass: 'danger'
    });
    if (confirmed) {
      this.state.update(state => ({
        ...state,
        loading: true
      }));

      this.flashcardApiService.deleteFlashcard(flashcard.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.state.update(state => ({
            ...state,
            flashcards: state.flashcards.filter(f => f.id !== flashcard.id),
            totalRecords: state.totalRecords - 1,
            loading: false
          }));
          if (this.state().flashcards.length === 0 && this.state().first > 0) {
            this.loadFlashcards({ first: Math.max(0, this.state().first - this.state().rows) });
          } else {
            this.loadFlashcards();
          }
          this.showUndoDelete(flashcard);
        },
        error: (error) => this.handleApiError(error, 'usuwania')
      });
    }
  }

  async handleBulkDelete(ids: number[]): Promise<void> {
    const confirmed = await this.confirmService.confirm({
      message: `Czy na pewno chcesz usunąć ${ids.length} ${ids.length === 1 ? 'fiszkę' : (ids.length < 5 ? 'fiszki' : 'fiszek')}?`,
      header: 'Potwierdzenie usunięcia',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Tak',
      rejectLabel: 'Nie',
      acceptClass: 'danger'
    });
    if (confirmed) {
      this.state.update(state => ({ ...state, loading: true }));

      const deleteObservables = ids.map(id =>
        this.flashcardApiService.deleteFlashcard(id).pipe(
          catchError(() => of({ error: true, id }))
        )
      );
      forkJoin(deleteObservables).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (results) => {
          const failed = results.filter((r): r is { error: true; id: number } => typeof r === 'object' && r !== null && 'error' in r);
          const successCount = ids.length - failed.length;

          if (failed.length === 0) {
            this.toastService.add({
              severity: 'success',
              summary: 'Sukces',
              detail: `Usunięto ${successCount} ${successCount === 1 ? 'fiszkę' : (successCount < 5 ? 'fiszki' : 'fiszek')}.`
            });
          } else if (successCount > 0) {
            this.toastService.add({
              severity: 'warn',
              summary: 'Częściowy sukces',
              detail: `Usunięto ${successCount} z ${ids.length}. Nie udało się usunąć ${failed.length}.`,
              life: 5000
            });
          } else {
            this.toastService.add({
              severity: 'error',
              summary: 'Błąd',
              detail: 'Nie udało się usunąć fiszek. Spróbuj ponownie.',
              life: 5000
            });
          }
          this.loadFlashcards();
        }
      });
    }
  }

  onPageChange(event: { first: number; rows: number }): void {
    // Aktualizuj stan bez ładowania danych
    this.state.update(state => ({
      ...state,
      first: event.first,
      rows: event.rows
    }));

    this.loadFlashcards(event);
  }

  // Obsługa sortowania
  onSort(event: { sortField: string; sortOrder: number }): void {
    // Aktualizuj stan bez ładowania danych
    this.state.update(state => ({
      ...state,
      sortField: event.sortField,
      sortOrder: event.sortOrder
    }));

    this.loadFlashcards(event);
  }

  onRowsChange(rows: number): void {
    this.state.update(state => ({
      ...state,
      rows,
      first: 0
    }));
    this.loadFlashcards();
  }

  onReorder(events: ReorderEvent[]): void {
    // Calculate new positions based on current page offset
    const offset: number = this.state().first;
    const updates = events.map(e => ({ id: e.id, position: offset + e.newIndex + 1 }));

    // Optimistically update local state
    const reordered = events
      .sort((a, b) => a.newIndex - b.newIndex)
      .map(e => this.state().flashcards.find(f => f.id === e.id)!)
      .filter(Boolean);
    this.state.update(s => ({ ...s, flashcards: reordered }));

    this.flashcardApiService.reorderFlashcards(updates).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        this.toastService.add({
          severity: 'success',
          summary: 'Sukces',
          detail: 'Kolejność fiszek została zmieniona.'
        });
      },
      error: () => {
        this.toastService.add({
          severity: 'error',
          summary: 'Błąd',
          detail: 'Nie udało się zapisać kolejności. Odświeżam...',
          life: 3000
        });
        this.loadFlashcards();
      }
    });
  }

  // Obsługa wyszukiwania
  onSearch(term: string): void {
    // Aktualizuj stan searchTerm
    this.state.update(state => ({
      ...state,
      searchTerm: term,
      // Resetuj paginację do pierwszej strony przy nowym wyszukiwaniu
      first: 0
    }));

    this.loadFlashcards();
  }

  // Resetowanie filtrów
  resetFilters(): void {
    this.state.update(state => ({
      ...state,
      searchTerm: '',
      sortField: 'id',
      sortOrder: -1,
      first: 0
    }));

    this.loadFlashcards();
  }

  openImportModal(): void {
    this.state.update(s => ({ ...s, isImportModalVisible: true }));
  }

  onCloseImportModal(): void {
    this.state.update(s => ({ ...s, isImportModalVisible: false }));
  }

  onImportSaved(proposals: FlashcardProposalDTO[]): void {
    this.state.update(s => ({ ...s, loading: true }));

    this.flashcardApiService.createFlashcards(proposals, this.state().setId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (savedFlashcards) => {
        this.state.update(s => ({ ...s, isImportModalVisible: false, loading: false }));
        this.toastService.add({
          severity: 'success',
          summary: 'Sukces',
          detail: `Zaimportowano ${savedFlashcards.length} fiszek.`
        });
        this.loadFlashcards();
      },
      error: (error) => this.handleApiError(error, 'importowania')
    });
  }

  exportCsv(): void {
    this.fetchAllFlashcards((flashcards: FlashcardDTO[]) => {
      const filename: string = `${this.state().setName || 'flashcards'}.csv`;
      this.flashcardExportService.exportToCsv(flashcards, filename);
    }, 'eksportowania', `Wyeksportowano ${this.state().totalRecords} fiszek.`);
  }

  exportJson(): void {
    this.fetchAllFlashcards((flashcards: FlashcardDTO[]) => {
      const filename: string = `${this.state().setName || 'flashcards'}.json`;
      this.flashcardExportService.exportToJson(flashcards, filename);
    }, 'eksportowania', `Wyeksportowano ${this.state().totalRecords} fiszek.`);
  }

  async openShareDialog(): Promise<void> {
    this.shareDialogVisible.set(true);
    this.shareLink.set(null);
    this.shareLoading.set(true);
    try {
      const setId = Number(this.route.snapshot.paramMap.get('id'));
      const link = await this.shareService.createShareLink(setId);
      this.shareLink.set(this.shareService.buildShareUrl(link.id));
    } catch {
      this.toastService.add({
        severity: 'error',
        summary: 'Błąd',
        detail: 'Nie udało się wygenerować linku',
      });
      this.shareDialogVisible.set(false);
    } finally {
      this.shareLoading.set(false);
    }
  }

  async copyShareLink(): Promise<void> {
    const link = this.shareLink();
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      this.toastService.add({
        severity: 'success',
        summary: 'Skopiowano',
        detail: 'Link skopiowany do schowka',
      });
    } catch {
      this.toastService.add({
        severity: 'error',
        summary: 'Błąd',
        detail: 'Nie udało się skopiować linku',
      });
    }
  }

  openPrintTestDialog(): void {
    this.printTestDialogVisible.set(true);
  }

  onPrintTest(config: PrintTestConfig): void {
    this.printTestDialogVisible.set(false);
    this.fetchAllFlashcards((flashcards: FlashcardDTO[]) => {
      const opened: boolean = this.printTestService.generateAndPrint(flashcards, config);
      if (!opened) {
        this.toastService.add({
          severity: 'warn',
          summary: 'Popup zablokowany',
          detail: 'Odblokuj wyskakujące okienka w przeglądarce, aby wydrukować test.',
          life: 5000
        });
      }
    }, 'generowania testu');
  }

  private fetchAllFlashcards(
    callback: (flashcards: FlashcardDTO[]) => void,
    errorContext: string = 'eksportowania',
    successMessage?: string
  ): void {
    this.state.update(s => ({ ...s, loading: true }));

    this.flashcardApiService.getFlashcards({
      limit: 10000,
      offset: 0,
      search: '',
      sortField: 'id',
      sortOrder: -1,
      setId: this.state().setId
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response: { flashcards: FlashcardDTO[]; totalRecords: number }) => {
        this.state.update(s => ({ ...s, loading: false }));
        callback(response.flashcards);
        if (successMessage) {
          this.toastService.add({
            severity: 'success',
            summary: 'Sukces',
            detail: successMessage
          });
        }
      },
      error: (error: unknown) => this.handleApiError(error, errorContext)
    });
  }

  // Pomocnicza metoda do obsługi błędów API
  private showUndoDelete(flashcard: FlashcardDTO): void {
    this.lastDeletedSignal.set(flashcard);
    if (this.undoTimer) clearTimeout(this.undoTimer);
    this.undoTimer = setTimeout(() => this.lastDeletedSignal.set(null), 6000);
  }

  public undoDelete(): void {
    const flashcard: FlashcardDTO | null = this.lastDeletedSignal();
    if (!flashcard) return;

    if (this.undoTimer) clearTimeout(this.undoTimer);
    this.lastDeletedSignal.set(null);

    this.flashcardApiService.createFlashcard({
      front: flashcard.front,
      back: flashcard.back,
      front_image_url: flashcard.front_image_url,
      back_audio_url: flashcard.back_audio_url,
      front_language: flashcard.front_language,
      back_language: flashcard.back_language,
      source: flashcard.source,
      set_id: flashcard.set_id
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.loadFlashcards();
        this.toastService.add({
          severity: 'success',
          summary: 'Przywrócono',
          detail: 'Fiszka została przywrócona.'
        });
      },
      error: () => {
        this.toastService.add({
          severity: 'error',
          summary: 'Błąd',
          detail: 'Nie udało się przywrócić fiszki.'
        });
      }
    });
  }

  public dismissUndo(): void {
    if (this.undoTimer) clearTimeout(this.undoTimer);
    this.lastDeletedSignal.set(null);
  }

  private handleApiError(error: unknown, action: string): void {
    let errorMessage = `Nie udało się wykonać operacji ${action}. Spróbuj ponownie później.`;
    let summary = 'Błąd';
    let redirectToLogin = false;

    const err = error as { status?: number; message?: string };

    if (err.status === 401) {
      errorMessage = 'Błąd autoryzacji. Zaloguj się ponownie.';
      summary = 'Błąd autoryzacji';
      redirectToLogin = true;
    } else if (err.status === 403) {
      errorMessage = 'Brak uprawnień do wykonania tej operacji.';
      summary = 'Błąd uprawnień';
    } else if (err.status === 404) {
      errorMessage = 'Nie znaleziono fiszki. Może została już usunięta.';
      this.loadFlashcards();
    }

    if (err.message && (err.message.includes('nie jest zalogowany') || err.message.includes('Sesja wygasła'))) {
      errorMessage = 'Musisz być zalogowany, aby zarządzać fiszkami.';
      summary = 'Błąd autoryzacji';
      redirectToLogin = true;
    }

    this.state.update(state => ({
      ...state,
      loading: false,
      error: errorMessage
    }));

    this.toastService.add({
      severity: 'error',
      summary: summary,
      detail: errorMessage,
      life: 5000
    });

    // Przekierowanie do strony logowania, jeśli to konieczne
    if (redirectToLogin) {
      this.redirectTimer = setTimeout(() => {
        this.router.navigate(['/login']);
      }, 2000);
    }
  }
}
