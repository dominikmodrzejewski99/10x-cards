import { Component, OnInit, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { DialogComponent } from '../../shared/components/dialog/dialog.component';
import { ToastService } from '../../shared/services/toast.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
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
    DialogComponent,
    NgxSkeletonLoaderModule,
    TranslocoDirective,
    TagInputComponent
  ],
  templateUrl: './set-list.component.html',
  styleUrls: ['./set-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SetListComponent implements OnInit {
  private setApi = inject(FlashcardSetApiService);
  private shareService = inject(ShareService);
  private toastService = inject(ToastService);
  private confirmService = inject(ConfirmService);
  private router = inject(Router);
  private route: ActivatedRoute = inject(ActivatedRoute);
  private exploreService = inject(ExploreService);
  private t = inject(TranslocoService);

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
          error: this.t.translate('sets.toasts.loadFailed')
        }));
        this.toastService.add({
          severity: 'error',
          summary: this.t.translate('toasts.error'),
          detail: this.t.translate('sets.toasts.loadFailed'),
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
          this.toastService.add({
            severity: 'success',
            summary: this.t.translate('toasts.success'),
            detail: this.t.translate('sets.toasts.setUpdated')
          });
        },
        error: () => {
          this.state.update(s => ({ ...s, formSaving: false }));
          this.toastService.add({
            severity: 'error',
            summary: this.t.translate('toasts.error'),
            detail: this.t.translate('sets.toasts.updateFailed')
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
          this.toastService.add({
            severity: 'success',
            summary: this.t.translate('toasts.success'),
            detail: this.t.translate('sets.toasts.setCreated')
          });
        },
        error: () => {
          this.state.update(s => ({ ...s, formSaving: false }));
          this.toastService.add({
            severity: 'error',
            summary: this.t.translate('toasts.error'),
            detail: this.t.translate('sets.toasts.createFailed')
          });
        }
      });
    }
  }

  async deleteSet(set: FlashcardSetDTO): Promise<void> {
    const confirmed = await this.confirmService.confirm({
      message: this.t.translate('sets.toasts.confirmDeleteMessage', { name: set.name }),
      header: this.t.translate('sets.toasts.confirmDeleteHeader'),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.t.translate('toasts.yes'),
      rejectLabel: this.t.translate('toasts.no'),
      acceptClass: 'danger'
    });
    if (confirmed) {
      this.state.update(s => ({ ...s, loading: true }));
      this.setApi.deleteSet(set.id).subscribe({
        next: () => {
          this.state.update(s => ({
            ...s,
            sets: s.sets.filter(st => st.id !== set.id),
            loading: false
          }));
          this.toastService.add({
            severity: 'success',
            summary: this.t.translate('toasts.success'),
            detail: this.t.translate('sets.toasts.setDeleted')
          });
        },
        error: () => {
          this.state.update(s => ({ ...s, loading: false }));
          this.toastService.add({
            severity: 'error',
            summary: this.t.translate('toasts.error'),
            detail: this.t.translate('sets.toasts.deleteFailed')
          });
        }
      });
    }
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
      this.toastService.add({
        severity: 'success',
        summary: this.t.translate('toasts.copied'),
        detail: this.t.translate('sets.toasts.shareLinkCopied'),
      });
    } catch {
      this.toastService.add({
        severity: 'error',
        summary: this.t.translate('toasts.error'),
        detail: this.t.translate('sets.toasts.linkGenerationFailed'),
      });
    }
  }

  async publishSet(set: FlashcardSetDTO): Promise<void> {
    const confirmed = await this.confirmService.confirm({
      message: this.t.translate('sets.toasts.confirmPublishMessage', { name: set.name }),
      header: this.t.translate('sets.toasts.confirmPublishHeader'),
      icon: 'pi pi-globe',
      acceptLabel: this.t.translate('toasts.publish'),
      rejectLabel: this.t.translate('toasts.cancel')
    });
    if (confirmed) {
      this.exploreService.publishSet(set.id).subscribe({
        next: () => {
          this.state.update(s => ({
            ...s,
            sets: s.sets.map(st => st.id === set.id
              ? { ...st, is_public: true, published_at: new Date().toISOString(), copy_count: st.copy_count ?? 0 }
              : st
            )
          }));
          this.toastService.add({
            severity: 'success',
            summary: this.t.translate('toasts.published'),
            detail: this.t.translate('sets.toasts.published')
          });
        },
        error: () => {
          this.toastService.add({
            severity: 'error',
            summary: this.t.translate('toasts.error'),
            detail: this.t.translate('sets.toasts.publishFailed')
          });
        }
      });
    }
  }

  async unpublishSet(set: FlashcardSetDTO): Promise<void> {
    const confirmed = await this.confirmService.confirm({
      message: this.t.translate('sets.toasts.confirmUnpublishMessage', { name: set.name }),
      header: this.t.translate('sets.toasts.confirmUnpublishHeader'),
      icon: 'pi pi-lock',
      acceptLabel: this.t.translate('sets.toasts.hide'),
      rejectLabel: this.t.translate('toasts.cancel')
    });
    if (confirmed) {
      this.exploreService.unpublishSet(set.id).subscribe({
        next: () => {
          this.state.update(s => ({
            ...s,
            sets: s.sets.map(st => st.id === set.id
              ? { ...st, is_public: false }
              : st
            )
          }));
          this.toastService.add({
            severity: 'success',
            summary: 'Ukryto',
            detail: 'Zestaw nie jest już publiczny.'
          });
        },
        error: () => {
          this.toastService.add({
            severity: 'error',
            summary: 'Błąd',
            detail: 'Nie udało się ukryć zestawu.'
          });
        }
      });
    }
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }
}
