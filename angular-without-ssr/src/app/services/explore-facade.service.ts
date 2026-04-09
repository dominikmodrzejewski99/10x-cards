import { Injectable, inject, signal, computed } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { ExploreService } from './explore.service';
import { UserPreferencesService } from './user-preferences.service';
import { ToastService } from '../shared/services/toast.service';
import { PublicSetDTO } from '../../types';

@Injectable({ providedIn: 'root' })
export class ExploreFacadeService {
  private readonly exploreService: ExploreService = inject(ExploreService);
  private readonly toastService: ToastService = inject(ToastService);
  private readonly prefsService: UserPreferencesService = inject(UserPreferencesService);
  private readonly t: TranslocoService = inject(TranslocoService);

  private readonly _sets = signal<PublicSetDTO[]>([]);
  private readonly _loading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);
  private readonly _search = signal<string>('');
  private readonly _sort = signal<string>('popular');
  private readonly _page = signal<number>(1);
  private readonly _pageSize = signal<number>(12);
  private readonly _total = signal<number>(0);
  private readonly _selectedTags = signal<string[]>([]);
  private readonly _popularTags = signal<string[]>([]);
  private readonly _copyDialogVisible = signal<boolean>(false);
  private readonly _copyDialogRemember = signal<boolean>(false);

  public readonly setsSignal = this._sets.asReadonly();
  public readonly loadingSignal = this._loading.asReadonly();
  public readonly errorSignal = this._error.asReadonly();
  public readonly searchSignal = this._search.asReadonly();
  public readonly sortSignal = this._sort.asReadonly();
  public readonly pageSignal = this._page.asReadonly();
  public readonly pageSizeSignal = this._pageSize.asReadonly();
  public readonly totalSignal = this._total.asReadonly();
  public readonly selectedTagsSignal = this._selectedTags.asReadonly();
  public readonly popularTagsSignal = this._popularTags.asReadonly();
  public readonly copyDialogVisibleSignal = this._copyDialogVisible.asReadonly();
  public readonly copyDialogRememberSignal = this._copyDialogRemember.asReadonly();

  public readonly totalPagesSignal = computed(() => Math.ceil(this._total() / this._pageSize()));

  private pendingCopySetId: number | null = null;
  private skipCopyConfirm = false;

  private readonly searchSubject = new Subject<string>();
  private searchSubscription: Subscription | null = null;

  public init(): void {
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
    ).subscribe((search: string) => {
      this._search.set(search);
      this._page.set(1);
      this.loadSets();
    });

    this.prefsService.isDialogDismissed('copy_set_confirm').subscribe(
      (dismissed: boolean) => this.skipCopyConfirm = dismissed,
    );

    this.loadPopularTags();
    this.loadSets();
  }

  public loadPopularTags(): void {
    this.exploreService.getPopularTags().subscribe({
      next: (tags: string[]) => {
        this._popularTags.set(tags);
      },
      error: () => { /* silently ignore */ },
    });
  }

  public loadSets(): void {
    this._loading.set(true);
    this._error.set(null);

    this.exploreService.browse(
      this._search(),
      this._sort(),
      this._page(),
      this._pageSize(),
      this._selectedTags(),
    ).subscribe({
      next: (response) => {
        this._sets.set(response.sets);
        this._total.set(response.total);
        this._loading.set(false);
      },
      error: () => {
        this._loading.set(false);
        this._error.set('Failed to load sets');
      },
    });
  }

  public onSearchInput(value: string): void {
    this.searchSubject.next(value);
  }

  public toggleTag(tag: string): void {
    const selected: string[] = this._selectedTags().includes(tag) ? [] : [tag];
    this._selectedTags.set(selected);
    this._page.set(1);
    this.loadSets();
  }

  public clearTags(): void {
    this._selectedTags.set([]);
    this._page.set(1);
    this.loadSets();
  }

  public onSortChange(sort: string): void {
    this._sort.set(sort);
    this._page.set(1);
    this.loadSets();
  }

  public onPageChange(page: number): void {
    this._page.set(page);
    this.loadSets();
  }

  public requestCopy(setId: number): void {
    if (this.skipCopyConfirm) {
      this.executeCopy(setId);
      return;
    }
    this.pendingCopySetId = setId;
    this._copyDialogRemember.set(false);
    this._copyDialogVisible.set(true);
  }

  public confirmCopy(): void {
    const setId = this.pendingCopySetId;
    this._copyDialogVisible.set(false);
    if (setId == null) return;

    if (this._copyDialogRemember()) {
      this.skipCopyConfirm = true;
      this.prefsService.dismissDialog('copy_set_confirm').subscribe();
    }

    this.executeCopy(setId);
  }

  public cancelCopy(): void {
    this._copyDialogVisible.set(false);
    this.pendingCopySetId = null;
  }

  public toggleCopyDialogRemember(): void {
    this._copyDialogRemember.update((current: boolean) => !current);
  }

  private executeCopy(setId: number): void {
    this.exploreService.copySet(setId).subscribe({
      next: () => {
        this.toastService.add({
          severity: 'success',
          summary: this.t.translate('toasts.copied'),
          detail: this.t.translate('explore.toasts.setCopied'),
        });
        this._sets.update((sets: PublicSetDTO[]) =>
          sets.map((set: PublicSetDTO) =>
            set.id === setId ? { ...set, copy_count: set.copy_count + 1 } : set,
          ),
        );
      },
      error: (err) => {
        const detail = err?.message?.includes('Cannot copy your own')
          ? this.t.translate('explore.toasts.cannotCopyOwnSet')
          : this.t.translate('explore.toasts.copyFailed');
        this.toastService.add({ severity: 'error', summary: this.t.translate('toasts.error'), detail });
      },
    });
  }

  public destroy(): void {
    this.searchSubscription?.unsubscribe();
    this.searchSubscription = null;
  }
}
