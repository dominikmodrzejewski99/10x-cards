import { Component, OnInit, signal, inject, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ToastService } from '../../shared/services/toast.service';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { ExploreService } from '../../services/explore.service';
import { UserPreferencesService } from '../../services/user-preferences.service';
import { PublicSetDTO } from '../../../types';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

interface ExploreState {
  sets: PublicSetDTO[];
  loading: boolean;
  error: string | null;
  search: string;
  sort: string;
  page: number;
  pageSize: number;
  total: number;
  selectedTags: string[];
  popularTags: string[];
}

@Component({
  selector: 'app-explore',
  imports: [FormsModule, RouterModule, NgxSkeletonLoaderModule, TranslocoDirective],
  templateUrl: './explore.component.html',
  styleUrls: ['./explore.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExploreComponent implements OnInit {
  private exploreService = inject(ExploreService);
  private toastService = inject(ToastService);
  private prefsService = inject(UserPreferencesService);
  private destroyRef = inject(DestroyRef);
  private t = inject(TranslocoService);

  copyDialogVisible = signal(false);
  copyDialogRemember = signal(false);
  private pendingCopySetId: number | null = null;
  private skipCopyConfirm = false;

  state = signal<ExploreState>({
    sets: [],
    loading: false,
    error: null,
    search: '',
    sort: 'popular',
    page: 1,
    pageSize: 12,
    total: 0,
    selectedTags: [],
    popularTags: []
  });

  private searchSubject = new Subject<string>();

  ngOnInit(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(search => {
      this.state.update(s => ({ ...s, search, page: 1 }));
      this.loadSets();
    });
    this.prefsService.isDialogDismissed('copy_set_confirm').pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(dismissed => this.skipCopyConfirm = dismissed);
    this.loadPopularTags();
    this.loadSets();
  }

  loadPopularTags(): void {
    this.exploreService.getPopularTags().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (tags: string[]) => {
        this.state.update(s => ({ ...s, popularTags: tags }));
      },
      error: () => { /* silently ignore */ }
    });
  }

  loadSets(): void {
    const { search, sort, page, pageSize, selectedTags } = this.state();
    this.state.update(s => ({ ...s, loading: true, error: null }));

    this.exploreService.browse(search, sort, page, pageSize, selectedTags).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.state.update(s => ({
          ...s,
          sets: response.sets,
          total: response.total,
          loading: false
        }));
      },
      error: () => {
        this.state.update(s => ({ ...s, loading: false, error: 'Failed to load sets' }));
      }
    });
  }

  onSearchInput(value: string): void {
    this.searchSubject.next(value);
  }

  toggleTag(tag: string): void {
    this.state.update(s => {
      const selected: string[] = s.selectedTags.includes(tag) ? [] : [tag];
      return { ...s, selectedTags: selected, page: 1 };
    });
    this.loadSets();
  }

  clearTags(): void {
    this.state.update(s => ({ ...s, selectedTags: [], page: 1 }));
    this.loadSets();
  }

  onSortChange(sort: string): void {
    this.state.update(s => ({ ...s, sort, page: 1 }));
    this.loadSets();
  }

  onPageChange(page: number): void {
    this.state.update(s => ({ ...s, page }));
    this.loadSets();
  }

  get totalPages(): number {
    return Math.ceil(this.state().total / this.state().pageSize);
  }

  requestCopy(setId: number): void {
    if (this.skipCopyConfirm) {
      this.executeCopy(setId);
      return;
    }
    this.pendingCopySetId = setId;
    this.copyDialogRemember.set(false);
    this.copyDialogVisible.set(true);
  }

  confirmCopy(): void {
    const setId = this.pendingCopySetId;
    this.copyDialogVisible.set(false);
    if (setId == null) return;

    if (this.copyDialogRemember()) {
      this.skipCopyConfirm = true;
      this.prefsService.dismissDialog('copy_set_confirm').subscribe();
    }

    this.executeCopy(setId);
  }

  cancelCopy(): void {
    this.copyDialogVisible.set(false);
    this.pendingCopySetId = null;
  }

  private executeCopy(setId: number): void {
    this.exploreService.copySet(setId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toastService.add({
          severity: 'success',
          summary: this.t.translate('toasts.copied'),
          detail: this.t.translate('explore.toasts.setCopied')
        });
        this.state.update(s => ({
          ...s,
          sets: s.sets.map(set =>
            set.id === setId ? { ...set, copy_count: set.copy_count + 1 } : set
          )
        }));
      },
      error: (err) => {
        const detail = err?.message?.includes('Cannot copy your own')
          ? this.t.translate('explore.toasts.cannotCopyOwnSet')
          : this.t.translate('explore.toasts.copyFailed');
        this.toastService.add({ severity: 'error', summary: this.t.translate('toasts.error'), detail });
      }
    });
  }
}
