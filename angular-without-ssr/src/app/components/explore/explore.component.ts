import { Component, OnInit, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { TranslocoDirective } from '@jsverse/transloco';
import { ExploreService } from '../../services/explore.service';
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
}

@Component({
  selector: 'app-explore',
  imports: [FormsModule, RouterModule, ToastModule, NgxSkeletonLoaderModule, TranslocoDirective],
  providers: [MessageService],
  templateUrl: './explore.component.html',
  styleUrls: ['./explore.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExploreComponent implements OnInit {
  private exploreService = inject(ExploreService);
  private messageService = inject(MessageService);

  state = signal<ExploreState>({
    sets: [],
    loading: false,
    error: null,
    search: '',
    sort: 'popular',
    page: 1,
    pageSize: 12,
    total: 0
  });

  private searchSubject = new Subject<string>();

  ngOnInit(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(search => {
      this.state.update(s => ({ ...s, search, page: 1 }));
      this.loadSets();
    });
    this.loadSets();
  }

  loadSets(): void {
    const { search, sort, page, pageSize } = this.state();
    this.state.update(s => ({ ...s, loading: true, error: null }));

    this.exploreService.browse(search, sort, page, pageSize).subscribe({
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

  onSortChange(sort: string): void {
    this.state.update(s => ({ ...s, sort, page: 1 }));
    this.loadSets();
  }

  onPageChange(page: number): void {
    this.state.update(s => ({ ...s, page }));
    this.loadSets();
  }

  copySet(setId: number): void {
    this.exploreService.copySet(setId).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Skopiowano',
          detail: 'Zestaw został skopiowany do Twoich zestawów.'
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
          ? 'Nie możesz skopiować własnego zestawu.'
          : 'Nie udało się skopiować zestawu.';
        this.messageService.add({ severity: 'error', summary: 'Błąd', detail });
      }
    });
  }

  get totalPages(): number {
    return Math.ceil(this.state().total / this.state().pageSize);
  }
}
