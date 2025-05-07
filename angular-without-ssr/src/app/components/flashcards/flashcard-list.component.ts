import { Component, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Router } from '@angular/router';

import { FlashcardApiService } from '../../services/flashcard-api.service';
import { FlashcardTableComponent } from './flashcard-table/flashcard-table.component';
import { FlashcardFormComponent, FlashcardFormData } from './flashcard-form/flashcard-form.component';
import { FlashcardDTO } from '../../../types';
import {InputText} from 'primeng/inputtext';
import {WindowMaximizeIcon} from 'primeng/icons';
import {Ripple} from 'primeng/ripple';

// Interfejs dla stanu widoku listy fiszek
interface FlashcardListState {
  flashcards: FlashcardDTO[];      // Lista fiszek na bieżącej stronie
  totalRecords: number;            // Całkowita liczba fiszek
  loading: boolean;                // Stan ładowania danych/operacji
  error: string | null;            // Komunikat ostatniego błędu
  rows: number;                    // Liczba wierszy na stronę (limit)
  first: number;                   // Indeks pierwszego rekordu (offset)
  isFormModalVisible: boolean;     // Widoczność modala formularza
  flashcardBeingEdited: FlashcardDTO | null; // Dane do edycji lub null dla dodawania
  searchTerm: string;              // Termin wyszukiwania
  sortField: string;               // Pole do sortowania
  sortOrder: number;               // Kierunek sortowania (1: rosnąco, -1: malejąco)
}

@Component({
  selector: 'app-flashcard-list',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    TableModule,
    DialogModule,
    ToastModule,
    ConfirmDialogModule,
    FlashcardTableComponent,
    FlashcardFormComponent
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './flashcard-list.component.html',
  styleUrls: ['./flashcard-list.component.css']
})
export class FlashcardListComponent implements OnInit {
  // Stan początkowy
  private initialState: FlashcardListState = {
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
    sortOrder: -1 // Domyślnie najnowsze pierwsze
  };

  // Sygnał stanu
  state = signal<FlashcardListState>({ ...this.initialState });

  // Zmienna do bezpośredniego kontrolowania widoczności dialogu
  dialogVisible: boolean = false;

  constructor(
    private flashcardApiService: FlashcardApiService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('FlashcardListComponent initialized');
    this.loadFlashcards();
  }

  // Ładowanie fiszek z API
  loadFlashcards(event?: any): void {
    console.log('Ładowanie fiszek z API');

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
      sortOrder: this.state().sortOrder
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
        console.error('Błąd podczas pobierania fiszek:', error);
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
    console.log('Opening add modal');

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
    console.log('Tymczasowo wyłączono zapisywanie fiszek');
    console.log('Dane formularza:', formData);

    const isEdit = !!formData.id;

    // Symulacja zapisywania
    setTimeout(() => {
      if (isEdit && formData.id) {
        // Symulacja aktualizacji istniejącej fiszki
        const updatedFlashcard = {
          id: formData.id,
          front: formData.front,
          back: formData.back,
          source: 'manual' as 'manual',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: '123e4567-e89b-12d3-a456-426614174000',
          generation_id: null
        };

        // Aktualizacja listy fiszek
        this.state.update(state => ({
          ...state,
          flashcards: state.flashcards.map(f =>
            f.id === updatedFlashcard.id ? updatedFlashcard : f
          ),
          loading: false
        }));

        // Zamknij modal
        this.onCloseFormModal();
        this.messageService.add({
          severity: 'success',
          summary: 'Sukces',
          detail: 'Fiszka została zaktualizowana.'
        });
      } else {
        // Symulacja dodawania nowej fiszki
        const newId = Math.max(0, ...this.state().flashcards.map(f => f.id)) + 1;
        const newFlashcard = {
          id: newId,
          front: formData.front,
          back: formData.back,
          source: 'manual' as 'manual',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: '123e4567-e89b-12d3-a456-426614174000',
          generation_id: null
        };

        // Aktualizacja listy fiszek
        this.state.update(state => ({
          ...state,
          flashcards: [...state.flashcards, newFlashcard],
          totalRecords: state.totalRecords + 1,
          loading: false
        }));

        // Zamknij modal
        this.onCloseFormModal();
        this.messageService.add({
          severity: 'success',
          summary: 'Sukces',
          detail: 'Nowa fiszka została dodana.'
        });
      }
    }, 500); // Symulacja opóźnienia sieciowego

    // Tymczasowo wyłączono żądanie HTTP
    /*
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
        source: 'manual'
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
    */
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
        console.log('Tymczasowo wyłączono usuwanie fiszek');
        console.log('Usuwanie fiszki o ID:', flashcard.id);

        // Symulacja usuwania
        setTimeout(() => {
          // Aktualizacja listy fiszek
          this.state.update(state => ({
            ...state,
            flashcards: state.flashcards.filter(f => f.id !== flashcard.id),
            totalRecords: state.totalRecords - 1,
            loading: false
          }));

          this.messageService.add({
            severity: 'success',
            summary: 'Sukces',
            detail: 'Fiszka została usunięta.'
          });
        }, 500); // Symulacja opóźnienia sieciowego

        // Tymczasowo wyłączono żądanie HTTP
        /*
        this.state.update(state => ({
          ...state,
          loading: true
        }));

        this.flashcardApiService.deleteFlashcard(flashcard.id).subscribe({
          next: () => {
            // Aktualizacja listy fiszek
            this.state.update(state => ({
              ...state,
              flashcards: state.flashcards.filter(f => f.id !== flashcard.id),
              totalRecords: state.totalRecords - 1,
              loading: false
            }));
            // Można dodać sprawdzenie czy usunięto ostatni element na stronie
            if (this.state().flashcards.length === 0 && this.state().first > 0) {
              this.loadFlashcards({ first: Math.max(0, this.state().first - this.state().rows) });
            } else {
              // Odświeżenie bieżącej strony, jeśli to potrzebne lub po prostu aktualizacja stanu
              this.loadFlashcards(); // Można to zoptymalizować, aby nie ładować ponownie
            }
            this.messageService.add({
              severity: 'success',
              summary: 'Sukces',
              detail: 'Fiszka została usunięta.'
            });
          },
          error: (error) => this.handleApiError(error, 'usuwania')
        });
        */
      }
    });
  }

  // Obsługa zmiany strony (paginacja)
  onPageChange(event: any): void {
    console.log('Tymczasowo wyłączono paginację');
    console.log('Zmiana strony:', event);

    // Aktualizuj stan bez ładowania danych
    this.state.update(state => ({
      ...state,
      first: event.first,
      rows: event.rows
    }));

    // Tymczasowo wyłączono żądanie HTTP
    // this.loadFlashcards(event);
  }

  // Obsługa sortowania
  onSort(event: any): void {
    console.log('Tymczasowo wyłączono sortowanie');
    console.log('Sortowanie:', event);

    // Aktualizuj stan bez ładowania danych
    this.state.update(state => ({
      ...state,
      sortField: event.sortField,
      sortOrder: event.sortOrder
    }));

    // Tymczasowo wyłączono żądanie HTTP
    // this.loadFlashcards(event);
  }

  // Obsługa wyszukiwania
  onSearch(term: string): void {
    console.log('Tymczasowo wyłączono wyszukiwanie fiszek');
    console.log('Wyszukiwanie:', term);

    this.state.update(state => ({
      ...state,
      searchTerm: term,
      first: 0 // Wróć do pierwszej strony przy wyszukiwaniu
    }));

    // Symulacja wyszukiwania
    setTimeout(() => {
      // Filtruj fiszki lokalnie
      const filteredFlashcards = [
        {
          id: 1,
          front: 'Przykładowa fiszka 1',
          back: 'Odpowiedź 1',
          source: 'manual' as 'manual',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: '123e4567-e89b-12d3-a456-426614174000',
          generation_id: null
        },
        {
          id: 2,
          front: 'Przykładowa fiszka 2',
          back: 'Odpowiedź 2',
          source: 'manual' as 'manual',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: '123e4567-e89b-12d3-a456-426614174000',
          generation_id: null
        },
        {
          id: 3,
          front: 'Przykładowa fiszka 3',
          back: 'Odpowiedź 3',
          source: 'manual' as 'manual',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: '123e4567-e89b-12d3-a456-426614174000',
          generation_id: null
        }
      ].filter(f =>
        f.front.toLowerCase().includes(term.toLowerCase()) ||
        f.back.toLowerCase().includes(term.toLowerCase())
      );

      this.state.update(state => ({
        ...state,
        flashcards: filteredFlashcards,
        totalRecords: filteredFlashcards.length,
        loading: false
      }));
    }, 300);

    // Tymczasowo wyłączono żądanie HTTP
    // this.loadFlashcards();
  }

  // Resetowanie filtrów
  resetFilters(): void {
    console.log('Tymczasowo wyłączono resetowanie filtrów');

    this.state.update(state => ({
      ...state,
      searchTerm: '',
      sortField: 'id',
      sortOrder: -1,
      first: 0
    }));

    // Symulacja resetowania filtrów
    setTimeout(() => {
      // Przywróć przykładowe dane
      this.state.update(state => ({
        ...state,
        flashcards: [
          {
            id: 1,
            front: 'Przykładowa fiszka 1',
            back: 'Odpowiedź 1',
            source: 'manual' as 'manual',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            user_id: '123e4567-e89b-12d3-a456-426614174000',
            generation_id: null
          },
          {
            id: 2,
            front: 'Przykładowa fiszka 2',
            back: 'Odpowiedź 2',
            source: 'manual' as 'manual',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            user_id: '123e4567-e89b-12d3-a456-426614174000',
            generation_id: null
          },
          {
            id: 3,
            front: 'Przykładowa fiszka 3',
            back: 'Odpowiedź 3',
            source: 'manual' as 'manual',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            user_id: '123e4567-e89b-12d3-a456-426614174000',
            generation_id: null
          }
        ],
        totalRecords: 3,
        loading: false
      }));
    }, 300);

    // Tymczasowo wyłączono żądanie HTTP
    // this.loadFlashcards();
  }

  // Pomocnicza metoda do obsługi błędów API
  private handleApiError(error: any, action: string): void {
    console.error(`Błąd podczas ${action} fiszki:`, error);

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
