import { Injectable, inject, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { FlashcardSetApiService } from './flashcard-set-api.service';
import { ExploreService } from './explore.service';
import { ToastService } from '../shared/services/toast.service';
import { FlashcardSetDTO, CreateFlashcardSetCommand, UpdateFlashcardSetCommand } from '../../types';

@Injectable({ providedIn: 'root' })
export class SetsFacadeService {
  private readonly setApi: FlashcardSetApiService = inject(FlashcardSetApiService);
  private readonly exploreService: ExploreService = inject(ExploreService);
  private readonly toastService: ToastService = inject(ToastService);
  private readonly t: TranslocoService = inject(TranslocoService);

  private readonly _sets = signal<FlashcardSetDTO[]>([]);
  private readonly _loading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);
  private readonly _saving = signal<boolean>(false);

  public readonly setsSignal = this._sets.asReadonly();
  public readonly loadingSignal = this._loading.asReadonly();
  public readonly errorSignal = this._error.asReadonly();
  public readonly savingSignal = this._saving.asReadonly();

  public loadSets(): void {
    this._loading.set(true);
    this._error.set(null);

    this.setApi.getSets().subscribe({
      next: (sets: FlashcardSetDTO[]) => {
        this._sets.set(sets);
        this._loading.set(false);
      },
      error: () => {
        this._loading.set(false);
        this._error.set(this.t.translate('sets.toasts.loadFailed'));
        this.toastService.add({
          severity: 'error',
          summary: this.t.translate('toasts.error'),
          detail: this.t.translate('sets.toasts.loadFailed'),
          life: 5000,
        });
      },
    });
  }

  public createSet(data: CreateFlashcardSetCommand): void {
    this._saving.set(true);

    this.setApi.createSet(data).subscribe({
      next: (created: FlashcardSetDTO) => {
        this._sets.update((sets: FlashcardSetDTO[]) => [created, ...sets]);
        this._saving.set(false);
        this.toastService.add({
          severity: 'success',
          summary: this.t.translate('toasts.success'),
          detail: this.t.translate('sets.toasts.setCreated'),
        });
      },
      error: () => {
        this._saving.set(false);
        this.toastService.add({
          severity: 'error',
          summary: this.t.translate('toasts.error'),
          detail: this.t.translate('sets.toasts.createFailed'),
        });
      },
    });
  }

  public updateSet(id: number, data: UpdateFlashcardSetCommand): void {
    this._saving.set(true);

    this.setApi.updateSet(id, data).subscribe({
      next: (updated: FlashcardSetDTO) => {
        this._sets.update((sets: FlashcardSetDTO[]) =>
          sets.map((s: FlashcardSetDTO) => (s.id === updated.id ? updated : s)),
        );
        this._saving.set(false);
        this.toastService.add({
          severity: 'success',
          summary: this.t.translate('toasts.success'),
          detail: this.t.translate('sets.toasts.setUpdated'),
        });
      },
      error: () => {
        this._saving.set(false);
        this.toastService.add({
          severity: 'error',
          summary: this.t.translate('toasts.error'),
          detail: this.t.translate('sets.toasts.updateFailed'),
        });
      },
    });
  }

  public deleteSet(id: number): void {
    this._loading.set(true);

    this.setApi.deleteSet(id).subscribe({
      next: () => {
        this._sets.update((sets: FlashcardSetDTO[]) => sets.filter((s: FlashcardSetDTO) => s.id !== id));
        this._loading.set(false);
        this.toastService.add({
          severity: 'success',
          summary: this.t.translate('toasts.success'),
          detail: this.t.translate('sets.toasts.setDeleted'),
        });
      },
      error: () => {
        this._loading.set(false);
        this.toastService.add({
          severity: 'error',
          summary: this.t.translate('toasts.error'),
          detail: this.t.translate('sets.toasts.deleteFailed'),
        });
      },
    });
  }

  public publishSet(id: number): void {
    this.exploreService.publishSet(id).subscribe({
      next: () => {
        this._sets.update((sets: FlashcardSetDTO[]) =>
          sets.map((s: FlashcardSetDTO) =>
            s.id === id
              ? { ...s, is_public: true, published_at: new Date().toISOString(), copy_count: s.copy_count ?? 0 }
              : s,
          ),
        );
        this.toastService.add({
          severity: 'success',
          summary: this.t.translate('toasts.published'),
          detail: this.t.translate('sets.toasts.published'),
        });
      },
      error: () => {
        this.toastService.add({
          severity: 'error',
          summary: this.t.translate('toasts.error'),
          detail: this.t.translate('sets.toasts.publishFailed'),
        });
      },
    });
  }

  public unpublishSet(id: number): void {
    this.exploreService.unpublishSet(id).subscribe({
      next: () => {
        this._sets.update((sets: FlashcardSetDTO[]) =>
          sets.map((s: FlashcardSetDTO) => (s.id === id ? { ...s, is_public: false } : s)),
        );
        this.toastService.add({
          severity: 'success',
          summary: this.t.translate('toasts.hidden'),
          detail: this.t.translate('sets.toasts.unpublished'),
        });
      },
      error: () => {
        this.toastService.add({
          severity: 'error',
          summary: this.t.translate('toasts.error'),
          detail: this.t.translate('sets.toasts.unpublishFailed'),
        });
      },
    });
  }
}
