import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

import { FlashcardApiService } from '../../services/flashcard-api.service';
import { FlashcardSetApiService } from '../../services/flashcard-set-api.service';
import { FlashcardTableComponent } from './flashcard-table/flashcard-table.component';
import { FlashcardFormComponent, FlashcardFormData } from './flashcard-form/flashcard-form.component';
import { FlashcardDTO } from '../../../types';

interface FlashcardListState {
  flashcards: FlashcardDTO[];
  totalRecords: number;
  loading: boolean;
  error: string | null;
  rows: number;
  first: number;
  isFormModalVisible: boolean;
  flashcardBeingEdited: FlashcardDTO | null;
  searchTerm: string;
  sortField: string;
  sortOrder: number;
  setId: number;
  setName: string;
}

@Component({
  selector: 'app-flashcard-list',
  standalone: true,
  imports: [
    CommonModule,
    DialogModule,
    ToastModule,
    ConfirmDialogModule,
    FlashcardTableComponent,
    FlashcardFormComponent,
    RouterModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './flashcard-list.component.html',
  styleUrls: ['./flashcard-list.component.css']
})
export class FlashcardListComponent implements OnInit, OnDestroy {
  private flashcardApiService = inject(FlashcardApiService);
  private flashcardSetApiService = inject(FlashcardSetApiService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  state = signal<FlashcardListState>({
    flashcards: [],
    totalRecords: 0,
    loading: false,
    error: null,
    rows: 10,
    first: 0,
    isFormModalVisible: false,
    flashcardBeingEdited: null,
    searchTerm: '',
    sortField: 'id',
    sortOrder: -1,
    setId: 0,
    setName: ''
  });

  dialogVisible: boolean = false;
  private routeSub: Subscription | null = null;

  ngOnInit(): void {
    this.routeSub = this.route.params.subscribe(params => {
      const setId = Number(params['id']);
      if (!setId) {
        this.router.navigate(['/sets']);
        return;
      }
      this.state.update(s => ({ ...s, setId, first: 0 }));
      this.loadSetName(setId);
      this.loadFlashcards();
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  private loadSetName(setId: number): void {
    this.flashcardSetApiService.getSet(setId).subscribe({
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
  loadFlashcards(event?: any): void {
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
    }).subscribe({
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
          this.messageService.add({
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

    // Otwórz dialog
    this.dialogVisible = true;
  }

  // Otwarcie modala edycji fiszki
  openEditModal(flashcard: FlashcardDTO): void {
    // Ustaw stan
    this.state.update(state => ({
      ...state,
      flashcardBeingEdited: flashcard,
      isFormModalVisible: true
    }));

    // Otwórz dialog
    this.dialogVisible = true;
  }

  // Zamknięcie modala formularza
  onCloseFormModal(): void {
    // Zamknij dialog
    this.dialogVisible = false;

    // Zaktualizuj stan
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
        { front: formData.front, back: formData.back }
      ).subscribe({
        next: (updatedFlashcard) => {
          this.state.update(state => ({
            ...state,
            flashcards: state.flashcards.map(f =>
              f.id === updatedFlashcard.id ? updatedFlashcard : f
            ),
            loading: false
          }));
          this.onCloseFormModal();
          this.messageService.add({
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
        source: 'manual',
        set_id: this.state().setId
      }).subscribe({
        next: (newFlashcard) => {
          this.loadFlashcards();
          this.state.update(state => ({
            ...state,
            loading: false
          }));
          this.onCloseFormModal();
          this.messageService.add({
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
  handleDelete(flashcard: FlashcardDTO): void {
    this.confirmationService.confirm({
      message: `Czy na pewno chcesz usunąć fiszkę "${flashcard.front}"?`,
      header: 'Potwierdzenie usunięcia',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Tak',
      rejectLabel: 'Nie',
      accept: () => {
        this.state.update(state => ({
          ...state,
          loading: true
        }));

        this.flashcardApiService.deleteFlashcard(flashcard.id).subscribe({
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
            this.messageService.add({
              severity: 'success',
              summary: 'Sukces',
              detail: 'Fiszka została usunięta.'
            });
          },
          error: (error) => this.handleApiError(error, 'usuwania')
        });
      }
    });
  }

  handleBulkDelete(ids: number[]): void {
    this.confirmationService.confirm({
      message: `Czy na pewno chcesz usunąć ${ids.length} ${ids.length === 1 ? 'fiszkę' : (ids.length < 5 ? 'fiszki' : 'fiszek')}?`,
      header: 'Potwierdzenie usunięcia',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Tak',
      rejectLabel: 'Nie',
      accept: () => {
        this.state.update(state => ({ ...state, loading: true }));

        const deleteObservables = ids.map(id => this.flashcardApiService.deleteFlashcard(id));
        import('rxjs').then(({ forkJoin }) => {
          forkJoin(deleteObservables).subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Sukces',
                detail: `Usunięto ${ids.length} ${ids.length === 1 ? 'fiszkę' : (ids.length < 5 ? 'fiszki' : 'fiszek')}.`
              });
              this.loadFlashcards();
            },
            error: (error) => this.handleApiError(error, 'usuwania')
          });
        });
      }
    });
  }

  onPageChange(event: any): void {
    // Aktualizuj stan bez ładowania danych
    this.state.update(state => ({
      ...state,
      first: event.first,
      rows: event.rows
    }));

    this.loadFlashcards(event);
  }

  // Obsługa sortowania
  onSort(event: any): void {
    // Aktualizuj stan bez ładowania danych
    this.state.update(state => ({
      ...state,
      sortField: event.sortField,
      sortOrder: event.sortOrder
    }));

    this.loadFlashcards(event);
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

  // Pomocnicza metoda do obsługi błędów API
  private handleApiError(error: any, action: string): void {
    let errorMessage = `Nie udało się wykonać operacji ${action}. Spróbuj ponownie później.`;
    let summary = 'Błąd';
    let redirectToLogin = false;

    if (error.status === 401) {
      errorMessage = 'Błąd autoryzacji. Zaloguj się ponownie.';
      summary = 'Błąd autoryzacji';
      redirectToLogin = true;
    } else if (error.status === 403) {
      errorMessage = 'Brak uprawnień do wykonania tej operacji.';
      summary = 'Błąd uprawnień';
    } else if (error.status === 404) {
      errorMessage = 'Nie znaleziono fiszki. Może została już usunięta.';
      // Odświeżenie listy w przypadku próby edycji/usunięcia nieistniejącej fiszki
      this.loadFlashcards();
    }

    // Sprawdzamy, czy błąd jest związany z autentykacją
    if (error.message && (error.message.includes('nie jest zalogowany') || error.message.includes('Sesja wygasła') || error.message.includes('problem z kontem'))) {
      errorMessage = 'Musisz być zalogowany, aby zarządzać fiszkami.';
      summary = 'Błąd autoryzacji';
      redirectToLogin = true;
    }

    this.state.update(state => ({
      ...state,
      loading: false,
      error: errorMessage
    }));

    this.messageService.add({
      severity: 'error',
      summary: summary,
      detail: errorMessage,
      life: 5000
    });

    // Przekierowanie do strony logowania, jeśli to konieczne
    if (redirectToLogin) {
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 2000);
    }
  }
}
