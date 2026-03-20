import { Component, computed, input, output, signal, InputSignal, OutputEmitterRef, Signal, WritableSignal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { FlashcardDTO } from '../../../../types';

export interface TableLazyLoadEvent {
  first: number;
  rows: number;
  sortField: string;
  sortOrder: number;
}

@Component({
  selector: 'app-flashcard-table',
  imports: [
    FormsModule,
    NgxSkeletonLoaderModule
  ],
  templateUrl: './flashcard-table.component.html',
  styleUrls: ['./flashcard-table.component.scss']
})
export class FlashcardTableComponent {
  public flashcardsSignal: InputSignal<FlashcardDTO[]> = input<FlashcardDTO[]>([], { alias: 'flashcards' });
  public loadingSignal: InputSignal<boolean> = input<boolean>(false, { alias: 'loading' });
  public totalRecordsSignal: InputSignal<number> = input<number>(0, { alias: 'totalRecords' });
  public rowsSignal: InputSignal<number> = input<number>(10, { alias: 'rows' });
  public firstSignal: InputSignal<number> = input<number>(0, { alias: 'first' });
  public sortFieldSignal: InputSignal<string> = input<string>('id', { alias: 'sortField' });
  public sortOrderSignal: InputSignal<number> = input<number>(-1, { alias: 'sortOrder' });

  public editFlashcard: OutputEmitterRef<FlashcardDTO> = output<FlashcardDTO>();
  public deleteFlashcard: OutputEmitterRef<FlashcardDTO> = output<FlashcardDTO>();
  public lazyLoad: OutputEmitterRef<TableLazyLoadEvent> = output<TableLazyLoadEvent>();
  public search: OutputEmitterRef<string> = output<string>();
  public bulkDelete: OutputEmitterRef<number[]> = output<number[]>();

  public searchTerm: string = '';
  private selectedIds: WritableSignal<Set<number>> = signal<Set<number>>(new Set());
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  public currentPageSignal: Signal<number> = computed<number>(() =>
    Math.floor(this.firstSignal() / this.rowsSignal()) + 1
  );

  public totalPagesSignal: Signal<number> = computed<number>(() =>
    Math.max(1, Math.ceil(this.totalRecordsSignal() / this.rowsSignal()))
  );

  public selectedCountSignal: Signal<number> = computed<number>(() =>
    this.selectedIds().size
  );

  public hasSelectionSignal: Signal<boolean> = computed<boolean>(() =>
    this.selectedIds().size > 0
  );

  public allSelectedSignal: Signal<boolean> = computed<boolean>(() => {
    const cards: FlashcardDTO[] = this.flashcardsSignal();
    const ids: Set<number> = this.selectedIds();
    return cards.length > 0 && cards.every((c: FlashcardDTO) => ids.has(c.id));
  });

  public isSelected(id: number): boolean {
    return this.selectedIds().has(id);
  }

  public toggleSelect(id: number): void {
    const current: Set<number> = new Set(this.selectedIds());
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    this.selectedIds.set(current);
  }

  public toggleSelectAll(): void {
    if (this.allSelectedSignal()) {
      this.selectedIds.set(new Set());
    } else {
      const allIds: Set<number> = new Set(this.flashcardsSignal().map((c: FlashcardDTO) => c.id));
      this.selectedIds.set(allIds);
    }
  }

  public clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  public onBulkDelete(): void {
    const ids: number[] = Array.from(this.selectedIds());
    if (ids.length > 0) {
      this.bulkDelete.emit(ids);
      this.selectedIds.set(new Set());
    }
  }

  public goToPage(newFirst: number): void {
    this.lazyLoad.emit({
      first: newFirst,
      rows: this.rowsSignal(),
      sortField: this.sortFieldSignal(),
      sortOrder: this.sortOrderSignal()
    });
  }

  public onSearch(): void {
    this.search.emit(this.searchTerm);
  }

  public onResetFilter(): void {
    this.searchTerm = '';
    this.search.emit('');
  }

  public onSearchTermChange(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.searchTimeout = setTimeout(() => {
      this.onSearch();
    }, 300);
  }
}
