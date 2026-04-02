import { Component, OnInit, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { TranslocoDirective } from '@jsverse/transloco';
import { FlashcardSetApiService } from '../../services/flashcard-set-api.service';
import { ShareService } from '../../services/share.service';
import { ExploreService } from '../../services/explore.service';
import { TagInputComponent } from '../../shared/components/tag-input/tag-input.component';
import { FlashcardSetDTO, CreateFlashcardSetCommand, UpdateFlashcardSetCommand } from '../../../types';

interface SetListState {
  sets: FlashcardSetDTO[];
  loading: boolean;
  error: string | null;
  dialogVisible: boolean;
  editingSet: FlashcardSetDTO | null;
  formName: string;
  formDescription: string;
  formTags: string[];
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
    NgxSkeletonLoaderModule,
    TranslocoDirective,
    TagInputComponent
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './set-list.component.html',
  styleUrls: ['./set-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SetListComponent implements OnInit {
  private setApi = inject(FlashcardSetApiService);
  private shareService = inject(ShareService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private router = inject(Router);
  private route: ActivatedRoute = inject(ActivatedRoute);
  private exploreService = inject(ExploreService);

  state = signal<SetListState>({
    sets: [],
    loading: false,
    error: null,
    dialogVisible: false,
    editingSet: null,
    formName: '',
    formDescription: '',
    formTags: [],
    formSaving: false
  });

  ngOnInit(): void {
    this.loadSets();

    const shouldCreate: string | null = this.route.snapshot.queryParams['create'];
    if (shouldCreate) {
      this.openCreateDialog();
      this.router.navigate([], { queryParams: {}, replaceUrl: true });
    }
  }

  loadSets(): void {
    this.state.update(s => ({ ...s, loading: true, error: null }));

    this.setApi.getSets().subscribe({
      next: (sets) => {
        this.state.update(s => ({ ...s, sets, loading: false }));
        if (sets.length === 0) {
          this.openCreateDialog();
        }
      },
      error: () => {
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
      formTags: [],
      dialogVisible: true
    }));
  }

  openEditDialog(set: FlashcardSetDTO): void {
    this.state.update(s => ({
      ...s,
      editingSet: set,
      formName: set.name,
      formDescription: set.description ?? '',
      formTags: [...(set.tags ?? [])],
      dialogVisible: true
    }));
  }

  closeDialog(): void {
    this.state.update(s => ({
      ...s,
      dialogVisible: false,
      editingSet: null,
      formName: '',
      formDescription: '',
      formTags: []
    }));
  }

  onFormNameChange(value: string): void {
    this.state.update(s => ({ ...s, formName: value }));
  }

  onFormDescriptionChange(value: string): void {
    this.state.update(s => ({ ...s, formDescription: value }));
  }

  onFormTagsChange(tags: string[]): void {
    this.state.update(s => ({ ...s, formTags: tags }));
  }

  saveSet(): void {
    const { editingSet, formName, formDescription, formTags } = this.state();
    if (!formName.trim()) return;

    this.state.update(s => ({ ...s, formSaving: true }));

    if (editingSet) {
      const data: UpdateFlashcardSetCommand = {
        name: formName.trim(),
        description: formDescription.trim() || null,
        tags: formTags
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
        description: formDescription.trim() || null,
        tags: formTags
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

  quizSet(set: FlashcardSetDTO): void {
    this.router.navigate(['/quiz', set.id]);
  }

  async shareSet(set: FlashcardSetDTO): Promise<void> {
    try {
      const link = await this.shareService.createShareLink(set.id);
      const url = this.shareService.buildShareUrl(link.id);
      await navigator.clipboard.writeText(url);
      this.messageService.add({
        severity: 'success',
        summary: 'Skopiowano',
        detail: 'Link do udostępnienia skopiowany do schowka (ważny 7 dni)',
      });
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Błąd',
        detail: 'Nie udało się wygenerować linku',
      });
    }
  }

  publishSet(set: FlashcardSetDTO): void {
    this.confirmationService.confirm({
      message: `Czy na pewno chcesz opublikować zestaw „${set.name}"? Będzie widoczny dla wszystkich użytkowników.`,
      header: 'Publikacja zestawu',
      icon: 'pi pi-globe',
      acceptLabel: 'Opublikuj',
      rejectLabel: 'Anuluj',
      accept: () => {
        this.exploreService.publishSet(set.id).subscribe({
          next: () => {
            this.state.update(s => ({
              ...s,
              sets: s.sets.map(st => st.id === set.id
                ? { ...st, is_public: true, published_at: new Date().toISOString(), copy_count: st.copy_count ?? 0 }
                : st
              )
            }));
            this.messageService.add({
              severity: 'success',
              summary: 'Opublikowano',
              detail: 'Zestaw jest teraz publiczny.'
            });
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Błąd',
              detail: 'Nie udało się opublikować zestawu.'
            });
          }
        });
      }
    });
  }

  unpublishSet(set: FlashcardSetDTO): void {
    this.confirmationService.confirm({
      message: `Czy na pewno chcesz ukryć zestaw „${set.name}"? Nie będzie już widoczny publicznie.`,
      header: 'Ukrycie zestawu',
      icon: 'pi pi-lock',
      acceptLabel: 'Ukryj',
      rejectLabel: 'Anuluj',
      accept: () => {
        this.exploreService.unpublishSet(set.id).subscribe({
          next: () => {
            this.state.update(s => ({
              ...s,
              sets: s.sets.map(st => st.id === set.id
                ? { ...st, is_public: false }
                : st
              )
            }));
            this.messageService.add({
              severity: 'success',
              summary: 'Ukryto',
              detail: 'Zestaw nie jest już publiczny.'
            });
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Błąd',
              detail: 'Nie udało się ukryć zestawu.'
            });
          }
        });
      }
    });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }
}
