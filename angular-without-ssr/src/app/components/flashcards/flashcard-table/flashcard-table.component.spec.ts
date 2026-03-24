import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { FlashcardTableComponent, TableLazyLoadEvent } from './flashcard-table.component';
import { FlashcardDTO } from '../../../../types';

const MOCK_FLASHCARD: FlashcardDTO = {
  id: 1,
  front: 'Question 1',
  back: 'Answer 1',
  front_image_url: null,
  back_audio_url: null,
  front_language: null,
  back_language: null,
  source: 'manual',
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  user_id: 'user-1',
  generation_id: null,
  set_id: 1
};

const MOCK_FLASHCARD_2: FlashcardDTO = {
  ...MOCK_FLASHCARD,
  id: 2,
  front: 'Question 2',
  back: 'Answer 2'
};

@Component({
  template: `
    <app-flashcard-table
      [flashcards]="flashcards"
      [loading]="loading"
      [totalRecords]="totalRecords"
      [rows]="rows"
      [first]="first"
      [sortField]="sortField"
      [sortOrder]="sortOrder"
      (editFlashcard)="onEdit($event)"
      (deleteFlashcard)="onDelete($event)"
      (lazyLoad)="onLazyLoad($event)"
      (search)="onSearch($event)"
      (bulkDelete)="onBulkDelete($event)"
    />
  `,
  imports: [FlashcardTableComponent]
})
class TestHostComponent {
  public flashcards: FlashcardDTO[] = [MOCK_FLASHCARD, MOCK_FLASHCARD_2];
  public loading: boolean = false;
  public totalRecords: number = 20;
  public rows: number = 10;
  public first: number = 0;
  public sortField: string = 'id';
  public sortOrder: number = -1;

  public editedFlashcard: FlashcardDTO | null = null;
  public deletedFlashcard: FlashcardDTO | null = null;
  public lazyLoadEvent: TableLazyLoadEvent | null = null;
  public searchTerm: string | null = null;
  public bulkDeleteIds: number[] | null = null;

  public onEdit(card: FlashcardDTO): void {
    this.editedFlashcard = card;
  }
  public onDelete(card: FlashcardDTO): void {
    this.deletedFlashcard = card;
  }
  public onLazyLoad(event: TableLazyLoadEvent): void {
    this.lazyLoadEvent = event;
  }
  public onSearch(term: string): void {
    this.searchTerm = term;
  }
  public onBulkDelete(ids: number[]): void {
    this.bulkDeleteIds = ids;
  }
}

describe('FlashcardTableComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;
  let component: FlashcardTableComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();

    const tableDebug: FlashcardTableComponent = fixture.debugElement.children[0].componentInstance as FlashcardTableComponent;
    component = tableDebug;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('inputs', () => {
    it('should receive flashcards input', () => {
      expect(component.flashcardsSignal()).toEqual([MOCK_FLASHCARD, MOCK_FLASHCARD_2]);
    });

    it('should receive loading input', () => {
      expect(component.loadingSignal()).toBeFalse();
    });

    it('should receive totalRecords input', () => {
      expect(component.totalRecordsSignal()).toBe(20);
    });

    it('should receive rows input', () => {
      expect(component.rowsSignal()).toBe(10);
    });

    it('should receive first input', () => {
      expect(component.firstSignal()).toBe(0);
    });

    it('should receive sortField input', () => {
      expect(component.sortFieldSignal()).toBe('id');
    });

    it('should receive sortOrder input', () => {
      expect(component.sortOrderSignal()).toBe(-1);
    });
  });

  describe('computed signals', () => {
    it('should compute currentPage as 1 when first is 0', () => {
      expect(component.currentPageSignal()).toBe(1);
    });

    it('should compute totalPages', () => {
      expect(component.totalPagesSignal()).toBe(2);
    });

    it('should have selectedCount of 0 initially', () => {
      expect(component.selectedCountSignal()).toBe(0);
    });

    it('should have hasSelection as false initially', () => {
      expect(component.hasSelectionSignal()).toBeFalse();
    });

    it('should have allSelected as false initially', () => {
      expect(component.allSelectedSignal()).toBeFalse();
    });
  });

  describe('selection', () => {
    it('should toggle selection for a flashcard', () => {
      component.toggleSelect(1);
      expect(component.isSelected(1)).toBeTrue();
      expect(component.selectedCountSignal()).toBe(1);
    });

    it('should deselect when toggling an already selected flashcard', () => {
      component.toggleSelect(1);
      component.toggleSelect(1);
      expect(component.isSelected(1)).toBeFalse();
    });

    it('should select all when toggleSelectAll is called and not all are selected', () => {
      component.toggleSelectAll();
      expect(component.allSelectedSignal()).toBeTrue();
      expect(component.selectedCountSignal()).toBe(2);
    });

    it('should deselect all when toggleSelectAll is called and all are selected', () => {
      component.toggleSelectAll();
      component.toggleSelectAll();
      expect(component.selectedCountSignal()).toBe(0);
    });

    it('should clear selection', () => {
      component.toggleSelect(1);
      component.toggleSelect(2);
      component.clearSelection();
      expect(component.selectedCountSignal()).toBe(0);
    });
  });

  describe('onBulkDelete', () => {
    it('should emit bulkDelete with selected ids and clear selection', () => {
      component.toggleSelect(1);
      component.toggleSelect(2);
      component.onBulkDelete();
      fixture.detectChanges();

      expect(host.bulkDeleteIds).toEqual(jasmine.arrayContaining([1, 2]));
      expect(component.selectedCountSignal()).toBe(0);
    });

    it('should not emit bulkDelete when no items are selected', () => {
      component.onBulkDelete();
      fixture.detectChanges();
      expect(host.bulkDeleteIds).toBeNull();
    });
  });

  describe('goToPage', () => {
    it('should emit lazyLoad event with correct parameters', () => {
      component.goToPage(10);
      fixture.detectChanges();

      expect(host.lazyLoadEvent).toEqual({
        first: 10,
        rows: 10,
        sortField: 'id',
        sortOrder: -1
      });
    });
  });

  describe('search', () => {
    it('should emit search event with current searchTerm', () => {
      component.searchTerm = 'test query';
      component.onSearch();
      fixture.detectChanges();

      expect(host.searchTerm).toBe('test query');
    });

    it('should reset filter and emit empty search', () => {
      component.searchTerm = 'test query';
      component.onResetFilter();
      fixture.detectChanges();

      expect(component.searchTerm).toBe('');
      expect(host.searchTerm).toBe('');
    });

    it('should debounce search on searchTermChange', fakeAsync(() => {
      component.searchTerm = 'debounced';
      component.onSearchTermChange();
      tick(100);
      expect(host.searchTerm).toBeNull();
      tick(200);
      expect(host.searchTerm).toBe('debounced');
    }));
  });
});
