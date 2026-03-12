import { Component, OnInit, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';

import { FlashcardSetApiService } from '../../services/flashcard-set-api.service';
import { FlashcardSetDTO, CreateFlashcardSetCommand, UpdateFlashcardSetCommand } from '../../../types';

interface SetListState {
  sets: FlashcardSetDTO[];
  loading: boolean;
  error: string | null;
  dialogVisible: boolean;
  editingSet: FlashcardSetDTO | null;
  formName: string;
  formDescription: string;
  formSaving: boolean;
}

@Component({
  selector: 'app-set-list',
  imports: [
    FormsModule,
    RouterModule,
    DialogModule,
    ToastModule,
    ConfirmDialogModule,
    ButtonModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './set-list.component.html',
  styleUrls: ['./set-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SetListComponent implements OnInit {
  private setApi = inject(FlashcardSetApiService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private router = inject(Router);

  state = signal<SetListState>({
    sets: [],
    loading: false,
    error: null,
    dialogVisible: false,
    editingSet: null,
    formName: '',
    formDescription: '',
    formSaving: false
  });

  ngOnInit(): void {
    this.loadSets();
  }

  loadSets(): void {
    this.state.update(s => ({ ...s, loading: true, error: null }));

    this.setApi.getSets().subscribe({
      next: (sets) => {
        this.state.update(s => ({ ...s, sets, loading: false }));
      },
      error: (err) => {
        this.state.update(s => ({
          ...s,
          loading: false,
          error: 'Nie udało się załadować zestawów.'
        }));
        this.messageService.add({
          severity: 'error',
          summary: 'Błąd',
          detail: 'Nie udało się załadować zestawów.',
          life: 5000
        });
      }
    });
  }

  openCreateDialog(): void {
    this.state.update(s => ({
      ...s,
      editingSet: null,
      formName: '',
      formDescription: '',
      dialogVisible: true
    }));
  }

  openEditDialog(set: FlashcardSetDTO): void {
    this.state.update(s => ({
      ...s,
      editingSet: set,
      formName: set.name,
      formDescription: set.description ?? '',
      dialogVisible: true
    }));
  }

  closeDialog(): void {
    this.state.update(s => ({
      ...s,
      dialogVisible: false,
      editingSet: null,
      formName: '',
      formDescription: ''
    }));
  }

  onFormNameChange(value: string): void {
    this.state.update(s => ({ ...s, formName: value }));
  }

  onFormDescriptionChange(value: string): void {
    this.state.update(s => ({ ...s, formDescription: value }));
  }

  saveSet(): void {
    const { editingSet, formName, formDescription } = this.state();
    if (!formName.trim()) return;

    this.state.update(s => ({ ...s, formSaving: true }));

    if (editingSet) {
      const data: UpdateFlashcardSetCommand = {
        name: formName.trim(),
        description: formDescription.trim() || null
      };
      this.setApi.updateSet(editingSet.id, data).subscribe({
        next: (updated) => {
          this.state.update(s => ({
            ...s,
            sets: s.sets.map(st => st.id === updated.id ? updated : st),
            formSaving: false
          }));
          this.closeDialog();
          this.messageService.add({
            severity: 'success',
            summary: 'Sukces',
            detail: 'Zestaw został zaktualizowany.'
          });
        },
        error: () => {
          this.state.update(s => ({ ...s, formSaving: false }));
          this.messageService.add({
            severity: 'error',
            summary: 'Błąd',
            detail: 'Nie udało się zaktualizować zestawu.'
          });
        }
      });
    } else {
      const data: CreateFlashcardSetCommand = {
        name: formName.trim(),
        description: formDescription.trim() || null
      };
      this.setApi.createSet(data).subscribe({
        next: (created) => {
          this.state.update(s => ({
            ...s,
            sets: [created, ...s.sets],
            formSaving: false
          }));
          this.closeDialog();
          this.messageService.add({
            severity: 'success',
            summary: 'Sukces',
            detail: 'Zestaw został utworzony.'
          });
        },
        error: () => {
          this.state.update(s => ({ ...s, formSaving: false }));
          this.messageService.add({
            severity: 'error',
            summary: 'Błąd',
            detail: 'Nie udało się utworzyć zestawu.'
          });
        }
      });
    }
  }

  deleteSet(set: FlashcardSetDTO): void {
    this.confirmationService.confirm({
      message: `Czy na pewno chcesz usunąć zestaw „${set.name}"? Wszystkie fiszki z tego zestawu zostaną również usunięte.`,
      header: 'Potwierdzenie usunięcia',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Tak',
      rejectLabel: 'Nie',
      accept: () => {
        this.state.update(s => ({ ...s, loading: true }));
        this.setApi.deleteSet(set.id).subscribe({
          next: () => {
            this.state.update(s => ({
              ...s,
              sets: s.sets.filter(st => st.id !== set.id),
              loading: false
            }));
            this.messageService.add({
              severity: 'success',
              summary: 'Sukces',
              detail: 'Zestaw został usunięty.'
            });
          },
          error: () => {
            this.state.update(s => ({ ...s, loading: false }));
            this.messageService.add({
              severity: 'error',
              summary: 'Błąd',
              detail: 'Nie udało się usunąć zestawu.'
            });
          }
        });
      }
    });
  }

  navigateToSet(set: FlashcardSetDTO): void {
    this.router.navigate(['/sets', set.id]);
  }

  studySet(set: FlashcardSetDTO): void {
    this.router.navigate(['/study'], { queryParams: { setId: set.id } });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }
}
